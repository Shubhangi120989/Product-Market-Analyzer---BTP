// app/api/rag/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getUser } from "@/lib/authHelper";
import { Product } from "@/models/product.model";
import { IMessage, Message } from "@/models/message.model";
import { getEmbedding } from "@/lib/getEmbedding";
import client from "@/lib/qdrantClient";
import { generateContent } from "@/lib/generateContent";
import { number } from "zod";

/**
 * Pipeline tuning constants
 */
const BASE_MODEL:number=1;              //to indicate if the answers are coming from the base model or not
const TOP_K_SEARCH = 30;        // how many candidates to fetch per hypothetical answer
const MMR_SELECT = 20;          // how many items to keep after MMR per subquery
const FUSED_TOP = 20;           // final number of chunks to include in prompt
const RRF_K = 60;               // RRF constant
const MMR_LAMBDA = 0.7;         // MMR trade-off (0..1)
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION_NAME || "reddit-posts";

/* -------------------- Types -------------------- */
type Vector = number[];

type QdrantHit = {
  id?: string | number;
  payload?: any;
  score?: number;
  vector?: Vector;
};

type Candidate = {
  id: string | number;
  text: string;
  payload: any;
  score?: number;
  embedding: Vector;
};

type PerAnswerBucket = {
  subquery: string;
  hypotheticalAnswer: string;
  hypEmbedding: Vector;
  candidates: Candidate[];
};

/* -------------------- Utilities -------------------- */

function cosineSim(a: Vector, b: Vector): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0;
    const bi = b[i] ?? 0;
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * MMR - returns selected subset of candidates (keeps order by selection)
 */
function applyMMR(candidates: Candidate[], queryEmbedding: Vector, selectK = MMR_SELECT, lambda = MMR_LAMBDA): Candidate[] {
  if (!candidates || candidates.length === 0) return [];

  const simsToQuery = candidates.map(c => cosineSim(c.embedding, queryEmbedding));
  // sort indices by relevance desc
  const idxs = candidates.map((_, i) => i).sort((i, j) => (simsToQuery[j] ?? 0) - (simsToQuery[i] ?? 0));

  const selected: Candidate[] = [];
  const selectedIdxs = new Set<number>();

  // pick best first
  if (idxs[0] !== undefined) {
    selectedIdxs.add(idxs[0]);
    selected.push(candidates[idxs[0]]!);
  }

  while (selected.length < Math.min(selectK, candidates.length)) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (const i of idxs) {
      if (selectedIdxs.has(i)) continue;
      const simToQuery = simsToQuery[i] ?? 0;
      // compute max similarity to selected set
      let maxSimToSelected = -Infinity;
      for (const s of selected) {
        const sim = cosineSim(candidates[i]?.embedding ?? [], s.embedding);
        if (sim > maxSimToSelected) maxSimToSelected = sim;
      }
      if (maxSimToSelected === -Infinity) maxSimToSelected = 0;
      const mmrScore = lambda * simToQuery - (1 - lambda) * maxSimToSelected;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;
    selectedIdxs.add(bestIdx);
    selected.push(candidates[bestIdx]!);
  }

  return selected;
}

/**
 * Reciprocal Rank Fusion (RRF)
 * Accepts ranked lists (arrays) of docs, returns fused ranked array.
 */
function reciprocalRankFusion(lists: Candidate[][], k = RRF_K): Candidate[] {
  const scores = new Map<string, number>();
  const docByKey = new Map<string, Candidate>();

  const docKey = (doc: Candidate) => {
    return String(doc.id || doc.payload?.id || doc.payload?.url || doc.payload?.permalink || doc.payload?.title || JSON.stringify(doc.text).slice(0, 64));
  };

  for (const list of lists) {
    for (let i = 0; i < list.length; i++) {
      const rank = i + 1;
      const doc = list[i]!;
      const key = docKey(doc);
      const add = 1.0 / (k + rank);
      scores.set(key, (scores.get(key) || 0) + add);
      if (!docByKey.has(key)) docByKey.set(key, doc);
    }
  }

  const fused = Array.from(scores.entries())
    .map(([key, score]) => ({ key, score, doc: docByKey.get(key)! }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.doc);

  return fused;
}

/* -------------------- LLM-driven helpers -------------------- */

async function createStandaloneQuery(originalQuery: string, productName: string): Promise<string> {
  const prompt = `You are given a user question and a product name. Convert the question into a concise standalone search-style query referencing the product.\n\nUser question: "${originalQuery}"\nProduct name: "${productName}"\n\nReturn only the standalone query in 1 line.`;
  return (await generateContent(prompt)).trim();
  
}

async function createSubQueries(standaloneQuery: string): Promise<string[]> {
  const prompt = `Take the standalone query: "${standaloneQuery}" and generate 3 focused sub-queries that cover different aspects of the main question. Return them as a numbered list, one per line.`;
  const out = await generateContent(prompt);
  const lines = out.split(/\r?\n/).map(l => l.replace(/^\d+[\).\-\s]*/, '').trim()).filter(Boolean);
  console.log("Standalone query:", standaloneQuery);
  // console.log("Generated sub-queries:", lines);
  return lines.slice(0, 3);
}

async function createHypotheticalAnswer(subquery: string): Promise<string> {
  const prompt = `Produce a short hypothetical answer for this sub-query that an expert might expect to find in relevant posts. Keep it concise (2-4 sentences).\n\nSub-query: "${subquery}"`;
  const hypotheticalAnswer = (await generateContent(prompt)).trim();
  console.log("Sub-query:", subquery);
  console.log("Hypothetical answer:", hypotheticalAnswer);
  return (hypotheticalAnswer);
}

/* -------------------- Qdrant retrieval -------------------- */

async function retrieveTopPostsForEmbedding(embedding: Vector, productFilter: string, limit = TOP_K_SEARCH): Promise<QdrantHit[]> {
  try {
    const res: any[] = await client.search(QDRANT_COLLECTION, {
      vector: embedding,
      limit,
      filter: { must: [{ key: "name", match: { value: productFilter } }] },
      with_payload: true,
      with_vector: true
    });
    console.log("an object gotten from qdrant", res[0]);
    // Normalise to QdrantHit[]
    return res.map((r: any) => ({
      id: r.id,
      payload: r.payload,
      score: r.score,
      vector: r.vector
    }));
  } catch (err) {
    console.error("Qdrant search error:", (err as any)?.response?.data || err);
    return [];
  }
}

/* -------------------- API handler -------------------- */

export async function POST(req: NextRequest) {
    try {
        const user = await getUser();
        if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { query, productId } = body ?? {};
        if (!query || !productId) return NextResponse.json({ message: "query and productId are required" }, { status: 400 });

        const product = await Product.findById(productId);
        if (!product || product.status === "pending") return NextResponse.json({ message: "Product not ready" }, { status: 400 });

        const productName: string = product.product_name;
        const productDescription: string = product.product_description || "";

        // ---------- WITH PIPELINE (MMR + RRF) ----------
        // 1) Standalone query
        const standaloneQuery = await createStandaloneQuery(query, productName);

        // 2) Subqueries
        let subqueries = await createSubQueries(standaloneQuery);
        while (subqueries.length < 3) subqueries.push(`${standaloneQuery} (follow-up ${subqueries.length + 1})`);

        // 3) Hypothetical answers
        const hypotheticalAnswers = await Promise.all(subqueries.map(sq => createHypotheticalAnswer(sq)));

        // 4) For each hypothetical answer: embed -> qdrant search -> collect candidates
        const perAnswerBuckets: PerAnswerBucket[] = [];
        for (let i = 0; i < hypotheticalAnswers.length; i++) {
            const hyp = hypotheticalAnswers[i] || "";
            const hypEmb = await getEmbedding(hyp);

            const hits = await retrieveTopPostsForEmbedding(hypEmb, productName, TOP_K_SEARCH);

            const candidates: Candidate[] = await Promise.all(
                hits.map(async (h) => {
                    const title = h.payload?.title || "";
                    const selftext = h.payload?.selftext || "";
                    const comments: string[] = (h.payload?.comments || []).slice(0, 5).map((c: any) => c.text || "");
                    const chunkText = [title, selftext, ...comments].filter(Boolean).join("\n");

                    const emb = h.vector ?? (chunkText ? await getEmbedding(chunkText) : await getEmbedding(title || selftext));

                    return {
                        id: h.id ?? `${productName}_${Math.random().toString(36).slice(2, 8)}`,
                        text: `${title}\n${selftext}`.trim(),
                        payload: h.payload,
                        score: h.score,
                        embedding: emb
                    } as Candidate;
                })
            );

            perAnswerBuckets.push({
                subquery: subqueries[i] ?? standaloneQuery,
                hypotheticalAnswer: hyp ?? "",
                hypEmbedding: hypEmb,
                candidates
            });
        }

        // 5) Apply MMR per hypothetical answer
        const mmrReducedLists: Candidate[][] = perAnswerBuckets.map(bucket =>
            applyMMR(bucket.candidates, bucket.hypEmbedding, Math.min(MMR_SELECT, bucket.candidates.length), MMR_LAMBDA)
        );

        // 6) Apply Reciprocal Rank Fusion (RRF) across the lists
        const fused = reciprocalRankFusion(mmrReducedLists);
        const finalChunks = fused.slice(0, Math.min(FUSED_TOP, fused.length));

        // 7) Build prompt and context string for pipeline
        let contextWithPipeline = "";
        let promptWithPipeline = `Product: ${productName}\nProduct description: ${productDescription}\n\nContext (posts about this product):\n\n`;

        finalChunks.forEach((c, idx) => {
            const title = c.payload?.title || "";
            const selftext = c.payload?.selftext || "";
            const topComments = (c.payload?.comments || []).slice(0, 5);
            const sourceUrl = c.payload?.url || c.payload?.permalink || "unknown";
            let chunkStr = `Chunk ${idx + 1}:\nTitle: ${title}\nSelftext: ${selftext}\nTop comments:\n`;
            topComments.forEach((cm: any, i: number) => {
                chunkStr += `${i + 1}. ${cm.text}\n`;
            });
            chunkStr += `Source: ${sourceUrl}\n\n`;
            promptWithPipeline += chunkStr;
            contextWithPipeline += chunkStr;
        });

        promptWithPipeline += `\nUser question: ${query}\n\nUsing ONLY the context above, produce a thorough and actionable answer to the user's question. Cite sources inline (give the Source URL next to the point you extract). Keep the answer factual and avoid inventing claims not found in the posts.`;

        const generatedWithPipeline = await generateContent(promptWithPipeline);

        // ---------- WITHOUT PIPELINE (Direct retrieval) ----------
        const queryEmb: Vector = await getEmbedding(query);
        const hits = await retrieveTopPostsForEmbedding(queryEmb, productName, 20);

        let contextWithoutPipeline = "";
        let promptWithoutPipeline = `Product: ${productName}\nProduct description: ${productDescription}\n\nContext (posts about this product):\n\n`;

        hits.forEach((c, idx) => {
            const title = c.payload?.title || "";
            const selftext = c.payload?.selftext || "";
            const topComments = (c.payload?.comments || []).slice(0, 5);
            const sourceUrl = c.payload?.url || c.payload?.permalink || "unknown";
            let chunkStr = `Chunk ${idx + 1}:\nTitle: ${title}\nSelftext: ${selftext}\nTop comments:\n`;
            topComments.forEach((cm: any, i: number) => {
                chunkStr += `${i + 1}. ${cm.text}\n`;
            });
            chunkStr += `Source: ${sourceUrl}\n\n`;
            promptWithoutPipeline += chunkStr;
            contextWithoutPipeline += chunkStr;
        });

        promptWithoutPipeline += `\nUser question: ${query}\n\nUsing ONLY the context above, produce a thorough and actionable answer to the user's question. Cite sources inline (give the Source URL next to the point you extract). Keep the answer factual and avoid inventing claims not found in the posts.`;

        const generatedWithoutPipeline = await generateContent(promptWithoutPipeline);

        // Return both results. Do not save to DB (testing mode).
        return NextResponse.json({
            with_pipeline: {
                ai_response: generatedWithPipeline,
                context_with_pipeline: contextWithPipeline
            },
            without_pipeline: {
                ai_response: generatedWithoutPipeline,
                context_without_pipeline: contextWithoutPipeline
            },
            meta: {
                standaloneQuery,
                subqueries,
                hypotheticalAnswers
            }
        });
    } catch (err) {
        console.error("Pipeline error:", err);
        return NextResponse.json({ message: "Internal server error", error: String(err) }, { status: 500 });
    }
}

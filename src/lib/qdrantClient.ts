import { QdrantClient } from "@qdrant/js-client-rest";
import { EMBEDDING_SIZE } from "../../constants";
// if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) throw new Error("QDRANT_URL or QDRANT_API_KEY is not defined");

const client = new QdrantClient({
    url: process.env.QDRANT_URL as string,
    apiKey: process.env.QDRANT_API_KEY as string,
    checkCompatibility: false,
});

export default client;

const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "reddit-posts";

// Create payload index on "name" at startup (required for filtering in Qdrant 1.7+, idempotent)
client.createPayloadIndex(QDRANT_COLLECTION_NAME, {
    field_name: "name",
    field_schema: "keyword",
}).catch(() => {/* index already exists or collection not ready yet */});

// Ensure the collection exists
export const ensureCollectionExists = async () => {
    try {
        const collections = await client.getCollections();
        const collectionNames = collections.collections.map((c) => c.name);
        if (!collectionNames.includes(QDRANT_COLLECTION_NAME)) {
            console.log(`Creating collection: ${QDRANT_COLLECTION_NAME}`);
            await client.createCollection(QDRANT_COLLECTION_NAME, {
                vectors: {
                    size: EMBEDDING_SIZE,
                    distance: "Cosine"
                }
            });
        }

        // Ensure payload index exists on "name" field (required for filtering in Qdrant 1.7+)
        await client.createPayloadIndex(QDRANT_COLLECTION_NAME, {
            field_name: "name",
            field_schema: "keyword",
        });
    } catch (error) {
        console.error("Error ensuring collection exists:", error);
    }
};

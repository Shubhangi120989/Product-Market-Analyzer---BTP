import { QdrantClient } from "@qdrant/js-client-rest";
// if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) throw new Error("QDRANT_URL or QDRANT_API_KEY is not defined");


const client = new QdrantClient({
    url: process.env.QDRANT_URL as string,
    apiKey: process.env.QDRANT_API_KEY as string
});

export default client;

const QDRANT_COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || "reddit-posts";

// Ensure the collection exists
export const ensureCollectionExists = async () => {
    try {
        const collections = await client.getCollections();
        const collectionNames = collections.collections.map((c) => c.name);
        if (!collectionNames.includes(QDRANT_COLLECTION_NAME)) {
            console.log(`Creating collection: ${QDRANT_COLLECTION_NAME}`);
            await client.createCollection(QDRANT_COLLECTION_NAME, {
                vectors: {
                    size: 768, // Ensure this matches your embedding model output size
                    distance: "Cosine"
                }
            });
        }
    } catch (error) {
        console.error("Error ensuring collection exists:", error);
    }
};

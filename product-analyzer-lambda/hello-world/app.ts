import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QdrantClient } from '@qdrant/js-client-rest';
import { connectToDatabase } from './lib/dbConnect';
import { Product } from './models/product.model';
import { fetchRedditPosts } from './lib/redditUtils';

// Initialize Qdrant client
const client = new QdrantClient({
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME || 'product_posts';

interface ProductRequest {
    product_name: string;
    product_description?: string;
    product_category: string;
}

/**
 * Lambda handler for processing product data
 * Receives product information and processes Reddit posts for market analysis
 */
export const lambdaHandler = async (event: any): Promise<APIGatewayProxyResult> => {
    try {
        const { product_name, product_description, product_category }: ProductRequest = event;
        
        console.log("product_name:", product_name);
        console.log("product_description:", product_description);
        console.log("product_category:", product_category);

        // Validate required fields
        if (!product_name || !product_category) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: "product_name and product_category are required"
                })
            };
        }

        // Connect to database
        await connectToDatabase();

        // Create new product record
        const newProduct = await Product.create({
            product_name: product_name,
            product_category: product_category,
            product_description: product_description || "",
            status: "pending",
            user: "system@lambda.com" // Lambda user identifier
        });

        if (!newProduct) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    message: "Failed to create product"
                })
            };
        }

        // Ensure Qdrant collection exists
        try {
            await ensureCollectionExists();
        } catch (error) {
            console.error("Error ensuring collection exists:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Failed to ensure collection exists in Qdrant"
                })
            };
        }

        // Fetch Reddit posts
        let postData;
        try {
            postData = await fetchRedditPosts(product_name, product_category, product_description!, 20);
            console.log(`Fetched ${postData.length} posts from Reddit`);
        } catch (error) {
            console.error("Error fetching Reddit posts:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Failed to fetch Reddit posts"
                })
            };
        }

        // Store in Qdrant
        try {
            await client.upsert(COLLECTION_NAME, { 
                points: postData as any
            });
            console.log("Posts inserted in vector database successfully");
        } catch (error) {
            console.error("Error storing data in Qdrant:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Failed to store data in Qdrant"
                })
            };
        }

        // Update product status to ready
        try {
            const updatedProduct = await Product.findOneAndUpdate(
                { _id: newProduct._id },
                { status: "ready" },
                { new: true }
            );
            
            console.log("Product status updated successfully");
            
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: "Posts processed successfully",
                    count: postData.length,
                    product: updatedProduct
                })
            };
        } catch (error) {
            console.error("Error updating product status:", error);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: "Failed to update product status"
                })
            };
        }

    } catch (error) {
        console.error("Error in Lambda function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: "Internal server error"
            })
        };
    }
};

// Helper function to ensure Qdrant collection exists
async function ensureCollectionExists(): Promise<void> {
    try {
        const collections = await client.getCollections();
        const collectionExists = collections.collections.some(
            (collection: any) => collection.name === COLLECTION_NAME
        );

        if (!collectionExists) {
            await client.createCollection(COLLECTION_NAME, {
                vectors: {
                    size: 1536, // OpenAI embedding size
                    distance: 'Cosine'
                }
            });
            console.log(`Created collection: ${COLLECTION_NAME}`);
        }
    } catch (error) {
        console.error("Error ensuring collection exists:", error);
        throw error;
    }
}
import { NextRequest, NextResponse } from "next/server"
import { Product , IProduct} from "@/models/product.model"
import { getUser } from "@/lib/authHelper"
import { fetchRedditPosts} from "@/lib/redditUtils"
import client, { ensureCollectionExists } from "@/lib/qdrantClient"
import dbConnect from "@/lib/dbConnect"

const COLLECTION_NAME = process.env.QDRANT_COLLECTION_NAME;
export async function POST(req: NextRequest): Promise<NextResponse> {
  const user = await getUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const {product_name,product_description,product_category} = await req.json();
    console.log("product_name:", product_name);
    console.log("product_description:", product_description);
    console.log("product_category:", product_category);

  try{
    if (!product_name || !product_category) {
      return NextResponse.json({ error: "product_name and product_category are required" }, { status: 400 });
      
    }

      const newProduct: IProduct = await Product.create({
        product_name: product_name,
        product_category: product_category,
        product_description: product_description || "",
        status: "pending",
        user: "shubhangi120989@gmail.com"
      })
      if(!newProduct){
        return NextResponse.json({ message: "Failed to create product" }, { status: 500 })
      }
    // Ensure the collection exists
    try{
      await ensureCollectionExists();
    }catch(error){
      console.error("Error ensuring collection exists:", error);
      return NextResponse.json({ error: "Failed to ensure collection exists in Qdrant" }, { status: 500 });
    }


    // const postData = await fetchRedditPosts(product_name, 70);
    let postData;
    try{
      postData = await fetchRedditPosts(product_name, product_category, product_description, 20);
      console.log(`Fetched ${postData.length} posts from Reddit`);
    }catch(error){
      console.error("Error fetching Reddit posts:", error);
      return NextResponse.json({ error: "Failed to fetch Reddit posts" }, { status: 500 });
    }

    try {
      // Store in Qdrant
      await client.upsert(COLLECTION_NAME!, { points: postData as any});
      console.log("Posts inserted in vector database successfully");
    } catch (error) {
      console.error("Error storing data in Qdrant:", error);
      return NextResponse.json({ error: "Failed to store data in Qdrant" }, { status: 500 });
    }

    try {
      // Update the product status to "ready" once insertion is successful
      console.log("newProduct._id:", newProduct._id);
      await dbConnect();
      const updatedProduct = await Product.findOneAndUpdate(
        { _id: newProduct._id },
        { status: "ready" },
        { new: true }
      );
      
      console.log("Product status updated successfully");
      return NextResponse.json({ message: "Posts inserted successfully", count: postData.length, product:updatedProduct }, { status: 200 });
    } catch (error) {
      console.error("Error updating product status:", error);
      return NextResponse.json({ error: "Failed to update product status" }, { status: 500 });
    }


  }catch(error){
    console.error("Error creating new product:", error);
    return NextResponse.json({ message: "Failed to create product" }, { status: 500 });
  }

}
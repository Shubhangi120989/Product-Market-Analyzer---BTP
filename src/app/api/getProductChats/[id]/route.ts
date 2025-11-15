import { NextRequest, NextResponse } from "next/server"
// import type { ChatMessage } from "@/lib/types"
import {IMessage, Message} from "@/models/message.model";
import { Product } from "@/models/product.model";
import { getUser } from "@/lib/authHelper";
import { AggregatePaginateModel, AggregatePaginateResult, PaginateOptions } from "mongoose";



export async function GET(req:NextRequest) {
  // console.log("In the getProductChats route");
  try{
    console.log("In the getProductChats route");
    const user = await getUser();
    // console.log("user:", user);
    if (!user) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const productId = req.nextUrl.pathname.split("/").pop();
    console.log("productId:", productId);
    
    if(!productId){
      return NextResponse.json({ message: "productId is required" }, { status: 400 });
    }
    const product = await Product.findById(productId);
    if(!product || product.status==="pending"){
        return NextResponse.json({ message: "Product not ready" }, { status: 400 });
    }
    console.log(product)



    // Extract query parameters correctly
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);

    console.log("page:", page);
    console.log("limit:", limit);
    const aggregateQuery = [
      { $match: { product: product._id } },
      { $sort: { createdAt: -1 as -1 } },
    ];
    
    const options: PaginateOptions = { page, limit };
    
    // Use aggregatePaginate for pagination
    const messages: AggregatePaginateResult<IMessage> = await (
      Message as AggregatePaginateModel<IMessage>
    ).aggregatePaginate(aggregateQuery, options);
    
    console.log(messages)
    messages.docs = messages.docs.reverse();
    const hasMore = messages.hasNextPage;
    return NextResponse.json({ messages, hasMore },{status:200});
    


  }catch(error){
    console.error("Error fetching messages:", error);
    return NextResponse.json({ message: "Failed to fetch messages" }, { status: 500 });

  }
}



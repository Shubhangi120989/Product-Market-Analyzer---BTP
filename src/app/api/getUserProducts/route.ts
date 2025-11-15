import { NextResponse } from "next/server";
import { Product, IProduct } from "@/models/product.model";
import { AggregatePaginateModel, AggregatePaginateResult, PaginateOptions } from "mongoose";
import { getUser } from "@/lib/authHelper";
import { NextRequest } from "next/server";
import dbConnect from "@/lib/dbConnect";

export async function GET(req: NextRequest) {
  try {
    // Get user securely
    const user = await getUser();
    console.log("user:", user);

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Extract query parameters correctly
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "9", 10);

    console.log("page:", page);
    console.log("limit:", limit);

    // Aggregate query for pagination
    await dbConnect();
    const aggregateQuery = Product.aggregate([
      { $match: { user: user.email } }, // Filter by authenticated user
      { $sort: { createdAt: -1 } }, // Sort by newest first
    ]);

    const options: PaginateOptions = { page, limit };

    // Use aggregatePaginate for pagination
    const products: AggregatePaginateResult<IProduct> = await (
      Product as AggregatePaginateModel<IProduct>
    ).aggregatePaginate(aggregateQuery, options);

    return NextResponse.json({ products }, { status: 200 });

  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ message: "Failed to fetch products" }, { status: 500 });
  }
}

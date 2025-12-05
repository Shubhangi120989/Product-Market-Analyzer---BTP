import mongoose, {Schema} from "mongoose"
import type { Document } from "mongoose";

export interface IProduct extends Document {
    _id: string
    user: string
    product_name: string
    product_category: string
    product_description?: string
    status: "pending" | "ready"
}

const productSchema: Schema<IProduct> = new Schema({
    user: {
        type: String,
        required: true,
    },
    product_name: {
        type: String,
        required: [true, "Please provide a product name"],
        trim: true
    },
    product_category: {
        type: String,
        required: [true, "Please provide a product category"],
        trim: true

    },
    product_description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["pending", "ready"],
        default: "pending"
    }
}, {
    timestamps: true
})

export const Product = (mongoose.models.Product as mongoose.Model<IProduct>) || mongoose.model<IProduct>("Product", productSchema);
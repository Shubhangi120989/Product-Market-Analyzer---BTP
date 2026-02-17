import { Schema, model, models, InferSchemaType } from "mongoose";

const productSchema = new Schema(
  {
    user: { type: String, required: true },
    product_name: { type: String, required: true, trim: true },
    product_category: { type: String, required: true, trim: true },
    product_description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "ready"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export type IProduct = InferSchemaType<typeof productSchema>;

export const Product =
  models.Product || model("Product", productSchema);

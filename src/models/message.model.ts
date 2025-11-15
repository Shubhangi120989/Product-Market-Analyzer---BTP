import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";
import { IProduct } from "./product.model";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

export interface IMessage extends Document {
  _id: string;
  product:  IProduct;
  content: string;
  role: "user" | "assistant"
  createdAt: string;
  sources?: string[];
}

const messageSchema: Schema<IMessage> = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    }
    ,
    content: {
      type: String,
      required: [true, "Please provide a query"],
      trim: true
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: [true, "Please provide a role"]
    },
   
    sources: {
      type: [String],
      default: []
    }
  },
  { timestamps: true }
);
// Apply the pagination plugin
messageSchema.plugin(aggregatePaginate);

export const Message =
  (mongoose.models.Message as mongoose.Model<IMessage>) ||
  mongoose.model<IMessage>("Message", messageSchema);

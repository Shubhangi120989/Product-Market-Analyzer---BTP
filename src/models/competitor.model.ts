import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";
import { IProduct } from "./product.model";
// import aggregatePaginate from "mongoose-aggregate-paginate-v2";

export interface ICompeditor extends Document {
  _id: string;
  product?:  IProduct;
  name: string
  description: string
  good_points?: string[]
  bad_points?: string[]

}

const compeditorSchema: Schema<ICompeditor> = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true
    }
    ,
    name: {
      type: String,
      required: [true, "Please provide a query"],
      trim: true
    },
    description: {
        type: String,
        required: [true, "Please provide a query"],
        trim: true
      },
    
   
    good_points: {
      type: [String],
      default: []
    },
    bad_points: {
        type: [String],
        default: []
      }
  },
  { timestamps: true }
);


export const Compeditor =
  (mongoose.models.Compeditor as mongoose.Model<ICompeditor>) ||
  mongoose.model<ICompeditor>("Compeditor", compeditorSchema);


import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";
import bcrypt from "bcrypt";
// import validator from "validator";

// Define a TypeScript interface for the User document
export interface IUser extends Document {
  _id: string;
  username: string;
  email: string;
  name: string;
  avatar: string;
  password: string;
  refreshToken?: string;
  isPasswordCorrect(password: string): Promise<boolean>;
}

const userSchema: Schema<IUser>= new Schema(
  {
    username: {
      type: String,
      required: [true, "Please enter your Username!"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Please enter your Email!"],
      unique: true,
      lowercase: true,
      trim: true,
      // validate: [validator.isEmail, "Please provide a valid Email!"],
      match:[/.+@.+\..+/, "Please provide a valid Email!"],
    },
    name: {
      type: String,
      required: [true, "Please enter your Name!"],
      trim: true,
      index: true,
    },
    avatar: {
      type: String, // For example, a Cloudinary URL
      required: [true, "Avatar is required"],
    },
    password: {
      type: String,
      required: [true, "Please provide a Password!"],
      minLength: [8, "Password must contain at least 8 characters!"],
      maxLength: [32, "Password cannot exceed 32 characters!"],
    },
    refreshToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password if it has been modified
userSchema.pre<IUser>("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Method to compare a given password with the hashed password
userSchema.methods.isPasswordCorrect = async function (
  password: string
): Promise<boolean> {
  return await bcrypt.compare(password, this.password);
};

// Export the User model. Use an existing model if it exists to prevent recompilation issues.
// export const User: Model<IUser> =
//   mongoose.models.User || mongoose.model<IUser>("User", userSchema);


//nextjs runs on edge so it does not know ki first time application bootup hori h ya usse pehle bhi ho chuki h
//so we have to check if model already exists or not
//if it exists then use that model otherwise create a new model

export const User=(mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>("User", userSchema);
import  { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import {IUser, User} from "@/models/user.model"
import dbConnect from "@/lib/dbConnect"

export const authOptions: NextAuthOptions = {
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          await dbConnect();
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email and password required");
          }
          const user = await User.findOne({ email: credentials.email }) as IUser;
          if (!user) {
            throw new Error("No user found with this email");
          }
          const isValid = await user.isPasswordCorrect(credentials.password);
          if (!isValid) {
            throw new Error("Incorrect password");
          }
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
          };
        },
      }),
    ],
    pages: {
      signIn: "/login",
    },
    session: {
      strategy: "jwt",
    },
    secret: process.env.SECRET,
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
        }
        return token;
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string;
        }
        return session;
      },
    },
  };
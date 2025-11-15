import { authOptions } from "@/lib/authoptions";

import { getServerSession } from "next-auth/next"


export interface User{
    name:string;
    email:string;
    image:string
}

export async function getSession() {
    try {
      const session = await getServerSession(authOptions);

      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }
  export async function getUser() {
    const session = await getSession();
    if (!session || !session.user) {
    
      
      return null;
    }
    return session.user as User;
  }
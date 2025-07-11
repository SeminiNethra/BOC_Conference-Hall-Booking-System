import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { findUserByEmail, comparePassword } from "@/lib/auth-utils";
import { NextAuthOptions } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string | number;
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await findUserByEmail(credentials.email);
          
          if (!user) {
            return null;
          }
          
          // Compare passwords
          const isPasswordValid = await comparePassword(credentials.password, user.password);
          
          if (!isPasswordValid) {
            return null;
          }
          
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/", // It will show the error on the login page
  },
  debug: process.env.NODE_ENV === "development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };

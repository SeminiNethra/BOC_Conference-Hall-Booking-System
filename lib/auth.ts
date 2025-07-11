import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { findUserByEmail, comparePassword } from "@/lib/auth-utils";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        try {
          // Check for admin credentials first (hardcoded for testing)
          const validEmail = "admin@boc.com";
          const validPassword = "admin1234";
          
          if (
            credentials.email === validEmail &&
            credentials.password === validPassword
          ) {
            return {
              id: "admin",
              name: "Admin",
              email: validEmail,
              role: "admin",
            };
          }
          
          // Check against database
          const user = await findUserByEmail(credentials.email);
          
          if (!user) {
            return null;
          }
          
          const isPasswordValid = await comparePassword(credentials.password, user.password);
          
          if (!isPasswordValid) {
            return null;
          }
          
          return {
            id: user.id.toString(),
            name: user.username,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (token && session.user) {
        session.user = {
          ...session.user,
          role: token.role as string,
        } as any;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
};

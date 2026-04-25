import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      email?: string | null;
      name?: string | null;
      role?: UserRole;
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      
      const email = user.email.trim();
      // Check environment variable whitelist first
      const envWhitelist = process.env.ALLOWED_EMAILS?.split(",").map(e => e.trim()) || [];
      if (envWhitelist.includes(email)) return true;

      // Check database whitelist
      const whitelistedUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
      
      return !!whitelistedUser;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        // Fetch user role from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { role: true },
        });
        token.role = dbUser?.role || "WHITELISTED";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login on error (like AccessDenied)
  },
  secret: process.env.NEXTAUTH_SECRET,
};

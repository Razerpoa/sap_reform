import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

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
      
      // Check environment variable whitelist first
      const envWhitelist = process.env.ALLOWED_EMAILS?.split(",") || [];
      if (envWhitelist.includes(user.email)) return true;

      // Check database whitelist
      const whitelistedUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
      
      return !!whitelistedUser;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
        session.user.name = token.name;
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

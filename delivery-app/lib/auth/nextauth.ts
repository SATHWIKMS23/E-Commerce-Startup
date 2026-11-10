import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const BACKEND_URL =
  process.env.BACKEND_API_URL?.replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "RiderCredentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        token: { label: "Token", type: "text" },
        riderData: { label: "RiderData", type: "text" },
      },
      async authorize(credentials) {
        if (credentials?.token && credentials?.riderData) {
          try {
            const rider = JSON.parse(credentials.riderData);
            return {
              id: rider.id,
              email: rider.email,
              name: `${rider.firstName} ${rider.lastName || ""}`.trim(),
              backendToken: credentials.token,
              rider,
            };
          } catch {
            return null;
          }
        }

        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${BACKEND_URL}/api/delivery/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });
          const data = await res.json();
          if (!res.ok || !data?.rider) {
            throw new Error(data?.message || "Invalid rider credentials");
          }
          return {
            id: data.rider.id,
            email: data.rider.email,
            name: `${data.rider.firstName} ${data.rider.lastName || ""}`.trim(),
            backendToken: data.token,
            rider: data.rider,
          };
        } catch (err: any) {
          throw new Error(err?.message || "Login failed");
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const idToken = account.id_token;
          if (!idToken) {
            console.error("[NextAuth] Missing id_token in Google account");
            return false;
          }

          const res = await fetch(`${BACKEND_URL}/api/delivery/auth/google`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: idToken }),
          });

          const data = await res.json();
          if (!res.ok || !data?.rider) {
            console.error("[NextAuth] Google backend auth failed:", data?.message);
            return `/login?error=${encodeURIComponent(data?.message || "GoogleAuthFailed")}`;
          }

          user.id = data.rider.id;
          user.email = data.rider.email;
          user.name = `${data.rider.firstName} ${data.rider.lastName || ""}`.trim();
          (user as any).backendToken = data.token;
          (user as any).rider = data.rider;
          return true;
        } catch (err: any) {
          console.error("[NextAuth] Google signIn error:", err?.message);
          return `/login?error=GoogleAuthFailed`;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.backendToken = (user as any).backendToken;
        token.rider = (user as any).rider;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        (session as any).backendToken = token.backendToken;
        (session as any).rider = token.rider;
      }
      return session;
    },
  },

  events: {
    async signOut() {
      try {
        await fetch(`${BACKEND_URL}/api/delivery/auth/logout`, { method: "POST" });
      } catch (err) {
        console.error("[NextAuth] Logout error:", err);
      }
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
  },

  secret: process.env.NEXTAUTH_SECRET || "atlasbasket_delivery_partner_secret_default",
};

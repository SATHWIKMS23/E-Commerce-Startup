import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

const BACKEND_URL = process.env.BACKEND_API_URL?.replace(/\/$/, '') || 'https://seller-api.atlasbasket.com';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
        // Direct session hydrate path (when client logged in via authApi)
        isDirectSync: { label: 'isDirectSync', type: 'text' },
        userId: { label: 'userId', type: 'text' },
        email: { label: 'email', type: 'text' },
        name: { label: 'name', type: 'text' },
        backendToken: { label: 'backendToken', type: 'text' },
        backendRefreshToken: { label: 'backendRefreshToken', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials?.isDirectSync === 'true') {
          if (!credentials.userId) return null;
          return {
            id: credentials.userId,
            email: credentials.email || '',
            name: credentials.name || '',
            backendToken: credentials.backendToken,
            backendRefreshToken: credentials.backendRefreshToken,
          };
        }

        const identifier = credentials?.identifier;
        if (!identifier || !credentials?.password) return null;

        try {
          const res = await fetch(`${BACKEND_URL}/seller/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier,
              password: credentials.password,
            }),
          });

          const data = await res.json();

          if (!res.ok || !data?.user) {
            throw new Error(data?.message || 'Invalid credentials');
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.username,
            username: data.user.username,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            backendToken: data.token,
            backendRefreshToken: data.refreshToken,
          };
        } catch (err: any) {
          throw new Error(err?.message || 'Login failed');
        }
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        try {
          const idToken = account.id_token;
          if (!idToken || !BACKEND_URL) return false;

          const res = await fetch(`${BACKEND_URL}/seller/api/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idToken,
              accessToken: account.access_token,
            }),
          });

          const rawText = await res.text();
          let data: any = {};
          try {
            data = JSON.parse(rawText);
          } catch {
            console.error(`[NextAuth] Seller Google auth received non-JSON response (status ${res.status}):`, rawText.slice(0, 300));
            return `/login?error=${encodeURIComponent(`Backend service unavailable (${res.status}). Please try again later.`)}`;
          }

          if (!res.ok || !data?.user) {
            console.error('[NextAuth] Seller Google login rejected by backend:', data?.message);
            return `/login?error=${encodeURIComponent(data?.message || 'Google authentication failed')}`;
          }

          user.id = data.user.id;
          user.email = data.user.email;
          user.name = `${data.user.firstName || ''} ${data.user.lastName || ''}`.trim() || data.user.username;
          (user as any).username = data.user.username;
          (user as any).firstName = data.user.firstName;
          (user as any).lastName = data.user.lastName;
          (user as any).backendToken = data.token;
          (user as any).backendRefreshToken = data.refreshToken;
          return true;
        } catch (err: any) {
          console.error('[NextAuth] Google signIn error:', err?.message || err);
          return `/login?error=${encodeURIComponent(err?.message || 'Google authentication failed')}`;
        }
      }
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.username = (user as any).username;
        token.firstName = (user as any).firstName;
        token.lastName = (user as any).lastName;
        token.backendToken = (user as any).backendToken;
        token.backendRefreshToken = (user as any).backendRefreshToken;
      }
      return token;
    },

    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.email = token.email || session.user.email;
        session.user.name = token.name || session.user.name;
        session.user.username = token.username as string | undefined;
        session.user.firstName = token.firstName as string | undefined;
        session.user.lastName = token.lastName as string | undefined;
        session.backendToken = token.backendToken as string | undefined;
        session.backendRefreshToken = token.backendRefreshToken as string | undefined;
      }
      return session;
    },
  },

  events: {
    async signOut() {
      try {
        if (BACKEND_URL) {
          await fetch(`${BACKEND_URL}/seller/api/auth/logout`, { method: 'POST' });
        }
      } catch (err) {
        console.error('[NextAuth] Logout error:', err);
      }
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET || 'supersecretnextauthsecret',
};

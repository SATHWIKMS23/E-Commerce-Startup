import type { DefaultSession, DefaultUser } from 'next-auth';
import type { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      username?: string;
      firstName?: string;
      lastName?: string;
    } & DefaultSession['user'];
    backendToken?: string;
    backendRefreshToken?: string;
  }

  interface User extends DefaultUser {
    id: string;
    backendToken?: string;
    backendRefreshToken?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id?: string;
    backendToken?: string;
    backendRefreshToken?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
  }
}

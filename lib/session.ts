import { SessionOptions } from 'iron-session';

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  role: 'ADMIN' | 'COLABORADOR';
}

export interface KioscoSession {
  user?: SessionUser;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'kiosco_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    // Session cookie: no maxAge = expires when browser closes
  },
};

import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, KioscoSession, SessionUser } from './session';

export async function getSession(): Promise<KioscoSession> {
  const cookieStore = cookies();
  const session = await getIronSession<KioscoSession>(cookieStore, sessionOptions);
  return session;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session.user ?? null;
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN');
  }
  return user;
}

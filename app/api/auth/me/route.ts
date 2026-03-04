import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, KioscoSession } from '@/lib/session';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET() {
  const cookieStore = cookies();
  const session = await getIronSession<KioscoSession>(cookieStore, sessionOptions);

  if (!session.user) {
    return apiError('No autorizado', 401);
  }

  return apiSuccess({ user: session.user });
}

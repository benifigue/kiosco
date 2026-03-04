import { cookies } from 'next/headers';
import { getIronSession } from 'iron-session';
import { sessionOptions, KioscoSession } from '@/lib/session';
import { createLog } from '@/lib/log';
import { apiSuccess } from '@/lib/utils';

export async function POST() {
  try {
    const cookieStore = cookies();
    const session = await getIronSession<KioscoSession>(cookieStore, sessionOptions);

    if (session.user) {
      await createLog(session.user.id, `Logout: ${session.user.username}`);
    }

    session.destroy();

    return apiSuccess({ message: 'Sesión cerrada' });
  } catch (error) {
    console.error('Logout error:', error);
    return apiSuccess({ message: 'Sesión cerrada' });
  }
}

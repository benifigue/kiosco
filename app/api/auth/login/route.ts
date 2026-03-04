import { NextRequest } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/prisma';
import { sessionOptions, KioscoSession } from '@/lib/session';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string; password?: string };
    const { username, password } = body;

    if (!username || !password) {
      return apiError('Usuario y contraseña requeridos');
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return apiError('Credenciales inválidas', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return apiError('Credenciales inválidas', 401);
    }

    const cookieStore = cookies();
    const session = await getIronSession<KioscoSession>(cookieStore, sessionOptions);

    session.user = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as 'ADMIN' | 'COLABORADOR',
    };

    await session.save();

    await createLog(user.id, `Login exitoso: ${user.username}`);

    return apiSuccess({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role as 'ADMIN' | 'COLABORADOR',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return apiError('Error interno del servidor', 500);
  }
}

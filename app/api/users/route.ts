import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';
import bcrypt from 'bcrypt';
import { canCreateUser } from '@/lib/membership';

export const dynamic = 'force-dynamic';

type Role = 'ADMIN' | 'COLABORADOR';
const VALID_ROLES: Role[] = ['ADMIN', 'COLABORADOR'];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return apiSuccess(users);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  try {
    const body = await request.json() as {
      name?: string;
      username?: string;
      password?: string;
      role?: string;
    };

    const { name, username, password, role } = body;

    if (!name || !username || !password || !role) {
      return apiError('Todos los campos son requeridos');
    }

    if (!VALID_ROLES.includes(role as Role)) {
      return apiError('Rol inválido');
    }

    // Check membership user limit
    const check = await canCreateUser(role as Role);
    if (!check.can) {
      return apiError(check.message || 'Límite de usuarios alcanzado para su plan', 403);
    }

    if (password.length < 6) {
      return apiError('La contraseña debe tener al menos 6 caracteres');
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return apiError('El nombre de usuario ya existe');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: role as Role,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    await createLog(user.id, `Usuario creado: ${newUser.username} (${newUser.role})`);

    return apiSuccess(newUser, 201);
  } catch (error) {
    console.error('Create user error:', error);
    return apiError('Error al crear usuario', 500);
  }
}

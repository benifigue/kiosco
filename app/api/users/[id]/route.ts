import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';
import bcrypt from 'bcrypt';

export const dynamic = 'force-dynamic';

type Role = 'ADMIN' | 'COLABORADOR';
const VALID_ROLES: Role[] = ['ADMIN', 'COLABORADOR'];

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('Usuario no encontrado', 404);

    let hashedPassword: string | undefined;
    if (body.password) {
      if (body.password.length < 6) {
        return apiError('La contraseña debe tener al menos 6 caracteres');
      }
      hashedPassword = await bcrypt.hash(body.password, 12);
    }

    if (body.role && !VALID_ROLES.includes(body.role as Role)) {
      return apiError('Rol inválido');
    }

    if (body.username && body.username !== existing.username) {
      const usernameExists = await prisma.user.findUnique({ where: { username: body.username } });
      if (usernameExists) return apiError('El nombre de usuario ya existe');
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.username && { username: body.username }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(body.role && { role: body.role as Role }),
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    await createLog(user.id, `Usuario actualizado: ${updated.username}`);

    return apiSuccess(updated);
  } catch (error) {
    console.error('Update user error:', error);
    return apiError('Error al actualizar usuario', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  try {
    if (params.id === user.id) {
      return apiError('No puedes eliminar tu propio usuario');
    }

    const existing = await prisma.user.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('Usuario no encontrado', 404);

    await prisma.user.delete({ where: { id: params.id } });

    await createLog(user.id, `Usuario eliminado: ${existing.username}`);

    return apiSuccess({ message: 'Usuario eliminado' });
  } catch (error) {
    console.error('Delete user error:', error);
    return apiError('Error al eliminar usuario', 500);
  }
}

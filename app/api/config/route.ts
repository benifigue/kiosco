import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  try {
    if (!(prisma as any).storeConfig) {
      return apiSuccess({ name: 'Mi Kiosco', currency: 'ARS' });
    }
    const config = await (prisma as any).storeConfig.findUnique({
      where: { id: 'default-config' },
    });
    return apiSuccess(config);
  } catch (error) {
    return apiError('Error al cargar configuración', 500);
  }
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  try {
    if (!(prisma as any).storeConfig) {
      return apiError('El cliente de base de datos no está actualizado. Reinicie el servidor.', 500);
    }
    const body = await request.json();
    const { name, description, address, phone, email, currency } = body;

    if (!name) return apiError('El nombre es requerido');

    const config = await (prisma as any).storeConfig.upsert({
      where: { id: 'default-config' },
      update: {
        name,
        description: description ?? null,
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        currency: currency ?? 'ARS',
      },
      create: {
        id: 'default-config',
        name,
        description: description ?? null,
        address: address ?? null,
        phone: phone ?? null,
        email: email ?? null,
        currency: currency ?? 'ARS',
      },
    });

    await createLog(user.id, 'Configuración del negocio actualizada');

    return apiSuccess(config);
  } catch (error) {
    console.error('Update config error:', error);
    return apiError('Error al actualizar configuración', 500);
  }
}

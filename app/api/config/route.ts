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

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  try {
    const body = await request.json();
    const { key } = body;

    if (!key) return apiError('La clave es requerida');

    // Basic validation
    const parts = key.split('.');
    if (parts.length !== 2) return apiError('Formato de clave inválido');

    const [payloadBase64, signature] = parts;
    const payloadStr = Buffer.from(payloadBase64, 'base64').toString();
    const payload = JSON.parse(payloadStr);

    // Verify signature
    const crypto = require('crypto');
    const SECRET = process.env.MEMBERSHIP_SECRET || 'clave-secreta-para-kiosco-manager-2024';
    const expectedSignature = crypto.createHmac('sha256', SECRET).update(payloadStr).digest('hex').substring(0, 16);

    if (signature !== expectedSignature) {
      return apiError('Clave de activación inválida o alterada');
    }

    // Verify expiration
    if (payload.e < Date.now()) {
      return apiError('Esta clave de membresía ya ha expirado');
    }

    // Get current config
    const config = await prisma.storeConfig.findUnique({
      where: { id: 'default-config' },
    });

    // Verify store name (optional, but requested)
    if (config?.name !== payload.s) {
      return apiError(`Esta clave fue generada para "${payload.s}", no coincide con su negocio.`);
    }

    // Apply membership
    const updated = await prisma.storeConfig.update({
      where: { id: 'default-config' },
      data: {
        membershipKey: key,
        membershipType: payload.t,
        membershipExpires: new Date(payload.e),
      },
    });

    await createLog(user.id, `Membresía activada: ${payload.t} hasta ${new Date(payload.e).toLocaleDateString()}`);

    return apiSuccess(updated);
  } catch (error) {
    console.error('Activation error:', error);
    return apiError('Error al procesar la clave de activación', 500);
  }
}

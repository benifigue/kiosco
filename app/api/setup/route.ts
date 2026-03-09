import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await prisma.storeConfig.findUnique({
      where: { id: 'default-config' },
    });
    return apiSuccess({ setupCompleted: config?.setupCompleted ?? false });
  } catch (error) {
    return apiSuccess({ setupCompleted: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const existingConfig = await prisma.storeConfig.findUnique({
      where: { id: 'default-config' },
    });

    if (existingConfig?.setupCompleted) {
      return apiError('El sistema ya ha sido configurado', 400);
    }

    const body = await request.json();
    const { storeName, adminPassword } = body;

    if (!storeName || !adminPassword) {
      return apiError('Nombre del negocio y contraseña de administrador son requeridos');
    }

    if (adminPassword.length < 6) {
      return apiError('La contraseña debe tener al menos 6 caracteres');
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const trialExpires = new Date();
    trialExpires.setDate(trialExpires.getDate() + 7);

    // Update or create store config
    await prisma.storeConfig.upsert({
      where: { id: 'default-config' },
      update: {
        name: storeName,
        setupCompleted: true,
        membershipType: 'FREE',
        membershipExpires: trialExpires,
      },
      create: {
        id: 'default-config',
        name: storeName,
        setupCompleted: true,
        membershipType: 'FREE',
        membershipExpires: trialExpires,
      },
    });

    // Update default admin password
    await prisma.user.update({
      where: { username: 'admin' },
      data: { password: hashedPassword },
    });

    return apiSuccess({ message: 'Configuración completada con éxito' });
  } catch (error) {
    console.error('Setup error:', error);
    return apiError('Error al realizar la configuración inicial', 500);
  }
}

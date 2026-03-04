import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  const { searchParams } = new URL(request.url);
  const open = searchParams.get('open');

  if (open === 'true') {
    // Find the current open register
    const register = await prisma.cashRegister.findFirst({
      where: { closedAt: null },
      include: { openedBy: { select: { id: true, name: true, username: true } } },
      orderBy: { openedAt: 'desc' },
    });
    return apiSuccess(register);
  }

  const registers = await prisma.cashRegister.findMany({
    include: { openedBy: { select: { id: true, name: true, username: true } } },
    orderBy: { openedAt: 'desc' },
    take: 50,
  });

  return apiSuccess(registers);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  try {
    const body = await request.json() as { openingAmount?: number };
    const { openingAmount } = body;

    if (openingAmount === undefined || openingAmount < 0) {
      return apiError('Monto de apertura inválido');
    }

    // Check if there's already an open register
    const existingOpen = await prisma.cashRegister.findFirst({
      where: { closedAt: null },
    });

    if (existingOpen) {
      return apiError('Ya existe una caja abierta. Ciérrela antes de abrir una nueva.');
    }

    const register = await prisma.cashRegister.create({
      data: {
        openedById: user.id,
        openingAmount,
      },
      include: { openedBy: { select: { id: true, name: true } } },
    });

    await createLog(user.id, `Caja abierta con $${openingAmount.toFixed(2)}`);

    return apiSuccess(register, 201);
  } catch (error) {
    console.error('Open cash register error:', error);
    return apiError('Error al abrir caja', 500);
  }
}

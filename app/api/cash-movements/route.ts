import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type MovementType = 'INCOME' | 'EXPENSE';
const VALID_MOVEMENT_TYPES: MovementType[] = ['INCOME', 'EXPENSE'];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const movements = await prisma.cashMovement.findMany({
    where: {
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return apiSuccess(movements);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  try {
    const body = await request.json() as {
      type?: string;
      amount?: number;
      description?: string;
    };

    const { type, amount, description } = body;

    if (!type || !VALID_MOVEMENT_TYPES.includes(type as MovementType)) {
      return apiError('Tipo de movimiento inválido');
    }

    if (amount === undefined || amount <= 0) {
      return apiError('El monto debe ser mayor a 0');
    }

    if (!description || description.trim().length === 0) {
      return apiError('La descripción es requerida');
    }

    const movement = await prisma.cashMovement.create({
      data: {
        type: type as MovementType,
        amount,
        description: description.trim(),
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    await createLog(
      user.id,
      `Movimiento de caja: ${type} $${amount.toFixed(2)} - ${description}`
    );

    return apiSuccess(movement, 201);
  } catch (error) {
    console.error('Cash movement error:', error);
    return apiError('Error al registrar movimiento', 500);
  }
}

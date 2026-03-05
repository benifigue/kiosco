import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

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

    if (register) {
      // Get all sales since open
      const [movements, sales] = await Promise.all([
        prisma.cashMovement.findMany({
          where: { createdAt: { gte: register.openedAt } },
        }),
        prisma.sale.findMany({
          where: { createdAt: { gte: register.openedAt } },
        }),
      ]);

      const totalIncome = movements
        .filter((m) => m.type === 'INCOME')
        .reduce((sum, m) => sum + m.amount, 0);

      const totalExpense = movements
        .filter((m) => m.type === 'EXPENSE')
        .reduce((sum, m) => sum + m.amount, 0);

      // Digital payment totals
      const transferTotal = sales
        .filter((s) => ['TRANSFERENCIA', 'MODO', 'MERCADOPAGO'].includes(s.paymentMethod))
        .reduce((sum, s) => sum + s.totalAmount, 0);

      const cardTotal = sales
        .filter((s) => ['DEBITO', 'CREDITO'].includes(s.paymentMethod))
        .reduce((sum, s) => sum + s.totalAmount, 0);

      const currentBalance = register.openingAmount + totalIncome - totalExpense;

      // Hide fields if user is COLABORADOR
      const result = {
        ...register,
        currentBalance: user.role === 'ADMIN' ? currentBalance : undefined,
        transferTotal,
        cardTotal,
        expectedAmount: user.role === 'ADMIN' ? register.expectedAmount : undefined,
        difference: user.role === 'ADMIN' ? register.difference : undefined,
      };

      return apiSuccess(result);
    }

    return apiSuccess(null);
  }

  const registers = await prisma.cashRegister.findMany({
    where: {
      ...(user.role === 'COLABORADOR' ? { openedById: user.id } : {}),
    },
    include: { openedBy: { select: { id: true, name: true, username: true } } },
    orderBy: { openedAt: 'desc' },
    take: 50,
  });

  // For history, also filter fields if COLABORADOR
  const filteredRegisters = registers.map((r) => ({
    ...r,
    expectedAmount: user.role === 'ADMIN' ? r.expectedAmount : undefined,
    difference: user.role === 'ADMIN' ? r.difference : undefined,
  }));

  return apiSuccess(filteredRegisters);
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

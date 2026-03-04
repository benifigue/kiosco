import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  const register = await prisma.cashRegister.findUnique({
    where: { id: params.id },
    include: { openedBy: { select: { id: true, name: true, username: true } } },
  });

  if (!register) return apiError('Caja no encontrada', 404);

  return apiSuccess(register);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  try {
    const body = await request.json() as { closingAmount?: number };
    const { closingAmount } = body;

    if (closingAmount === undefined || closingAmount < 0) {
      return apiError('Monto de cierre inválido');
    }

    const register = await prisma.cashRegister.findUnique({
      where: { id: params.id },
    });

    if (!register) return apiError('Caja no encontrada', 404);
    if (register.closedAt) return apiError('La caja ya está cerrada');

    // Calculate expected amount
    // openingAmount + all INCOME movements - all EXPENSE movements today
    const sinceOpen = register.openedAt;
    const movements = await prisma.cashMovement.findMany({
      where: { createdAt: { gte: sinceOpen } },
    });

    const totalIncome = movements
      .filter((m) => m.type === 'INCOME')
      .reduce((sum, m) => sum + m.amount, 0);

    const totalExpense = movements
      .filter((m) => m.type === 'EXPENSE')
      .reduce((sum, m) => sum + m.amount, 0);

    const expectedAmount = register.openingAmount + totalIncome - totalExpense;
    const difference = closingAmount - expectedAmount;

    const updated = await prisma.cashRegister.update({
      where: { id: params.id },
      data: {
        closingAmount,
        expectedAmount,
        difference,
        closedAt: new Date(),
      },
    });

    await createLog(
      user.id,
      `Caja cerrada. Esperado: $${expectedAmount.toFixed(2)}, Real: $${closingAmount.toFixed(2)}, Diferencia: $${difference.toFixed(2)}`
    );

    return apiSuccess(updated);
  } catch (error) {
    console.error('Close cash register error:', error);
    return apiError('Error al cerrar caja', 500);
  }
}

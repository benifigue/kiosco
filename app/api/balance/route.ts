import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const dateWhere = from || to ? {
    createdAt: {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    },
  } : {};

  const [sales, movements] = await Promise.all([
    prisma.sale.findMany({ where: dateWhere }),
    prisma.cashMovement.findMany({ where: dateWhere }),
  ]);

  const totalSales = sales.reduce((s, x) => s + x.totalAmount, 0);
  const totalProfit = sales.reduce((s, x) => s + x.totalProfit, 0);
  const totalCost = sales.reduce((s, x) => s + x.totalCost, 0);

  const totalIncome = movements.filter((m) => m.type === 'INCOME').reduce((s, m) => s + m.amount, 0);
  const totalExpenses = movements.filter((m) => m.type === 'EXPENSE').reduce((s, m) => s + m.amount, 0);

  const netProfit = totalProfit - totalExpenses;

  return apiSuccess({
    totalSales,
    totalProfit,
    totalCost,
    totalIncome,
    totalExpenses,
    netProfit,
    salesCount: sales.length,
  });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess, getStartOfDay, getEndOfDay, getStartOfWeek, getStartOfMonth, getEndOfMonth } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const filterUserId = searchParams.get('userId');

  const now = new Date();

  // Parse filters for general query
  const generalFilter: any = {};
  if (from && to) {
    generalFilter.createdAt = {
      gte: new Date(from),
      lte: getEndOfDay(new Date(to)),
    };
  }
  if (filterUserId) {
    generalFilter.userId = filterUserId;
  }

  const dateFilter = (start: Date, end: Date) => ({
    createdAt: {
      gte: start,
      lte: end,
    },
    ...(filterUserId ? { userId: filterUserId } : {}),
  });

  const [
    dailySales,
    weeklySales,
    monthlySales,
    customSales,
    allSales,
  ] = await Promise.all([
    prisma.sale.findMany({ where: dateFilter(getStartOfDay(now), getEndOfDay(now)) }),
    prisma.sale.findMany({ where: dateFilter(getStartOfWeek(now), getEndOfDay(now)) }),
    prisma.sale.findMany({ where: dateFilter(getStartOfMonth(now), getEndOfMonth(now)) }),
    from && to
      ? prisma.sale.findMany({ where: dateFilter(new Date(from), getEndOfDay(new Date(to))) })
      : Promise.resolve(null),
    prisma.sale.findMany({
      where: generalFilter,
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, username: true } },
      },
    }),
  ]);

  const sumSales = (sales: typeof dailySales) => ({
    totalAmount: sales.reduce((s, x) => s + x.totalAmount, 0),
    totalProfit: sales.reduce((s, x) => s + x.totalProfit, 0),
    count: sales.length,
  });

  // Product sales aggregation
  const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  allSales.forEach((sale) => {
    sale.items.forEach((item) => {
      const existing = productSalesMap.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.salePrice * item.quantity;
      } else {
        productSalesMap.set(item.productId, {
          name: item.product.name,
          quantity: item.quantity,
          revenue: item.salePrice * item.quantity,
        });
      }
    });
  });

  const productSales = Array.from(productSalesMap.entries())
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.quantity - a.quantity);

  const mostSold = productSales.slice(0, 5);
  const leastSold = [...productSales].sort((a, b) => a.quantity - b.quantity).slice(0, 5);

  // Sales by collaborator
  const salesByUser = new Map<string, { name: string; username: string; totalAmount: number; totalProfit: number; count: number }>();
  allSales.forEach((sale) => {
    const existing = salesByUser.get(sale.userId);
    if (existing) {
      existing.totalAmount += sale.totalAmount;
      existing.totalProfit += sale.totalProfit;
      existing.count += 1;
    } else {
      salesByUser.set(sale.userId, {
        name: sale.user.name,
        username: sale.user.username,
        totalAmount: sale.totalAmount,
        totalProfit: sale.totalProfit,
        count: 1,
      });
    }
  });

  // Monthly comparison (last 6 months)
  const monthlyData: { month: string; totalAmount: number; totalProfit: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = getStartOfMonth(date);
    const end = getEndOfMonth(date);
    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ...(filterUserId ? { userId: filterUserId } : {}),
      },
    });
    monthlyData.push({
      month: date.toLocaleString('es-AR', { month: 'short', year: 'numeric' }),
      totalAmount: sales.reduce((s, x) => s + x.totalAmount, 0),
      totalProfit: sales.reduce((s, x) => s + x.totalProfit, 0),
    });
  }

  // Sales by payment method
  const paymentMethodMap = new Map<string, number>();
  allSales.forEach((sale) => {
    const existing = paymentMethodMap.get(sale.paymentMethod) ?? 0;
    paymentMethodMap.set(sale.paymentMethod, existing + sale.totalAmount);
  });

  return apiSuccess({
    daily: sumSales(dailySales),
    weekly: sumSales(weeklySales),
    monthly: sumSales(monthlySales),
    custom: customSales ? sumSales(customSales) : null,
    mostSold,
    leastSold,
    salesByUser: Array.from(salesByUser.entries()).map(([id, data]) => ({ id, ...data })),
    monthlyComparison: monthlyData,
    paymentMethods: Array.from(paymentMethodMap.entries()).map(([method, amount]) => ({ method, amount })),
  });
}

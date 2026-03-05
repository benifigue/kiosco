import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type PaymentMethod = 'EFECTIVO' | 'TRANSFERENCIA' | 'DEBITO' | 'CREDITO' | 'MODO' | 'MERCADOPAGO';
const VALID_PAYMENT_METHODS: PaymentMethod[] = ['EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'MODO', 'MERCADOPAGO'];

interface CartItem {
  productId: string;
  quantity: number;
  salePrice: number;
  purchasePrice: number;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const userId = searchParams.get('userId');

  const sales = await prisma.sale.findMany({
    where: {
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
      ...(userId ? { userId } : {}),
      // COLABORADOR can only see their own sales
      ...(user.role === 'COLABORADOR' ? { userId: user.id } : {}),
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, category: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return apiSuccess(sales);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  try {
    const body = await request.json() as {
      items?: CartItem[];
      paymentMethod?: string;
    };

    const { items, paymentMethod } = body;

    // Check if there's an open cash register
    const openRegister = await prisma.cashRegister.findFirst({
      where: { closedAt: null },
    });

    if (!openRegister) {
      return apiError('No hay una caja abierta. Debe abrir la caja antes de registrar una venta.');
    }

    if (!items || items.length === 0) {
      return apiError('El carrito está vacío');
    }

    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod as PaymentMethod)) {
      return apiError('Método de pago inválido');
    }

    // Validate each item
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) {
        return apiError('Datos de item inválidos');
      }
    }

    // Fetch all products to validate stock and prices
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, active: true },
    });

    if (products.length !== productIds.length) {
      return apiError('Uno o más productos no existen o están inactivos');
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate totals using DB prices (server-side, not client)
    let totalAmount = 0;
    let totalCost = 0;

    const saleItemsData = items.map((item) => {
      const product = productMap.get(item.productId)!;
      const salePrice = product.salePrice;
      const purchasePrice = product.purchasePrice;
      totalAmount += salePrice * item.quantity;
      totalCost += purchasePrice * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        salePrice,
        purchasePrice,
      };
    });

    const totalProfit = totalAmount - totalCost;

    // Create sale in transaction
    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          userId: user.id,
          totalAmount,
          totalCost,
          totalProfit,
          paymentMethod: paymentMethod as PaymentMethod,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // Decrement stock for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Register cash movement (INCOME)
      if (paymentMethod === 'EFECTIVO') {
        await tx.cashMovement.create({
          data: {
            type: 'INCOME',
            amount: totalAmount,
            description: `Venta #${newSale.id.slice(-6)} - Efectivo`,
            userId: user.id,
          },
        });
      }

      return newSale;
    });

    await createLog(
      user.id,
      `Venta registrada: #${sale.id.slice(-6)} - $${totalAmount.toFixed(2)} - ${paymentMethod} - ${items.length} item(s)`
    );

    return apiSuccess(sale, 201);
  } catch (error) {
    console.error('Create sale error:', error);
    return apiError('Error al registrar venta', 500);
  }
}

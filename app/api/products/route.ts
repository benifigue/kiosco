import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createLog } from '@/lib/log';
import { apiError, apiSuccess } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? '';
  const category = searchParams.get('category') ?? '';
  const activeOnly = searchParams.get('active') !== 'false';

  const products = await prisma.product.findMany({
    where: {
      active: activeOnly ? true : undefined,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { barcode: { contains: search } },
              { internalCode: { contains: search } },
            ],
          }
        : {}),
      ...(category ? { category } : {}),
    },
    orderBy: { name: 'asc' },
  });

  return apiSuccess(products);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  try {
    const body = await request.json() as {
      name?: string;
      barcode?: string;
      internalCode?: string;
      category?: string;
      purchasePrice?: number;
      salePrice?: number;
      stock?: number;
      minStock?: number;
      image?: string;
    };

    const {
      name, barcode, internalCode, category,
      purchasePrice, salePrice, stock, minStock, image,
    } = body;

    if (!name || !category || purchasePrice === undefined || salePrice === undefined || stock === undefined || minStock === undefined) {
      return apiError('Campos requeridos: name, category, purchasePrice, salePrice, stock, minStock');
    }

    if (purchasePrice < 0 || salePrice < 0 || stock < 0 || minStock < 0) {
      return apiError('Los valores numéricos no pueden ser negativos');
    }

    const product = await prisma.product.create({
      data: {
        name,
        barcode: barcode ?? null,
        internalCode: internalCode ?? null,
        category,
        purchasePrice,
        salePrice,
        stock,
        minStock,
        image: image ?? null,
        active: true,
      },
    });

    await createLog(user.id, `Producto creado: ${product.name} (ID: ${product.id})`);

    return apiSuccess(product, 201);
  } catch (error) {
    console.error('Create product error:', error);
    return apiError('Error al crear producto', 500);
  }
}

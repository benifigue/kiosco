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

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) return apiError('Producto no encontrado', 404);

  return apiSuccess(product);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      active?: boolean;
    };

    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('Producto no encontrado', 404);

    if (
      body.purchasePrice !== undefined && body.purchasePrice < 0 ||
      body.salePrice !== undefined && body.salePrice < 0 ||
      body.stock !== undefined && body.stock < 0 ||
      body.minStock !== undefined && body.minStock < 0
    ) {
      return apiError('Los valores numéricos no pueden ser negativos');
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.barcode !== undefined && { barcode: body.barcode }),
        ...(body.internalCode !== undefined && { internalCode: body.internalCode }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.purchasePrice !== undefined && { purchasePrice: body.purchasePrice }),
        ...(body.salePrice !== undefined && { salePrice: body.salePrice }),
        ...(body.stock !== undefined && { stock: body.stock }),
        ...(body.minStock !== undefined && { minStock: body.minStock }),
        ...(body.image !== undefined && { image: body.image }),
        ...(body.active !== undefined && { active: body.active }),
      },
    });

    await createLog(user.id, `Producto actualizado: ${updated.name} (ID: ${updated.id})`);

    return apiSuccess(updated);
  } catch (error) {
    console.error('Update product error:', error);
    return apiError('Error al actualizar producto', 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  try {
    const existing = await prisma.product.findUnique({ where: { id: params.id } });
    if (!existing) return apiError('Producto no encontrado', 404);

    // Soft delete
    await prisma.product.update({
      where: { id: params.id },
      data: { active: false },
    });

    await createLog(user.id, `Producto desactivado: ${existing.name} (ID: ${existing.id})`);

    return apiSuccess({ message: 'Producto desactivado correctamente' });
  } catch (error) {
    console.error('Delete product error:', error);
    return apiError('Error al eliminar producto', 500);
  }
}

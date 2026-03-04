import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { apiError, apiSuccess } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError('No autorizado', 401);
  if (user.role !== 'ADMIN') return apiError('Acceso denegado', 403);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const filterUserId = searchParams.get('userId');

  const logs = await prisma.systemLog.findMany({
    where: {
      ...(from || to ? {
        createdAt: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
      ...(filterUserId ? { userId: filterUserId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, username: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  return apiSuccess(logs);
}

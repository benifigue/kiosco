import { prisma } from './prisma';

export async function createLog(userId: string, action: string): Promise<void> {
  await prisma.systemLog.create({
    data: { userId, action },
  });
}

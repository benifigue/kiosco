import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function RootPage() {
  const config = await prisma.storeConfig.findUnique({
    where: { id: 'default-config' },
  });

  if (!config || !config.setupCompleted) {
    redirect('/setup');
  }

  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}

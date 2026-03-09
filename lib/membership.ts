import { prisma } from './prisma';

export type MembershipType = 'FREE' | 'PRO' | 'PREMIUM';

export interface MembershipInfo {
  type: MembershipType;
  expiresAt: Date | null;
  isExpired: boolean;
}

export async function getMembership(): Promise<MembershipInfo> {
  try {
    const config = await prisma.storeConfig.findUnique({
      where: { id: 'default-config' },
      select: { membershipType: true, membershipExpires: true }
    });

    const type = (config?.membershipType as MembershipType) || 'FREE';
    const expiresAt = config?.membershipExpires || null;
    const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

    return { type, expiresAt, isExpired };
  } catch (error) {
    console.error('Error fetching membership info:', error);
    return { type: 'FREE', expiresAt: null, isExpired: false };
  }
}

export type Permission = 'VIEW_STATS' | 'VIEW_LOGS' | 'USER_LIMIT_APPLIED';

export async function hasPermission(permission: Permission): Promise<boolean> {
  const { type, isExpired } = await getMembership();

  // If expired, maybe we should block everything?
  // But for now let's focus on the plan limitations
  
  switch (permission) {
    case 'VIEW_STATS':
      return type === 'PREMIUM';
    case 'VIEW_LOGS':
      return type === 'PRO' || type === 'PREMIUM';
    case 'USER_LIMIT_APPLIED':
      return type === 'FREE';
    default:
      return true;
  }
}

/**
 * Checks if a user can be created based on the current membership
 */
export async function canCreateUser(role: 'ADMIN' | 'COLABORADOR'): Promise<{ can: boolean; message?: string }> {
  const { type } = await getMembership();
  
  if (type !== 'FREE') return { can: true };

  const users = await prisma.user.findMany({
    select: { role: true }
  });

  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const collabCount = users.filter(u => u.role === 'COLABORADOR').length;

  if (role === 'ADMIN' && adminCount >= 1) {
    return { can: false, message: 'El plan FREE solo permite 1 administrador' };
  }

  if (role === 'COLABORADOR' && collabCount >= 1) {
    return { can: false, message: 'El plan FREE solo permite 1 colaborador' };
  }

  return { can: true };
}

import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export async function verifyPermission(
  request: Request,
  module: string,
  requiredLevel: 'VIEW' | 'EDIT' | 'FULL'
) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=').trim()];
      })
    );
    const token = cookies['token'];
    if (!token) {
      return { authorized: false, error: 'Unauthorized', status: 401 };
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || user.status !== 'ACTIVE') {
      return { authorized: false, error: 'Unauthorized', status: 401 };
    }

    // ADMIN has full access everywhere
    if (user.role === 'ADMIN') {
      return { authorized: true, user };
    }

    // Only ADMIN and MANAGER have access to `/dashboard/*` page resources
    if (user.role !== 'MANAGER') {
      return { authorized: false, error: 'Access Denied', status: 403 };
    }

    // MANAGER custom permissions check
    const permissions: any = user.permissions || {};
    
    // Default manager permission fallback (if settings, default to NONE, else FULL for backwards compatibility)
    const userPerm = permissions[module] || (module === 'settings' ? 'NONE' : 'FULL');

    const levels = { 'NONE': 0, 'VIEW': 1, 'EDIT': 2, 'FULL': 3 };
    const userLevel = levels[userPerm as 'NONE' | 'VIEW' | 'EDIT' | 'FULL'] || 0;
    const reqLevel = levels[requiredLevel];

    if (userLevel >= reqLevel) {
      return { authorized: true, user };
    }

    return { authorized: false, error: 'Access Denied', status: 403 };
  } catch (error) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }
}

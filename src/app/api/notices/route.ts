import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { verifyPermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=').trim()];
      })
    );
    const tokenCookie = cookies['token'];
    
    let userId: string | null = null;
    if (tokenCookie) {
      try {
        const decoded: any = jwt.verify(tokenCookie, process.env.JWT_SECRET || 'fallback-secret');
        userId = decoded.id;
      } catch (err) {}
    }

    let notices;
    try {
      notices = await prisma.notice.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        include: {
          reads: userId ? {
            where: { userId }
          } : false
        }
      });
    } catch (e) {
      // Fallback if NoticeRead relation is not yet generated in Prisma Client
      notices = await prisma.notice.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
      });
    }

    const formattedNotices = notices.map((n: any) => ({
      ...n,
      isRead: n.reads ? n.reads.length > 0 : false,
      reads: undefined
    }));

    return NextResponse.json(formattedNotices);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notices' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyPermission(request, 'notices', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { title, content } = await request.json();
    const notice = await prisma.notice.create({
      data: { title, content }
    });
    return NextResponse.json(notice);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create notice' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=').trim()];
      })
    );
    const tokenCookie = cookies['token'];
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tokenCookie, process.env.JWT_SECRET || 'fallback-secret');
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;
    const { noticeId } = await request.json();

    if (!noticeId) {
      return NextResponse.json({ error: 'Notice ID is required' }, { status: 400 });
    }

    const read = await prisma.noticeRead.upsert({
      where: {
        noticeId_userId: {
          noticeId,
          userId
        }
      },
      update: {},
      create: {
        noticeId,
        userId
      }
    });

    return NextResponse.json({ success: true, read });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to mark notice as read' }, { status: 500 });
  }
}

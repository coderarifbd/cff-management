import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

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
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded: any = jwt.verify(tokenCookie, process.env.JWT_SECRET || 'fallback-secret');
    return NextResponse.json({ id: decoded.id, role: decoded.role });
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Normalize phone number if needed (Firebase usually returns +880...)
    // Our DB might store it differently. We'll try to find a user with this phone.
    // We should be careful about formatting.
    const user = await prisma.user.findFirst({
      where: {
        phone: {
          contains: phone.replace('+', '') // Simple fuzzy match
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'No member found with this phone number.' }, { status: 404 });
    }

    if (user.status === 'BANNED') {
      return NextResponse.json({ error: 'This account has been banned.' }, { status: 403 });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      success: true,
      role: user.role
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('OTP Login error:', error);
    return NextResponse.json({ error: 'Server error during OTP login' }, { status: 500 });
  }
}

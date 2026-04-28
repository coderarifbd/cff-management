import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, adminSecretKey, newPassword } = await request.json();

    // 1. Verify the admin secret key
    const expectedKey = process.env.ADMIN_RESET_KEY;
    if (!expectedKey || adminSecretKey !== expectedKey) {
      return NextResponse.json({ error: 'Invalid secret key' }, { status: 403 });
    }

    // 2. Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'No account found with that email' }, { status: 404 });
    }

    // 3. Only allow ADMIN or MANAGER roles to use this route
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'This reset is only available for admin accounts' }, { status: 403 });
    }

    // 4. Validate new password
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // 5. Hash and update
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { email }, data: { password: hashed } });

    return NextResponse.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Server error. Please try again.' }, { status: 500 });
  }
}

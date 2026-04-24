import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const members = await prisma.user.findMany({
      where: {
        role: { in: ['MEMBER', 'MANAGER'] }
      },
      orderBy: { joinDate: 'desc' }
    });
    return NextResponse.json(members);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { memberNo, name, email, phone, role, status, joinDate } = data;

    // Check if email or memberNo already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { memberNo: memberNo || undefined } // Only check if memberNo is provided
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email or Member No already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash('cff12345', 10); // default password for new members

    const newMember = await prisma.user.create({
      data: {
        memberNo: memberNo || null,
        name,
        email,
        phone: phone || null,
        role: role || 'MEMBER',
        status: status || 'ACTIVE',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        password: hashedPassword
      }
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}

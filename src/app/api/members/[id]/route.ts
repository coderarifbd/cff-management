import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const currentUser = await prisma.user.findUnique({ where: { id } });
    const { memberNo, name, email, phone, role, status, joinDate, bannedDate, refundAmount } = data;

    // Optional: check if email or memberNo is being used by another user
    const existing = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          { email },
          { memberNo: memberNo || undefined }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Email or Member No already taken' }, { status: 400 });
    }

    // 1. Transition: ACTIVE -> BANNED
    if (currentUser?.status !== 'BANNED' && status === 'BANNED' && refundAmount > 0) {
      await prisma.expense.create({
        data: {
          title: `Settlement Refund: ${name} (${memberNo || id})`,
          amount: parseFloat(refundAmount),
          category: 'Member Settlement',
          description: `Refunded after penalty deduction. Settlement date: ${bannedDate || new Date().toISOString()}`,
          date: bannedDate ? new Date(bannedDate) : new Date()
        }
      });
    }

    // 2. Transition: BANNED -> ACTIVE (Reversal)
    if (currentUser?.status === 'BANNED' && status === 'ACTIVE') {
      const recentRefund = await prisma.expense.findFirst({
        where: { 
          title: { contains: `Settlement Refund: ${name}` },
          category: 'Member Settlement'
        },
        orderBy: { createdAt: 'desc' }
      });

      if (recentRefund) {
        await prisma.income.create({
          data: {
            title: `Refund Reversal: ${name} (${memberNo || id})`,
            amount: recentRefund.amount,
            category: 'Settlement Reversal',
            description: `Automated reversal for re-activated member. Original refund date: ${recentRefund.date.toLocaleDateString()}`,
            date: new Date()
          }
        });
      }
    }

    const updatedMember = await prisma.user.update({
      where: { id },
      data: {
        memberNo: memberNo || null,
        name,
        email,
        phone: phone || null,
        role,
        status,
        bannedAt: status === 'BANNED' ? (bannedDate ? new Date(bannedDate) : new Date()) : (status === 'ACTIVE' ? null : undefined),
        joinDate: joinDate ? new Date(joinDate) : undefined,
      }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check if member has related payments or investments before deleting
    // If they do, usually we set status to 'REMOVED' instead of hard delete
    
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    // Return 400 suggesting soft delete if related records exist
    return NextResponse.json({ error: 'Cannot delete member with existing records. Please set status to BANNED instead.' }, { status: 400 });
  }
}

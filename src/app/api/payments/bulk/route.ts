import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { month, year, amount } = await request.json();

    const activeMembers = await prisma.user.findMany({
      where: { status: 'ACTIVE', role: 'MEMBER' }
    });

    if (activeMembers.length === 0) {
      return NextResponse.json({ error: 'No active members found' }, { status: 400 });
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const member of activeMembers) {
      const existing = await prisma.payment.findUnique({
        where: { userId_month_year: { userId: member.id, month: parseInt(month), year: parseInt(year) } }
      });

      if (!existing) {
        await prisma.payment.create({
          data: {
            userId: member.id,
            month: parseInt(month),
            year: parseInt(year),
            amount: parseFloat(amount),
            fine: 0,
            isPaid: false
          }
        });
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    return NextResponse.json({ message: `Successfully generated ${createdCount} payment records. Skipped ${skippedCount} existing records.` });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Bulk generation failed' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    const { amount, note, date } = data;

    const profit = await prisma.$transaction(async (tx) => {
      const newProfit = await tx.investmentProfit.create({
        data: {
          investmentId: id,
          amount: parseFloat(amount),
          note: note || '',
          date: date ? new Date(date) : undefined
        }
      });

      await tx.investment.update({
        where: { id },
        data: {
          profit: {
            increment: parseFloat(amount)
          }
        }
      });

      return newProfit;
    });

    return NextResponse.json(profit);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add profit' }, { status: 500 });
  }
}

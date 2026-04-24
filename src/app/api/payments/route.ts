import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const userId = searchParams.get('userId');
  const limit = searchParams.get('limit');

  try {
    const query: any = {
      include: { user: true },
      orderBy: [
        { year: 'desc' }, 
        { month: 'desc' },
        { user: { memberNo: 'asc' } }
      ]
    };

    if (month && year) {
      query.where = { ...query.where, month: parseInt(month), year: parseInt(year) };
    }
    if (userId) {
      query.where = { ...query.where, userId };
    }
    if (limit) {
      query.take = parseInt(limit);
    }

    const payments = await prisma.payment.findMany(query);
    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { userId, month, year, amount, fine, isPaid, paidAt } = data;

    const existing = await prisma.payment.findUnique({
      where: { userId_month_year: { userId, month: parseInt(month), year: parseInt(year) } }
    });

    if (existing) {
      return NextResponse.json({ error: 'Payment record already exists for this member for the given month.' }, { status: 400 });
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        month: parseInt(month),
        year: parseInt(year),
        amount: parseFloat(amount),
        fine: parseFloat(fine || 0),
        isPaid: Boolean(isPaid),
        paidAt: isPaid && paidAt ? new Date(paidAt) : null
      },
      include: { user: true }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add payment' }, { status: 500 });
  }
}

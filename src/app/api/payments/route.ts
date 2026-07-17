import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await verifyPermission(request, 'payments', 'VIEW');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const months = searchParams.get('months') || searchParams.get('month');
    const years = searchParams.get('years') || searchParams.get('year');
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit');
    
    const query: any = {
      include: { user: true },
      where: {},
      orderBy: [
        { year: 'desc' }, 
        { month: 'desc' },
        { user: { memberNo: 'asc' } }
      ]
    };

    if (months) {
      const monthList = months.split(',').map(m => parseInt(m)).filter(m => !isNaN(m));
      if (monthList.length > 0) {
        query.where.month = { in: monthList };
      }
    }
    if (years) {
      const yearList = years.split(',').map(y => parseInt(y)).filter(y => !isNaN(y));
      if (yearList.length > 0) {
        query.where.year = { in: yearList };
      }
    }
    if (userId) {
      query.where.userId = userId;
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
    const auth = await verifyPermission(request, 'payments', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const data = await request.json();
    const { userId, month, year, amount, fine, isPaid, paidAt, notes } = data;

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
        paidAt: isPaid && paidAt ? new Date(paidAt) : null,
        notes: notes || null
      },
      include: { user: true }
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to add payment' }, { status: 500 });
  }
}

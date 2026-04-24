import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const investments = await prisma.investment.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(investments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, type, amount, date, documentUrl } = data;

    const investment = await prisma.investment.create({
      data: {
        title,
        type: type || 'Other Investment',
        amount: parseFloat(amount),
        date: date ? new Date(date) : undefined,
        documentUrl
      }
    });

    return NextResponse.json(investment);
  } catch (error) {
    console.error('API Error in Investments POST:', error);
    return NextResponse.json({ error: 'Failed to add investment' }, { status: 500 });
  }
}

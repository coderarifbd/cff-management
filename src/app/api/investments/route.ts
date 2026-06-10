import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await verifyPermission(request, 'investments', 'VIEW');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const investments = await prisma.investment.findMany({
      include: {
        profits: {
          orderBy: { date: 'desc' }
        }
      },
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(investments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch investments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyPermission(request, 'investments', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const data = await request.json();
    const { title, type, amount, date, documentUrl, profitPeriod } = data;

    const investment = await prisma.investment.create({
      data: {
        title,
        type: type || 'Other Investment',
        amount: parseFloat(amount),
        date: date ? new Date(date) : undefined,
        documentUrl,
        profitPeriod: profitPeriod || 'NONE'
      }
    });

    return NextResponse.json(investment);
  } catch (error) {
    console.error('API Error in Investments POST:', error);
    return NextResponse.json({ error: 'Failed to add investment' }, { status: 500 });
  }
}

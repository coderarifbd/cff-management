import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await verifyPermission(request, 'incomes', 'VIEW');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const incomes = await prisma.income.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(incomes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyPermission(request, 'incomes', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const income = await prisma.income.create({
      data: {
        title: body.title,
        amount: parseFloat(body.amount),
        category: body.category,
        date: new Date(body.date),
        description: body.description
      }
    });
    return NextResponse.json(income);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create income' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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

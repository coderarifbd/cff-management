import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyPermission(request, 'expenses', 'VIEW');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' }
    });
    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyPermission(request, 'expenses', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const data = await request.json();
    const { category, amount, description, date, receiptUrl } = data;

    const expense = await prisma.expense.create({
      data: {
        category,
        amount: parseFloat(amount),
        description: description || '',
        date: date ? new Date(date) : undefined,
        receiptUrl
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error('API Error in Expenses POST:', error);
    return NextResponse.json({ error: 'Failed to add expense' }, { status: 500 });
  }
}

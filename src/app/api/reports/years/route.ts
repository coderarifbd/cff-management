import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const payment = await prisma.payment.aggregate({ _min: { year: true } });
    const expense = await prisma.expense.aggregate({ _min: { date: true } });
    const investment = await prisma.investment.aggregate({ _min: { date: true } });

    const minPaymentYear = payment._min.year || new Date().getFullYear();
    const minExpenseYear = expense._min.date ? new Date(expense._min.date).getFullYear() : new Date().getFullYear();
    const minInvestmentYear = investment._min.date ? new Date(investment._min.date).getFullYear() : new Date().getFullYear();

    const minYear = Math.min(minPaymentYear, minExpenseYear, minInvestmentYear);

    return NextResponse.json({ minYear });
  } catch (error) {
    return NextResponse.json({ minYear: 2015 });
  }
}

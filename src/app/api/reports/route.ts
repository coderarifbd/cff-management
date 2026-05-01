import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const month = parseInt(searchParams.get('month') || '0');
  const year = parseInt(searchParams.get('year') || '0');

  try {
    if (type === 'monthly') {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const payments = await prisma.payment.findMany({
        where: { month, year },
        include: { user: true }
      });
      const expenses = await prisma.expense.findMany({
        where: { date: { gte: startDate, lte: endDate } }
      });
      const investments = await prisma.investment.findMany({
        where: { date: { gte: startDate, lte: endDate } }
      });
      const profits = await prisma.investmentProfit.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { investment: true }
      });

      const incomes = await prisma.income.findMany({
        where: { date: { gte: startDate, lte: endDate } }
      });

      return NextResponse.json({ payments, expenses, investments, profits, incomes });
    }

    if (type === 'annual') {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);

      const payments = await prisma.payment.findMany({
        where: { year },
        include: { user: true }
      });
      const expenses = await prisma.expense.findMany({
        where: { date: { gte: startDate, lte: endDate } }
      });
      const investments = await prisma.investment.findMany({
        where: { date: { gte: startDate, lte: endDate } }
      });
      const profits = await prisma.investmentProfit.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: { investment: true }
      });
      const incomes = await prisma.income.findMany({
        where: { date: { gte: startDate, lte: endDate } }
      });

      return NextResponse.json({ payments, expenses, investments, profits, incomes });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to generate report data' }, { status: 500 });
  }
}

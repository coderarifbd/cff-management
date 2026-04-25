import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Total members (ACTIVE or BANNED, but maybe just count all users who are not ADMIN)
    const totalMembers = await prisma.user.count({
      where: {
        role: { in: ['MEMBER', 'MANAGER'] }
      }
    });

    const totalFees = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { isPaid: true }
    });
    
    const monthlyCollection = totalFees._sum.amount || 0;
    const totalFines = await prisma.payment.aggregate({
      _sum: { fine: true },
      where: { isPaid: true }
    });

    const investments = await prisma.investment.aggregate({
      _sum: { amount: true }
    });

    const expenses = await prisma.expense.aggregate({
      _sum: { amount: true }
    });

    const activeInvestmentsCount = await prisma.investment.count({
      where: { status: 'RUNNING' }
    });

    const investmentTotals = await prisma.investment.aggregate({
      _sum: { profit: true, refund: true }
    });
    
    const totalInvestmentProfit = investmentTotals._sum.profit || 0;
    const totalInvestmentRefund = investmentTotals._sum.refund || 0;

    // Net profit calculation: 
    // Collections + Fines + Deposits + Investment Profit + Investment Refund - Expenses - Investment Principal
    const allCollections = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: { isPaid: true }
    });
    const allDeposits = await prisma.deposit.aggregate({
      _sum: { amount: true }
    });
    
    const allOtherIncomes = await prisma.income.aggregate({
      _sum: { amount: true }
    });
    
    const totalIncome = (allCollections._sum.amount || 0) + (totalFines._sum.fine || 0) + (allDeposits._sum.amount || 0) + (allOtherIncomes._sum.amount || 0);
    const totalInvestments = investments._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    
    // Add profit and refunded principal back to the net balance
    const netProfit = totalIncome + totalInvestmentProfit + totalInvestmentRefund - totalExpenses - totalInvestments;

    return NextResponse.json({
      totalMembers,
      monthlyCollection,
      totalFines: totalFines._sum.fine || 0,
      totalInvestments,
      activeInvestmentsCount,
      totalInvestmentProfit,
      totalExpenses,
      netProfit
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}

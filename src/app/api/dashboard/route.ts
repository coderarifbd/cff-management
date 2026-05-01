import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'yearly';
  const selectedYear = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

  try {
    // Current Stats (Global)
    const [totalMembers, totalFees, totalFines, investments, expenses, activeInvestmentsCount, investmentTotals, allDeposits, allOtherIncomes] = await Promise.all([
      prisma.user.count({ where: { role: { in: ['MEMBER', 'MANAGER'] } } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { isPaid: true } }),
      prisma.payment.aggregate({ _sum: { fine: true }, where: { isPaid: true } }),
      prisma.investment.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.investment.count({ where: { status: 'RUNNING' } }),
      prisma.investment.aggregate({ _sum: { profit: true, refund: true } }),
      prisma.deposit.aggregate({ _sum: { amount: true } }),
      prisma.income.aggregate({ _sum: { amount: true } })
    ]);

    const monthlyCollection = totalFees._sum.amount || 0;
    const totalInvestmentProfit = investmentTotals._sum.profit || 0;
    const totalInvestmentRefund = investmentTotals._sum.refund || 0;
    const totalIncome = (totalFees._sum.amount || 0) + (totalFines._sum.fine || 0) + (allDeposits._sum.amount || 0) + (allOtherIncomes._sum.amount || 0);
    const totalInvestments = investments._sum.amount || 0;
    const totalExpenses = expenses._sum.amount || 0;
    
    const netProfit = totalIncome + totalInvestmentProfit + totalInvestmentRefund - totalExpenses - totalInvestments;
    const totalOtherAmount = (allOtherIncomes._sum.amount || 0) + (allDeposits._sum.amount || 0);
    const totalFederationProfit = totalInvestmentProfit + totalOtherAmount;
    const totalAmount = monthlyCollection + (totalFines._sum.fine || 0) + totalInvestmentProfit + totalOtherAmount - totalExpenses;

    // Growth Chart Data
    const chartData: any[] = [];
    
    if (mode === 'overall') {
      // Find the first payment year
      const firstPayment = await prisma.payment.findFirst({
        where: { isPaid: true },
        orderBy: { year: 'asc' }
      });
      const startYear = firstPayment?.year || selectedYear;
      const currentYear = new Date().getFullYear();

      for (let y = startYear; y <= currentYear; y++) {
        const yPayments = await prisma.payment.aggregate({
          _sum: { amount: true, fine: true },
          where: { year: y, isPaid: true }
        });
        const yOtherIncomes = await prisma.income.aggregate({
          _sum: { amount: true },
          where: { date: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) } }
        });
        const yExpenses = await prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) } }
        });
        const yInvProfits = await prisma.investmentProfit.aggregate({
          _sum: { amount: true },
          where: { date: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) } }
        });

        const yIncome = (yPayments._sum.amount || 0) + (yPayments._sum.fine || 0) + (yOtherIncomes._sum.amount || 0) + (yInvProfits._sum.amount || 0);
        const yExpense = yExpenses._sum.amount || 0;

        chartData.push({
          label: y.toString(),
          income: yIncome,
          expense: yExpense,
          growth: yIncome - yExpense
        });
      }
    } else {
      // Yearly Mode (12 Months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let m = 1; m <= 12; m++) {
        const startDate = new Date(selectedYear, m - 1, 1);
        const endDate = new Date(selectedYear, m, 0, 23, 59, 59);

        const mPayments = await prisma.payment.aggregate({
          _sum: { amount: true, fine: true },
          where: { month: m, year: selectedYear, isPaid: true }
        });
        const mOtherIncomes = await prisma.income.aggregate({
          _sum: { amount: true },
          where: { date: { gte: startDate, lte: endDate } }
        });
        const mExpenses = await prisma.expense.aggregate({
          _sum: { amount: true },
          where: { date: { gte: startDate, lte: endDate } }
        });
        const mInvProfits = await prisma.investmentProfit.aggregate({
          _sum: { amount: true },
          where: { date: { gte: startDate, lte: endDate } }
        });

        const mIncome = (mPayments._sum.amount || 0) + (mPayments._sum.fine || 0) + (mOtherIncomes._sum.amount || 0) + (mInvProfits._sum.amount || 0);
        const mExpense = mExpenses._sum.amount || 0;

        chartData.push({
          label: monthNames[m - 1],
          income: mIncome,
          expense: mExpense,
          growth: mIncome - mExpense
        });
      }
    }

    return NextResponse.json({
      totalMembers,
      monthlyCollection,
      totalFines: totalFines._sum.fine || 0,
      totalInvestments,
      activeInvestmentsCount,
      totalInvestmentProfit,
      totalExpenses,
      netProfit,
      totalAmount,
      totalProfit: totalFederationProfit,
      chartData
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}

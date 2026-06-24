import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

const banglaMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export async function GET(request: Request) {
  try {
    const auth = await verifyPermission(request, 'ledger', 'VIEW');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 1. Fetch Incomes
    const incomes = await prisma.income.findMany();

    // 2. Fetch Expenses
    const expenses = await prisma.expense.findMany();

    // 3. Fetch Investment Profits (with related investment details)
    const profits = await prisma.investmentProfit.findMany({
      include: {
        investment: true
      }
    });

    // Fetch Investments (outflows)
    const investments = await prisma.investment.findMany();

    // Fetch Deposits (inflows)
    const deposits = await prisma.deposit.findMany({
      include: {
        user: true
      }
    });

    // 4. Fetch Paid Payments (collections)
    const payments = await prisma.payment.findMany({
      where: { isPaid: true }
    });

    // 5. Aggregate Member Payments month-wise
    const paymentGroups: { [key: string]: { amount: number; date: Date; month: number; year: number } } = {};
    payments.forEach(p => {
      const key = `${p.month}-${p.year}`;
      const totalAmount = p.amount + p.fine;
      
      // Determine a representative date for the month (last day of that month)
      // Note: month in JS Date is 0-indexed, so 0 is last day of previous month, month is next month
      const lastDay = new Date(p.year, p.month, 0);

      if (!paymentGroups[key]) {
        paymentGroups[key] = {
          amount: 0,
          date: lastDay,
          month: p.month,
          year: p.year
        };
      }
      paymentGroups[key].amount += totalAmount;
    });

    // 6. Map all data to unified ledger rows
    const ledgerRows: any[] = [];

    // Map Incomes
    incomes.forEach(inc => {
      ledgerRows.push({
        id: inc.id,
        date: inc.date,
        description: inc.title,
        income: inc.amount,
        expense: 0,
        source: 'income',
        createdAt: inc.createdAt
      });
    });

    // Map Expenses
    expenses.forEach(exp => {
      ledgerRows.push({
        id: exp.id,
        date: exp.date,
        description: exp.description || exp.category,
        income: 0,
        expense: exp.amount,
        source: 'expense',
        createdAt: exp.createdAt
      });
    });

    // Map Profits
    profits.forEach((p: any) => {
      const projectTitle = p.investment?.title || 'প্রকল্প মুনাফা';
      const detailNote = p.note ? ` (${p.note})` : '';
      ledgerRows.push({
        id: p.id,
        date: p.date,
        description: `লভ্যাংশ: ${projectTitle}${detailNote}`,
        income: p.amount,
        expense: 0,
        source: 'profit',
        createdAt: p.createdAt
      });
    });

    // Map Investments & Investment Refunds
    investments.forEach(inv => {
      // Outflow
      ledgerRows.push({
        id: `investment-outflow-${inv.id}`,
        date: inv.date,
        description: `বিনিয়োগ: ${inv.title}`,
        income: 0,
        expense: inv.amount,
        source: 'investment',
        createdAt: inv.createdAt
      });

      // Inflow (Capital refund)
      if (inv.refund > 0) {
        ledgerRows.push({
          id: `investment-refund-${inv.id}`,
          date: inv.updatedAt,
          description: `বিনিয়োগ ফেরত: ${inv.title}`,
          income: inv.refund,
          expense: 0,
          source: 'investment-refund',
          createdAt: inv.updatedAt
        });
      }
    });

    // Map Deposits
    deposits.forEach(dep => {
      ledgerRows.push({
        id: dep.id,
        date: dep.date,
        description: `আমানত (জমা): ${dep.user?.name || 'সদস্য'}`,
        income: dep.amount,
        expense: 0,
        source: 'deposit',
        createdAt: dep.createdAt
      });
    });

    // Map Monthly Payments Aggregations
    Object.entries(paymentGroups).forEach(([key, group]) => {
      ledgerRows.push({
        id: `payments-summary-${key}`,
        date: group.date,
        description: `সদস্য চাঁদা আদায় - ${banglaMonths[group.month - 1]} ${group.year}`,
        income: group.amount,
        expense: 0,
        source: 'payment',
        createdAt: group.date // Using group.date as representation
      });
    });

    // 7. Sort all consolidated ledger rows chronologically: date ASC, then createdAt ASC
    ledgerRows.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      return createdA - createdB;
    });

    return NextResponse.json(ledgerRows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch consolidated ledger' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyPermission(request, 'ledger', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const { date, description, income, expense } = body;

    if (income > 0) {
      const newIncome = await prisma.income.create({
        data: {
          title: description,
          amount: parseFloat(income),
          category: 'General Ledger',
          date: new Date(date),
          description: 'Added via Cash Book Ledger'
        }
      });
      return NextResponse.json(newIncome);
    } else if (expense > 0) {
      const newExpense = await prisma.expense.create({
        data: {
          category: 'General Ledger',
          amount: parseFloat(expense),
          description: description,
          date: new Date(date)
        }
      });
      return NextResponse.json(newExpense);
    }

    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}

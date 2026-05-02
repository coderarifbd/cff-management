import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const membersOnly = searchParams.get('membersOnly') === 'true';

    // Fetch federation-wide totals for equity calculation
    const [allPaymentsAgg, activePaymentsAgg, totalInvProfit, totalExtraIncome, totalExpenses] = await Promise.all([
      // 1. All historical payments (to calculate current total wealth)
      prisma.payment.aggregate({ 
        where: { isPaid: true },
        _sum: { amount: true, fine: true } 
      }),
      // 2. Only ACTIVE members' payments (to use as ratio denominator)
      prisma.payment.aggregate({ 
        where: { 
          isPaid: true,
          user: { status: 'ACTIVE' }
        },
        _sum: { amount: true } 
      }),
      prisma.investmentProfit.aggregate({ _sum: { amount: true } }),
      prisma.income.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const totalFederationPaidByActive = activePaymentsAgg._sum.amount || 0;
    
    // Total income represents ALL money that ever entered the federation.
    // Refunded amounts are already subtracted via 'totalExpenses'.
    // Penalties from banned members stay in the fund.
    const totalIncomes = 
      (allPaymentsAgg._sum.amount || 0) + 
      (allPaymentsAgg._sum.fine || 0) + 
      (totalInvProfit._sum.amount || 0) + 
      (totalExtraIncome._sum.amount || 0);
    
    const totalOutgoings = (totalExpenses._sum.amount || 0);
    const netFederationFunds = totalIncomes - totalOutgoings;

    const members = await prisma.user.findMany({
      where: {
        role: membersOnly ? 'MEMBER' : { in: ['MEMBER', 'MANAGER'] }
      },
      include: {
        payments: {
          where: { isPaid: true },
          select: { amount: true, fine: true }
        }
      },
      orderBy: [{ memberNo: 'asc' }, { joinDate: 'asc' }]
    });

    const membersWithStats = members.map(member => {
      const totalPaidFees = member.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalPaidFines = member.payments.reduce((sum, p) => sum + p.fine, 0);
      
      let individualEquity = 0;
      if (member.status === 'ACTIVE' && totalFederationPaidByActive > 0) {
        // Equity = (Member's Contribution / Total Contribution of all Active Members) * Total Federation Wealth
        const userPaidRatio = totalPaidFees / totalFederationPaidByActive;
        individualEquity = netFederationFunds * userPaidRatio;
      }

      return {
        ...member,
        totalPaidFees,
        totalPaidFines,
        netEquity: individualEquity,
        payments: undefined 
      };
    });

    return NextResponse.json(membersWithStats);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { memberNo, name, email, phone, role, status, joinDate } = data;

    // Check if email or memberNo already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { memberNo: memberNo || undefined } // Only check if memberNo is provided
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email or Member No already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash('cff12345', 10); // default password for new members

    const newMember = await prisma.user.create({
      data: {
        memberNo: memberNo || null,
        name,
        email,
        phone: phone || null,
        role: role || 'MEMBER',
        status: status || 'ACTIVE',
        joinDate: joinDate ? new Date(joinDate) : new Date(),
        password: hashedPassword
      }
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map(c => {
        const [k, ...v] = c.trim().split('=');
        return [k.trim(), v.join('=').trim()];
      })
    );
    const tokenCookie = cookies['token'];
    if (!tokenCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(tokenCookie, process.env.JWT_SECRET || 'fallback-secret');
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, phone: true, memberNo: true, joinDate: true,
        payments: {
          orderBy: [{ year: 'desc' }, { month: 'desc' }]
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate totals
    const paidPayments = user.payments.filter(p => p.isPaid);
    const unpaidPayments = user.payments.filter(p => !p.isPaid);
    
    const totalPaidFees = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPaidFines = paidPayments.reduce((sum, p) => sum + p.fine, 0);
    const totalDueFees = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalDueFines = unpaidPayments.reduce((sum, p) => sum + p.fine, 0);

    // Federation-wide inclusive equity calculation
    const [allPayments, totalInvProfit, totalExtraIncome, totalExpenses, activeMemberCount] = await Promise.all([
      prisma.payment.aggregate({ 
        where: { isPaid: true },
        _sum: { amount: true, fine: true } 
      }),
      prisma.investmentProfit.aggregate({ _sum: { amount: true } }),
      prisma.income.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.user.count({ 
        where: { 
          status: 'ACTIVE',
          role: 'MEMBER'
        } 
      })
    ]);

    const totalIncomes = 
      (allPayments._sum.amount || 0) + 
      (allPayments._sum.fine || 0) + 
      (totalInvProfit._sum.amount || 0) + 
      (totalExtraIncome._sum.amount || 0);
    
    const totalOutgoings = (totalExpenses._sum.amount || 0);
    
    const netFederationFunds = totalIncomes - totalOutgoings;
    const equityPerMember = activeMemberCount > 0 ? netFederationFunds / activeMemberCount : 0;

    return NextResponse.json({
      profile: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        memberNo: user.memberNo,
        joinDate: user.joinDate
      },
      stats: {
        totalPaidFees,
        totalPaidFines,
        totalDueFees,
        totalDueFines,
        totalPaidAmount: totalPaidFees + totalPaidFines,
        totalDueAmount: totalDueFees + totalDueFines,
        profitShare: equityPerMember - totalPaidFees, // For display purposes, showing the "bonus" value
        totalShare: equityPerMember
      },
      payments: user.payments
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

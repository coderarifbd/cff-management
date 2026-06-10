import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await verifyPermission(request, 'settings', 'FULL');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const [users, payments, deposits, investments, invProfits, expenses, notices, noticeReads, incomes] = await Promise.all([
      prisma.user.findMany(),
      prisma.payment.findMany(),
      prisma.deposit.findMany(),
      prisma.investment.findMany(),
      prisma.investmentProfit.findMany(),
      prisma.expense.findMany(),
      prisma.notice.findMany(),
      prisma.noticeRead.findMany(),
      prisma.income.findMany()
    ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      data: {
        users,
        payments,
        deposits,
        investments,
        invProfits,
        expenses,
        notices,
        noticeReads,
        incomes
      }
    };

    return new NextResponse(JSON.stringify(backupData), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="cff_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json({ error: 'Failed to generate backup' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyPermission(request, 'settings', 'FULL');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const backup = await request.json();
    const { data } = backup;

    if (!data || !data.users) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Use a transaction to ensure atomic restore with increased timeout
    await prisma.$transaction(async (tx) => {
      // 1. Clear everything in safe order
      await tx.noticeRead.deleteMany();
      await tx.notice.deleteMany();
      await tx.payment.deleteMany();
      await tx.deposit.deleteMany();
      await tx.investmentProfit.deleteMany();
      await tx.investment.deleteMany();
      await tx.expense.deleteMany();
      await tx.income.deleteMany();
      await tx.user.deleteMany();

      // 2. Restore in safe order
      await tx.user.createMany({ data: data.users });
      await tx.notice.createMany({ data: data.notices });
      await tx.investment.createMany({ data: data.investments });
      await tx.expense.createMany({ data: data.expenses });
      await tx.income.createMany({ data: data.incomes });
      
      if (data.payments.length > 0) await tx.payment.createMany({ data: data.payments });
      if (data.deposits.length > 0) await tx.deposit.createMany({ data: data.deposits });
      if (data.invProfits.length > 0) await tx.investmentProfit.createMany({ data: data.invProfits });
      if (data.noticeReads.length > 0) await tx.noticeRead.createMany({ data: data.noticeReads });
    }, {
      maxWait: 10000, // 10 seconds to get a connection
      timeout: 60000  // 60 seconds to complete the transaction
    });

    return NextResponse.json({ success: true, message: 'Database restored successfully' });
  } catch (error: any) {
    console.error('Restore failed:', error);
    return NextResponse.json({ error: 'Restore failed: ' + error.message }, { status: 500 });
  }
}

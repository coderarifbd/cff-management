import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyPermission(request, 'ledger', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
    const body = await request.json();
    const { date, description, income, expense } = body;

    // Check if it exists in Income first
    const existingIncome = await prisma.income.findUnique({ where: { id } });
    if (existingIncome) {
      const updatedIncome = await prisma.income.update({
        where: { id },
        data: {
          title: description,
          amount: parseFloat(income) || 0,
          date: new Date(date)
        }
      });
      return NextResponse.json(updatedIncome);
    }

    // Check if it exists in Expense
    const existingExpense = await prisma.expense.findUnique({ where: { id } });
    if (existingExpense) {
      const updatedExpense = await prisma.expense.update({
        where: { id },
        data: {
          description: description,
          amount: parseFloat(expense) || 0,
          date: new Date(date)
        }
      });
      return NextResponse.json(updatedExpense);
    }

    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update ledger entry' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyPermission(request, 'ledger', 'FULL');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;

    // Try deleting from Income first
    try {
      const existingIncome = await prisma.income.findUnique({ where: { id } });
      if (existingIncome) {
        await prisma.income.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }
    } catch (e) {
      // Proceed to try Expense deletion
    }

    // Try deleting from Expense
    try {
      const existingExpense = await prisma.expense.findUnique({ where: { id } });
      if (existingExpense) {
        await prisma.expense.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }
    } catch (e) {
      // Not found or failed
    }

    return NextResponse.json({ error: 'Entry not found or cannot be deleted' }, { status: 404 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete ledger entry' }, { status: 500 });
  }
}

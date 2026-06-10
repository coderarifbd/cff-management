import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function PUT(request: Request, context: any) {
  try {
    const auth = await verifyPermission(request, 'expenses', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await context.params;
    const data = await request.json();
    const { category, amount, description, date, receiptUrl } = data;

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        category: category !== undefined ? category : undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        description: description !== undefined ? description : undefined,
        date: date ? new Date(date) : undefined,
        receiptUrl: receiptUrl !== undefined ? receiptUrl : undefined
      }
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const auth = await verifyPermission(request, 'expenses', 'FULL');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await context.params;
    await prisma.expense.delete({
      where: { id }
    });
    return NextResponse.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}

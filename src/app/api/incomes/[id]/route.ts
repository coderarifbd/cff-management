import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const income = await prisma.income.update({
      where: { id },
      data: {
        title: body.title,
        amount: parseFloat(body.amount),
        category: body.category,
        date: new Date(body.date),
        description: body.description
      }
    });
    return NextResponse.json(income);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.income.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}

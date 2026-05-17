import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updatedData: any = {};
    
    if (body.isPaid !== undefined) {
      updatedData.isPaid = body.isPaid;
      if (body.isPaid && !existing.isPaid) {
        updatedData.paidAt = new Date();
      } else if (!body.isPaid) {
        updatedData.paidAt = null;
      }
    }
    
    if (body.fine !== undefined) updatedData.fine = parseFloat(body.fine);
    if (body.amount !== undefined) updatedData.amount = parseFloat(body.amount);
    if (body.notes !== undefined) updatedData.notes = body.notes;

    const payment = await prisma.payment.update({
      where: { id },
      data: updatedData
    });

    return NextResponse.json(payment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.payment.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 });
  }
}

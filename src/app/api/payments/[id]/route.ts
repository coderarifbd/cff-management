import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyPermission(request, 'payments', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updatedData: any = {};
    
    if (body.isPaid !== undefined) {
      updatedData.isPaid = body.isPaid;
      if (body.isPaid) {
        updatedData.paidAt = body.paidAt ? new Date(body.paidAt) : (existing.paidAt || new Date());
      } else {
        updatedData.paidAt = null;
      }
    } else if (body.paidAt !== undefined) {
      updatedData.paidAt = body.paidAt ? new Date(body.paidAt) : null;
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
    const auth = await verifyPermission(request, 'payments', 'FULL');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
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

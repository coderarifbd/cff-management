import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const investment = await prisma.investment.findUnique({
      where: { id },
      include: {
        profits: {
          orderBy: { date: 'desc' }
        },
        documents: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
    if (!investment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(investment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch investment details' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params;
    const data = await request.json();
    const { title, type, amount, profit, refund, status, date, documentUrl, profitPeriod } = data;

    const investment = await prisma.investment.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        type: type !== undefined ? type : undefined,
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        profit: profit !== undefined ? parseFloat(profit) : undefined,
        refund: refund !== undefined ? parseFloat(refund) : undefined,
        status: status !== undefined ? status : undefined,
        date: date ? new Date(date) : undefined,
        documentUrl: documentUrl !== undefined ? documentUrl : undefined,
        profitPeriod: profitPeriod !== undefined ? profitPeriod : undefined
      }
    });

    return NextResponse.json(investment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update investment' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = await context.params;
    await prisma.investment.delete({
      where: { id }
    });
    return NextResponse.json({ message: 'Investment deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete investment' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPermission } from '@/lib/api-auth';

export async function POST(request: Request, context: any) {
  try {
    const auth = await verifyPermission(request, 'investments', 'EDIT');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { id: investmentId } = await context.params;
    const { url, name } = await request.json();

    if (!url || !name) {
      return NextResponse.json({ error: 'Missing document info' }, { status: 400 });
    }

    const document = await prisma.investmentDocument.create({
      data: {
        investmentId,
        url,
        name
      }
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to add document:', error);
    return NextResponse.json({ error: 'Failed to add document' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await verifyPermission(request, 'investments', 'FULL');
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { searchParams } = new URL(request.url);
    const docId = searchParams.get('docId');

    if (!docId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    await prisma.investmentDocument.delete({
      where: { id: docId }
    });

    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Failed to delete document:', error);
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}

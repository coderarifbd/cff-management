import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Get user and their total payments
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        payments: {
          where: { isPaid: true }
        }
      }
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const totalPrincipal = user.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Calculate membership duration in years
    const joinDate = new Date(user.joinDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - joinDate.getTime());
    const durationYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);

    // For profit calculation, we'll need a placeholder or a global logic
    // Since profit distribution isn't fully implemented per user yet, 
    // let's assume a sample calculation or return stats for the admin to review
    
    return NextResponse.json({
      userName: user.name,
      memberNo: user.memberNo,
      joinDate: user.joinDate,
      durationYears: durationYears.toFixed(2),
      totalPrincipal: totalPrincipal,
      // In a real scenario, you'd calculate dividends here
      suggestedDividend: 0 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to calculate settlement' }, { status: 500 });
  }
}

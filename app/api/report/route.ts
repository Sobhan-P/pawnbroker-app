import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendDailySummaryWhatsApp } from '@/lib/whatsapp';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30

function istDayUTC(dateParam: string): Date {
  const [y, m, d] = dateParam.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

function todayISTMidnightUTC(): Date {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  let start: Date;
  let end: Date;

  if (fromParam || toParam) {
    // Date range mode
    start = fromParam ? istDayUTC(fromParam) : todayISTMidnightUTC();
    const toStart = toParam ? istDayUTC(toParam) : todayISTMidnightUTC();
    end = new Date(toStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  } else {
    // Single day mode (backward compat)
    const dayStart = dateParam ? istDayUTC(dateParam) : todayISTMidnightUTC();
    start = dayStart;
    end = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  // reportDate label — use start date for single-day, range string for multi-day
  const reportDateIST = new Date(start.getTime() + IST_OFFSET_MS);
  const reportEndIST = new Date(end.getTime() + IST_OFFSET_MS + 1);
  const isRange = fromParam || toParam;

  const [newLoans, closedLoans, clientsWithPaymentsInPeriod] = await Promise.all([
    Client.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }),
    Client.find({ closedDate: { $gte: start, $lte: end }, status: 'closed' }).sort({ closedDate: -1 }),
    Client.find({ 'payments.date': { $gte: start, $lte: end } }).select('payments'),
  ]);

  const totalNewPrincipal = newLoans.reduce((sum, c) => sum + c.pawnAmount, 0);
  const totalCollected = closedLoans.reduce((sum, c) => sum + (c.totalAmountPaid || 0), 0);

  // For closed loans: bifurcate principal returned vs interest paid from the final payment
  let totalPrincipalFromClosures = 0;
  let totalInterestFromClosures = 0;
  for (const c of closedLoans) {
    const finalPayment = (c.payments || []).find((p: { type: string }) => p.type === 'full');
    if (finalPayment) {
      totalPrincipalFromClosures += (finalPayment as { principalReduced?: number }).principalReduced || 0;
      totalInterestFromClosures += (finalPayment as { interestPaid?: number }).interestPaid || 0;
    }
  }

  // Sum interestPaid only from loan closures (type='full') and partial payments (type='partial')
  let totalInterestCollected = 0;
  for (const c of clientsWithPaymentsInPeriod) {
    for (const p of c.payments) {
      const pd = new Date(p.date);
      if (pd >= start && pd <= end && (p.type === 'full' || p.type === 'partial')) {
        totalInterestCollected += p.interestPaid || 0;
      }
    }
  }

  const dateLabel = isRange
    ? `${reportDateIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })} – ${reportEndIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}`
    : reportDateIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

  // Handle WhatsApp send request (single-day only)
  const sendWa = searchParams.get('sendWhatsApp');
  if (sendWa === '1') {
    try {
      await sendDailySummaryWhatsApp(dateLabel, newLoans.length, totalNewPrincipal, closedLoans.length, totalCollected, Math.round(totalInterestCollected));
    } catch {
      // WhatsApp failure should not block the response
    }
  }

  return NextResponse.json({
    date: reportDateIST.toISOString().split('T')[0],
    dateLabel,
    isRange: !!isRange,
    newLoans,
    closedLoans,
    totalNewPrincipal,
    totalCollected,
    totalInterestCollected: Math.round(totalInterestCollected),
    totalPrincipalFromClosures: Math.round(totalPrincipalFromClosures),
    totalInterestFromClosures: Math.round(totalInterestFromClosures),
    newCount: newLoans.length,
    closedCount: closedLoans.length,
  });
}

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

  // Indian Financial Year: April 1 of fyYear to March 31 of fyYear+1
  const nowIST2 = new Date(Date.now() + IST_OFFSET_MS);
  const fyYear = nowIST2.getUTCMonth() < 3 ? nowIST2.getUTCFullYear() - 1 : nowIST2.getUTCFullYear();
  const fyStart = new Date(Date.UTC(fyYear, 3, 1) - IST_OFFSET_MS); // April 1 IST
  // FY end = end of the queried period or today, whichever applies
  const fyEnd = end;

  const [newLoans, closedLoans, clientsWithPaymentsInPeriod, fyClients] = await Promise.all([
    Client.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }),
    Client.find({ closedDate: { $gte: start, $lte: end }, status: 'closed' }).sort({ closedDate: -1 }),
    Client.find({ 'payments.date': { $gte: start, $lte: end } }).select('name glNumber serialNumber payments'),
    Client.find({
      $or: [
        { closedDate: { $gte: fyStart, $lte: fyEnd }, status: 'closed' },
        { 'payments.date': { $gte: fyStart, $lte: fyEnd } },
      ],
    }).select('payments'),
  ]);

  const totalNewPrincipal = newLoans.reduce((sum, c) => sum + c.pawnAmount, 0);
  const totalCollected = closedLoans.reduce((sum, c) => {
    const fp = (c.payments || []).find((p: { type: string }) => p.type === 'full');
    const principal = (fp as { principalReduced?: number } | undefined)?.principalReduced || 0;
    const interest = (fp as { interestPaid?: number } | undefined)?.interestPaid || 0;
    return sum + principal + interest;
  }, 0);

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

  // Gather partial payments made in the date range (excluding top-up entries with amountPaid=0)
  const partialPaymentsInPeriod: Array<{
    clientId: string; clientName: string; glNumber: string; serialNumber: number;
    date: Date; amountPaid: number; principalReduced: number; interestPaid: number;
    processedByName?: string;
  }> = [];
  let totalPartialPrincipalReduced = 0;
  let totalPartialInterestCollected = 0;

  for (const c of clientsWithPaymentsInPeriod) {
    // Cast to avoid type issues with mongoose sub-docs
    const client = c as unknown as {
      _id: string; name: string; glNumber?: string; serialNumber: number; payments: Array<{
        date: Date; type: string; amountPaid: number; principalReduced?: number; interestPaid?: number; processedByName?: string; resetsInterestClock?: boolean;
      }>
    };
    for (const p of client.payments) {
      const pd = new Date(p.date);
      if (pd >= start && pd <= end && p.type === 'partial' && p.amountPaid > 0) {
        partialPaymentsInPeriod.push({
          clientId: client._id,
          clientName: client.name,
          glNumber: client.glNumber || '',
          serialNumber: client.serialNumber,
          date: pd,
          amountPaid: p.amountPaid,
          principalReduced: p.principalReduced || 0,
          interestPaid: p.interestPaid || 0,
          processedByName: p.processedByName,
        });
        totalPartialPrincipalReduced += p.principalReduced || 0;
        totalPartialInterestCollected += p.interestPaid || 0;
      }
    }
  }

  const dateLabel = isRange
    ? `${reportDateIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })} – ${reportEndIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' })}`
    : reportDateIST.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

  // Total interest across full closures + partial payments (interest payment type)
  let totalInterestCollected = totalInterestFromClosures;
  for (const c of clientsWithPaymentsInPeriod) {
    for (const p of c.payments) {
      const pd = new Date(p.date);
      if (pd >= start && pd <= end && p.type === 'interest') {
        totalInterestCollected += (p as unknown as { interestPaid?: number }).interestPaid || 0;
      }
    }
  }
  totalInterestCollected += totalPartialInterestCollected;

  const sendWa = searchParams.get('sendWhatsApp');
  if (sendWa === '1') {
    try {
      await sendDailySummaryWhatsApp(dateLabel, newLoans.length, totalNewPrincipal, closedLoans.length, totalCollected, Math.round(totalInterestCollected));
    } catch { /* WhatsApp failure should not block the response */ }
  }

  // FY Interest Earned
  let fyInterestEarned = 0;
  for (const c of fyClients) {
    for (const p of (c.payments || [])) {
      const pd = new Date(p.date);
      if (pd < fyStart || pd > fyEnd) continue;
      if (p.type === 'full' || p.type === 'partial' || p.type === 'interest') {
        fyInterestEarned += (p as unknown as { interestPaid?: number }).interestPaid || 0;
      }
    }
  }
  fyInterestEarned = Math.round(fyInterestEarned);

  return NextResponse.json({
    date: reportDateIST.toISOString().split('T')[0],
    dateLabel,
    isRange: !!isRange,
    newLoans,
    closedLoans,
    partialPayments: partialPaymentsInPeriod,
    totalNewPrincipal,
    totalCollected,
    totalInterestCollected: Math.round(totalInterestCollected),
    totalPrincipalFromClosures: Math.round(totalPrincipalFromClosures),
    totalInterestFromClosures: Math.round(totalInterestFromClosures),
    totalPartialPrincipalReduced: Math.round(totalPartialPrincipalReduced),
    totalPartialInterestCollected: Math.round(totalPartialInterestCollected),
    newCount: newLoans.length,
    closedCount: closedLoans.length,
    fyInterestEarned,
  });
}

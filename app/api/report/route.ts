import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendDailySummaryWhatsApp } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get('date');

  // Build IST-aware date boundaries so that "2026-03-02" means midnight-to-midnight IST,
  // not UTC. Without this, loans created in early IST morning fall outside the UTC range.
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +5:30
  let istDayUTCStart: Date;
  if (dateParam) {
    const [y, m, d] = dateParam.split('-').map(Number);
    // Date.UTC gives UTC midnight of "dateParam"; subtract IST offset → IST midnight in UTC
    istDayUTCStart = new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
  } else {
    // "Today" in IST: floor current UTC time down to IST midnight
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    istDayUTCStart = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS);
  }
  const start = istDayUTCStart;
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  // reportDate: a UTC Date whose date components equal the IST calendar date
  const reportDate = new Date(istDayUTCStart.getTime() + IST_OFFSET_MS);

  const [newLoans, closedLoans, clientsWithPaymentsToday] = await Promise.all([
    Client.find({ createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }),
    Client.find({ closedDate: { $gte: start, $lte: end }, status: 'closed' }).sort({ closedDate: -1 }),
    Client.find({ 'payments.date': { $gte: start, $lte: end } }).select('payments'),
  ]);

  const totalNewPrincipal = newLoans.reduce((sum, c) => sum + c.pawnAmount, 0);
  const totalCollected = closedLoans.reduce((sum, c) => sum + (c.totalAmountPaid || 0), 0);

  // Sum up all interestPaid from payments made today
  let totalInterestCollected = 0;
  for (const c of clientsWithPaymentsToday) {
    for (const p of c.payments) {
      const pd = new Date(p.date);
      if (pd >= start && pd <= end) {
        totalInterestCollected += p.interestPaid || 0;
      }
    }
  }

  const dateLabel = reportDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });

  // Handle WhatsApp send request
  const sendWa = new URL(req.url).searchParams.get('sendWhatsApp');
  if (sendWa === '1') {
    try {
      await sendDailySummaryWhatsApp(dateLabel, newLoans.length, totalNewPrincipal, closedLoans.length, totalCollected, Math.round(totalInterestCollected));
    } catch {
      // WhatsApp failure should not block the response
    }
  }

  return NextResponse.json({
    date: reportDate.toISOString().split('T')[0],
    newLoans,
    closedLoans,
    totalNewPrincipal,
    totalCollected,
    totalInterestCollected: Math.round(totalInterestCollected),
    newCount: newLoans.length,
    closedCount: closedLoans.length,
  });
}

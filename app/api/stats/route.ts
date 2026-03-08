import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const now = new Date();

  // IST-aware today boundaries (same logic as /api/report)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  const todayStart = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

  // Indian Financial Year: April 1 to March 31
  // If current month is Jan–Mar, FY started April 1 of previous year; else April 1 of current year
  const fyYear = nowIST.getUTCMonth() < 3 ? nowIST.getUTCFullYear() - 1 : nowIST.getUTCFullYear();
  // April 1 00:00 IST = April 1 - 5h30m UTC
  const fyStart = new Date(Date.UTC(fyYear, 3, 1) - IST_OFFSET_MS);
  const fyEnd = todayEnd; // up to end of today

  const [totalActive, totalClosed, activeClients, todayNewCount, todayClosedCount] = await Promise.all([
    Client.countDocuments({ status: 'active' }),
    Client.countDocuments({ status: 'closed' }),
    Client.find({ status: 'active' }, 'pawnAmount expectedReturnDate'),
    Client.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Client.countDocuments({ closedDate: { $gte: todayStart, $lte: todayEnd }, status: 'closed' }),
  ]);

  const totalPawnAmount = activeClients.reduce((sum, c) => sum + c.pawnAmount, 0);
  const overdueCount = activeClients.filter((c) => new Date(c.expectedReturnDate) < now).length;

  // FY Interest Earned: sum interest from closed loans + partial + interest payments in FY date range
  const fyClients = await Client.find({
    $or: [
      { closedDate: { $gte: fyStart, $lte: fyEnd }, status: 'closed' },
      { 'payments.date': { $gte: fyStart, $lte: fyEnd } },
    ],
  }).select('payments status closedDate');

  let fyInterestEarned = 0;
  for (const c of fyClients) {
    for (const p of (c.payments || [])) {
      const pd = new Date(p.date);
      if (pd < fyStart || pd > fyEnd) continue;
      if (p.type === 'full' || p.type === 'partial' || p.type === 'interest') {
        fyInterestEarned += (p as { interestPaid?: number }).interestPaid || 0;
      }
    }
  }
  fyInterestEarned = Math.round(fyInterestEarned);

  return NextResponse.json({ totalActive, totalPawnAmount, overdueCount, totalClosed, todayNewCount, todayClosedCount, fyInterestEarned });
}

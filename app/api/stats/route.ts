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

  const [totalActive, totalClosed, activeClients, todayNewCount, todayClosedCount] = await Promise.all([
    Client.countDocuments({ status: 'active' }),
    Client.countDocuments({ status: 'closed' }),
    Client.find({ status: 'active' }, 'pawnAmount expectedReturnDate'),
    Client.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
    Client.countDocuments({ closedDate: { $gte: todayStart, $lte: todayEnd }, status: 'closed' }),
  ]);

  const totalPawnAmount = activeClients.reduce((sum, c) => sum + c.pawnAmount, 0);
  const overdueCount = activeClients.filter((c) => new Date(c.expectedReturnDate) < now).length;

  return NextResponse.json({ totalActive, totalPawnAmount, overdueCount, totalClosed, todayNewCount, todayClosedCount });
}

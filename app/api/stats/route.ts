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

  const [totalActive, totalClosed, activeClients] = await Promise.all([
    Client.countDocuments({ status: 'active' }),
    Client.countDocuments({ status: 'closed' }),
    Client.find({ status: 'active' }, 'pawnAmount expectedReturnDate'),
  ]);

  const totalPawnAmount = activeClients.reduce((sum, c) => sum + c.pawnAmount, 0);
  const overdueCount = activeClients.filter((c) => new Date(c.expectedReturnDate) < now).length;

  return NextResponse.json({ totalActive, totalPawnAmount, overdueCount, totalClosed });
}

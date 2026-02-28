import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET() {
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

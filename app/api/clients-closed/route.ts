import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const query: Record<string, unknown> = { status: 'closed' };

  if (search) {
    const serialNum = parseInt(search);
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      ...(isNaN(serialNum) ? [] : [{ serialNumber: serialNum }]),
    ];
  }
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) {
      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      dateFilter.$gte = fromDate;
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.$lte = toDate;
    }
    query.closedDate = dateFilter;
  }

  const clients = await Client.find(query).sort({ closedDate: -1 });
  return NextResponse.json(clients);
}

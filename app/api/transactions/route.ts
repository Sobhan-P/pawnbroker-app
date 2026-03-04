import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Transaction from '@/models/Transaction';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const filter: Record<string, unknown> = {};

  if (from || to) {
    filter.date = {};
    if (from) {
      const [y, m, d] = from.split('-').map(Number);
      (filter.date as Record<string, Date>).$gte = new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
    }
    if (to) {
      const [y, m, d] = to.split('-').map(Number);
      (filter.date as Record<string, Date>).$lte = new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS + 24 * 60 * 60 * 1000 - 1);
    }
  }

  const transactions = await Transaction.find(filter).sort({ date: -1 });
  return NextResponse.json(transactions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const body = await req.json();
  const { date, type, amount, tag, description } = body;

  if (!date || !type || !amount || !tag) {
    return NextResponse.json({ error: 'date, type, amount, tag are required' }, { status: 400 });
  }

  const tx = await Transaction.create({
    date: new Date(date),
    type,
    amount: Number(amount),
    tag: tag.trim(),
    description: description?.trim() || undefined,
    recordedBy: session.user.id,
    recordedByName: session.user.name,
  });

  return NextResponse.json(tx, { status: 201 });
}

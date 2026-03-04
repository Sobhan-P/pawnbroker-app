import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const doc = await Settings.findOne({ key: 'initialBalance' });
  return NextResponse.json({ initialBalance: doc?.value ?? 0 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { initialBalance } = await req.json();
  if (typeof initialBalance !== 'number') {
    return NextResponse.json({ error: 'initialBalance must be a number' }, { status: 400 });
  }

  await Settings.findOneAndUpdate(
    { key: 'initialBalance' },
    { value: initialBalance },
    { upsert: true }
  );

  return NextResponse.json({ ok: true, initialBalance });
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const { totalAmountPaid } = await req.json();
  const client = await Client.findByIdAndUpdate(
    id,
    { status: 'closed', closedDate: new Date(), totalAmountPaid },
    { new: true }
  );
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(client);
}

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendWhatsApp, pawnConfirmationMessage } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const query: Record<string, unknown> = { status: 'active' };
  if (search) {
    const serialNum = parseInt(search);
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      ...(isNaN(serialNum) ? [] : [{ serialNumber: serialNum }]),
    ];
  }
  const clients = await Client.find(query).sort({ createdAt: -1 });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  await connectDB();
  const body = await req.json();

  const last = await Client.findOne({ serialNumber: { $exists: true } }).sort({ serialNumber: -1 }).select('serialNumber');
  const serialNumber = (last?.serialNumber ?? 0) + 1;

  const client = await Client.create({ ...body, serialNumber });

  const dueDate = new Date(client.expectedReturnDate).toLocaleDateString('en-IN');
  const msg = pawnConfirmationMessage(client.name, client.pawnAmount, client.interestRate, dueDate);
  await sendWhatsApp(client.contactNumber, msg);

  return NextResponse.json(client, { status: 201 });
}

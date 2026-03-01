import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import AuditLog from '@/models/AuditLog';
import { sendWhatsApp, pawnConfirmationMessage } from '@/lib/whatsapp';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const filter = searchParams.get('filter') || 'all'; // 'all' | 'overdue'

  const query: Record<string, unknown> = { status: 'active' };

  if (search) {
    const serialNum = parseInt(search);
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactNumber: { $regex: search, $options: 'i' } },
      { glNumber: { $regex: search, $options: 'i' } },
      ...(isNaN(serialNum) ? [] : [{ serialNumber: serialNum }]),
    ];
  }

  if (filter === 'overdue') {
    query.expectedReturnDate = { $lt: new Date() };
  }

  const clients = await Client.find(query).sort({ createdAt: -1 });
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();

  const last = await Client.findOne({ serialNumber: { $exists: true } })
    .sort({ serialNumber: -1 })
    .select('serialNumber');
  const serialNumber = (last?.serialNumber ?? 0) + 1;

  const client = await Client.create({
    ...body,
    serialNumber,
    payments: [],
    createdBy: session.user.id,
    createdByName: session.user.name,
  });

  await AuditLog.create({
    action: 'loan_created',
    performedBy: session.user.id,
    performedByName: session.user.name,
    loanId: client._id,
    glNumber: client.glNumber,
    clientName: client.name,
    amount: client.pawnAmount,
    details: `New loan of Rs.${client.pawnAmount} for ${client.name}`,
  });

  try {
    const dueDate = new Date(client.expectedReturnDate).toLocaleDateString('en-IN');
    const msg = pawnConfirmationMessage(client.name, client.pawnAmount, 12, dueDate);
    await sendWhatsApp(client.contactNumber, msg);
  } catch {
    // WhatsApp failure should not block the response
  }

  return NextResponse.json(client, { status: 201 });
}

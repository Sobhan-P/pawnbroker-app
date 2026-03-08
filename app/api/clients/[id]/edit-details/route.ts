import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * PATCH /api/clients/[id]/edit-details
 * Update bank details on an active pledge: bankName, bankDate, bankAmount.
 * Admin only.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const existing = await Client.findById(id).select('status');
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status !== 'active') {
    return NextResponse.json({ error: 'Can only edit active pledges' }, { status: 400 });
  }

  const { bankName, bankDate, bankAmount } = await req.json();

  const setFields: Record<string, unknown> = {};
  if (bankName !== undefined) setFields.bankName = bankName || '';
  if (bankDate !== undefined) setFields.bankDate = bankDate ? new Date(bankDate) : null;
  if (bankAmount !== undefined) setFields.bankAmount = bankAmount ? Number(bankAmount) : null;

  const updated = await Client.findByIdAndUpdate(id, { $set: setFields }, { new: true });
  return NextResponse.json(updated);
}

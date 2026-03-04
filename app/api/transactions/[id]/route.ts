import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import AuditLog from '@/models/AuditLog';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;
  const tx = await Transaction.findByIdAndDelete(id);
  if (!tx) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await AuditLog.create({
    action: 'transaction_deleted',
    performedBy: session.user.id,
    performedByName: session.user.name,
    amount: tx.amount,
    details: `${tx.type} transaction deleted — Tag: ${tx.tag} | Rs.${tx.amount}`,
  });

  return NextResponse.json({ ok: true });
}

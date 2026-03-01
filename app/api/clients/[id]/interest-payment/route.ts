import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import AuditLog from '@/models/AuditLog';
import { calculateOutstanding } from '@/lib/interest';
import { uploadImage } from '@/lib/cloudinary';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { amountPaid, facePhoto } = body;

  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (client.status === 'closed') return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });

  const { totalInterest } = calculateOutstanding(
    client.pawnAmount,
    client.pawnDate,
    client.payments,
    new Date()
  );

  const actualAmountPaid = amountPaid || totalInterest;
  // Reset the clock to 12% only when the FULL outstanding interest is paid
  const resetsInterestClock = actualAmountPaid >= totalInterest;

  let facePhotoUrl: string | undefined;
  if (facePhoto) {
    facePhotoUrl = await uploadImage(facePhoto, 'interest-payments');
  }

  const paymentEntry = {
    date: new Date(),
    type: 'interest' as const,
    amountPaid: actualAmountPaid,
    principalReduced: 0,
    interestPaid: actualAmountPaid,
    resetsInterestClock,
    facePhotoUrl,
    processedBy: session.user.id,
    processedByName: session.user.name,
  };

  const updated = await Client.findByIdAndUpdate(
    id,
    { $push: { payments: paymentEntry } },
    { new: true }
  );

  await AuditLog.create({
    action: 'interest_paid',
    performedBy: session.user.id,
    performedByName: session.user.name,
    loanId: client._id,
    glNumber: client.glNumber,
    clientName: client.name,
    amount: actualAmountPaid,
    details: `Interest payment: Rs.${actualAmountPaid}. ${resetsInterestClock ? 'Rate resets to 12%.' : 'Partial interest — clock continues.'}`,
  });

  return NextResponse.json(updated);
}

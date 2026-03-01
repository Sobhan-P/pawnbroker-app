import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import AuditLog from '@/models/AuditLog';
import { uploadImage } from '@/lib/cloudinary';
import { calculateOutstanding } from '@/lib/interest';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { amountPaid, principalReduced, interestPaid, facePhoto, jewelleryPhoto } = body;

  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (client.status === 'closed') return NextResponse.json({ error: 'Loan is already closed' }, { status: 400 });

  // Determine if this payment covers the full outstanding interest → resets clock
  const { totalInterest } = calculateOutstanding(
    client.pawnAmount,
    client.pawnDate,
    client.payments,
    new Date()
  );
  const paidInterest = interestPaid || 0;
  const resetsInterestClock = paidInterest >= totalInterest;

  let facePhotoUrl: string | undefined;
  let jewelleryPhotoUrl: string | undefined;
  if (facePhoto) facePhotoUrl = await uploadImage(facePhoto, 'partial-face');
  if (jewelleryPhoto) jewelleryPhotoUrl = await uploadImage(jewelleryPhoto, 'partial-jewellery');

  const paymentEntry = {
    date: new Date(),
    type: 'partial' as const,
    amountPaid,
    principalReduced: principalReduced || 0,
    interestPaid: paidInterest,
    resetsInterestClock,
    facePhotoUrl,
    jewelleryPhotoUrl,
    processedBy: session.user.id,
    processedByName: session.user.name,
  };

  const updated = await Client.findByIdAndUpdate(
    id,
    { $push: { payments: paymentEntry } },
    { new: true }
  );

  await AuditLog.create({
    action: 'partial_payment',
    performedBy: session.user.id,
    performedByName: session.user.name,
    loanId: client._id,
    glNumber: client.glNumber,
    clientName: client.name,
    amount: amountPaid,
    details: `Partial payment: Rs.${amountPaid} (Principal: Rs.${principalReduced || 0}, Interest: Rs.${interestPaid || 0})`,
  });

  return NextResponse.json(updated);
}

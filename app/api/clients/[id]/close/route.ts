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
  const { totalAmountPaid, closingFacePhoto, closingJewelleryPhoto, discount = 0 } = body;

  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (client.status === 'closed') return NextResponse.json({ error: 'Already closed' }, { status: 400 });

  const { currentPrincipal, totalInterest } = calculateOutstanding(
    client.pawnAmount,
    client.pawnDate,
    client.payments,
    new Date()
  );

  let closingFacePhotoUrl: string | undefined;
  let closingJewelleryPhotoUrl: string | undefined;
  if (closingFacePhoto) closingFacePhotoUrl = await uploadImage(closingFacePhoto, 'closing-face');
  if (closingJewelleryPhoto) closingJewelleryPhotoUrl = await uploadImage(closingJewelleryPhoto, 'closing-jewellery');

  const effectiveInterest = Math.max(0, totalInterest - discount);
  const paymentEntry = {
    date: new Date(),
    type: 'full' as const,
    amountPaid: totalAmountPaid,
    principalReduced: currentPrincipal,
    interestPaid: effectiveInterest,
    discount: discount || undefined,
    facePhotoUrl: closingFacePhotoUrl,
    jewelleryPhotoUrl: closingJewelleryPhotoUrl,
    processedBy: session.user.id,
    processedByName: session.user.name,
  };

  const updated = await Client.findByIdAndUpdate(
    id,
    {
      status: 'closed',
      closedDate: new Date(),
      totalAmountPaid,
      closingFacePhotoUrl,
      closingJewelleryPhotoUrl,
      $push: { payments: paymentEntry },
    },
    { new: true }
  );

  await AuditLog.create({
    action: 'loan_closed',
    performedBy: session.user.id,
    performedByName: session.user.name,
    loanId: client._id,
    glNumber: client.glNumber,
    clientName: client.name,
    amount: totalAmountPaid,
    details: `Loan closed. Amount paid: Rs.${totalAmountPaid}${discount ? ` | Discount: Rs.${discount}` : ''}`,
  });

  return NextResponse.json(updated);
}

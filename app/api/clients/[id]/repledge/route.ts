import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import AuditLog from '@/models/AuditLog';
import { calculateOutstanding } from '@/lib/interest';

/**
 * POST /api/clients/[id]/repledge
 * Closes the current active loan and creates a new loan for the same
 * customer + jewellery with a new principal amount and due date.
 *
 * Body: { newPawnAmount: number, newDueDate: string (YYYY-MM-DD) }
 * Returns: { newClientId: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { newPawnAmount, newDueDate } = await req.json();

  if (!newPawnAmount || !newDueDate) {
    return NextResponse.json({ error: 'newPawnAmount and newDueDate are required' }, { status: 400 });
  }

  const client = await Client.findById(id);
  if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (client.status !== 'active') return NextResponse.json({ error: 'Loan is not active' }, { status: 400 });

  const now = new Date();
  const { currentPrincipal, totalInterest } = calculateOutstanding(
    client.pawnAmount,
    client.pawnDate,
    client.payments,
    now
  );

  // Close the old loan with a zero-cash settlement entry (the repledge itself settles it)
  await Client.findByIdAndUpdate(id, {
    status: 'closed',
    closedDate: now,
    totalAmountPaid: 0,
    $push: {
      payments: {
        date: now,
        type: 'full',
        amountPaid: 0,
        principalReduced: currentPrincipal,
        interestPaid: totalInterest,
        processedBy: session.user.id,
        processedByName: session.user.name,
      },
    },
  });

  // Get next serial number
  const last = await Client.findOne({ serialNumber: { $exists: true } })
    .sort({ serialNumber: -1 })
    .select('serialNumber');
  const serialNumber = (last?.serialNumber ?? 0) + 1;

  // Create the new loan — carry over all identity and jewellery fields
  const newClient = await Client.create({
    serialNumber,
    name: client.name,
    contactNumber: client.contactNumber,
    jewelleryDetails: client.jewelleryDetails,
    goldWeight: client.goldWeight,
    goldWeightGross: client.goldWeightGross,
    goldWeightNet: client.goldWeightNet,
    facePhotoUrl: client.facePhotoUrl,
    kycDocumentUrl: client.kycDocumentUrl,
    kycBackDocumentUrl: client.kycBackDocumentUrl,
    jewelleryPhotoUrl: client.jewelleryPhotoUrl,
    nomineeName: client.nomineeName,
    nomineePhone: client.nomineePhone,
    nomineeRelationship: client.nomineeRelationship,
    interestRate: client.interestRate || 18,
    pawnAmount: newPawnAmount,
    pawnDate: now,
    expectedReturnDate: new Date(newDueDate),
    repledgedFromId: client._id,
    payments: [],
    createdBy: session.user.id,
    createdByName: session.user.name,
  });

  try {
    await AuditLog.create({
      action: 'loan_repledged',
      performedBy: session.user.id,
      performedByName: session.user.name,
      loanId: newClient._id,
      glNumber: newClient.glNumber,
      clientName: newClient.name,
      amount: newPawnAmount,
      details: `Repledge from loan #${client.serialNumber}. New loan: Rs.${newPawnAmount}`,
    });
  } catch { /* audit failure should not block repledge */ }

  return NextResponse.json({ newClientId: newClient._id.toString() });
}

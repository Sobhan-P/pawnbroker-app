import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import AuditLog from '@/models/AuditLog';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        await connectDB();
        const { id } = await params;
        const client = await Client.findById(id);
        if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
        if (client.status !== 'active') return NextResponse.json({ error: 'Loan is not active' }, { status: 400 });

        const body = await req.json();
        const { additionalAmount, newDueDate } = body;

        if (!additionalAmount || isNaN(Number(additionalAmount)) || Number(additionalAmount) <= 0) {
            return NextResponse.json({ error: 'Please provide a valid top-up amount' }, { status: 400 });
        }
        if (!newDueDate) {
            return NextResponse.json({ error: 'Please provide a new due date' }, { status: 400 });
        }

        const topupAmount = Number(additionalAmount);
        const oldPrincipal = client.pawnAmount;
        const newPrincipal = oldPrincipal + topupAmount;

        client.payments.push({
            date: new Date(),
            type: 'partial',
            amountPaid: topupAmount,
            principalReduced: 0,
            interestPaid: 0,
            resetsInterestClock: true,
            processedBy: session.user.id,
            processedByName: session.user.name,
        } as never);

        client.pawnAmount = newPrincipal;
        client.pawnDate = new Date();
        client.expectedReturnDate = new Date(newDueDate);

        await client.save();

        try {
            await AuditLog.create({
                action: 'loan_topup',
                performedBy: session.user.id,
                performedByName: session.user.name,
                loanId: client._id,
                glNumber: client.glNumber,
                clientName: client.name,
                amount: topupAmount,
                details: `Top-up of Rs.${topupAmount} added. Principal: Rs.${oldPrincipal} → Rs.${newPrincipal}`,
            });
        } catch { /* audit failure should never block the operation */ }

        return NextResponse.json(client);
    } catch (err) {
        console.error('Top-up error:', err);
        return NextResponse.json({ error: 'Server error during top-up' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';

/**
 * GET /api/clients/banks
 * Returns distinct bank names from all active clients that have a bankName set.
 */
export async function GET(_req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const banks = await Client.distinct('bankName', {
        status: 'active',
        bankName: { $exists: true, $nin: [null, ''] },
    });

    return NextResponse.json({ banks: banks.sort() });
}

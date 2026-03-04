import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import Transaction from '@/models/Transaction';
import Settings from '@/models/Settings';
import { CashflowDay } from '@/types';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function toISTDateString(date: Date): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return ist.toISOString().split('T')[0];
}

function istMidnightUTC(yyyy: number, mm: number, dd: number): Date {
  return new Date(Date.UTC(yyyy, mm - 1, dd) - IST_OFFSET_MS);
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from'); // YYYY-MM-DD
  const to = searchParams.get('to');     // YYYY-MM-DD

  // Parse period boundaries (IST-aware)
  let periodStart: Date;
  let periodEnd: Date;

  if (from) {
    const [y, m, d] = from.split('-').map(Number);
    periodStart = istMidnightUTC(y, m, d);
  } else {
    // Default: start of current IST month
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    periodStart = istMidnightUTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth() + 1, 1);
  }

  if (to) {
    const [y, m, d] = to.split('-').map(Number);
    periodEnd = new Date(istMidnightUTC(y, m, d).getTime() + 24 * 60 * 60 * 1000 - 1);
  } else {
    // Default: end of today IST
    const nowIST = new Date(Date.now() + IST_OFFSET_MS);
    const todayStart = istMidnightUTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth() + 1, nowIST.getUTCDate());
    periodEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  }

  // Fetch data for all-time running balance (no date filter for balance)
  const [allClients, allTransactions, settingsDoc] = await Promise.all([
    Client.find({}).select('pawnAmount pawnDate payments closedDate totalAmountPaid status createdAt'),
    Transaction.find({}).sort({ date: 1 }),
    Settings.findOne({ key: 'initialBalance' }),
  ]);

  const initialBalance = settingsDoc?.value ?? 0;

  // All-time running balance
  let allTimeLoansOut = 0;
  let allTimeCollectionsIn = 0;
  for (const c of allClients) {
    allTimeLoansOut += c.pawnAmount;
    for (const p of c.payments || []) {
      allTimeCollectionsIn += p.amountPaid || 0;
    }
  }

  let allTimeOtherIncome = 0;
  let allTimeOtherExpenses = 0;
  for (const t of allTransactions) {
    if (t.type === 'income') allTimeOtherIncome += t.amount;
    else allTimeOtherExpenses += t.amount;
  }

  const runningBalance =
    initialBalance - allTimeLoansOut + allTimeCollectionsIn + allTimeOtherIncome - allTimeOtherExpenses;

  // Period-scoped data
  const periodTransactions = allTransactions.filter(
    (t) => t.date >= periodStart && t.date <= periodEnd
  );

  // Build day-by-day breakdown for the calendar
  const dayMap = new Map<string, CashflowDay>();

  // Pawn: loans out (use createdAt as the date money was disbursed)
  for (const c of allClients) {
    const cDate = new Date(c.createdAt);
    if (cDate >= periodStart && cDate <= periodEnd) {
      const key = toISTDateString(cDate);
      const day = dayMap.get(key) ?? { date: key, loansOut: 0, collectionsIn: 0, otherIncome: 0, otherExpenses: 0, net: 0 };
      day.loansOut += c.pawnAmount;
      dayMap.set(key, day);
    }
    // Pawn: collections in (payments made in period)
    for (const p of c.payments || []) {
      const pDate = new Date(p.date);
      if (pDate >= periodStart && pDate <= periodEnd) {
        const key = toISTDateString(pDate);
        const day = dayMap.get(key) ?? { date: key, loansOut: 0, collectionsIn: 0, otherIncome: 0, otherExpenses: 0, net: 0 };
        day.collectionsIn += p.amountPaid || 0;
        dayMap.set(key, day);
      }
    }
  }

  // Other transactions
  for (const t of periodTransactions) {
    const key = toISTDateString(t.date);
    const day = dayMap.get(key) ?? { date: key, loansOut: 0, collectionsIn: 0, otherIncome: 0, otherExpenses: 0, net: 0 };
    if (t.type === 'income') day.otherIncome += t.amount;
    else day.otherExpenses += t.amount;
    dayMap.set(key, day);
  }

  // Calculate net for each day and sort
  const days: CashflowDay[] = Array.from(dayMap.values())
    .map((d) => ({
      ...d,
      net: d.collectionsIn + d.otherIncome - d.loansOut - d.otherExpenses,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Period totals
  const period = {
    loansOut: days.reduce((s, d) => s + d.loansOut, 0),
    collectionsIn: days.reduce((s, d) => s + d.collectionsIn, 0),
    pawnNet: 0,
    otherIncome: days.reduce((s, d) => s + d.otherIncome, 0),
    otherExpenses: days.reduce((s, d) => s + d.otherExpenses, 0),
    otherNet: 0,
    totalNet: 0,
  };
  period.pawnNet = period.collectionsIn - period.loansOut;
  period.otherNet = period.otherIncome - period.otherExpenses;
  period.totalNet = period.pawnNet + period.otherNet;

  return NextResponse.json({
    initialBalance,
    runningBalance: Math.round(runningBalance),
    period,
    days,
    transactions: periodTransactions,
  });
}

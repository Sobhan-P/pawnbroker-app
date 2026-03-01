import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Client from '@/models/Client';
import { sendWhatsApp, dueDateAlertMessage, monthlyReminderMessage } from '@/lib/whatsapp';

async function runReminders(req: NextRequest) {
  // Accept Vercel Cron header OR manual Bearer token
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isAuthorized = isVercelCron || authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const activeClients = await Client.find({ status: 'active' });

  let sent = 0;
  for (const client of activeClients) {
    const due = new Date(client.expectedReturnDate);
    const dueStr = due.toLocaleDateString('en-IN');
    const monthsOverdue = Math.max(0, Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    const legacyRate = client.interestRate ?? 12;
    const interest = Math.round(client.pawnAmount * (legacyRate / 100) * (monthsOverdue + 1));
    const total = client.pawnAmount + interest;

    if (due <= threeDaysLater && due >= now) {
      // Due in 3 days — send due date alert
      await sendWhatsApp(client.contactNumber, dueDateAlertMessage(client.name, dueStr, total));
      sent++;
    } else if (due < now) {
      // Overdue — send monthly reminder
      await sendWhatsApp(client.contactNumber, monthlyReminderMessage(client.name, client.pawnAmount, interest, total));
      sent++;
    }
  }

  return NextResponse.json({ message: `Reminders sent: ${sent}` });
}

export async function GET(req: NextRequest) {
  return runReminders(req);
}

export async function POST(req: NextRequest) {
  return runReminders(req);
}

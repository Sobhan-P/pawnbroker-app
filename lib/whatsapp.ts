import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

export async function sendWhatsApp(to: string, message: string) {
  const formattedTo = `whatsapp:+91${to.replace(/\D/g, '').slice(-10)}`;
  try {
    await client.messages.create({ from: FROM, to: formattedTo, body: message });
  } catch (err) {
    console.error('WhatsApp send error:', err);
  }
}

export function pawnConfirmationMessage(name: string, amount: number, rate: number, dueDate: string) {
  return `Hi ${name}, your gold pawn of Rs.${amount} has been recorded. Interest rate: ${rate}%/month. Due date: ${dueDate}. Please contact us for any queries. - Rise Again Web Solutions`;
}

export function dueDateAlertMessage(name: string, dueDate: string, total: number) {
  return `Hi ${name}, reminder: your gold pawn is due on ${dueDate}. Total amount to clear: Rs.${total}. Please return the gold and settle dues. - Rise Again Web Solutions`;
}

export function monthlyReminderMessage(name: string, principal: number, interest: number, total: number) {
  return `Hi ${name}, your pawn is overdue. Principal: Rs.${principal}, Accumulated Interest: Rs.${interest}, Total Due: Rs.${total}. Please clear at the earliest. - Rise Again Web Solutions`;
}

export function dailySummaryMessage(
  date: string,
  newCount: number,
  newPrincipal: number,
  closedCount: number,
  totalCollected: number,
  interestCollected: number
) {
  return (
    `PPN Finance — Daily Summary (${date})\n` +
    `New Loans: ${newCount} | Amount: Rs.${newPrincipal.toLocaleString('en-IN')}\n` +
    `Closed Loans: ${closedCount} | Collected: Rs.${totalCollected.toLocaleString('en-IN')}\n` +
    `Interest Earned Today: Rs.${interestCollected.toLocaleString('en-IN')}`
  );
}

export async function sendDailySummaryWhatsApp(
  date: string,
  newCount: number,
  newPrincipal: number,
  closedCount: number,
  totalCollected: number,
  interestCollected: number
) {
  const msg = dailySummaryMessage(date, newCount, newPrincipal, closedCount, totalCollected, interestCollected);
  await sendWhatsApp('7530058236', msg);
}

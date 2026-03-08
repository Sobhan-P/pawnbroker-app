// WhatsApp message templates for Pawn Broker App
// Twilio integration removed — stubs kept so existing imports compile without changes.

const CONTACT_NUMBER = '+91 95006 18457';

// No-op — Twilio removed. Replace with a new provider if needed in future.
export async function sendWhatsApp(_to: string, _message: string): Promise<void> {
  // no-op
}

export function pawnConfirmationMessage(name: string, amount: number, rate: number, dueDate: string) {
  return `Hi ${name}, your gold pawn of Rs.${amount} has been recorded at Pawn Broker App. Interest rate: ${rate}% p.a. Due date: ${dueDate}. Contact us: ${CONTACT_NUMBER}. - Pawn Broker App`;
}

export function dueDateAlertMessage(name: string, dueDate: string, total: number) {
  return `Hi ${name}, reminder: your gold pawn at Pawn Broker App is due on ${dueDate}. Total amount to clear: Rs.${total}. Contact us: ${CONTACT_NUMBER}. - Pawn Broker App`;
}

export function monthlyReminderMessage(name: string, principal: number, interest: number, total: number) {
  return `Hi ${name}, your pawn at Pawn Broker App is overdue. Principal: Rs.${principal}, Interest: Rs.${interest}, Total Due: Rs.${total}. Contact us: ${CONTACT_NUMBER}. - Pawn Broker App`;
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
    `Pawn Broker App — Daily Summary (${date})\n` +
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
): Promise<void> {
  const msg = dailySummaryMessage(date, newCount, newPrincipal, closedCount, totalCollected, interestCollected);
  await sendWhatsApp('9500618457', msg);
}

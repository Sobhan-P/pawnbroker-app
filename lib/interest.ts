// Interest calculation engine for PPN Finance
// Rates: Month 1 = 12%, Months 2-3 = 18%, Month 4+ = 24%
// Days are calculated based on actual UTC calendar days in each month period

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Normalize any date to UTC midnight (avoids timezone-shift bugs with setHours).
 * e.g. "2025-03-01T00:00:00.000Z" stays March 1 regardless of server/client timezone.
 */
function toUTCMidnight(d: Date | string): Date {
  const dt = d instanceof Date ? d : new Date(d);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

export interface InterestPeriod {
  monthNumber: number;
  monthName: string; // e.g., "January 2025"
  rate: number;      // percentage e.g. 12
  daysHeld: number;
  daysInCalendarMonth: number;
  interest: number;
  startDate: Date;
  endDate: Date;
}

export interface OutstandingResult {
  currentPrincipal: number;
  totalInterest: number;       // net interest owed (after partial-interest credits)
  rawInterest: number;         // gross interest from the clock-start date
  interestCreditBalance: number; // partial interest paid that has not yet reset the clock
  totalDue: number;
  periods: InterestPeriod[];   // breakdown of rawInterest by month period
  lastPaymentDate: Date;       // the date from which the interest clock is running
}

export interface PaymentRecord {
  _id?: string;
  date: Date | string;
  type: 'interest' | 'partial' | 'full';
  amountPaid: number;
  principalReduced: number;
  interestPaid: number;
  facePhotoUrl?: string;
  jewelleryPhotoUrl?: string;
  /**
   * true  → this payment settled the full outstanding interest → clock resets to 12%
   * false → partial interest only → clock keeps running from original start date
   * undefined (old records) → treated as true for backward compatibility
   */
  resetsInterestClock?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processedBy?: any;
  processedByName?: string;
}

export function getDaysInMonth(year: number, month: number): number {
  // month is 0-indexed (0=Jan, 11=Dec); uses UTC to avoid timezone issues
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function getRateForMonth(monthNumber: number): number {
  if (monthNumber === 1) return 0.12;
  if (monthNumber <= 3) return 0.18;
  return 0.24;
}

export function calculateInterestFromDate(
  principal: number,
  fromDate: Date | string,
  toDate: Date | string,
  applyMinimumDays: boolean = false
): { totalInterest: number; periods: InterestPeriod[] } {
  const periods: InterestPeriod[] = [];
  let totalInterest = 0;
  let monthNumber = 1;

  // Use UTC midnight to avoid any local-timezone offset shifting the date
  let periodStart = toUTCMidnight(fromDate);
  const rawEndDate = toUTCMidnight(toDate);

  // Minimum 10-day interest rule: only applied for the initial loan period (from pawnDate).
  // After an interest payment resets the clock, no minimum applies for the new period.
  const totalDays = Math.round(
    (rawEndDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const endDate = (applyMinimumDays && totalDays < 10)
    ? new Date(periodStart.getTime() + 10 * 24 * 60 * 60 * 1000)
    : rawEndDate;

  while (periodStart < endDate) {
    // End of this period = first day of the NEXT calendar month (calendar month boundaries)
    const periodEnd = new Date(Date.UTC(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth() + 1,
      1
    ));

    // Actual days in the calendar month where this period starts (UTC)
    const daysInCalendarMonth = getDaysInMonth(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth()
    );

    // Effective end (whichever is earlier: period end or toDate)
    const effectiveEnd = periodEnd < endDate ? periodEnd : endDate;

    // Days actually held in this period
    const daysHeld = Math.round(
      (effectiveEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysHeld <= 0) break;

    const rate = getRateForMonth(monthNumber);
    // Annual rate divided by 12 gives monthly rate; then prorate by days in month
    const interest = principal * (rate / 12) * (daysHeld / daysInCalendarMonth);
    const monthName = `${MONTH_NAMES[periodStart.getUTCMonth()]} ${periodStart.getUTCFullYear()}`;

    periods.push({
      monthNumber,
      monthName,
      rate: rate * 100,
      daysHeld,
      daysInCalendarMonth,
      interest: Math.round(interest),
      startDate: new Date(periodStart),
      endDate: new Date(effectiveEnd),
    });

    totalInterest += interest;

    if (periodEnd >= endDate) break;
    periodStart = new Date(periodEnd);
    monthNumber++;
  }

  return { totalInterest: Math.round(totalInterest), periods };
}

export function calculateOutstanding(
  pawnAmount: number,
  pawnDate: Date | string,
  payments: PaymentRecord[],
  asOfDate: Date = new Date()
): OutstandingResult {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentPrincipal = pawnAmount;
  // clockStart: date from which the interest rate clock is running
  let clockStart: Date = toUTCMidnight(pawnDate);
  // interestCreditBalance: partial interest already paid that has NOT reset the clock
  let interestCreditBalance = 0;
  // Use IST offset so payment dates match how effectiveAsOf is computed below
  const IST_OFFSET_MS = 330 * 60 * 1000;

  for (const payment of sortedPayments) {
    if (payment.type === 'full') continue; // loan already closed

    // Reduce principal if applicable
    if (payment.principalReduced > 0) {
      currentPrincipal -= payment.principalReduced;
    }

    // resetsInterestClock defaults to true for old records (backward compat)
    const resets = payment.resetsInterestClock !== false;

    if (resets) {
      // Full interest was paid → reset the clock.
      // Convert payment timestamp to IST date (same as effectiveAsOf) so that a payment
      // made at e.g. 00:30 IST (which is UTC previous-day) still resets to the IST date.
      const paymentIST = new Date(new Date(payment.date).getTime() + IST_OFFSET_MS);
      clockStart = toUTCMidnight(paymentIST);
      interestCreditBalance = 0;
    } else {
      // Only partial interest paid → accumulate credit, clock keeps running
      interestCreditBalance += payment.interestPaid || 0;
    }
  }

  // Convert asOfDate to IST before extracting the date. Without this, before 05:30 IST
  // the UTC date is still the previous day, causing the current month to not appear.
  const asOfIST = new Date(asOfDate.getTime() + IST_OFFSET_MS);
  const effectiveAsOf = new Date(
    Date.UTC(asOfIST.getUTCFullYear(), asOfIST.getUTCMonth(), asOfIST.getUTCDate())
  );

  // Apply the minimum 10-day rule only when the interest clock has never been reset
  // (i.e., clockStart is still the original pawnDate). After a payment resets the clock,
  // no minimum applies — the new period charges only actual days elapsed.
  const pawnDateUTC = toUTCMidnight(pawnDate);
  const isInitialPeriod = clockStart.getTime() === pawnDateUTC.getTime();

  const { totalInterest: rawInterest, periods } = calculateInterestFromDate(
    currentPrincipal,
    clockStart,
    effectiveAsOf,
    isInitialPeriod
  );

  // Net interest = gross interest minus any partial payments already made
  const totalInterest = Math.max(0, rawInterest - interestCreditBalance);

  return {
    currentPrincipal,
    totalInterest,
    rawInterest,
    interestCreditBalance,
    totalDue: currentPrincipal + totalInterest,
    periods,
    lastPaymentDate: clockStart,
  };
}

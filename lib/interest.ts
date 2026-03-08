// Interest calculation engine for SB Finance
// Tiered annual rates: Months 1–3 = 18%, Months 4–12 = 24%, After 12 mo = Compounding
// Denominator: actual days in each calendar month (not fixed 360)
// Timezone: all date logic uses IST (Asia/Kolkata, UTC+5:30)

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Convert any date to UTC midnight equivalent of IST midnight.
 * e.g. IST 2025-09-17 00:00 → UTC 2025-09-16 18:30 → represented as UTC midnight of 2025-09-17
 */
function toUTCMidnight(d: Date | string): Date {
  const dt = d instanceof Date ? d : new Date(d);
  const ist = new Date(dt.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
}

export interface InterestPeriod {
  monthNumber: number;
  monthName: string; // e.g., "January 2025"
  rate: number;      // percentage e.g. 12, 18, 24
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

/**
 * Returns the annual interest rate for a given month number.
 * Months 1-3 = 18%, Month 4+ = 24% p.a.
 */
export function getRateForMonth(monthNumber: number): number {
  if (monthNumber <= 3) return 0.18;
  return 0.24;
}

export function calculateInterestFromDate(
  principal: number,
  fromDate: Date | string,
  toDate: Date | string,
  applyMinimumDays: boolean = false,
  manualRate?: number // [NEW] if present, bypass tiered/compounding
): { totalInterest: number; rawTotalFloat: number; periods: InterestPeriod[] } {
  const periods: InterestPeriod[] = [];
  let monthNumber = 1;
  let currentPrincipal = principal;

  // Use IST-aware UTC midnight
  let periodStart = toUTCMidnight(fromDate);
  const rawEndDate = toUTCMidnight(toDate);

  // Minimum 15-day interest rule: only applied for the initial loan period (from pawnDate).
  const totalDays = Math.round(
    (rawEndDate.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const endDate = (applyMinimumDays && totalDays < 15)
    ? new Date(periodStart.getTime() + 15 * 24 * 60 * 60 * 1000)
    : rawEndDate;

  // Track raw (unrounded) running total
  let rawTotalFloat = 0;
  let yearAccumulatedInterest = 0;

  const isFixedRate = manualRate !== undefined && manualRate !== null && manualRate > 0;

  while (periodStart < endDate) {
    // End of this period = first day of the NEXT calendar month
    // To find the next month's IST midnight, we first get the currently represented IST month/year
    const currentIST = new Date(periodStart.getTime() + IST_OFFSET_MS);
    const nextMonthUTC = new Date(Date.UTC(
      currentIST.getUTCFullYear(),
      currentIST.getUTCMonth() + 1,
      1
    ) - IST_OFFSET_MS);

    const effectiveEnd = nextMonthUTC < endDate ? nextMonthUTC : endDate;
    const daysInCalendarMonth = getDaysInMonth(
      currentIST.getUTCFullYear(),
      currentIST.getUTCMonth()
    );
    const daysHeld = Math.round(
      (effectiveEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysHeld < 0) break; // Safety break

    if (daysHeld > 0) {
      // If manualRate is provided, use it flatly. Otherwise use tiered logic.
      const annualRate = isFixedRate ? (manualRate / 100) : getRateForMonth(monthNumber);

      // Formula: (CurrentPrincipal × AnnualRate ÷ 12) ÷ DaysInCalendarMonth × daysHeld
      const interest = (currentPrincipal * (annualRate / 12)) / daysInCalendarMonth * daysHeld;
      const monthName = `${MONTH_NAMES[currentIST.getUTCMonth()]} ${currentIST.getUTCFullYear()}${(!isFixedRate && monthNumber > 12) ? ' (Compounded)' : ''}`;

      rawTotalFloat += interest;
      yearAccumulatedInterest += interest;

      periods.push({
        monthNumber,
        monthName,
        rate: Math.round(annualRate * 100),
        daysHeld,
        daysInCalendarMonth,
        interest: Math.round(interest),
        startDate: new Date(periodStart),
        endDate: new Date(effectiveEnd),
      });

      // Compounding logic: Only apply if NOT using a fixed rate
      if (!isFixedRate && monthNumber % 12 === 0) {
        currentPrincipal += yearAccumulatedInterest;
        yearAccumulatedInterest = 0;
      }
    }

    if (effectiveEnd >= endDate) break;

    periodStart = nextMonthUTC;
    monthNumber++;
  }

  return { totalInterest: periods.reduce((s, p) => s + p.interest, 0), rawTotalFloat, periods };
}

export function calculateOutstanding(
  pawnAmount: number,
  pawnDate: Date | string,
  payments: PaymentRecord[],
  asOfDate: Date = new Date(),
  interestRate?: number // [NEW]
): OutstandingResult {
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let currentPrincipal = pawnAmount;
  // clockStart: date from which the interest rate clock is running
  let clockStart: Date = toUTCMidnight(pawnDate);
  // interestCreditBalance: partial interest already paid that has NOT reset the clock
  let interestCreditBalance = 0;

  for (const payment of sortedPayments) {
    if (payment.type === 'full') continue; // loan already closed

    // Reduce principal if applicable (ignore negative top-up entries)
    if (payment.principalReduced > 0) {
      currentPrincipal -= payment.principalReduced;
    }

    // resetsInterestClock defaults to true for old records (backward compat)
    const resets = payment.resetsInterestClock !== false;

    if (resets) {
      // Full interest was paid → reset the clock.
      // Use IST date so a payment at 00:30 IST still resets to the correct IST calendar date.
      const paymentDate = toUTCMidnight(payment.date);
      // Reset to the DAY AFTER payment to avoid double-charging the same day.
      clockStart = new Date(paymentDate.getTime() + 24 * 60 * 60 * 1000);
      interestCreditBalance = 0;
    } else {
      // Only partial interest paid → accumulate credit, clock keeps running
      interestCreditBalance += payment.interestPaid || 0;
    }
  }

  // Convert asOfDate to IST before extracting the date.
  const effectiveAsOf = toUTCMidnight(asOfDate);

  // Apply the minimum 15-day rule only when the interest clock has never been reset
  const pawnDateUTC = toUTCMidnight(pawnDate);
  const isInitialPeriod = clockStart.getTime() === pawnDateUTC.getTime();

  const { totalInterest: rawInterestRounded, rawTotalFloat, periods } = calculateInterestFromDate(
    currentPrincipal,
    clockStart,
    effectiveAsOf,
    isInitialPeriod,
    interestRate
  );
  // Use raw float total to compute the accurate rounded interest.
  // Math.max(1, ...) ensures small principals (e.g. Rs.111) don't show Rs.0
  // when any interest days have actually elapsed.
  const rawInterest = rawTotalFloat > 0 ? Math.max(1, Math.round(rawTotalFloat)) : rawInterestRounded;

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

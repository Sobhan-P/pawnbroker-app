
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * Returns today's date in YYYY-MM-DD format (IST).
 * Suitable for <input type="date"> value.
 */
export function getMonthStartIST(): string {
    const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

export function getTodayIST(): string {
    const now = new Date();
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    return ist.toISOString().split('T')[0];
}

/**
 * Formats a date or string into DD/MM/YYYY (IST).
 */
export function formatDateIST(d: Date | string | undefined | null): string {
    if (!d) return '—';
    const dt = typeof d === 'string' ? new Date(d) : d;
    const ist = new Date(dt.getTime() + IST_OFFSET_MS);

    const day = String(ist.getUTCDate()).padStart(2, '0');
    const month = String(ist.getUTCMonth() + 1).padStart(2, '0');
    const year = ist.getUTCFullYear();

    return `${day}/${month}/${year}`;
}

/**
 * Formats a date or string into DD/MM/YYYY HH:MM AM/PM (IST).
 */
export function formatDateTimeIST(d: Date | string | undefined | null): string {
    if (!d) return '—';
    const dt = typeof d === 'string' ? new Date(d) : d;
    return dt.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).replace(/,/g, '');
}

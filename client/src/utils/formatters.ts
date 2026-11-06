/**
 * Formats a numeric value into USD currency format ($120).
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats an ISO date string into human-friendly format (e.g., Nov 5, 2026).
 */
export const formatDate = (dateInput: string | Date): string => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
};

/**
 * Converts a Date object into HTML <input type="date"> format (YYYY-MM-DD).
 */
export const toInputDateFormat = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Calculates whole nights between check-in and check-out strings.
 */
export const calculateNightsBetween = (
  checkInStr: string,
  checkOutStr: string
): number => {
  if (!checkInStr || !checkOutStr) return 0;
  const inDate = new Date(checkInStr);
  const outDate = new Date(checkOutStr);
  const diffMs = outDate.getTime() - inDate.getTime();
  const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return nights > 0 ? nights : 0;
};


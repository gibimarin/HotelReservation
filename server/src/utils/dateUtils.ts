import { AppError } from './appError';

/**
 * Normalizes a date or date-string to midnight UTC (00:00:00.000Z).
 * Ensures date comparisons and database queries are timezone-agnostic.
 */
export const normalizeDate = (dateInput: Date | string): Date => {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    throw new AppError('Invalid date format provided.', 400, 'INVALID_DATE');
  }

  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Returns today's date normalized to midnight UTC.
 */
export const getTodayUTC = (): Date => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
};

/**
 * Verifies if a given date is in the past (before today midnight UTC).
 */
export const isDateInPast = (dateInput: Date | string): boolean => {
  const target = normalizeDate(dateInput);
  const today = getTodayUTC();
  return target.getTime() < today.getTime();
};

/**
 * Calculates whole nights between check-in and check-out.
 * Throws AppError if checkOut <= checkIn or if checkIn is in the past.
 */
export const calculateNights = (
  checkInInput: Date | string,
  checkOutInput: Date | string
): number => {
  const checkIn = normalizeDate(checkInInput);
  const checkOut = normalizeDate(checkOutInput);

  if (isDateInPast(checkIn)) {
    throw new AppError(
      'Check-in date cannot be in the past.',
      400,
      'PAST_CHECKIN_DATE'
    );
  }

  const diffMs = checkOut.getTime() - checkIn.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.round(diffMs / msPerDay);

  if (nights < 1) {
    throw new AppError(
      'Check-out date must be at least one day after check-in date.',
      400,
      'INVALID_DATE_RANGE'
    );
  }

  return nights;
};

/**
 * Generates an array of normalized Date objects for each night of a reservation.
 * Example: checkIn = Dec 1, checkOut = Dec 4 -> [Dec 1, Dec 2, Dec 3] (3 nights)
 */
export const getNightlyDateRange = (
  checkInInput: Date | string,
  checkOutInput: Date | string
): Date[] => {
  const checkIn = normalizeDate(checkInInput);
  const nights = calculateNights(checkInInput, checkOutInput);

  const dates: Date[] = [];
  for (let i = 0; i < nights; i++) {
    const nextDate = new Date(checkIn);
    nextDate.setUTCDate(checkIn.getUTCDate() + i);
    dates.push(nextDate);
  }

  return dates;
};


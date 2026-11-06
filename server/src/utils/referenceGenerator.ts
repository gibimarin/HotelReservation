import crypto from 'crypto';

/**
 * Generates a human-friendly, collision-resistant reservation reference.
 * Format: RES-YYYYMMDD-XXXX (e.g., RES-20261105-9B2F)
 */
export const generateReservationReference = (): string => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const dateSegment = `${year}${month}${day}`;

  // 4-character cryptographically secure random alphanumeric suffix
  const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);

  return `RES-${dateSegment}-${randomSuffix}`;
};


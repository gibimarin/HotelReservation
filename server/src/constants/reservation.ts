export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
}

export const RESERVATION_STATUSES = [
  ReservationStatus.PENDING,
  ReservationStatus.CONFIRMED,
  ReservationStatus.CHECKED_IN,
  ReservationStatus.CHECKED_OUT,
  ReservationStatus.CANCELLED,
] as const;

/**
 * Valid state transition matrix.
 * Enforces business rule: "Prevent invalid reservation status transitions".
 */
export const VALID_STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.PENDING]: [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED]: [ReservationStatus.CHECKED_IN, ReservationStatus.CANCELLED],
  [ReservationStatus.CHECKED_IN]: [ReservationStatus.CHECKED_OUT],
  [ReservationStatus.CHECKED_OUT]: [], // Terminal state
  [ReservationStatus.CANCELLED]: [],   // Terminal state
};

/**
 * Returns true if moving from currentStatus to nextStatus is allowed.
 */
export const isValidStatusTransition = (
  currentStatus: ReservationStatus,
  nextStatus: ReservationStatus
): boolean => {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
};


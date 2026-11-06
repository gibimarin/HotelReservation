import React from 'react';
import type { ReservationStatus } from '../../types';

interface StatusBadgeProps {
  status: ReservationStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configMap: Record<
    ReservationStatus,
    { label: string; bg: string; text: string; dot: string }
  > = {
    pending: {
      label: 'Pending',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    checked_in: {
      label: 'Checked In',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-500',
    },
    checked_out: {
      label: 'Checked Out',
      bg: 'bg-purple-50 border-purple-200',
      text: 'text-purple-800',
      dot: 'bg-purple-500',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-800',
      dot: 'bg-rose-500',
    },
  };

  const current = configMap[status] || {
    label: status,
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-800',
    dot: 'bg-slate-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg} ${current.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );
};

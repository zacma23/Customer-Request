import React from 'react';
import { RequestStatus, Priority, PaymentStatus } from '../../types';

interface BadgeProps {
  status?: RequestStatus | PaymentStatus | string;
  priority?: Priority;
  className?: string;
}

export const StatusBadge: React.FC<{ status: RequestStatus | PaymentStatus | string; className?: string }> = ({
  status,
  className = '',
}) => {
  const getStyle = () => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'MEETING_SCHEDULED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'AWAITING_PAYMENT':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      case 'PROOF_SUBMITTED':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
      case 'VERIFIED':
      case 'IN_PROGRESS':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
      case 'COMPLETED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const formatText = (s: string) => {
    return s.replace(/_/g, ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStyle()} ${className}`}
    >
      {formatText(status)}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority; className?: string }> = ({
  priority,
  className = '',
}) => {
  const getStyle = () => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-500 text-white animate-pulse';
      case 'HIGH':
        return 'bg-orange-500 text-white';
      case 'NORMAL':
        return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      case 'LOW':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${getStyle()} ${className}`}>
      {priority}
    </span>
  );
};

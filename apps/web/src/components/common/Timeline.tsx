import React from 'react';
import { RequestStatus } from '../../types';
import { Check, Clock, AlertCircle } from 'lucide-react';

interface TimelineProps {
  currentStatus: RequestStatus;
}

const STAGES: { status: RequestStatus; label: string }[] = [
  { status: 'PENDING', label: 'Submitted' },
  { status: 'APPROVED', label: 'Approved' },
  { status: 'MEETING_SCHEDULED', label: 'Meeting' },
  { status: 'AWAITING_PAYMENT', label: 'Payment' },
  { status: 'PROOF_SUBMITTED', label: 'Verification' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'COMPLETED', label: 'Delivered' },
];

export const StatusTimeline: React.FC<TimelineProps> = ({ currentStatus }) => {
  if (currentStatus === 'REJECTED') {
    return (
      <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">This request has been rejected.</p>
      </div>
    );
  }

  const currentIndex = STAGES.findIndex((s) => s.status === currentStatus);
  const activeIndex = currentIndex === -1 ? (currentStatus === 'CLOSED' ? STAGES.length - 1 : 0) : currentIndex;

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center justify-between min-w-[580px] px-2">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeIndex || currentStatus === 'COMPLETED' || currentStatus === 'CLOSED';
          const isCurrent = idx === activeIndex && currentStatus !== 'COMPLETED' && currentStatus !== 'CLOSED';

          return (
            <React.Fragment key={stage.status}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-950 animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-5 h-5 stroke-[2.5]" /> : isCurrent ? <Clock className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`mt-2 text-xs font-semibold ${
                    isCurrent
                      ? 'text-brand-600 dark:text-brand-400 font-bold'
                      : isDone
                      ? 'text-slate-900 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 rounded transition-all ${
                    idx < activeIndex ? 'bg-emerald-600' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { PaymentRequest } from '../../types';
import { StatusBadge } from '../../components/common/Badge';
import { CreditCard, ArrowRight, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const ClientPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await api.get('/payments');
        setPayments(response.data.data);
      } catch (err) {
        console.error('Failed to load payments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Payments & Milestone Invoices
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review your project quotations, milestone deposits, and uploaded payment verification receipts
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-sm">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No invoices issued yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            When our engineering team creates a project quotation or milestone invoice, it will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {payments.map((p) => (
            <div
              key={p.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Invoice
                  </span>
                  <StatusBadge status={p.status} />
                </div>

                <div>
                  <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {p.description}
                  </h4>
                  <div className="text-2xl font-black text-brand-600 dark:text-brand-400">
                    {p.amount.toLocaleString()} {p.currency}
                  </div>
                </div>

                {p.rejectionReason && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 text-xs">
                    <strong>Proof Rejected:</strong> {p.rejectionReason}
                  </div>
                )}

                {p.proofs && p.proofs.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Submitted Proof:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      Method: <strong>{p.proofs[0].paymentMethod}</strong> • Ref:{' '}
                      <strong>{p.proofs[0].referenceNumber || 'N/A'}</strong>
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {format(new Date(p.createdAt), 'MMM d, yyyy')}
                </span>
                <Link
                  to={`/portal/requests/${(p as any).serviceRequestId || ''}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  <span>Open Request Thread</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

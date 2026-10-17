import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Download,
  AlertCircle,
  FileCheck2,
  Filter,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { PaymentStatus } from '../../types';

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  description: string;
  paymentLink?: string | null;
  bankDetails?: string | null;
  dueDate?: string | null;
  status: PaymentStatus;
  rejectionReason?: string | null;
  createdAt: string;
  serviceRequest: {
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    client: {
      id: string;
      name: string;
      phone: string;
      email?: string | null;
    };
  };
  proofs?: Array<{
    id: string;
    referenceNumber?: string | null;
    amountPaid: number;
    paymentMethod: string;
    paymentDate: string;
    notes?: string | null;
    submittedAt: string;
    receiptAttachment?: {
      id: string;
      fileName: string;
      url?: string;
    } | null;
  }>;
  verifiedBy?: { id: string; name: string } | null;
}

export const AdminPaymentsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch payments list
  const { data: payments = [], isLoading } = useQuery<PaymentItem[]>({
    queryKey: ['admin-payments', statusFilter],
    queryFn: async () => {
      const url = statusFilter ? `/payments?status=${statusFilter}` : '/payments';
      const res = await api.get(url);
      return res.data.data || [];
    },
  });

  // Verify/Reject mutation
  const verifyMutation = useMutation({
    mutationFn: async ({
      paymentId,
      verified,
      rejectionReason,
    }: {
      paymentId: string;
      verified: boolean;
      rejectionReason?: string;
    }) => {
      const res = await api.patch(`/payments/${paymentId}/verify`, {
        verified,
        rejectionReason,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
      setIsVerifyModalOpen(false);
      setIsRejectModalOpen(false);
      setSelectedPayment(null);
      setRejectionReason('');
    },
  });

  const filteredPayments = payments.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.serviceRequest.requestNumber.toLowerCase().includes(term) ||
      p.serviceRequest.client.name.toLowerCase().includes(term) ||
      p.serviceRequest.title.toLowerCase().includes(term) ||
      p.proofs?.some((prf) => prf.referenceNumber?.toLowerCase().includes(term))
    );
  });

  // KPI Calculations
  const verifiedETB = payments
    .filter((p) => p.status === 'VERIFIED' && p.currency === 'ETB')
    .reduce((sum, p) => sum + p.amount, 0);

  const verifiedUSD = payments
    .filter((p) => p.status === 'VERIFIED' && p.currency === 'USD')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingVerificationCount = payments.filter((p) => p.status === 'PROOF_SUBMITTED').length;
  const awaitingPaymentCount = payments.filter((p) => p.status === 'AWAITING_PAYMENT').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <CreditCard className="w-7 h-7 text-emerald-600" />
          Payments & Verification Hub
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review Telebirr / CBE payment slips, verify transactions, and unlock client project progress.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Verified (ETB)
          </span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">
            {verifiedETB.toLocaleString()} ETB
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Local Ethiopian Birr</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Verified (USD)
          </span>
          <p className="text-2xl font-bold text-sky-600 dark:text-sky-400 mt-2">
            ${verifiedUSD.toLocaleString()}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">International Invoicing</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Pending Proof Review
          </span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
            {pendingVerificationCount}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Requires manual review</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Awaiting Client Payment
          </span>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-2">
            {awaitingPaymentCount}
          </p>
          <span className="text-xs text-slate-400 mt-1 block">Invoices generated</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Request #, client, reference #..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="PROOF_SUBMITTED">Proof Submitted (Pending Review)</option>
            <option value="AWAITING_PAYMENT">Awaiting Payment</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Request # / Client</th>
                <th className="px-6 py-4">Invoice Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Submitted Proof</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2"></div>
                    <p>Loading payments queue...</p>
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium">No payment records found.</p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => {
                  const latestProof = p.proofs && p.proofs.length > 0 ? p.proofs[p.proofs.length - 1] : null;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.serviceRequest.requestNumber}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {p.serviceRequest.client.name} &bull; {p.serviceRequest.client.phone}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.amount.toLocaleString()} {p.currency}
                        </div>
                        <div className="text-xs text-slate-400 line-clamp-1">{p.description}</div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            p.status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : p.status === 'PROOF_SUBMITTED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse'
                              : p.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {p.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {latestProof ? (
                          <div className="text-xs space-y-0.5">
                            <span className="font-medium text-slate-900 dark:text-white block">
                              {latestProof.paymentMethod}: {latestProof.referenceNumber || 'No ref'}
                            </span>
                            <span className="text-slate-400 block">
                              Paid: {latestProof.amountPaid} {p.currency}
                            </span>
                            {latestProof.receiptAttachment && (
                              <a
                                href={latestProof.receiptAttachment.url || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary-600 hover:underline mt-0.5"
                              >
                                <FileCheck2 className="w-3 h-3" /> View Receipt
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">No proof submitted yet</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-right">
                        {p.status === 'PROOF_SUBMITTED' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setIsVerifyModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verify
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setIsRejectModalOpen(true);
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300 rounded-lg transition-colors flex items-center gap-1"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}

                        {p.status === 'VERIFIED' && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-4 h-4" /> Confirmed
                          </span>
                        )}

                        {p.status === 'AWAITING_PAYMENT' && (
                          <span className="text-xs text-slate-400 flex items-center justify-end gap-1">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify Confirmation Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isVerifyModalOpen}
          onClose={() => setIsVerifyModalOpen(false)}
          title={`Verify Payment for ${selectedPayment.serviceRequest.requestNumber}`}
        >
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-4 rounded-xl text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total Invoice:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedPayment.amount.toLocaleString()} {selectedPayment.currency}
                </span>
              </div>
              {selectedPayment.proofs?.[0] && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Method:</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {selectedPayment.proofs[0].paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Reference Number:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {selectedPayment.proofs[0].referenceNumber || 'N/A'}
                    </span>
                  </div>
                  {selectedPayment.proofs[0].receiptAttachment?.url && (
                    <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800">
                      <a
                        href={selectedPayment.proofs[0].receiptAttachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary-600 dark:text-primary-400 underline font-medium flex items-center gap-1"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> Open Uploaded Receipt Image
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Confirming this payment will immediately move the service request to{' '}
              <strong className="text-emerald-600">IN PROGRESS</strong> and send instant confirmations to the client
              via Telegram, WhatsApp, and their Web portal.
            </p>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  verifyMutation.mutate({
                    paymentId: selectedPayment.id,
                    verified: true,
                  })
                }
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {verifyMutation.isPending ? 'Verifying...' : 'Confirm & Unlock Project'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      {selectedPayment && (
        <Modal
          isOpen={isRejectModalOpen}
          onClose={() => setIsRejectModalOpen(false)}
          title={`Reject Payment Proof`}
        >
          <div className="space-y-4">
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-4 rounded-xl text-sm">
              <p className="text-rose-800 dark:text-rose-200 font-medium">
                Rejecting payment proof for {selectedPayment.serviceRequest.requestNumber}.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                The client will be notified and asked to resubmit valid Telebirr or CBE transaction proof.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Rejection Reason (Required)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Reference number does not match banking statement, or receipt image is unreadable."
                rows={3}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifyMutation.isPending || !rejectionReason.trim()}
                onClick={() =>
                  verifyMutation.mutate({
                    paymentId: selectedPayment.id,
                    verified: false,
                    rejectionReason: rejectionReason.trim(),
                  })
                }
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                {verifyMutation.isPending ? 'Rejecting...' : 'Reject Proof'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { fetchUserRequests, deleteServiceRequest } from '../../api/supabaseService';
import { ServiceRequest } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  MessageSquare,
  ArrowRight,
  Bot,
  ExternalLink,
  Calendar,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

export const ClientDashboard: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadRequests = async () => {
    try {
      // 1. Load user's data directly from Supabase
      const data = await fetchUserRequests();
      setRequests(data);
    } catch (err) {
      console.warn('Supabase fetch failed, trying local API fallback...', err);
      try {
        const response = await api.get('/requests?limit=10');
        setRequests(response.data.data);
      } catch (fallbackErr) {
        console.error('Failed to fetch requests', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleDeleteRequest = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this service request?')) return;
    try {
      await deleteServiceRequest(id);
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete request:', err);
      alert('Could not delete request. Please try again.');
    }
  };

  const pendingCount = requests.filter(
    (r) => r.status === 'PENDING' || r.status === 'APPROVED' || r.status === 'MEETING_SCHEDULED'
  ).length;
  const paymentDueCount = requests.filter((r) => r.status === 'AWAITING_PAYMENT').length;
  const inProgressCount = requests.filter(
    (r) => r.status === 'IN_PROGRESS' || r.status === 'PROOF_SUBMITTED' || r.status === 'VERIFIED'
  ).length;
  const completedCount = requests.filter((r) => r.status === 'COMPLETED' || r.status === 'CLOSED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm mb-3">
              Client Operations Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="mt-1 text-sm text-brand-100 max-w-xl">
              Track project milestones, coordinate meetings, review payment invoices, and inspect deliverables in real time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/portal/new-request"
              className="px-5 py-3 rounded-xl text-sm font-bold bg-white text-brand-700 hover:bg-brand-50 shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Request</span>
            </Link>
            <Link
              to="/portal/profile"
              className="px-5 py-3 rounded-xl text-sm font-bold bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all flex items-center gap-2 border border-white/20"
            >
              <Bot className="w-4 h-4" />
              <span>Link Telegram / WhatsApp</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {pendingCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting meeting or approval</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Payment Due</span>
            <CreditCard className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {paymentDueCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting receipt upload</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">In Progress</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {inProgressCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Development sprints active</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {completedCount}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Completed projects</span>
        </div>
      </div>

      {/* Recent Requests Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">My Service Requests</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Overview of all submitted project requests and their current status
            </p>
          </div>
          <Link
            to="/portal/new-request"
            className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>Submit New</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-4">
              <PlusCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">No requests submitted yet</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Ready to begin? Choose from our 9 specialized services and submit your project requirements.
            </p>
            <Link
              to="/portal/new-request"
              className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Your First Request</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Request #</th>
                  <th className="py-3 px-4">Project Title</th>
                  <th className="py-3 px-4">Services</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-4 px-4 font-mono font-bold text-brand-600 dark:text-brand-400">
                      {req.requestNumber}
                    </td>
                    <td className="py-4 px-4 max-w-xs">
                      <span className="font-bold text-slate-900 dark:text-white line-clamp-1">
                        {req.title}
                      </span>
                      <span className="text-[11px] text-slate-400 line-clamp-1">{req.description}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {req.services?.map((s, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {s.service.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-4 px-4">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-4 px-4 text-slate-500 whitespace-nowrap">
                      {req.createdAt ? format(new Date(req.createdAt), 'MMM d, yyyy') : 'N/A'}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/portal/requests/${req.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white transition-colors"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={(e) => handleDeleteRequest(req.id, e)}
                          title="Delete request"
                          className="inline-flex items-center p-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

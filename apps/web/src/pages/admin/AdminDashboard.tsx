import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { DashboardStats } from '../../types';
import { StatusBadge } from '../../components/common/Badge';
import {
  Layers,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Star,
  Users,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/reports/dashboard');
        setStats(response.data.data);
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        Loading executive dashboard metrics...
      </div>
    );
  }

  const { statusCounts, revenue, satisfaction, serviceDistribution, recentRequests } = stats;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time telemetry across requests, revenue, SLA targets, and customer satisfaction
          </p>
        </div>
        <Link
          to="/admin/requests"
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Open Requests Queue</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue (ETB)</span>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {revenue.etb.toLocaleString()} ETB
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            + ${revenue.usd.toLocaleString()} USD international
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Verification Queue</span>
            <CreditCard className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {statusCounts.PROOF_SUBMITTED || 0}
            </p>
            {statusCounts.PROOF_SUBMITTED > 0 && (
              <span className="text-xs font-bold text-amber-500 animate-pulse">Needs Review</span>
            )}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Awaiting receipt verification</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Response Time</span>
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {stats.averageResponseTimeHours} hrs
          </p>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 block">
            Within 2h SLA target
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Satisfaction CSAT</span>
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {satisfaction.score} / 5.0
            </p>
            <span className="text-xs text-slate-400">({satisfaction.reviewCount} reviews)</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Verified customer ratings</span>
        </div>
      </div>

      {/* Status Breakdown Grid (All 9 Stages) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          Request Pipeline Counts by Status
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { key: 'PENDING', label: 'Pending', count: statusCounts.PENDING || 0, color: 'text-amber-500' },
            { key: 'APPROVED', label: 'Approved', count: statusCounts.APPROVED || 0, color: 'text-blue-500' },
            { key: 'MEETING_SCHEDULED', label: 'Meeting Scheduled', count: statusCounts.MEETING_SCHEDULED || 0, color: 'text-purple-500' },
            { key: 'AWAITING_PAYMENT', label: 'Awaiting Payment', count: statusCounts.AWAITING_PAYMENT || 0, color: 'text-orange-500' },
            { key: 'PROOF_SUBMITTED', label: 'Payment Submitted', count: statusCounts.PROOF_SUBMITTED || 0, color: 'text-yellow-500' },
            { key: 'VERIFIED', label: 'Verified', count: statusCounts.VERIFIED || 0, color: 'text-indigo-500' },
            { key: 'IN_PROGRESS', label: 'In Progress', count: statusCounts.IN_PROGRESS || 0, color: 'text-indigo-600' },
            { key: 'COMPLETED', label: 'Completed', count: statusCounts.COMPLETED || 0, color: 'text-emerald-500' },
            { key: 'REJECTED', label: 'Rejected', count: statusCounts.REJECTED || 0, color: 'text-rose-500' },
            { key: 'CLOSED', label: 'Closed', count: statusCounts.CLOSED || 0, color: 'text-slate-500' },
          ].map((st) => (
            <div
              key={st.key}
              className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                  {st.label}
                </span>
                <span className={`text-xl font-black ${st.color}`}>{st.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Service Distribution + Recent Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Service Distribution */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            Requests by Service
          </h3>

          <div className="space-y-3">
            {serviceDistribution.map((item) => {
              const maxCount = Math.max(...serviceDistribution.map((d) => d.count), 1);
              const percentage = Math.round((item.count / maxCount) * 100);

              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span className="truncate pr-2">{item.title}</span>
                    <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                      {item.count}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-600 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Inbound Requests */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Recent Service Requests
            </h3>
            <Link
              to="/admin/requests"
              className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentRequests.map((req) => (
              <div
                key={req.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 p-2 rounded-2xl transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400">
                      {req.requestNumber}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {req.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Client: <strong className="text-slate-600 dark:text-slate-300">{req.client?.name}</strong> •{' '}
                    {req.client?.phone}
                  </p>
                </div>

                <Link
                  to={`/admin/requests/${req.id}`}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white transition-colors self-start sm:self-auto flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

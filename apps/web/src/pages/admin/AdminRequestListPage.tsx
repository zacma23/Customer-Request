import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { ServiceRequest, Service, RequestStatus, Priority } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  Search,
  Download,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminRequestListPage: React.FC = () => {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Pagination States
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [serviceKey, setServiceKey] = useState<string>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Load services for filter dropdown
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get('/services');
        setServices(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchServices();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        sortBy,
        sortOrder,
      });

      if (search) params.append('search', search);
      if (status) params.append('status', status);
      if (priority) params.append('priority', priority);
      if (serviceKey) params.append('serviceKey', serviceKey);

      const res = await api.get(`/requests?${params.toString()}`);
      setRequests(res.data.data);
      setTotalPages(res.data.pagination.totalPages);
      setTotalCount(res.data.pagination.total);
    } catch (err) {
      console.error('Failed to load requests queue', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, status, priority, serviceKey, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRequests();
  };

  const handleExportCsv = async () => {
    try {
      const response = await api.get('/requests/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `requests-export-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Requests Management Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Browse, filter, assign engineers, and transition tickets across the full project lifecycle
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Request #, title, client name, or phone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="MEETING_SCHEDULED">Meeting Scheduled</option>
              <option value="AWAITING_PAYMENT">Awaiting Payment</option>
              <option value="PROOF_SUBMITTED">Proof Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Service filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Service</label>
            <select
              value={serviceKey}
              onChange={(e) => {
                setServiceKey(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="">All Services</option>
              {services.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Sort Order</label>
            <select
              value={`${sortBy}:${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split(':');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="createdAt:desc">Newest First</option>
              <option value="createdAt:asc">Oldest First</option>
              <option value="priority:desc">Priority (Urgent)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-400">
            Showing {requests.length} of {totalCount} total requests
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-xs">Loading requests queue...</div>
        ) : requests.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-xs">
            No requests matched your filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-3">Req #</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Project Title</th>
                  <th className="py-3 px-3">Service</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Priority</th>
                  <th className="py-3 px-3">Assignee</th>
                  <th className="py-3 px-3">Created</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-3 font-mono font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
                      {req.requestNumber}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {req.client?.name}
                      </span>
                      <span className="text-[10px] text-slate-400">{req.client?.phone}</span>
                    </td>
                    <td className="py-3.5 px-3 max-w-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {req.title}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">
                        {req.description}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1">
                        {req.services?.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            {s.service.title}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <PriorityBadge priority={req.priority} />
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {req.assignedStaff ? (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          {req.assignedStaff.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">
                      {format(new Date(req.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3.5 px-3 text-right whitespace-nowrap">
                      <Link
                        to={`/admin/requests/${req.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white transition-colors"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <span className="text-xs text-slate-400">
            Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page >= totalPages}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 flex items-center gap-1"
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealTime } from '../../context/RealTimeContext';
import { ServiceRequest, Message, ReplyTemplate, User, RequestStatus, Priority, PaymentStatus } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { StatusTimeline } from '../../components/common/Timeline';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Sparkles,
  Bot,
  Send,
  Calendar,
  CreditCard,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  UserCheck,
  Building,
  Phone,
  Mail,
  ExternalLink,
  MessageSquare,
  Lock,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

export const AdminRequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isSuperAdmin } = useAuth();
  const { subscribe } = useRealTime();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<ReplyTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'CHAT' | 'INTERNAL_NOTES' | 'PAYMENTS'
  const [activeTab, setActiveTab] = useState<'CHAT' | 'INTERNAL_NOTES' | 'PAYMENTS'>('CHAT');

  // Composer State
  const [composerText, setComposerText] = useState('');
  const [sending, setSending] = useState(false);
  const [draftingAi, setDraftingAi] = useState(false);

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<RequestStatus>('APPROVED');
  const [statusReason, setStatusReason] = useState('');

  const [meetingModalOpen, setMeetingModalOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [meetingType, setMeetingType] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [meetingLocation, setMeetingLocation] = useState('Google Meet (https://meet.google.com/xyz)');

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState<'ETB' | 'USD'>('ETB');
  const [paymentDescription, setPaymentDescription] = useState('Initial 50% milestone deposit for development sprint');
  const [paymentLink, setPaymentLink] = useState('');

  const [quotationModalOpen, setQuotationModalOpen] = useState(false);
  const [quotationDraft, setQuotationDraft] = useState<any>(null);
  const [loadingQuotation, setLoadingQuotation] = useState(false);

  const [receiptPreviewModalOpen, setReceiptPreviewModalOpen] = useState(false);
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<string | null>(null);
  const [verifyPaymentId, setVerifyPaymentId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchData = async () => {
    try {
      const [reqRes, msgRes, staffRes, tmplRes] = await Promise.all([
        api.get(`/requests/${id}`),
        api.get(`/messages/request/${id}`),
        api.get('/users?role=STAFF'),
        api.get('/templates'),
      ]);
      setRequest(reqRes.data.data);
      setMessages(msgRes.data.data);
      setStaffUsers(staffRes.data.data);
      setTemplates(tmplRes.data.data);
    } catch (err) {
      console.error('Failed to load admin request detail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const unsubscribe = subscribe('new_message', (data: any) => {
      if (data.requestId === id) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    const unsubscribeProof = subscribe('payment_proof_submitted', (data: any) => {
      if (data.requestId === id) {
        fetchData();
      }
    });

    return () => {
      unsubscribe();
      unsubscribeProof();
    };
  }, [id, subscribe]);

  // AI Actions
  const handleAiDraftReply = async (intent: 'GENERAL' | 'APPROVAL' | 'MEETING' | 'PAYMENT') => {
    setDraftingAi(true);
    try {
      const res = await api.post(`/ai/request/${id}/draft-reply`, {
        replyType: intent,
        instructions: 'Courteous and clear Ethiopian technology agency communication',
      });
      setComposerText(res.data.data.draft);
    } catch (err) {
      alert('AI draft reply unavailable. You can compose manually.');
    } finally {
      setDraftingAi(false);
    }
  };

  const handleAiSummarize = async () => {
    try {
      const res = await api.post(`/ai/request/${id}/summarize`);
      setRequest((prev) => (prev ? { ...prev, aiSummary: res.data.data.summary } : null));
    } catch (err) {
      alert('Could not generate AI summary');
    }
  };

  const handleAiGenerateQuotation = async () => {
    setLoadingQuotation(true);
    setQuotationModalOpen(true);
    try {
      const res = await api.post(`/ai/request/${id}/quotation`);
      setQuotationDraft(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuotation(false);
    }
  };

  // Status and Assignments
  const handleUpdateStatus = async (status: RequestStatus, reason?: string) => {
    try {
      await api.patch(`/requests/${id}/status`, { status, reason });
      setStatusModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleAssignStaff = async (staffId: string | null) => {
    try {
      await api.patch(`/requests/${id}/assign`, { staffId: staffId || null });
      fetchData();
    } catch (err) {
      alert('Failed to assign staff');
    }
  };

  const handleUpdatePriority = async (p: Priority) => {
    try {
      await api.patch(`/requests/${id}/priority`, { priority: p });
      fetchData();
    } catch (err) {
      alert('Failed to update priority');
    }
  };

  // Messaging
  const handleSendMessage = async (type: 'GENERAL' | 'INTERNAL_NOTE' = 'GENERAL') => {
    if (!composerText.trim() || sending) return;
    setSending(true);

    try {
      const res = await api.post(`/messages/request/${id}`, {
        content: composerText,
        type,
      });
      setMessages((prev) => [...prev, res.data.data]);
      setComposerText('');
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleScheduleMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/messages/request/${id}`, {
        content: `Discovery consultation scheduled for ${meetingDate}. Coordinates: ${meetingLocation}`,
        type: 'MEETING',
        metadata: {
          scheduledAt: new Date(meetingDate).toISOString(),
          durationMinutes: meetingDuration,
          meetingType,
          locationOrUrl: meetingLocation,
        },
      });
      setMeetingModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to schedule meeting');
    }
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/messages/request/${id}`, {
        content: `Milestone invoice issued for ${paymentAmount} ${paymentCurrency}. ${paymentDescription}`,
        type: 'PAYMENT',
        metadata: {
          amount: parseFloat(paymentAmount),
          currency: paymentCurrency,
          description: paymentDescription,
          paymentLink: paymentLink || undefined,
          bankDetails: {
            telebirr: '+251911223344',
            cbe: '1000345678912',
          },
        },
      });
      setPaymentModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to issue payment request');
    }
  };

  const handleVerifyPayment = async (paymentId: string, verified: boolean) => {
    try {
      await api.patch(`/payments/${paymentId}/verify`, {
        verified,
        rejectionReason: verified ? undefined : rejectionReason || 'Receipt details could not be matched',
      });
      setReceiptPreviewModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Payment verification action failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-400">
        Loading admin workspace...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Request not found</h2>
        <Link to="/admin/requests" className="text-brand-600 underline mt-2 block">
          Back to Requests
        </Link>
      </div>
    );
  }

  const clientMessages = messages.filter((m) => m.type !== 'INTERNAL_NOTE');
  const internalNotes = messages.filter((m) => m.type === 'INTERNAL_NOTE');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Navigation & Status Bar */}
      <div>
        <Link
          to="/admin/requests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests Queue</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                {request.requestNumber}
              </span>
              <StatusBadge status={request.status} />
              <PriorityBadge priority={request.priority} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {request.title}
            </h1>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Dropdown */}
            <select
              value={request.status}
              onChange={(e) => handleUpdateStatus(e.target.value as RequestStatus)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="MEETING_SCHEDULED">MEETING SCHEDULED</option>
              <option value="AWAITING_PAYMENT">AWAITING PAYMENT</option>
              <option value="PROOF_SUBMITTED">PROOF SUBMITTED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CLOSED">CLOSED</option>
            </select>

            {/* Priority Dropdown */}
            <select
              value={request.priority}
              onChange={(e) => handleUpdatePriority(e.target.value as Priority)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>

            {/* Assignee Dropdown */}
            <select
              value={request.assignedStaffId || ''}
              onChange={(e) => handleAssignStaff(e.target.value || null)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="">Unassigned</option>
              {staffUsers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Claude AI Insights Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-900 via-indigo-950 to-slate-950 rounded-3xl p-6 text-white shadow-xl border border-brand-800/40">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-brand-200">
                Claude AI Intelligence Analysis
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 font-bold">
                Category: {request.aiCategory || 'General'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 font-bold">
                Language: {request.aiLanguage || 'English'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 font-bold text-amber-300">
                Sentiment: {request.aiSentiment || 'Neutral'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 text-xs text-slate-200 leading-relaxed whitespace-pre-line">
              <div className="flex items-center justify-between mb-1 text-[11px] font-bold text-brand-300">
                <span>Executive Summary:</span>
                <button
                  onClick={handleAiSummarize}
                  className="hover:underline flex items-center gap-1 text-slate-400 hover:text-white"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Refresh</span>
                </button>
              </div>
              {request.aiSummary || 'AI analysis is currently synthesizing this request specifications...'}
            </div>

            {request.aiNextAction && (
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl">
                <span>👉 Next Recommended Action:</span>
                <span className="text-white">{request.aiNextAction}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={handleAiGenerateQuotation}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-md transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4" />
              <span>Generate AI Quotation Draft</span>
            </button>
            <button
              onClick={() => setMeetingModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-purple-200 bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/50 transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Discovery Call</span>
            </button>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-amber-200 bg-amber-950/50 hover:bg-amber-950/70 border border-amber-800/50 transition-colors flex items-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Issue Milestone Invoice</span>
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Client Profile (Left) + Workspace Tabs (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Client Summary & Project Scope */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Client Profile
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-brand-600 text-white font-extrabold text-lg flex items-center justify-center">
                {request.client.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {request.client.name}
                </h4>
                <span className="text-[11px] text-slate-400">Client Account</span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="font-bold">{request.client.phone}</span>
              </div>
              {request.client.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{request.client.email}</span>
                </div>
              )}
              {request.client.profile?.companyName && (
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4 text-slate-400" />
                  <span>{request.client.profile.companyName}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Bot Integrations
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    request.client.channelLinks?.some((l) => l.channelType === 'TELEGRAM' && l.isVerified)
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  Telegram
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    request.client.channelLinks?.some((l) => l.channelType === 'WHATSAPP' && l.isVerified)
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  WhatsApp
                </span>
              </div>
            </div>
          </div>

          {/* Description & Scope */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              Scope Specifications
            </h3>

            <div className="flex flex-wrap gap-1">
              {request.services.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                >
                  {s.service.title}
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              {request.description}
            </p>

            {request.attachments && request.attachments.length > 0 && (
              <div className="pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Client Attachments ({request.attachments.length}):
                </span>
                <div className="space-y-1.5 mt-1.5">
                  {request.attachments.map((att) => (
                    <a
                      key={att.id}
                      href={`/api/v1/files/download/${att.fileKey}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs hover:border-brand-500"
                    >
                      <span className="truncate">{att.fileName}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-1" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Multi-tab Workspace (Communication, Internal Notes, Payment Verification) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-[750px]">
            {/* Tab Selector */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('CHAT')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'CHAT'
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Client Thread ({clientMessages.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('INTERNAL_NOTES')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'INTERNAL_NOTES'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Team Internal Notes ({internalNotes.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('PAYMENTS')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                    activeTab === 'PAYMENTS'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Payment Receipts ({request.paymentRequests?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {activeTab === 'CHAT' ? (
                clientMessages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    No client messages yet. Use the composer below to begin communication.
                  </div>
                ) : (
                  clientMessages.map((msg) => {
                    const isClient = msg.sender.role === 'CLIENT';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                      >
                        <div className="flex items-center gap-2 mb-1 px-1">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {msg.sender.name}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {msg.sender.role}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {format(new Date(msg.createdAt), 'h:mm a')}
                          </span>
                        </div>

                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            !isClient
                              ? 'bg-brand-600 text-white rounded-br-none'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })
                )
              ) : activeTab === 'INTERNAL_NOTES' ? (
                internalNotes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                    <Lock className="w-8 h-8 text-slate-300 mb-2" />
                    <p>No internal notes recorded. These notes are completely hidden from clients.</p>
                  </div>
                ) : (
                  internalNotes.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200"
                    >
                      <div className="flex items-center justify-between mb-1 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                        <span>Staff Note by {msg.sender.name}</span>
                        <span>{format(new Date(msg.createdAt), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="whitespace-pre-line">{msg.content}</p>
                    </div>
                  ))
                )
              ) : (
                /* Payments Verification Tab */
                <div className="space-y-4">
                  {!request.paymentRequests || request.paymentRequests.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                      No payment requests issued for this ticket yet. Click "Issue Milestone Invoice" above.
                    </div>
                  ) : (
                    request.paymentRequests.map((p) => (
                      <div
                        key={p.id}
                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {p.amount.toLocaleString()} {p.currency}
                            </span>
                            <p className="text-xs text-slate-500">{p.description}</p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>

                        {/* Submitted Proofs */}
                        {p.proofs && p.proofs.length > 0 ? (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Submitted Payment Verification Details:
                            </span>
                            {p.proofs.map((proof) => (
                              <div
                                key={proof.id}
                                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs space-y-2"
                              >
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Payment Channel:</span>
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    {proof.paymentMethod}
                                  </strong>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Transaction Reference:</span>
                                  <strong className="font-mono">{proof.referenceNumber || 'N/A'}</strong>
                                </div>
                                {proof.notes && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">Client Note:</span>
                                    <span>{proof.notes}</span>
                                  </div>
                                )}

                                {proof.receiptAttachment && (
                                  <div className="pt-2">
                                    <a
                                      href={`/api/v1/files/download/${proof.receiptAttachment.fileKey}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 transition-colors"
                                    >
                                      <FileText className="w-4 h-4" />
                                      <span>View Receipt ({proof.receiptAttachment.fileName})</span>
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  </div>
                                )}

                                {/* Admin Action: Verify or Reject */}
                                {p.status === 'PROOF_SUBMITTED' && (
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                      onClick={() => handleVerifyPayment(p.id, true)}
                                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors"
                                    >
                                      Verify & Start Sprint
                                    </button>
                                    <button
                                      onClick={() => {
                                        setVerifyPaymentId(p.id);
                                        setReceiptPreviewModalOpen(true);
                                      }}
                                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                                    >
                                      Reject Proof
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Awaiting client settlement and receipt upload.
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Smart Message Composer Toolbar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {/* AI Draft Reply Buttons in Client's Detected Language */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">AI Drafts:</span>
                  <button
                    onClick={() => handleAiDraftReply('APPROVAL')}
                    disabled={draftingAi}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 border border-brand-200 dark:border-brand-800"
                  >
                    ✨ Approval Notice
                  </button>
                  <button
                    onClick={() => handleAiDraftReply('MEETING')}
                    disabled={draftingAi}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 border border-brand-200 dark:border-brand-800"
                  >
                    ✨ Meeting Invite
                  </button>
                  <button
                    onClick={() => handleAiDraftReply('PAYMENT')}
                    disabled={draftingAi}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 hover:bg-brand-100 border border-brand-200 dark:border-brand-800"
                  >
                    ✨ Payment Details
                  </button>
                </div>

                {/* Canned Templates Dropdown */}
                {templates.length > 0 && (
                  <select
                    onChange={(e) => {
                      const tmpl = templates.find((t) => t.id === e.target.value);
                      if (tmpl) {
                        let text = tmpl.content
                          .replace(/\{\{clientName\}\}/g, request.client.name)
                          .replace(/\{\{requestNumber\}\}/g, request.requestNumber)
                          .replace(/\{\{staffName\}\}/g, user?.name || 'Engineer');
                        setComposerText(text);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                  >
                    <option value="">Insert Canned Template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Text Input & Buttons */}
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  placeholder={
                    activeTab === 'INTERNAL_NOTES'
                      ? 'Write an internal team note (never visible to client)...'
                      : 'Type response to client...'
                  }
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />

                <div className="flex flex-col gap-1.5 justify-end">
                  {activeTab === 'INTERNAL_NOTES' ? (
                    <button
                      onClick={() => handleSendMessage('INTERNAL_NOTE')}
                      disabled={sending || !composerText.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                      Post Note
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage('GENERAL')}
                      disabled={sending || !composerText.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={meetingModalOpen}
        onClose={() => setMeetingModalOpen(false)}
        title="Schedule Discovery Consultation"
        maxWidth="md"
      >
        <form onSubmit={handleScheduleMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Meeting Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Duration (Minutes)
              </label>
              <input
                type="number"
                value={meetingDuration}
                onChange={(e) => setMeetingDuration(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Meeting Format
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="ONLINE">Online Video Call</option>
                <option value="IN_PERSON">In-Person Office (Bole)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Google Meet URL or Office Location *
            </label>
            <input
              type="text"
              required
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-md"
          >
            Dispatch Meeting Invite
          </button>
        </form>
      </Modal>

      {/* Issue Payment Modal */}
      <Modal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        title="Issue Milestone Payment Request"
        maxWidth="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Amount *
              </label>
              <input
                type="number"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="25000"
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Currency
              </label>
              <select
                value={paymentCurrency}
                onChange={(e) => setPaymentCurrency(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              >
                <option value="ETB">ETB (Ethiopian Birr)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Description / Milestone *
            </label>
            <input
              type="text"
              required
              value={paymentDescription}
              onChange={(e) => setPaymentDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Online Payment Gateway Link (Optional)
            </label>
            <input
              type="text"
              placeholder="https://checkout.chapa.co/..."
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-md"
          >
            Issue Invoice to Client
          </button>
        </form>
      </Modal>

      {/* AI Quotation Draft Modal */}
      <Modal
        isOpen={quotationModalOpen}
        onClose={() => setQuotationModalOpen(false)}
        title="AI Generated Project Quotation"
        maxWidth="lg"
      >
        {loadingQuotation ? (
          <div className="py-16 text-center text-xs text-slate-400">
            Synthesizing itemized line items and pricing models...
          </div>
        ) : quotationDraft ? (
          <div className="space-y-4 text-xs">
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
              {quotationDraft.title}
            </h4>

            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold uppercase text-[10px] text-slate-400">
                  <tr>
                    <th className="p-3">Deliverable Scope</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quotationDraft.items?.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="p-3 font-medium">{item.description}</td>
                      <td className="p-3">{item.quantity}</td>
                      <td className="p-3">{item.unitPrice?.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold">
                        {item.total?.toLocaleString()} {quotationDraft.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-xl font-bold">
              <span>Grand Total (incl. 15% VAT):</span>
              <span className="text-base text-brand-600 dark:text-brand-400">
                {quotationDraft.total?.toLocaleString()} {quotationDraft.currency}
              </span>
            </div>

            <button
              onClick={() => {
                setPaymentAmount(quotationDraft.total.toString());
                setPaymentDescription(quotationDraft.title);
                setQuotationModalOpen(false);
                setPaymentModalOpen(true);
              }}
              className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors shadow-md"
            >
              Convert to Formal Payment Invoice
            </button>
          </div>
        ) : null}
      </Modal>

      {/* Reject Payment Proof Modal */}
      <Modal
        isOpen={receiptPreviewModalOpen}
        onClose={() => setReceiptPreviewModalOpen(false)}
        title="Reject Payment Receipt"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Provide a clear explanation for why this payment proof could not be validated (e.g. invalid transaction code, amount mismatch).
          </p>
          <textarea
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Transaction reference not found in Commercial Bank of Ethiopia records. Please verify the 12-digit code."
            className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
          />
          <button
            onClick={() => verifyPaymentId && handleVerifyPayment(verifyPaymentId, false)}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors"
          >
            Confirm Rejection
          </button>
        </div>
      </Modal>
    </div>
  );
};

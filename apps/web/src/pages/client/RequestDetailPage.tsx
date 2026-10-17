import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useRealTime } from '../../context/RealTimeContext';
import {
  fetchRequestById,
  fetchRequestMessages,
  createMessage,
  updateServiceRequest,
} from '../../api/supabaseService';
import { ServiceRequest, Message, PaymentRequest, Meeting } from '../../types';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { StatusTimeline } from '../../components/common/Timeline';
import { Modal } from '../../components/common/Modal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CreditCard,
  Send,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileText,
  Star,
  ExternalLink,
  ShieldCheck,
  Building,
  Sparkles,
  Edit2,
} from 'lucide-react';
import { format } from 'date-fns';

export const RequestDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { subscribe } = useRealTime();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);

  // Edit Request Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Payment Proof Modal State
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [activePaymentRequest, setActivePaymentRequest] = useState<PaymentRequest | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('TELEBIRR');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofNotes, setProofNotes] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  // Meeting Reschedule Modal State
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  // Feedback Modal State
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    try {
      // 1. Try fetching from Supabase directly
      const sbRequest = await fetchRequestById(id);
      if (sbRequest) {
        setRequest(sbRequest);
        const sbMessages = await fetchRequestMessages(id);
        setMessages(sbMessages);
        setLoading(false);
        return;
      }
    } catch (sbErr) {
      console.warn('Supabase fetch failed, trying local API fallback...', sbErr);
    }

    try {
      const [reqRes, msgRes] = await Promise.all([
        api.get(`/requests/${id}`),
        api.get(`/messages/request/${id}`),
      ]);
      setRequest(reqRes.data.data);
      setMessages(msgRes.data.data);
    } catch (err) {
      console.error('Failed to load request details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to live updates for this request room
    const unsubscribeMessage = subscribe('new_message', (data: any) => {
      if (data.requestId === id) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    const unsubscribeStatus = subscribe('request_status_updated', (data: any) => {
      if (data.requestId === id) {
        setRequest((prev) => (prev ? { ...prev, status: data.newStatus } : null));
      }
    });

    const unsubscribePayment = subscribe('payment_verified', (data: any) => {
      if (data.requestId === id) {
        fetchData();
      }
    });

    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
      unsubscribePayment();
    };
  }, [id, subscribe]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !id) return;

    setSending(true);
    try {
      let sentMsg: Message;
      try {
        sentMsg = await createMessage(id, newMessage);
      } catch (sbErr) {
        console.warn('Supabase message create failed, fallback to API:', sbErr);
        const res = await api.post(`/messages/request/${id}`, {
          content: newMessage,
          type: 'GENERAL',
        });
        sentMsg = res.data.data;
      }
      setMessages((prev) => [...prev, sentMsg]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editTitle.trim() || !editDescription.trim()) return;

    setSubmittingEdit(true);
    try {
      const updated = await updateServiceRequest(id, {
        title: editTitle,
        description: editDescription,
      });
      setRequest((prev) => (prev ? { ...prev, title: updated.title, description: updated.description } : updated));
      setEditModalOpen(false);
    } catch (err: any) {
      console.error('Failed to update request:', err);
      alert('Failed to update request details: ' + (err.message || ''));
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleAcceptMeeting = async (meetingId: string) => {
    try {
      await api.post(`/meetings/${meetingId}/respond`, { action: 'ACCEPT' });
      fetchData();
    } catch (err) {
      alert('Could not accept meeting. Please try again.');
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMeeting || !rescheduleReason) return;

    setSubmittingReschedule(true);
    try {
      await api.post(`/meetings/${activeMeeting.id}/respond`, {
        action: 'RESCHEDULE',
        reason: rescheduleReason,
      });
      setRescheduleModalOpen(false);
      setRescheduleReason('');
      fetchData();
    } catch (err) {
      alert('Failed to submit reschedule request');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaymentRequest) return;

    setSubmittingProof(true);
    try {
      let attachmentId: string | undefined = undefined;

      // 1. Upload receipt file if provided
      if (proofFile) {
        const formData = new FormData();
        formData.append('file', proofFile);
        formData.append('serviceRequestId', id!);
        const uploadRes = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        attachmentId = uploadRes.data.data.id;
      }

      // 2. Submit payment proof
      await api.post('/payments/proof', {
        paymentRequestId: activePaymentRequest.id,
        referenceNumber: referenceNumber || undefined,
        amountPaid: parseFloat(amountPaid || activePaymentRequest.amount.toString()),
        paymentMethod,
        receiptAttachmentId: attachmentId,
        notes: proofNotes || undefined,
      });

      setProofModalOpen(false);
      setReferenceNumber('');
      setProofFile(null);
      setProofNotes('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to submit payment proof');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await api.post(`/feedbacks/request/${id}`, {
        rating,
        comment,
      });
      setFeedbackModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center text-slate-400">
        Loading project details...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Request not found</h2>
        <Link to="/portal/dashboard" className="text-brand-600 underline mt-2 block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  // Parse bank details helper
  const parseJson = (text?: string | null) => {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button and Header */}
      <div>
        <Link
          to="/portal/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-brand-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Requests</span>
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                {request.requestNumber}
              </span>
              <PriorityBadge priority={request.priority} />
              <StatusBadge status={request.status} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {request.title}
            </h1>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <button
              onClick={() => {
                setEditTitle(request.title);
                setEditDescription(request.description);
                setEditModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>

            {(request.status === 'COMPLETED' || request.status === 'CLOSED') && !request.feedback && (
              <button
                onClick={() => setFeedbackModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-md flex items-center gap-1.5 transition-all"
              >
                <Star className="w-4 h-4 fill-white" />
                <span>Leave Feedback & Rating</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Progress Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Milestone Progression
        </h3>
        <StatusTimeline currentStatus={request.status} />
      </div>

      {/* Main Grid: Details (Left) + Conversation / Actions (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Request Details & Attachments */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
              Request Information
            </h3>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Selected Services</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {request.services.map((s, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
                  >
                    {s.service.title}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Project Description</span>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                {request.description}
              </p>
            </div>

            {request.budgetRange && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Budget Range</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                  {request.budgetRange}
                </p>
              </div>
            )}

            {request.preferredContactTime && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase">Preferred Time</span>
                <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                  {request.preferredContactTime}
                </p>
              </div>
            )}

            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Submitted On</span>
              <p className="text-xs text-slate-500 mt-0.5">
                {format(new Date(request.createdAt), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>

          {/* Attachments Card */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Uploaded Attachments
              </h3>
              <div className="space-y-2">
                {request.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={`/api/v1/files/download/${att.fileKey}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                      <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                        {att.fileName}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Customer Feedback Card (if already left) */}
          {request.feedback && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-1 text-amber-500 mb-2">
                {[...Array(request.feedback.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
                <span className="text-xs font-bold text-amber-800 dark:text-amber-200 ml-1">
                  Your Review
                </span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-300 italic">
                "{request.feedback.comment}"
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Live Conversation Thread & Interactive Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-[700px]">
            {/* Thread Header */}
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Project Communication Thread
                </h3>
                <p className="text-xs text-slate-400">
                  Direct messages with Zacma Tech engineers & administration
                </p>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {messages.length} messages
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                  <p>No messages yet. Send a message below to reach the engineering team.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  const metadata = parseJson(msg.metadata);

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          {isMe ? 'You' : msg.sender.name}
                        </span>
                        {!isMe && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300">
                            {msg.sender.role}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {format(new Date(msg.createdAt), 'h:mm a')}
                        </span>
                      </div>

                      {/* Regular Message or Specialized Action Cards */}
                      {msg.type === 'MEETING' ? (
                        /* Meeting Card */
                        <div className="w-full max-w-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 shadow-sm text-xs">
                          <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-bold mb-2">
                            <Calendar className="w-4 h-4" />
                            <span>Discovery Consultation Scheduled</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 mb-3">{msg.content}</p>

                          {msg.meeting && (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-purple-900/60 space-y-1.5 mb-3">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Date & Time:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-100">
                                  {format(new Date(msg.meeting.scheduledAt), 'EEE, MMM d, yyyy @ h:mm a')}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Format:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-100">
                                  {msg.meeting.meetingType} ({msg.meeting.durationMinutes} min)
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Location / Link:</span>
                                <span className="font-semibold text-brand-600 dark:text-brand-400 underline">
                                  {msg.meeting.locationOrUrl}
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Status:</span>
                                <span className="font-bold text-purple-600">
                                  {msg.meeting.status}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Meeting Action Buttons */}
                          {msg.meeting?.status === 'SCHEDULED' && (
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => handleAcceptMeeting(msg.meeting!.id)}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
                              >
                                Accept Meeting
                              </button>
                              <button
                                onClick={() => {
                                  setActiveMeeting(msg.meeting!);
                                  setRescheduleModalOpen(true);
                                }}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 hover:bg-slate-50 transition-colors"
                              >
                                Request Reschedule
                              </button>
                            </div>
                          )}
                        </div>
                      ) : msg.type === 'PAYMENT' ? (
                        /* Payment Invoice Card */
                        <div className="w-full max-w-md bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 shadow-sm text-xs">
                          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold mb-2">
                            <CreditCard className="w-4 h-4" />
                            <span>Payment Invoice Issued</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-200 mb-3">{msg.content}</p>

                          {msg.paymentRequest && (
                            <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/60 space-y-2 mb-3">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400">Amount Due:</span>
                                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                  {msg.paymentRequest.amount.toLocaleString()}{' '}
                                  {msg.paymentRequest.currency}
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                  Official Bank & Mobile Money Settlement:
                                </span>
                                <p className="text-slate-700 dark:text-slate-200 font-medium">
                                  • <strong>Telebirr SuperApp:</strong> +251911223344 (Zacma Tech)
                                </p>
                                <p className="text-slate-700 dark:text-slate-200 font-medium">
                                  • <strong>Commercial Bank of Ethiopia:</strong> 1000345678912
                                </p>
                              </div>

                              {msg.paymentRequest.paymentLink && (
                                <a
                                  href={msg.paymentRequest.paymentLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 underline"
                                >
                                  <span>Pay Online via Gateway</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-slate-400">Payment Status:</span>
                                <StatusBadge status={msg.paymentRequest.status} />
                              </div>
                            </div>
                          )}

                          {/* Submit Proof Button */}
                          {(msg.paymentRequest?.status === 'AWAITING_PAYMENT' ||
                            msg.paymentRequest?.status === 'REJECTED') && (
                            <button
                              onClick={() => {
                                setActivePaymentRequest(msg.paymentRequest!);
                                setAmountPaid(msg.paymentRequest!.amount.toString());
                                setProofModalOpen(true);
                              }}
                              className="w-full mt-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors shadow-sm flex items-center justify-center gap-1.5"
                            >
                              <UploadCloud className="w-4 h-4" />
                              <span>Submit Payment Receipt / Reference</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        /* Standard Chat Bubble */
                        <div
                          className={`max-w-md px-4 py-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                            isMe
                              ? 'bg-brand-600 text-white rounded-br-none'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Composer */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message to Zacma Technologies..."
                className="flex-1 px-4 py-3 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-5 py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Payment Proof Upload Modal */}
      <Modal
        isOpen={proofModalOpen}
        onClose={() => setProofModalOpen(false)}
        title="Submit Payment Proof & Receipt"
        maxWidth="md"
      >
        <form onSubmit={handleProofSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            >
              <option value="TELEBIRR">Telebirr SuperApp</option>
              <option value="CBE_BIRR">CBE Birr</option>
              <option value="CBE_TRANSFER">CBE Account Transfer</option>
              <option value="BANK_TRANSFER">Other Bank Wire / Awash</option>
              <option value="OTHER">International Card / Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Amount Paid ({activePaymentRequest?.currency || 'ETB'}) *
              </label>
              <input
                type="number"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Reference / Tx Code
              </label>
              <input
                type="text"
                placeholder="e.g. TB99881122"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Upload Screenshot or Receipt (PDF / Image)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Notes or Transfer Description
            </label>
            <textarea
              rows={2}
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="e.g. Paid via Abebe's Telebirr account ending in 3344"
              className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submittingProof}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-md"
          >
            {submittingProof ? 'Uploading Receipt...' : 'Confirm & Submit Proof'}
          </button>
        </form>
      </Modal>

      {/* Reschedule Meeting Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Request Meeting Reschedule"
        maxWidth="md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Please let our team know why you need to reschedule and your preferred alternative date and time.
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Reason & Preferred Time *
            </label>
            <textarea
              required
              rows={4}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. I have an urgent client call at that time. Could we meet tomorrow afternoon at 3:00 PM instead?"
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={submittingReschedule}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {submittingReschedule ? 'Sending Request...' : 'Submit Reschedule Request'}
          </button>
        </form>
      </Modal>

      {/* Leave Feedback Modal */}
      <Modal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        title="Leave Project Feedback"
        maxWidth="md"
      >
        <form onSubmit={handleFeedbackSubmit} className="space-y-4 text-center">
          <p className="text-xs text-slate-500">
            How satisfied are you with Zacma Technologies' delivery of this project?
          </p>

          <div className="flex justify-center gap-2 py-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="text-left">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Testimonial / Review Comments
            </label>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe your experience working with our team and the impact on your business..."
              className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={submittingFeedback}
            className="w-full py-3 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors shadow-md"
          >
            {submittingFeedback ? 'Submitting Review...' : 'Publish Testimonial'}
          </button>
        </form>
      </Modal>

      {/* Edit Request Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Service Request"
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Project Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Project Description
            </label>
            <textarea
              rows={4}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingEdit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all disabled:opacity-50"
            >
              {submittingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

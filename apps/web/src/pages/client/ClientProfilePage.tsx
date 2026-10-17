import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { User, Phone, Mail, Building, MapPin, Bot, MessageCircle, CheckCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';

export const ClientProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [telegramInstructions, setTelegramInstructions] = useState<string | null>(null);
  const [whatsAppCode, setWhatsAppCode] = useState<string | null>(null);
  const [whatsAppInstructions, setWhatsAppInstructions] = useState<string | null>(null);
  const [loadingChannel, setLoadingChannel] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const telegramLink = user?.channelLinks?.find((l) => l.channelType === 'TELEGRAM' && l.isVerified);
  const whatsAppLink = user?.channelLinks?.find((l) => l.channelType === 'WHATSAPP' && l.isVerified);

  const handleGenerateCode = async (channel: 'TELEGRAM' | 'WHATSAPP') => {
    setLoadingChannel(channel);
    try {
      const res = await api.post(`/auth/link-code/${channel.toLowerCase()}`);
      if (channel === 'TELEGRAM') {
        setTelegramCode(res.data.data.oneTimeCode);
        setTelegramInstructions(res.data.data.instructions);
      } else {
        setWhatsAppCode(res.data.data.oneTimeCode);
        setWhatsAppInstructions(res.data.data.instructions);
      }
    } catch (err) {
      alert('Could not generate linking code');
    } finally {
      setLoadingChannel(null);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Client Profile & Bot Integrations
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your account profile and connect your Telegram & WhatsApp accounts for instant mobile updates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="md:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center mx-auto mb-3 shadow-md">
              {user?.name.charAt(0)}
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{user?.name}</h3>
            <span className="text-xs text-brand-600 dark:text-brand-400 font-semibold">{user?.role}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{user?.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>{user?.email || 'No email registered'}</span>
            </div>
            {user?.profile?.companyName && (
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <Building className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{user.profile.companyName}</span>
              </div>
            )}
            {user?.profile?.address && (
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span>{user.profile.address}, {user.profile.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bot Linking Cards */}
        <div className="md:col-span-2 space-y-6">
          {/* Telegram Linking Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Telegram Bot Integration</h4>
                  <p className="text-[11px] text-slate-500">Receive status alerts and send payment receipts via Telegram</p>
                </div>
              </div>

              {telegramLink ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Linked</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Not Linked
                </span>
              )}
            </div>

            {telegramLink ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                <span>Account linked as Telegram user @{telegramLink.channelUsername || 'client'}. All messages & receipts are synchronized.</span>
                <button onClick={refreshUser} className="text-emerald-700 hover:text-emerald-900 p-1">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Link your account with our Telegram bot to receive real-time approval notices, meeting invites, and upload receipts via photo.
                </p>

                {telegramCode ? (
                  <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">
                      Your One-Time Telegram Linking Code:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-mono font-black text-blue-600 dark:text-blue-400 tracking-widest bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-blue-100 dark:border-blue-900 shadow-inner">
                        {telegramCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(`/link ${telegramCode}`, 'tg')}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copied === 'tg' ? 'Copied!' : 'Copy /link command'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      👉 Open <strong>@ZacmaSupportBot</strong> on Telegram and send:{' '}
                      <code className="font-bold">/link {telegramCode}</code>
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleGenerateCode('TELEGRAM')}
                    disabled={loadingChannel === 'TELEGRAM'}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-500 hover:bg-blue-600 shadow-md transition-all flex items-center gap-2"
                  >
                    <Bot className="w-4 h-4" />
                    <span>{loadingChannel === 'TELEGRAM' ? 'Generating...' : 'Generate Telegram Link Code'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* WhatsApp Linking Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">WhatsApp Cloud API Integration</h4>
                  <p className="text-[11px] text-slate-500">Receive WhatsApp notifications and chat with our AI concierge</p>
                </div>
              </div>

              {whatsAppLink ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Linked</span>
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Not Linked
                </span>
              )}
            </div>

            {whatsAppLink ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200">
                Connected with phone number {whatsAppLink.channelUserId}. Updates will be pushed to your WhatsApp.
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Connect your WhatsApp to receive milestone invoices directly and submit proof of payment instantly.
                </p>

                {whatsAppCode ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                      Your One-Time WhatsApp Linking Code:
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-widest bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900 shadow-inner">
                        {whatsAppCode}
                      </span>
                      <button
                        onClick={() => copyToClipboard(`/link ${whatsAppCode}`, 'wa')}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-emerald-600 hover:bg-emerald-50 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Copy className="w-4 h-4" />
                        <span>{copied === 'wa' ? 'Copied!' : 'Copy /link command'}</span>
                      </button>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200">
                      👉 Send message: <code className="font-bold">/link {whatsAppCode}</code> to our official WhatsApp support number.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => handleGenerateCode('WHATSAPP')}
                    disabled={loadingChannel === 'WHATSAPP'}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{loadingChannel === 'WHATSAPP' ? 'Generating...' : 'Generate WhatsApp Link Code'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

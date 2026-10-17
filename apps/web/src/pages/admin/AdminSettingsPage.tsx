import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings,
  Shield,
  CreditCard,
  UserPlus,
  Clock,
  Sparkles,
  Search,
  CheckCircle2,
  Save,
  AlertTriangle,
  History,
  Building,
  Mail,
  Phone,
  Lock,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { User, AuditLog } from '../../types';

export const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [activeTab, setActiveTab] = useState<'settings' | 'staff' | 'audit'>('settings');

  // 1. Settings state
  const [cbeAccount, setCbeAccount] = useState('');
  const [cbeName, setCbeName] = useState('');
  const [telebirrMerchant, setTelebirrMerchant] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [slaHours, setSlaHours] = useState('24');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // 2. Staff state
  const [isNewStaffModalOpen, setIsNewStaffModalOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'STAFF',
    password: '',
  });
  const [staffError, setStaffError] = useState('');

  // 3. Audit log state
  const [auditSearch, setAuditSearch] = useState('');

  // Fetch system settings
  const { data: settings = {}, isLoading: isSettingsLoading } = useQuery<Record<string, any>>({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      return res.data.data || {};
    },
  });

  // Populate local form once settings load
  React.useEffect(() => {
    if (settings) {
      if (settings.cbe_account) {
        setCbeAccount(settings.cbe_account.accountNumber || '');
        setCbeName(settings.cbe_account.accountName || '');
      }
      if (settings.telebirr_account) {
        setTelebirrMerchant(settings.telebirr_account.accountNumber || settings.telebirr_account.phone || '');
      }
      if (settings.support_contact) {
        setSupportPhone(settings.support_contact.phone || '+251 911 000000');
        setSupportEmail(settings.support_contact.email || 'support@zacmatech.com');
      }
      if (settings.sla_response_hours) {
        setSlaHours(String(settings.sla_response_hours));
      }
      if (settings.ai_auto_analysis !== undefined) {
        setAiEnabled(Boolean(settings.ai_auto_analysis));
      }
    }
  }, [settings]);

  // Fetch staff accounts
  const { data: staffList = [], isLoading: isStaffLoading } = useQuery<User[]>({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const res = await api.get('/users?role=STAFF');
      const staff = res.data.data.users || [];
      const adminRes = await api.get('/users?role=ADMIN');
      const admins = adminRes.data.data.users || [];
      return [...admins, ...staff];
    },
    enabled: isSuperAdmin,
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: isAuditLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/users/audit-logs');
      return res.data.data || [];
    },
    enabled: isSuperAdmin && activeTab === 'audit',
  });

  // Save Settings Mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const res = await api.put(`/settings/${key}`, { value });
      return res.data;
    },
  });

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    try {
      await updateSettingMutation.mutateAsync({
        key: 'cbe_account',
        value: { bankName: 'Commercial Bank of Ethiopia', accountNumber: cbeAccount, accountName: cbeName },
      });
      await updateSettingMutation.mutateAsync({
        key: 'telebirr_account',
        value: { service: 'Telebirr', accountNumber: telebirrMerchant, phone: telebirrMerchant },
      });
      await updateSettingMutation.mutateAsync({
        key: 'support_contact',
        value: { phone: supportPhone, email: supportEmail },
      });
      await updateSettingMutation.mutateAsync({
        key: 'sla_response_hours',
        value: parseInt(slaHours, 10) || 24,
      });
      await updateSettingMutation.mutateAsync({
        key: 'ai_auto_analysis',
        value: aiEnabled,
      });

      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setSaveSuccessMsg('All system configurations updated and applied successfully.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update settings');
    }
  };

  // Create Staff Mutation
  const createStaffMutation = useMutation({
    mutationFn: async (payload: typeof staffForm) => {
      const res = await api.post('/users/staff', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-users'] });
      setIsNewStaffModalOpen(false);
      setStaffForm({ name: '', phone: '', email: '', role: 'STAFF', password: '' });
      setStaffError('');
    },
    onError: (err: any) => {
      setStaffError(err.response?.data?.error?.message || 'Failed to create staff account');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-primary-600" />
          Settings & Administration
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage Ethiopian banking accounts, operational parameters, staff access, and security audit trails.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <CreditCard className="w-4 h-4" /> System & Payments
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => setActiveTab('staff')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'staff'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" /> Staff & Admins
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'audit'
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" /> Audit Trail
            </button>
          </>
        )}
      </div>

      {/* Tab 1: System & Payments */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {saveSuccessMsg && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-800 dark:text-amber-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>You are viewing system configuration in read-only mode. Only SUPER_ADMIN can modify settings.</span>
            </div>
          )}

          {/* Ethiopian Bank Accounts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-emerald-600" />
              Ethiopian Payment Destinations (Client Invoicing)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              These details are automatically displayed to clients whenever an invoice or payment request is issued.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CBE Account Name
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={cbeName}
                  onChange={(e) => setCbeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-60"
                  placeholder="e.g. Zacma Technologies PLC"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CBE Account Number
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={cbeAccount}
                  onChange={(e) => setCbeAccount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono disabled:opacity-60"
                  placeholder="1000123456789"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telebirr Merchant / Phone Number
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={telebirrMerchant}
                  onChange={(e) => setTelebirrMerchant(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono disabled:opacity-60"
                  placeholder="+251911223344 or Merchant ID"
                />
              </div>
            </div>
          </div>

          {/* SLA & AI Preferences */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Automation & SLA Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Default SLA Response Time (Hours)
                </label>
                <input
                  type="number"
                  disabled={!isSuperAdmin}
                  value={slaHours}
                  onChange={(e) => setSlaHours(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-60"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Target response time shown in admin dashboard for incoming requests.
                </span>
              </div>

              <div className="flex flex-col justify-center">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Claude AI Pipeline Status
                </span>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200">
                    Enable automated Claude AI classification, sentiment analysis & draft generation
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Support Contacts */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-sky-600" />
              Public Support Contact Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Support Phone (+251)
                </label>
                <input
                  type="text"
                  disabled={!isSuperAdmin}
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  disabled={!isSuperAdmin}
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={updateSettingMutation.isPending}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                {updateSettingMutation.isPending ? 'Saving...' : 'Save All Settings'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Tab 2: Staff Management */}
      {activeTab === 'staff' && isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Team Access & Permission Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Manage operational staff and system administrators who process client requests.
              </p>
            </div>
            <button
              onClick={() => setIsNewStaffModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Add Team Member
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isStaffLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      Loading staff members...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                        {m.name}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="text-slate-800 dark:text-slate-200">{m.phone}</div>
                        <div className="text-slate-400">{m.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                            m.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : m.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            m.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {m.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Trail */}
      {activeTab === 'audit' && isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-5 h-5 text-primary-600" />
                Immutable System Audit Trail
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Full cryptographic history of administrative actions, status transitions, and payment approvals.
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search action, user, IP..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {isAuditLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Loading audit events...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      No audit events logged yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs
                    .filter((log) => {
                      const term = auditSearch.toLowerCase();
                      return (
                        log.action.toLowerCase().includes(term) ||
                        log.resourceType.toLowerCase().includes(term) ||
                        (log.user?.name && log.user.name.toLowerCase().includes(term)) ||
                        (log.ipAddress && log.ipAddress.includes(term))
                      );
                    })
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white font-sans font-medium">
                          {log.user ? `${log.user.name} (${log.user.role})` : 'System / Anonymous'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded text-[11px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 font-sans">
                          {log.resourceType} {log.resourceId ? `#${log.resourceId.slice(0, 8)}` : ''}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      <Modal
        isOpen={isNewStaffModalOpen}
        onClose={() => setIsNewStaffModalOpen(false)}
        title="Create Operational Account"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createStaffMutation.mutate(staffForm);
          }}
          className="space-y-4 text-sm"
        >
          {staffError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-rose-700 dark:text-rose-300 text-xs">
              {staffError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={staffForm.name}
              onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              placeholder="e.g. Dawit Tadesse"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Phone (+251)
              </label>
              <input
                type="text"
                required
                value={staffForm.phone}
                onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                placeholder="+251911..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={staffForm.email}
                onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                placeholder="staff@zacma.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Assigned Role
              </label>
              <select
                value={staffForm.role}
                onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
              >
                <option value="STAFF">STAFF (Manage Requests & Chat)</option>
                <option value="ADMIN">ADMIN (Full Operational Access)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Temporary Password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={staffForm.password}
                onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                placeholder="Min 8 characters"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewStaffModalOpen(false)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createStaffMutation.isPending}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold"
            >
              {createStaffMutation.isPending ? 'Creating...' : 'Create Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Phone,
  Mail,
  Building,
  Calendar,
  ExternalLink,
  Send,
  Shield,
  FileText,
} from 'lucide-react';
import { api } from '../../api/client';
import { User, Role } from '../../types';
import { Modal } from '../../components/common/Modal';

export const AdminClientsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('CLIENT');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch users list
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['admin-users', roleFilter],
    queryFn: async () => {
      const res = await api.get(`/users?role=${roleFilter}`);
      return res.data.data.users || [];
    },
  });

  // Toggle user active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await api.patch(`/users/${userId}/status`, { isActive });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      if (selectedUser) {
        setSelectedUser((prev) => (prev ? { ...prev, isActive: !prev.isActive } : null));
      }
    },
  });

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.profile?.companyName && u.profile.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-primary-600" />
            Client Directory
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage registered clients, verify identities, view channel linkages and request records.
          </p>
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
            placeholder="Search by name, phone, email, company..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Filter Role:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="CLIENT">Clients Only</option>
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admins</option>
            <option value="">All Accounts</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Client Name / Company</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Role & Verification</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-2"></div>
                    <p>Loading directory...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-medium">No clients found matching the search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {user.name}
                      </div>
                      {user.profile?.companyName ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          {user.profile.companyName}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic">Individual Client</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{user.phone}</span>
                        </div>
                        {user.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-sky-500" />
                            <span>{user.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : user.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                              : user.role === 'STAFF'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.isPhoneVerified ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Phone Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400">
                            Unverified Phone
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {user.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDetailModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 dark:hover:bg-primary-900/60 rounded-lg transition-colors"
                        >
                          View Details
                        </button>
                        <button
                          disabled={toggleActiveMutation.isPending}
                          onClick={() =>
                            toggleActiveMutation.mutate({
                              userId: user.id,
                              isActive: !user.isActive,
                            })
                          }
                          title={user.isActive ? 'Suspend User' : 'Reactivate User'}
                          className={`p-1.5 rounded-lg border text-xs transition-colors ${
                            user.isActive
                              ? 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:hover:bg-rose-950/50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/60 dark:hover:bg-emerald-950/50'
                          }`}
                        >
                          {user.isActive ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Client Profile: ${selectedUser.name}`}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs text-slate-400 block">Full Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.name}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Role</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.role}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Phone Number</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.phone}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Email</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.email || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">Company Name</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.profile?.companyName || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 block">City / Address</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {selectedUser.profile?.city || selectedUser.profile?.address || 'Addis Ababa'}
                </span>
              </div>
            </div>

            {/* Channels & Linked Bots */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                Connected Messaging Channels
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xs">
                    TG
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-sky-950 dark:text-sky-200">Telegram</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {selectedUser.profile?.telegramUsername
                        ? `@${selectedUser.profile.telegramUsername}`
                        : 'Not Linked'}
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs">
                    WA
                  </div>
                  <div className="text-xs">
                    <p className="font-semibold text-emerald-950 dark:text-emerald-200">WhatsApp</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      {selectedUser.profile?.whatsappPhone || 'Not Linked'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() =>
                  toggleActiveMutation.mutate({
                    userId: selectedUser.id,
                    isActive: !selectedUser.isActive,
                  })
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedUser.isActive
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                }`}
              >
                {selectedUser.isActive ? 'Suspend Account' : 'Reactivate Account'}
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-lg text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

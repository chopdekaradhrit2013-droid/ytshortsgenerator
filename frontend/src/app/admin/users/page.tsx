"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  Shield,
  ShieldAlert,
  Ban,
  CheckCircle,
  Eye,
  RotateCw,
  AlertTriangle,
  X,
  CreditCard,
  Film,
  Coins,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  adminListUsersApi,
  adminGetUserDetailApi,
  adminUpdateUserStatusApi,
  adminUpdateUserRoleApi
} from '@/lib/api';
import { AdminUserListItem, AdminUserDetails } from '@/types';
import { useApp } from '@/context/AppContext';

function UsersManagementContent() {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get('search') || '';

  const { user: currentAdmin, addNotification } = useApp();

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Modals
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetails | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [statusModalUser, setStatusModalUser] = useState<AdminUserListItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<'suspended' | 'disabled' | 'active'>('suspended');
  const [statusReason, setStatusReason] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [roleModalUser, setRoleModalUser] = useState<AdminUserListItem | null>(null);
  const [targetRole, setTargetRole] = useState<'creator' | 'support_agent' | 'admin' | 'super_admin'>('creator');
  const [roleUpdating, setRoleUpdating] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminListUsersApi({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
        limit: 50
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load user directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, planFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleInspectUser = async (userId: string) => {
    setLoadingDetail(true);
    try {
      const details = await adminGetUserDetailApi(userId);
      setSelectedUserDetail(details);
    } catch (err: any) {
      addNotification("Error", err.message || "Could not retrieve user details.", "error");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUser) return;
    if (targetStatus !== 'active' && !statusReason.trim()) {
      addNotification("Validation Error", "A reason is mandatory for suspension or deactivation.", "error");
      return;
    }

    setStatusUpdating(true);
    try {
      await adminUpdateUserStatusApi(statusModalUser.id, targetStatus, statusReason.trim() || "Administrative reactivation");
      addNotification("Account Updated", `Account status changed to ${targetStatus}.`, "success");
      setStatusModalUser(null);
      setStatusReason('');
      fetchUsers();
    } catch (err: any) {
      addNotification("Update Failed", err.message, "error");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;

    setRoleUpdating(true);
    try {
      await adminUpdateUserRoleApi(roleModalUser.id, targetRole);
      addNotification("Role Reassigned", `User role elevated/changed to ${targetRole}.`, "success");
      setRoleModalUser(null);
      fetchUsers();
    } catch (err: any) {
      addNotification("Role Update Failed", err.message, "error");
    } finally {
      setRoleUpdating(false);
    }
  };

  const isSuperAdmin = currentAdmin?.role === 'super_admin';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">User Directory & RBAC</h1>
          <p className="text-xs text-gray-400 mt-1">
            Search, inspect profiles, manage subscription quotas, and enforce account suspensions.
          </p>
        </div>
        <div className="text-xs font-mono text-gray-400 px-3 py-1.5 rounded-xl bg-[#0E131F] border border-[#1B2338]">
          Total Registered: <span className="font-bold text-white">{total}</span>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="p-4 rounded-2xl bg-[#0D111A] border border-[#192236] flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or username..."
            className="w-full pl-10 pr-24 py-2 rounded-xl bg-[#131926] border border-[#202940] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* ROLE FILTER */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Roles</option>
            <option value="creator">Creator</option>
            <option value="support_agent">Support Agent</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* STATUS FILTER */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="disabled">Disabled</option>
          </select>

          {/* PLAN FILTER */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Plans</option>
            <option value="free">Free Starter</option>
            <option value="creator">Creator Pro</option>
            <option value="pro">Viral Agency</option>
            <option value="enterprise">Enterprise</option>
          </select>

          {(search || roleFilter || statusFilter || planFilter) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setStatusFilter('');
                setPlanFilter('');
              }}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={fetchUsers} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-2">
            <RotateCw className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
            <p className="text-xs text-gray-500">Querying registered user ledger...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Users className="w-8 h-8 text-gray-600 mx-auto" />
            <p className="text-sm font-semibold text-gray-300">No users match filter criteria</p>
            <p className="text-xs text-gray-500">Try loosening your search terms or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#181F30] text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-bold">Creator</th>
                  <th className="pb-3 font-bold">Role</th>
                  <th className="pb-3 font-bold">Plan</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Credits</th>
                  <th className="pb-3 font-bold">Usage</th>
                  <th className="pb-3 font-bold">Channel</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151B2A]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#111624] transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold shrink-0 text-[11px]">
                          {u.full_name?.charAt(0) || u.email?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white leading-tight">{u.full_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        u.role === 'super_admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                        u.role === 'admin' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                        u.role === 'support_agent' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        'bg-gray-800/80 text-gray-400 border border-gray-700/50'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3 font-semibold text-gray-300">
                      <span className="capitalize">{u.plan?.name || 'Free Starter'}</span>
                    </td>

                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                        u.account_status === 'suspended' ? 'text-amber-400' :
                        u.account_status === 'disabled' ? 'text-red-400' : 'text-emerald-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          u.account_status === 'suspended' ? 'bg-amber-400' :
                          u.account_status === 'disabled' ? 'bg-red-400' : 'bg-emerald-400'
                        }`} />
                        <span className="capitalize">{u.account_status || 'active'}</span>
                      </span>
                    </td>

                    <td className="py-3 font-mono font-bold text-purple-300">
                      {u.usage?.credits_balance ?? 100}
                    </td>

                    <td className="py-3 text-gray-400 text-[11px]">
                      <span>{u.usage?.video_minutes_used || 0}m</span>
                      <span className="text-gray-600 mx-1">/</span>
                      <span>{u.usage?.clips_generated || 0} clips</span>
                    </td>

                    <td className="py-3 text-gray-400 text-[11px] truncate max-w-[120px]">
                      {u.connected_channel ? (
                        <span className="text-red-400 font-semibold">{u.connected_channel}</span>
                      ) : (
                        <span className="text-gray-600">None</span>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* INSPECT */}
                        <button
                          type="button"
                          onClick={() => handleInspectUser(u.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#171F32] transition-colors"
                          title="Inspect User Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* SUSPEND / REACTIVATE */}
                        {u.account_status === 'active' || !u.account_status ? (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalUser(u);
                              setTargetStatus('suspended');
                              setStatusReason('');
                            }}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                            title="Suspend User Account"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setStatusModalUser(u);
                              setTargetStatus('active');
                              setStatusReason('Administrative reactivation');
                            }}
                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                            title="Reactivate User Account"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* ROLE REASSIGNMENT (Super Admin only) */}
                        {isSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setRoleModalUser(u);
                              setTargetRole(u.role as any);
                            }}
                            className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                            title="Reassign Role"
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: INSPECT USER DETAILS */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2236] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-sm">
                  {selectedUserDetail.user.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedUserDetail.user.full_name}</h3>
                  <p className="text-xs text-gray-400 font-mono">{selectedUserDetail.user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* STATS STRIP */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#141A28] border border-[#202940]">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Plan</span>
                <span className="text-white font-semibold mt-0.5 block capitalize">{selectedUserDetail.subscription.plan_name}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141A28] border border-[#202940]">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Status</span>
                <span className="text-emerald-400 font-bold mt-0.5 block capitalize">{selectedUserDetail.user.account_status}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141A28] border border-[#202940]">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Credits</span>
                <span className="text-purple-300 font-mono font-bold mt-0.5 block">{selectedUserDetail.usage.credits_balance}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#141A28] border border-[#202940]">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Role</span>
                <span className="text-amber-400 font-mono font-bold mt-0.5 block uppercase">{selectedUserDetail.user.role}</span>
              </div>
            </div>

            {/* CONNECTED CHANNEL */}
            <div className="p-4 rounded-xl bg-[#141A28] border border-[#202940] space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Connected YouTube Channel</span>
              {selectedUserDetail.connected_channel ? (
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-white">{selectedUserDetail.connected_channel.channel_title}</p>
                    <p className="text-[11px] text-gray-400 font-mono">ID: {selectedUserDetail.connected_channel.channel_id}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-[11px] font-bold">
                    {selectedUserDetail.connected_channel.subscriber_count?.toLocaleString()} subs
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No YouTube channel currently connected.</p>
              )}
            </div>

            {/* USAGE METERS */}
            <div className="p-4 rounded-xl bg-[#141A28] border border-[#202940] space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Quota Consumption This Cycle</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <span className="text-gray-400 text-[10px] block">Video Minutes</span>
                  <span className="font-mono text-white font-bold">{selectedUserDetail.usage.video_minutes_used}m</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Clips Made</span>
                  <span className="font-mono text-white font-bold">{selectedUserDetail.usage.clips_generated}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Thumbnails</span>
                  <span className="font-mono text-white font-bold">{selectedUserDetail.usage.thumbnails_used}</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Exports</span>
                  <span className="font-mono text-white font-bold">{selectedUserDetail.usage.exports_used}</span>
                </div>
              </div>
            </div>

            {/* RECENT PROJECTS */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Recent Creator Projects</span>
              {selectedUserDetail.recent_projects.length === 0 ? (
                <p className="text-xs text-gray-500">No projects generated yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {selectedUserDetail.recent_projects.map((p) => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-[#121622] border border-[#1C2337] flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white truncate max-w-sm">{p.name}</p>
                        <p className="text-[10px] text-gray-500">{new Date(p.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                        {p.clip_count} clips
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#1A2236] hover:bg-[#222C46] text-white text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SUSPEND / REACTIVATE STATUS */}
      {statusModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                targetStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {targetStatus === 'active' ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-white capitalize">{targetStatus} Account</h3>
                <p className="text-xs text-gray-400">{statusModalUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleStatusSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Target Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="active">Active (Full Access)</option>
                  <option value="suspended">Suspended (Access Halted)</option>
                  <option value="disabled">Disabled (Deactivated)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">
                  Mandatory Audit Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Explain why this account status is being modified..."
                  required
                  rows={3}
                  className="w-full p-3 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatusModalUser(null)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusUpdating || (!statusReason.trim() && targetStatus !== 'active')}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all disabled:opacity-50 ${
                    targetStatus === 'active' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {statusUpdating ? 'Updating...' : `Confirm ${targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ROLE ASSIGNMENT (Super Admin only) */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Reassign Staff Role</h3>
                <p className="text-xs text-gray-400">{roleModalUser.email}</p>
              </div>
            </div>

            <form onSubmit={handleRoleSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Administrative Role</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500 capitalize"
                >
                  <option value="creator">Creator (Standard Customer)</option>
                  <option value="support_agent">Support Agent (Read-only Inspection)</option>
                  <option value="admin">Administrator (Operations & Credits)</option>
                  <option value="super_admin">Super Admin (Full Root Access)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 text-[11px] text-purple-300 leading-relaxed">
                Super Admins can configure platform-wide settings and reassign roles. Admins manage users, jobs, and credits. Support Agents have inspection access only.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRoleModalUser(null)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={roleUpdating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {roleUpdating ? 'Reassigning...' : 'Confirm Role Elevation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500 text-xs">Loading user management...</div>}>
      <UsersManagementContent />
    </Suspense>
  );
}


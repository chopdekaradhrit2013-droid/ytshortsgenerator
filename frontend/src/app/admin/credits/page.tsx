"use client";

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Plus,
  Minus,
  RotateCw,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
  Sliders,
  DollarSign
} from 'lucide-react';
import {
  adminListUsersApi,
  adminAdjustCreditsApi,
  adminListCreditAdjustmentsApi
} from '@/lib/api';
import { AdminCreditAdjustment } from '@/types';
import { useApp } from '@/context/AppContext';

export default function AdminCreditsPage() {
  const { addNotification } = useApp();

  const [adjustments, setAdjustments] = useState<AdminCreditAdjustment[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedUserId, setSelectedUserId] = useState('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct' | 'correction' | 'promotional'>('promotional');
  const [amount, setAmount] = useState<number>(50);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [adjRes, usersRes] = await Promise.all([
        adminListCreditAdjustmentsApi(undefined, 50),
        adminListUsersApi({ limit: 100 })
      ]);
      setAdjustments(adjRes.adjustments || []);
      setUsersList(usersRes.users || []);
      if (usersRes.users?.length > 0 && !selectedUserId) {
        setSelectedUserId(usersRes.users[0].id);
      }
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load credits ledger.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !reason.trim() || amount <= 0) {
      addNotification("Validation", "Please select a user, enter positive amount, and specify a reason.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminAdjustCreditsApi({
        user_id: selectedUserId,
        adjustment_type: adjustmentType,
        amount,
        reason: reason.trim()
      });
      addNotification("Credits Adjusted", res.message || "Auditable credit transaction logged.", "success");
      setReason('');
      loadData();
    } catch (err: any) {
      addNotification("Adjustment Failed", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedUserObj = usersList.find((u) => u.id === selectedUserId);
  const currentBalance = selectedUserObj?.usage?.credits_balance ?? 100;
  const simulatedAfter =
    adjustmentType === 'add' || adjustmentType === 'promotional'
      ? currentBalance + amount
      : adjustmentType === 'deduct'
      ? Math.max(0, currentBalance - amount)
      : Math.max(0, amount);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Credit & Quota Management</h1>
        <p className="text-xs text-gray-400 mt-1">
          Perform immutable credit grants, deductions, and auditable balance corrections with mandatory justifications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ADJUSTMENT CONSOLE FORM */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Manual Credit Console</h2>
              <p className="text-[11px] text-gray-400">Strictly auditable ledger entry</p>
            </div>
          </div>

          <form onSubmit={handleAdjustSubmit} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Target User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
              >
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Operation Type</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAdjustmentType('promotional')}
                  className={`py-2 px-2.5 rounded-xl border font-semibold text-left transition-all ${
                    adjustmentType === 'promotional'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-300'
                      : 'bg-[#141A28] border-[#202940] text-gray-400'
                  }`}
                >
                  Promotional
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('add')}
                  className={`py-2 px-2.5 rounded-xl border font-semibold text-left transition-all ${
                    adjustmentType === 'add'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#141A28] border-[#202940] text-gray-400'
                  }`}
                >
                  Manual Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('deduct')}
                  className={`py-2 px-2.5 rounded-xl border font-semibold text-left transition-all ${
                    adjustmentType === 'deduct'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                      : 'bg-[#141A28] border-[#202940] text-gray-400'
                  }`}
                >
                  Debit / Deduct
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustmentType('correction')}
                  className={`py-2 px-2.5 rounded-xl border font-semibold text-left transition-all ${
                    adjustmentType === 'correction'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-[#141A28] border-[#202940] text-gray-400'
                  }`}
                >
                  Set Absolute
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">Amount</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 0))}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* LIVE PREVIEW CARD */}
            <div className="p-3 rounded-xl bg-[#121622] border border-[#1E263D] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Current Balance</span>
                <span className="font-mono text-gray-300 font-bold">{currentBalance} credits</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-purple-400 uppercase font-bold block">New Projected Balance</span>
                <span className="font-mono text-purple-300 font-bold text-sm">{simulatedAfter} credits</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-gray-300">
                Auditable Justification <span className="text-red-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain the operational reason for this adjustment..."
                required
                minLength={5}
                rows={2}
                className="w-full p-2.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !reason.trim()}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Logging Audit Transaction...</span>
                </>
              ) : (
                <>
                  <span>Commit Credit Adjustment</span>
                  <Coins className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* RECENT ADJUSTMENTS TABLE */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Immutable Credit Adjustments Ledger</h2>
            <p className="text-xs text-gray-400 mt-0.5">Historical record of staff manual interventions and promotional grants.</p>
          </div>

          {loading ? (
            <div className="py-16 text-center text-xs text-gray-500">
              <RotateCw className="w-5 h-5 animate-spin mx-auto text-purple-500 mb-2" />
              <span>Loading ledger...</span>
            </div>
          ) : adjustments.length === 0 ? (
            <p className="text-xs text-gray-500 py-12 text-center">No manual adjustments on record.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#181F30] text-gray-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-bold">User</th>
                    <th className="pb-3 font-bold">Type</th>
                    <th className="pb-3 font-bold">Amount</th>
                    <th className="pb-3 font-bold">Balance Delta</th>
                    <th className="pb-3 font-bold">Reason</th>
                    <th className="pb-3 font-bold text-right">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#151B2A]">
                  {adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-[#111624] transition-colors">
                      <td className="py-3">
                        <span className="font-semibold text-white block">{a.user_name || 'Creator'}</span>
                        <span className="text-[10px] text-gray-500 font-mono">{a.user_email}</span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          a.adjustment_type === 'promotional' ? 'bg-purple-500/20 text-purple-300' :
                          a.adjustment_type === 'add' ? 'bg-emerald-500/20 text-emerald-300' :
                          a.adjustment_type === 'deduct' ? 'bg-amber-500/20 text-amber-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {a.adjustment_type}
                        </span>
                      </td>
                      <td className="py-3 font-mono font-bold text-white">
                        {a.adjustment_type === 'deduct' ? `-${a.amount}` : `+${a.amount}`}
                      </td>
                      <td className="py-3 text-[11px] font-mono text-gray-400">
                        {a.balance_before} → <span className="text-white font-bold">{a.balance_after}</span>
                      </td>
                      <td className="py-3 text-gray-300 text-[11px] max-w-xs truncate" title={a.reason}>
                        {a.reason}
                      </td>
                      <td className="py-3 text-right text-[10px] text-gray-400 font-mono">
                        {a.admin_email}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


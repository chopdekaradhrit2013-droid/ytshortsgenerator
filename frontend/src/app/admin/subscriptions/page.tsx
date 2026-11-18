"use client";

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Edit2,
  Check,
  X,
  RotateCw,
  AlertCircle,
  Coins,
  CheckCircle2,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  adminListSubscriptionsApi,
  listSubscriptionPlansApi,
  adminCreatePlanApi,
  adminUpdatePlanApi
} from '@/lib/api';
import { SubscriptionPlan } from '@/types';
import { useApp } from '@/context/AppContext';

export default function AdminSubscriptionsPage() {
  const { addNotification } = useApp();

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subStatusFilter, setSubStatusFilter] = useState('');

  // Modals
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Form states
  const [planForm, setPlanForm] = useState({
    name: '',
    slug: '',
    description: '',
    price_monthly: 29,
    price_yearly: 290,
    monthly_video_minutes: 120,
    monthly_clips_limit: 100,
    monthly_ai_analysis_limit: 50,
    monthly_thumbnails_limit: 100,
    monthly_exports_limit: 100,
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, plansRes] = await Promise.all([
        adminListSubscriptionsApi(subStatusFilter || undefined, 50),
        listSubscriptionPlansApi()
      ]);
      setSubscriptions(subsRes.subscriptions || []);
      setPlans(plansRes || []);
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load subscriptions data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subStatusFilter]);

  const handleOpenEdit = (p: SubscriptionPlan) => {
    setEditingPlan(p);
    setPlanForm({
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      price_monthly: p.price_monthly,
      price_yearly: p.price_yearly,
      monthly_video_minutes: p.monthly_video_minutes,
      monthly_clips_limit: p.monthly_clips_limit,
      monthly_ai_analysis_limit: p.monthly_ai_analysis_limit,
      monthly_thumbnails_limit: p.monthly_thumbnails_limit,
      monthly_exports_limit: p.monthly_exports_limit,
      is_active: p.is_active ?? true
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setSavingPlan(true);
    try {
      await adminUpdatePlanApi(editingPlan.id, planForm);
      addNotification("Plan Updated", `Successfully saved updates to ${planForm.name}.`, "success");
      setEditingPlan(null);
      loadData();
    } catch (err: any) {
      addNotification("Update Failed", err.message, "error");
    } finally {
      setSavingPlan(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlan(true);
    try {
      await adminCreatePlanApi({
        ...planForm,
        included_features: ["basic_editing", "standard_exports", "ai_subtitles", "youtube_publishing"]
      });
      addNotification("Plan Created", `Created tier ${planForm.name}.`, "success");
      setCreatingPlan(false);
      loadData();
    } catch (err: any) {
      addNotification("Creation Failed", err.message, "error");
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Subscriptions & Plans Management</h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure dynamic commercial tiers, pricing models, quota ceilings, and monitor active subscriber statuses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setPlanForm({
              name: '',
              slug: '',
              description: '',
              price_monthly: 39,
              price_yearly: 390,
              monthly_video_minutes: 150,
              monthly_clips_limit: 120,
              monthly_ai_analysis_limit: 60,
              monthly_thumbnails_limit: 120,
              monthly_exports_limit: 100,
              is_active: true
            });
            setCreatingPlan(true);
          }}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Tier</span>
        </button>
      </div>

      {/* PLAN CARDS GRID */}
      <div>
        <h2 className="text-sm font-bold text-white uppercase tracking-wider text-[11px] mb-3">
          Configured Subscription Plans ({plans.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((p) => (
            <div
              key={p.id}
              className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] hover:border-purple-500/40 transition-all space-y-4 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                    {p.slug}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(p)}
                    className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#161D2E] transition-colors"
                    title="Edit Plan Config"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white mt-2">{p.name}</h3>
                <p className="text-[11px] text-gray-400 line-clamp-2 mt-1">{p.description}</p>

                <div className="mt-3 pt-3 border-t border-[#161D2E] space-y-1.5 text-xs">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-white font-mono">${p.price_monthly}</span>
                    <span className="text-[10px] text-gray-500">/mo (${p.price_yearly}/yr)</span>
                  </div>
                  <div className="text-[11px] text-gray-400 space-y-1 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Processing Minutes:</span>
                      <span className="font-semibold text-white font-mono">{p.monthly_video_minutes}m</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Clips Limit:</span>
                      <span className="font-semibold text-white font-mono">{p.monthly_clips_limit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">AI Analyses:</span>
                      <span className="font-semibold text-white font-mono">{p.monthly_ai_analysis_limit}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#161D2E] flex items-center justify-between text-[11px]">
                <span className="text-gray-500">Features: {p.included_features?.length || 0}</span>
                <span className={`inline-flex items-center gap-1 font-bold ${p.is_active ? 'text-emerald-400' : 'text-gray-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  <span>{p.is_active ? 'Active' : 'Disabled'}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ALL ACTIVE SUBSCRIPTIONS TABLE */}
      <div className="p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Active Customer Subscriptions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Live subscription instances mapped to creator accounts.</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={subStatusFilter}
              onChange={(e) => setSubStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="past_due">Past Due</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-gray-500">
            <RotateCw className="w-5 h-5 animate-spin mx-auto text-purple-500 mb-2" />
            <span>Loading subscriptions...</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <p className="text-xs text-gray-500 py-8 text-center">No subscriptions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#181F30] text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-bold">Customer</th>
                  <th className="pb-3 font-bold">Plan Tier</th>
                  <th className="pb-3 font-bold">Cadence</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Period End</th>
                  <th className="pb-3 font-bold">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151B2A]">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#111624] transition-colors">
                    <td className="py-3">
                      <div className="font-semibold text-white">{s.full_name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{s.email}</div>
                    </td>
                    <td className="py-3 font-semibold text-purple-300 capitalize">
                      {s.plan_name}
                    </td>
                    <td className="py-3 text-gray-400 uppercase text-[10px] font-mono">
                      {s.billing_interval}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${
                        s.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          s.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'
                        }`} />
                        <span className="capitalize">{s.status}</span>
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 font-mono text-[11px]">
                      {new Date(s.current_period_end).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-300 text-[11px] font-mono">
                      {s.payment_method_brand ? `${s.payment_method_brand} •••• ${s.payment_method_last4}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: EDIT OR CREATE PLAN */}
      {(editingPlan || creatingPlan) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1A2236] pb-3">
              <h3 className="text-base font-bold text-white">
                {creatingPlan ? 'Create New Subscription Plan' : `Edit ${editingPlan?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(null);
                  setCreatingPlan(false);
                }}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={creatingPlan ? handleCreatePlan : handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Plan Name</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Slug</label>
                  <input
                    type="text"
                    value={planForm.slug}
                    onChange={(e) => setPlanForm({ ...planForm, slug: e.target.value })}
                    disabled={!creatingPlan}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500 disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Description</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Monthly Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planForm.price_monthly}
                    onChange={(e) => setPlanForm({ ...planForm, price_monthly: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Yearly Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planForm.price_yearly}
                    onChange={(e) => setPlanForm({ ...planForm, price_yearly: parseFloat(e.target.value) || 0 })}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-300">Video Minutes</label>
                  <input
                    type="number"
                    value={planForm.monthly_video_minutes}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_video_minutes: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-300">Clips Limit</label>
                  <input
                    type="number"
                    value={planForm.monthly_clips_limit}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_clips_limit: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-300">AI Analyses</label>
                  <input
                    type="number"
                    value={planForm.monthly_ai_analysis_limit}
                    onChange={(e) => setPlanForm({ ...planForm, monthly_ai_analysis_limit: parseInt(e.target.value) || 0 })}
                    required
                    className="w-full px-2.5 py-1.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditingPlan(null);
                    setCreatingPlan(false);
                  }}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {savingPlan ? 'Saving...' : creatingPlan ? 'Create Plan' : 'Save Plan Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


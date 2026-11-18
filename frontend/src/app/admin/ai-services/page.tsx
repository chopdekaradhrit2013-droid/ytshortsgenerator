"use client";

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Sliders,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Activity,
  Layers,
  X,
  Edit2
} from 'lucide-react';
import { adminListAIServicesApi, adminUpdateAIServiceApi } from '@/lib/api';
import { AdminAIService } from '@/types';
import { useApp } from '@/context/AppContext';

export default function AdminAIServicesPage() {
  const { addNotification } = useApp();

  const [services, setServices] = useState<AdminAIService[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editingService, setEditingService] = useState<AdminAIService | null>(null);
  const [formModel, setFormModel] = useState('');
  const [formBudget, setFormBudget] = useState(5000);
  const [formSpendLimit, setFormSpendLimit] = useState(500.0);
  const [formStatus, setFormStatus] = useState<'active' | 'degraded' | 'maintenance' | 'disabled'>('active');
  const [formEnabled, setFormEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await adminListAIServicesApi();
      setServices(res || []);
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load AI services.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleOpenEdit = (s: AdminAIService) => {
    setEditingService(s);
    setFormModel(s.model_name);
    setFormBudget(s.daily_request_budget);
    setFormSpendLimit(s.monthly_spend_limit_usd);
    setFormStatus(s.status);
    setFormEnabled(s.is_enabled);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;

    setSaving(true);
    try {
      await adminUpdateAIServiceApi(editingService.service_key, {
        model_name: formModel,
        daily_request_budget: formBudget,
        monthly_spend_limit_usd: formSpendLimit,
        status: formStatus,
        is_enabled: formEnabled
      });
      addNotification("AI Pipeline Updated", `Saved settings for ${editingService.service_name}.`, "success");
      setEditingService(null);
      loadServices();
    } catch (err: any) {
      addNotification("Update Failed", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">AI Services Control Center</h1>
          <p className="text-xs text-gray-400 mt-1">
            Configure model versions, request budgets, spend limits, and monitor inference latency across AI pipelines.
          </p>
        </div>

        <button
          type="button"
          onClick={loadServices}
          className="px-3.5 py-2 rounded-xl bg-[#121724] hover:bg-[#1A2234] border border-[#202940] text-gray-300 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </button>
      </div>

      {/* SERVICES GRID */}
      {loading ? (
        <div className="py-20 text-center space-y-2">
          <RotateCw className="w-6 h-6 animate-spin text-purple-500 mx-auto" />
          <p className="text-xs text-gray-500">Connecting to AI telemetry bus...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded border border-gray-700/50">
                    {s.provider}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    s.status === 'active' && s.is_enabled
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' && s.is_enabled ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    <span>{s.is_enabled ? s.status : 'disabled'}</span>
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mt-3">{s.service_name}</h3>
                <p className="text-xs text-purple-300 font-mono mt-0.5">{s.model_name}</p>

                <div className="mt-4 pt-3 border-t border-[#161D2E] grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#121622] border border-[#1B2338]">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Latency</span>
                    <span className="font-mono text-white font-bold text-xs mt-0.5 block flex items-center gap-1">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{s.latency_ms} ms</span>
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#121622] border border-[#1B2338]">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Est. Spend</span>
                    <span className="font-mono text-emerald-300 font-bold text-xs mt-0.5 block flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-400" />
                      <span>${s.estimated_spend_usd.toFixed(2)}</span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-[11px] text-gray-400">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Daily Budget:</span>
                    <span className="font-mono text-white font-semibold">{s.daily_request_budget.toLocaleString()} reqs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Requests:</span>
                    <span className="font-mono text-white font-semibold">{s.total_requests_count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Failed Calls:</span>
                    <span className={`font-mono font-semibold ${s.failed_requests_count > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {s.failed_requests_count}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">API Key Mask:</span>
                    <span className="font-mono text-gray-400 text-[10px]">{s.api_key_masked}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-[#161D2E]">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(s)}
                  className="w-full py-2 rounded-xl bg-[#141A28] hover:bg-[#1B2337] border border-[#202940] text-gray-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Configure Pipeline</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT CONFIG MODAL */}
      {editingService && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2236] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Configure {editingService.service_name}</h3>
                <p className="text-xs text-gray-400 font-mono">{editingService.provider}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Model Name / Checkpoint</label>
                <input
                  type="text"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Daily Req Budget</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(parseInt(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300">Spend Limit ($/mo)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formSpendLimit}
                    onChange={(e) => setFormSpendLimit(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Pipeline Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500 capitalize"
                >
                  <option value="active">Active (Operational)</option>
                  <option value="degraded">Degraded (High Latency)</option>
                  <option value="maintenance">Maintenance (Queue Paused)</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="enabledCheckbox"
                  checked={formEnabled}
                  onChange={(e) => setFormEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-[#141A28] border-[#202940]"
                />
                <label htmlFor="enabledCheckbox" className="text-xs text-gray-300 font-semibold cursor-pointer">
                  Service Enabled for Platform
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Pipeline Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


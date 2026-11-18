"use client";

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  HardDrive,
  Layers,
  Cpu,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { adminGetSystemHealthApi } from '@/lib/api';
import { SystemHealthReport } from '@/types';
import { useApp } from '@/context/AppContext';

export default function AdminHealthPage() {
  const { addNotification } = useApp();

  const [health, setHealth] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);

  const runCheck = async () => {
    setRunningDiagnostic(true);
    try {
      const res = await adminGetSystemHealthApi();
      setHealth(res);
      addNotification("Diagnostics Complete", "Live system integrity verified.", "success");
    } catch (err: any) {
      addNotification("Diagnostic Failed", err.message, "error");
    } finally {
      setLoading(false);
      setRunningDiagnostic(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
        <p className="text-xs text-gray-400">Pinging backend diagnostic probes...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/30 text-center space-y-3 max-w-md mx-auto my-12">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-xs text-red-300">Failed to connect to health diagnostics endpoint.</p>
        <button
          type="button"
          onClick={runCheck}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
        >
          Retry Diagnostic
        </button>
      </div>
    );
  }

  const isHealthy = health.overall_status === 'healthy';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">System Health & Diagnostics</h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time automated probing of SQLite database latency, media storage, queues, and AI providers.
          </p>
        </div>

        <button
          type="button"
          onClick={runCheck}
          disabled={runningDiagnostic}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${runningDiagnostic ? 'animate-spin' : ''}`} />
          <span>{runningDiagnostic ? 'Probing Services...' : 'Run Live Diagnostic'}</span>
        </button>
      </div>

      {/* OVERALL STATUS BANNER */}
      <div className={`p-6 rounded-2xl border flex items-center justify-between ${
        isHealthy
          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
          : 'bg-amber-950/20 border-amber-500/30 text-amber-300'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            isHealthy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {isHealthy ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">
              Platform Status: {health.overall_status}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              All essential SaaS microservices and databases are reporting active telemetry.
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block text-xs font-mono text-gray-400">
          <span>Last Checked: {new Date(health.checked_at).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* 5 DIAGNOSTIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* DATABASE */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Database Engine</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
              {health.services.database.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span>Engine:</span>
              <span className="font-mono text-white font-semibold">{health.services.database.engine}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Query Latency:</span>
              <span className="font-mono text-emerald-400 font-bold">{health.services.database.latency_ms} ms</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>PRAGMA Integrity:</span>
              <span className="font-mono text-emerald-300 font-bold uppercase">{health.services.database.integrity}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#161D2E] text-[11px] text-gray-500 space-y-1 font-mono">
            <p>Users: {health.services.database.table_counts?.users || 0} rows</p>
            <p>Projects: {health.services.database.table_counts?.projects || 0} rows</p>
            <p>Clips: {health.services.database.table_counts?.generated_clips || 0} rows</p>
          </div>
        </div>

        {/* STORAGE */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <HardDrive className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Media Storage</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
              {health.services.storage.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span>Available Capacity:</span>
              <span className="font-mono text-white font-bold">{health.services.storage.free_gb} GB</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Total Volume:</span>
              <span className="font-mono text-gray-300">{health.services.storage.total_gb} GB</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Percent Free:</span>
              <span className="font-mono text-purple-300 font-bold">{health.services.storage.percent_free}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#161D2E] text-[10px] text-gray-500 font-mono truncate">
            Path: {health.services.storage.path || './media_storage'}
          </div>
        </div>

        {/* PROCESSING QUEUE */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Processing Queue</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
              {health.services.queue.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span>Active Background Workers:</span>
              <span className="font-mono text-emerald-400 font-bold">{health.services.queue.active_workers} online</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>In-Flight Processing:</span>
              <span className="font-mono text-white font-bold">{health.services.queue.processing_jobs}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Pending in Queue:</span>
              <span className="font-mono text-purple-300 font-bold">{health.services.queue.queued_jobs}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Failed in Last 24h:</span>
              <span className={`font-mono font-bold ${health.services.queue.failed_24h > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {health.services.queue.failed_24h}
              </span>
            </div>
          </div>
        </div>

        {/* AI PIPELINES */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">AI Services Reachability</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
              {health.services.ai_pipelines.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span>Configured Pipelines:</span>
              <span className="font-mono text-white font-bold">{health.services.ai_pipelines.total_configured}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Active Endpoints:</span>
              <span className="font-mono text-emerald-400 font-bold">{health.services.ai_pipelines.active_services} / 5</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Avg Pipeline Latency:</span>
              <span className="font-mono text-purple-300 font-bold">{health.services.ai_pipelines.avg_latency_ms} ms</span>
            </div>
          </div>
        </div>

        {/* YOUTUBE DATA API */}
        <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">YouTube Integration</h3>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
              {health.services.youtube_api.status}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-400">
              <span>API Version:</span>
              <span className="font-mono text-white font-bold">{health.services.youtube_api.api_version}</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>OAuth 2.0 Config:</span>
              <span className="font-mono text-emerald-400 font-bold">Authenticated</span>
            </div>
            <div className="flex items-center justify-between text-gray-400">
              <span>Daily Quota Consumed:</span>
              <span className="font-mono text-purple-300 font-bold">{health.services.youtube_api.daily_quota_used_pct}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


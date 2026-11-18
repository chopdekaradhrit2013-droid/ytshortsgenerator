"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  Search,
  Filter,
  RotateCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Ban,
  X,
  FileText
} from 'lucide-react';
import {
  adminListJobsApi,
  adminRetryJobApi,
  adminCancelJobApi
} from '@/lib/api';
import { AdminProcessingJob } from '@/types';
import { useApp } from '@/context/AppContext';

function VideoJobsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || '';

  const { addNotification } = useApp();

  const [jobs, setJobs] = useState<AdminProcessingJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');

  // Modals
  const [inspectJob, setInspectJob] = useState<AdminProcessingJob | null>(null);
  const [cancellingJob, setCancellingJob] = useState<AdminProcessingJob | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by administrator');
  const [actionLoading, setActionLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await adminListJobsApi({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
        limit: 50
      });
      setJobs(res.jobs || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load processing jobs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const handleRetry = async (jobId: string) => {
    setActionLoading(true);
    try {
      await adminRetryJobApi(jobId);
      addNotification("Job Re-queued", `Job ${jobId} has been queued for re-processing.`, "success");
      loadJobs();
    } catch (err: any) {
      addNotification("Retry Failed", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingJob) return;

    setActionLoading(true);
    try {
      await adminCancelJobApi(cancellingJob.id, cancelReason);
      addNotification("Job Cancelled", `Job ${cancellingJob.id} has been halted.`, "success");
      setCancellingJob(null);
      loadJobs();
    } catch (err: any) {
      addNotification("Cancellation Failed", err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Video Processing Pipeline</h1>
          <p className="text-xs text-gray-400 mt-1">
            Monitor background highlight analyses, Whisper transcriptions, stuck workers, and job retries.
          </p>
        </div>

        <button
          type="button"
          onClick={loadJobs}
          className="px-3.5 py-2 rounded-xl bg-[#121724] hover:bg-[#1A2234] border border-[#202940] text-gray-300 text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="p-4 rounded-2xl bg-[#0D111A] border border-[#192236] flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={(e) => { e.preventDefault(); loadJobs(); }} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job ID, project name, or owner email..."
            className="w-full pl-10 pr-24 py-2 rounded-xl bg-[#131926] border border-[#202940] text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px]"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#131926] border border-[#202940] text-gray-300 text-xs focus:outline-none focus:border-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* JOBS TABLE */}
      <div className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            <RotateCw className="w-5 h-5 animate-spin mx-auto text-purple-500 mb-2" />
            <span>Polling processing queues...</span>
          </div>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-gray-500 py-12 text-center">No processing jobs match current filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#181F30] text-gray-500 uppercase tracking-wider text-[10px]">
                  <th className="pb-3 font-bold">Job ID & Project</th>
                  <th className="pb-3 font-bold">Owner</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold">Stage</th>
                  <th className="pb-3 font-bold">Progress</th>
                  <th className="pb-3 font-bold">Created</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151B2A]">
                {jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-[#111624] transition-colors">
                    <td className="py-3">
                      <span className="font-semibold text-white block max-w-xs truncate">{j.project_name}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{j.id}</span>
                    </td>
                    <td className="py-3 text-gray-400 font-mono text-[11px]">
                      {j.owner_email || 'System'}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        j.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                        j.status === 'processing' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                        j.status === 'queued' ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' :
                        'bg-red-500/15 text-red-300 border-red-500/30'
                      }`}>
                        <span>{j.status}</span>
                      </span>
                    </td>
                    <td className="py-3 text-gray-300 capitalize text-[11px]">
                      {j.stage.replace('_', ' ')}
                    </td>
                    <td className="py-3">
                      <div className="w-24 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                          <span>{j.progress_percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#1A2234] overflow-hidden">
                          <div
                            className={`h-full ${j.status === 'failed' ? 'bg-red-500' : 'bg-purple-600'}`}
                            style={{ width: `${j.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-gray-400 font-mono text-[10px]">
                      {new Date(j.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* DIAGNOSTICS */}
                        {j.error_message && (
                          <button
                            type="button"
                            onClick={() => setInspectJob(j)}
                            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            title="Inspect Error Log"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* RETRY */}
                        {(j.status === 'failed' || j.status === 'cancelled') && (
                          <button
                            type="button"
                            onClick={() => handleRetry(j.id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                            title="Retry Processing Job"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* CANCEL */}
                        {(j.status === 'queued' || j.status === 'processing') && (
                          <button
                            type="button"
                            onClick={() => setCancellingJob(j)}
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                            title="Cancel Job"
                          >
                            <Ban className="w-3.5 h-3.5" />
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

      {/* ERROR INSPECTION MODAL */}
      {inspectJob && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2236] pb-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Job Diagnostic Traceback</span>
              </div>
              <button type="button" onClick={() => setInspectJob(null)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#141A28] border border-[#202940] space-y-1 font-mono text-[11px]">
                <p><span className="text-gray-500">Job ID:</span> <span className="text-white">{inspectJob.id}</span></p>
                <p><span className="text-gray-500">Project:</span> <span className="text-white">{inspectJob.project_name}</span></p>
                <p><span className="text-gray-500">Stage:</span> <span className="text-amber-400">{inspectJob.stage}</span></p>
              </div>

              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/30 text-red-300 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                {inspectJob.error_message || "No stacktrace recorded."}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const id = inspectJob.id;
                  setInspectJob(null);
                  handleRetry(id);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                Retry Job Now
              </button>
              <button
                type="button"
                onClick={() => setInspectJob(null)}
                className="px-4 py-2 rounded-xl bg-[#141A28] hover:bg-[#1B2338] text-gray-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancellingJob && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cancel Processing Job</h3>
                <p className="text-xs text-gray-400 font-mono">{cancellingJob.id}</p>
              </div>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block">Cancellation Reason</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  required
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCancellingJob(null)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideoJobsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-gray-500 text-xs">Loading processing jobs...</div>}>
      <VideoJobsContent />
    </Suspense>
  );
}


"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Globe,
  Lock,
  EyeOff,
  Upload,
  Play,
  ExternalLink,
  RotateCw,
  Plus,
  SlidersHorizontal,
  Info,
  Check
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';
import { VisibilityType, PublishingStatus } from '@/types';

export default function PublishingCentrePage() {
  const {
    publishingJobs,
    startUploadJob,
    startAllUploads,
    retryJob,
    connectedChannel,
    toggleChannelConnection,
    addNotification,
    clips
  } = useApp();

  const [selectedJobId, setSelectedJobId] = useState<string | null>(publishingJobs[0]?.id || null);
  const [selectedVisibility, setSelectedVisibility] = useState<VisibilityType>("public");
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [isScheduling, setIsScheduling] = useState<boolean>(false);

  const selectedJob = publishingJobs.find(j => j.id === selectedJobId) || publishingJobs[0];

  const waitingJobsCount = publishingJobs.filter(j => j.status === 'waiting').length;
  const publishedJobsCount = publishingJobs.filter(j => j.status === 'published').length;

  const renderStatusPill = (status: PublishingStatus, percentage: number) => {
    switch (status) {
      case 'published':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Published</span>
          </span>
        );
      case 'uploading':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1 animate-pulse">
            <Upload className="w-3 h-3" />
            <span>Uploading ({percentage}%)</span>
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1 animate-pulse">
            <RotateCw className="w-3 h-3 animate-spin" />
            <span>YouTube Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Waiting in Queue</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. CHANNEL CONNECTION & METRICS HEADER */}
      <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-2">
              <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
              <span>OFFICIAL YOUTUBE DATA API V3 INTEGRATION</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Publishing Centre & Shorts Scheduler
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              One-click multi-upload to your connected YouTube channel with automated metadata, tags & hashtags.
            </p>
          </div>

          {/* CHANNEL STATUS PILL / CONNECT BUTTON */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-[#0A0C10] border border-[#23293A]">
              <div className="relative">
                <img
                  src={connectedChannel.avatar_url}
                  alt={connectedChannel.channel_name}
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <span
                  className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0A0C10] ${
                    connectedChannel.connected ? 'bg-emerald-500' : 'bg-gray-500'
                  }`}
                />
              </div>
              <div className="text-left pr-2">
                <p className="text-xs font-bold text-white leading-tight">
                  {connectedChannel.connected ? connectedChannel.channel_name : "No Channel Connected"}
                </p>
                <p className="text-[11px] text-gray-400">
                  {connectedChannel.connected
                    ? `${(connectedChannel.subscribers / 1000).toFixed(1)}K subscribers • OAuth Active`
                    : "YouTube OAuth not configured"}
                </p>
              </div>
            </div>

            <button
              onClick={toggleChannelConnection}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                connectedChannel.connected
                  ? 'bg-[#1C2130] text-gray-300 hover:text-red-400 hover:bg-red-950/20 border border-[#2A3144]'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/30'
              }`}
            >
              {connectedChannel.connected ? "Disconnect" : "Connect YouTube Account"}
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#1C2130] text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333]">
            <span className="text-gray-400">Pending Upload Queue</span>
            <span className="font-extrabold text-amber-400 text-base">{waitingJobsCount} Shorts</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333]">
            <span className="text-gray-400">Published This Week</span>
            <span className="font-extrabold text-emerald-400 text-base">{publishedJobsCount} Shorts</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333]">
            <span className="text-gray-400">API Quota Usage</span>
            <span className="font-extrabold text-purple-400 text-base">3,200 / 10,000 pts</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN PUBLISHING QUEUE & METADATA EDITOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: PUBLISHING QUEUE & BULK BAR */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-purple-400" />
              <span>Shorts Upload Queue ({publishingJobs.length})</span>
            </h2>

            <button
              onClick={startAllUploads}
              disabled={waitingJobsCount === 0 || !connectedChannel.connected}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                waitingJobsCount > 0 && connectedChannel.connected
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-glow-purple active:scale-95'
                  : 'bg-[#1C2130] text-gray-500 cursor-not-allowed'
              }`}
            >
              <Upload className="w-4 h-4" />
              <span>Upload All Pending ({waitingJobsCount})</span>
            </button>
          </div>

          {/* JOBS LIST */}
          <div className="space-y-3">
            {publishingJobs.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected
                      ? 'bg-[#161B29] border-purple-500 shadow-md'
                      : 'bg-[#12151E] border-[#23293A] hover:bg-[#161A26]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                      <img
                        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
                        alt="Short preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/80 text-[8px] font-mono px-1 rounded text-white">
                        9:16
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-xs truncate max-w-md">
                        {job.video_title}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">
                        {job.video_description}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        {renderStatusPill(job.status, job.progress_percentage)}
                        
                        <span className="text-[10px] text-gray-500 font-mono">
                          {job.visibility.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {job.status === 'published' && job.platform_url ? (
                      <a
                        href={job.platform_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#1C2130] hover:bg-[#252C40] text-emerald-400 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Watch Short</span>
                      </a>
                    ) : job.status === 'waiting' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startUploadJob(job.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Now</span>
                      </button>
                    ) : job.status === 'uploading' ? (
                      <span className="text-xs font-semibold text-blue-400">
                        Uploading {job.progress_percentage}%...
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          retryJob(job.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-950/40 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT 1 COL: METADATA & SCHEDULE INSPECTOR */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#12151E] border border-[#23293A] space-y-5">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>YouTube Video Metadata</span>
              <span className="text-[11px] text-purple-400">SEO Optimized</span>
            </h3>

            {/* VIDEO TITLE */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400">
                Short Title (With #Shorts)
              </label>
              <input
                type="text"
                value={selectedJob ? selectedJob.video_title : ""}
                onChange={(e) => {
                  if (selectedJob) selectedJob.video_title = e.target.value;
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400">
                Video Description
              </label>
              <textarea
                rows={3}
                value={selectedJob ? selectedJob.video_description : ""}
                onChange={(e) => {
                  if (selectedJob) selectedJob.video_description = e.target.value;
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* VISIBILITY SELECTOR */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400">
                Visibility Setting
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "public", label: "Public", icon: Globe },
                  { id: "unlisted", label: "Unlisted", icon: EyeOff },
                  { id: "private", label: "Private", icon: Lock },
                ].map((vis) => {
                  const Icon = vis.icon;
                  return (
                    <button
                      key={vis.id}
                      type="button"
                      onClick={() => setSelectedVisibility(vis.id as VisibilityType)}
                      className={`p-2 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                        selectedVisibility === vis.id
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-[#0A0C10] border-[#23293A] text-gray-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{vis.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SCHEDULING INTERFACE */}
            <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>Schedule For Later</span>
                </span>
                <input
                  type="checkbox"
                  checked={isScheduling}
                  onChange={() => setIsScheduling(!isScheduling)}
                  className="w-4 h-4 rounded text-purple-600"
                />
              </div>

              {isScheduling && (
                <div className="space-y-2 pt-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#12151E] border border-[#23293A] text-white text-xs"
                  />
                  <p className="text-[10px] text-gray-500">
                    YouTube will automatically release this Short at the specified time.
                  </p>
                </div>
              )}
            </div>

            {/* INTEGRATION NOTICE */}
            <div className="p-3.5 rounded-xl bg-[#12151E] border border-[#23293A] text-xs text-gray-400 space-y-1">
              <div className="flex items-center gap-1.5 text-white font-bold">
                <Info className="w-3.5 h-3.5 text-purple-400" />
                <span>Production Upload Ready</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Connect your YouTube Studio credentials via <code className="text-purple-300">YOUTUBE_CLIENT_ID</code> in environment settings for production OAuth token authorization.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

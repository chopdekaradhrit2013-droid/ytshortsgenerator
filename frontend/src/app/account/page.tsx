"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  User,
  Sparkles,
  CreditCard,
  Zap,
  Clock,
  Film,
  Type,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Edit3,
  Calendar,
  Layers,
  HardDrive,
  RotateCw,
  LogOut,
  FolderOpen,
  Megaphone
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';
import { updateProfileApi, getUsageSummaryApi, getUserAnnouncementsApi } from '@/lib/api';

export default function AccountDashboardPage() {
  const {
    user,
    subscription,
    usageSummary,
    connectedChannel,
    projects,
    logout,
    refreshAuthData,
    addNotification
  } = useApp();

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setUsername(user.username);
    }
    getUserAnnouncementsApi().then((data) => {
      if (Array.isArray(data)) setAnnouncements(data);
    }).catch(() => {});
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileApi({ full_name: fullName, username });
      await refreshAuthData();
      setIsEditingProfile(false);
      addNotification("Profile Updated", "Your account details were saved successfully.", "success");
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const planName = subscription?.plan_name || user?.plan_name || "Creator Pro";
  const planSlug = subscription?.plan_slug || user?.plan_slug || "pro";
  const subStatus = subscription?.status || "active";
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Active';

  const metrics = usageSummary?.metrics;
  const creditsBalance = usageSummary?.credits_balance ?? 120;
  const daysRemaining = usageSummary?.cycle?.days_remaining ?? 28;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 0. PLATFORM ANNOUNCEMENTS BANNER */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-lg ${
                ann.priority === 'critical' ? 'bg-red-950/30 border-red-500/40 text-red-200' :
                ann.priority === 'high' ? 'bg-amber-950/30 border-amber-500/40 text-amber-200' :
                'bg-purple-950/30 border-purple-500/30 text-purple-200'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${
                ann.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                ann.priority === 'high' ? 'bg-amber-500/20 text-amber-400' :
                'bg-purple-500/20 text-purple-400'
              }`}>
                <Megaphone className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white tracking-tight">{ann.title}</h3>
                  <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.2 rounded bg-black/40">
                    {ann.type}
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{ann.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. TOP WELCOME & PROFILE HEADER */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#141824] via-[#161C2C] to-[#121622] border border-[#21283B] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            {user?.avatar_url && !user.avatar_url.includes('unsplash') ? (
              <img
                src={user.avatar_url}
                alt={user?.full_name || "User Avatar"}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-500/40 shadow-lg shadow-purple-500/20"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-xl font-black text-white border-2 border-purple-400/40 shadow-lg shadow-purple-500/20 select-none">
                {user?.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AC'}
              </div>
            )}
            {user?.is_verified && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#12151E] flex items-center justify-center text-white" title="Verified Creator">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">
                {user?.full_name || "Adhrit Chopdekar"}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                {planName}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                subStatus === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {subStatus}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <span>@{user?.username || 'adhrit'}</span>
              <span>•</span>
              <span>{user?.email || 'adhrit@shortsfactory.io'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center">
          <button
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="px-3.5 py-2 rounded-xl bg-[#1D2335] hover:bg-[#252D44] border border-[#2B344D] text-xs font-semibold text-gray-200 flex items-center gap-2 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5 text-purple-400" />
            <span>Edit Profile</span>
          </button>

          <Link
            href="/pricing"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Upgrade Plan</span>
          </Link>
        </div>
      </div>

      {/* EDIT PROFILE DRAWER */}
      {isEditingProfile && (
        <form onSubmit={handleSaveProfile} className="p-5 rounded-2xl bg-[#12151E] border border-purple-500/30 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-purple-400" />
              <span>Update Creator Profile</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsEditingProfile(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              {savingProfile ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      )}

      {/* 2. SUBSCRIPTION OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CURRENT PLAN */}
        <div className="p-5 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-purple-400" />
              Active Subscription
            </span>
            <span className="text-white font-bold">{subscription?.billing_interval === 'yearly' ? 'Annual' : 'Monthly'}</span>
          </div>

          <div>
            <div className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{planName}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {planSlug === 'free' ? 'Standard free quota' : 'Unlimited cloud presets & publishing'}
            </p>
          </div>

          <div className="pt-2 border-t border-[#1C2130] flex items-center justify-between text-xs">
            <span className="text-gray-400">Next renewal: <strong className="text-gray-200">{renewalDate}</strong></span>
            <Link href="/billing" className="text-purple-400 hover:underline font-semibold text-[11px]">
              Manage Billing →
            </Link>
          </div>
        </div>

        {/* REMAINING CREDITS */}
        <div className="p-5 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Studio Credits Balance
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono text-[10px]">
              Resets in {daysRemaining} days
            </span>
          </div>

          <div>
            <div className="text-3xl font-black text-white tracking-tight font-mono">
              {creditsBalance} <span className="text-sm font-normal text-gray-400">credits</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Used for priority highlight detection & 4K exports
            </p>
          </div>

          <div className="pt-2 border-t border-[#1C2130] flex items-center justify-between text-xs">
            <span className="text-gray-400">Monthly renewal: <strong className="text-gray-200">Full Refresh</strong></span>
            <Link href="/pricing" className="text-amber-400 hover:underline font-semibold text-[11px]">
              Get More Credits →
            </Link>
          </div>
        </div>

        {/* CONNECTED CHANNEL */}
        <div className="p-5 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              Publishing Channel
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              connectedChannel.connected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-zinc-500/15 text-zinc-400'
            }`}>
              {connectedChannel.connected ? 'Connected' : 'Not Connected'}
            </span>
          </div>

          {connectedChannel.connected ? (
            <div className="flex items-center gap-3">
              {connectedChannel.avatar_url && !connectedChannel.avatar_url.includes('unsplash') ? (
                <img
                  src={connectedChannel.avatar_url}
                  alt="Channel Avatar"
                  className="w-10 h-10 rounded-xl object-cover border border-[#272E42]"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  {connectedChannel.channel_name ? connectedChannel.channel_name.slice(0, 2).toUpperCase() : 'YT'}
                </div>
              )}
              <div className="truncate">
                <p className="text-sm font-bold text-white truncate">{connectedChannel.channel_name}</p>
                <p className="text-[11px] text-gray-400">
                  {connectedChannel.subscribers > 0 ? `${connectedChannel.subscribers.toLocaleString()} subscribers` : 'Ready to publish'}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-1">
              <p className="text-xs text-gray-400">No YouTube channel linked.</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Link your channel to auto-publish Shorts.</p>
            </div>
          )}

          <div className="pt-2 border-t border-[#1C2130] flex items-center justify-between text-xs">
            <span className="text-gray-400">Status: <strong className={connectedChannel.connected ? "text-emerald-400" : "text-gray-400"}>{connectedChannel.connected ? "Active" : "Unlinked"}</strong></span>
            <Link href="/publishing" className="text-purple-400 hover:underline font-semibold text-[11px]">
              {connectedChannel.connected ? "Publishing Hub →" : "Connect Channel →"}
            </Link>
          </div>
        </div>
      </div>

      {/* 3. VISUAL USAGE & LIMIT METERS */}
      <div className="p-6 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1C2130]">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <span>Monthly Usage & Resource Limits</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Server-validated resource consumption for current billing cycle (Ends in {daysRemaining} days).
            </p>
          </div>

          <Link
            href="/pricing"
            className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-colors self-start sm:self-center"
          >
            Increase Limits
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* 1. VIDEO MINUTES */}
          <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                Video Ingestion Minutes
              </span>
              <span className="font-mono font-bold text-white">
                {metrics?.video_processing_minutes.used ?? 32.5} / {metrics?.video_processing_minutes.limit ?? 120} m
              </span>
            </div>
            <div className="h-2 w-full bg-[#181D2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.video_processing_minutes.percentage ?? 27}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{metrics?.video_processing_minutes.percentage ?? 27}% utilized</span>
              <span className="text-gray-400 font-medium">{metrics?.video_processing_minutes.remaining ?? 87.5} mins remaining</span>
            </div>
          </div>

          {/* 2. AI CLIP GENERATIONS */}
          <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5 text-blue-400" />
                AI Shorts Rendered
              </span>
              <span className="font-mono font-bold text-white">
                {metrics?.ai_clip_generations.used ?? 24} / {metrics?.ai_clip_generations.limit ?? 100}
              </span>
            </div>
            <div className="h-2 w-full bg-[#181D2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.ai_clip_generations.percentage ?? 24}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{metrics?.ai_clip_generations.percentage ?? 24}% utilized</span>
              <span className="text-gray-400 font-medium">{metrics?.ai_clip_generations.remaining ?? 76} clips left</span>
            </div>
          </div>

          {/* 3. HIGHLIGHT ANALYSES */}
          <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                AI Highlight Analyses
              </span>
              <span className="font-mono font-bold text-white">
                {metrics?.ai_analysis_requests.used ?? 12} / {metrics?.ai_analysis_requests.limit ?? 50}
              </span>
            </div>
            <div className="h-2 w-full bg-[#181D2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.ai_analysis_requests.percentage ?? 24}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{metrics?.ai_analysis_requests.percentage ?? 24}% utilized</span>
              <span className="text-gray-400 font-medium">{metrics?.ai_analysis_requests.remaining ?? 38} requests left</span>
            </div>
          </div>

          {/* 4. THUMBNAIL GENERATIONS */}
          <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                AI Thumbnails & Covers
              </span>
              <span className="font-mono font-bold text-white">
                {metrics?.thumbnail_generations.used ?? 18} / {metrics?.thumbnail_generations.limit ?? 100}
              </span>
            </div>
            <div className="h-2 w-full bg-[#181D2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.thumbnail_generations.percentage ?? 18}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{metrics?.thumbnail_generations.percentage ?? 18}% utilized</span>
              <span className="text-gray-400 font-medium">{metrics?.thumbnail_generations.remaining ?? 82} remaining</span>
            </div>
          </div>

          {/* 5. EXPORT OPERATIONS */}
          <div className="p-4 rounded-xl bg-[#0E1119] border border-[#1E2436] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-rose-400" />
                HQ Video Exports
              </span>
              <span className="font-mono font-bold text-white">
                {metrics?.export_operations.used ?? 14} / {metrics?.export_operations.limit ?? 80}
              </span>
            </div>
            <div className="h-2 w-full bg-[#181D2B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-500"
                style={{ width: `${metrics?.export_operations.percentage ?? 17.5}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{metrics?.export_operations.percentage ?? 17.5}% utilized</span>
              <span className="text-gray-400 font-medium">{metrics?.export_operations.remaining ?? 66} exports left</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENT PROJECTS & QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECENT PROJECTS */}
        <div className="p-6 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C2130]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-purple-400" />
              <span>My Recent Projects</span>
            </h3>
            <Link href="/projects" className="text-xs text-purple-400 hover:underline font-semibold">
              View All ({projects.length}) →
            </Link>
          </div>

          <div className="space-y-2.5">
            {projects.slice(0, 3).map((p) => (
              <div
                key={p.id}
                className="p-3 rounded-xl bg-[#161B29] border border-[#23293D] hover:border-purple-500/40 transition-colors flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 truncate">
                  <img
                    src={p.thumbnail_url || "https://images.unsplash.com/photo-1589254065878-42c9da997008?w=600&auto=format&fit=crop&q=80"}
                    alt={p.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-white truncate">{p.name}</h4>
                    <p className="text-[10px] text-gray-400 capitalize">{p.category} • {p.clip_count} clips ready</p>
                  </div>
                </div>

                <Link
                  href={`/generator?project=${p.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[#20263B] hover:bg-purple-600 text-gray-200 hover:text-white text-[11px] font-semibold transition-colors flex-shrink-0"
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* UPGRADE RECOMMENDATIONS */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#161B29] to-[#12151E] border border-purple-500/30 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Recommended Upgrade</span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Unlock Viral Agency Pro & Competitor Intelligence
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Scale to 500 processing minutes, 400 AI Shorts, competitor gap benchmarking, 4K 60FPS exports, and priority cloud queues.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div>
              <span className="text-2xl font-black text-white">$79</span>
              <span className="text-xs text-gray-400"> / month</span>
            </div>

            <Link
              href="/pricing"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-[0.99]"
            >
              <span>Explore Pro Plan</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}


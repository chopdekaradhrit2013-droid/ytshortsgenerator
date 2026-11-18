"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar as CalendarIcon,
  Globe,
  Lock,
  EyeOff,
  Upload,
  Play,
  Pause,
  ExternalLink,
  RotateCw,
  Plus,
  SlidersHorizontal,
  Info,
  Check,
  Sparkles,
  Trash2,
  Edit3,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Layers,
  Film,
  Tag,
  Hash,
  Users,
  Wifi,
  WifiOff,
  Copy,
  X,
  RefreshCw,
  Video,
  Image as ImageIcon
} from 'lucide-react';
import { ThumbnailStudioModal } from '@/components/studio/ThumbnailStudioModal';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';
import { VisibilityType, PublishingStatus, GeneratedClip, PublishingJob } from '@/types';
import {
  fetchChannelStatusApi,
  disconnectChannelApi,
  connectDemoChannelApi,
  fetchPublishingJobsApi,
  createPublishingJobApi,
  updatePublishingJobApi,
  deletePublishingJobApi,
  startPublishingJobUploadApi,
  retryPublishingJobApi,
  suggestSEOMetadataApi,
  batchPublishShortsApi,
  fetchPublishingCalendarApi,
  resolveMediaUrl,
  ChannelStatusResponse,
  CalendarDayEntry
} from '@/lib/api';

type ActiveTab = 'studio' | 'queue' | 'calendar' | 'history';

export default function PublishingCentrePage() {
  const { clips, addNotification } = useApp();

  // Tab State
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');

  // Channel Connection State
  const [channel, setChannel] = useState<ChannelStatusResponse>({
    connected: true,
    channel_name: "AI Shorts Factory Studios",
    channel_id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    subscribers: 148500,
    avatar_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80",
    auth_mode: "mock_demo"
  });
  const [channelLoading, setChannelLoading] = useState(false);

  // Jobs State
  const [jobs, setJobs] = useState<PublishingJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Calendar State
  const [calendarEntries, setCalendarEntries] = useState<CalendarDayEntry[]>([]);
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Upload Studio Form State
  const [selectedClipId, setSelectedClipId] = useState<string>(clips[0]?.id || "");
  const [videoTitle, setVideoTitle] = useState<string>("The Secret AGI Timeline Nobody Speaks About #Shorts");
  const [videoDescription, setVideoDescription] = useState<string>(
    "Top AI lab insiders reveal the timeline towards artificial superintelligence.\n\nSubscribe for daily AI breakthroughs.\n#Shorts #AGI #ArtificialIntelligence #TechTrends"
  );
  const [hashtags, setHashtags] = useState<string[]>(["#Shorts", "#AGI", "#Tech", "#Viral"]);
  const [newHashtagInput, setNewHashtagInput] = useState<string>("");
  const [tags, setTags] = useState<string[]>(["Shorts", "AGI", "AI", "Technology", "Future"]);
  const [newTagInput, setNewTagInput] = useState<string>("");
  const [visibility, setVisibility] = useState<VisibilityType>("public");
  const [isScheduled, setIsScheduled] = useState<boolean>(false);
  const [scheduleDate, setScheduleDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [scheduleTime, setScheduleTime] = useState<string>("18:00");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [audienceMadeForKids, setAudienceMadeForKids] = useState<boolean>(false);
  const [seoSuggestions, setSeoSuggestions] = useState<string[]>([]);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Inspection & Editing Modal for Existing Job
  const [inspectJob, setInspectJob] = useState<PublishingJob | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Batch Publish Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchSelectedClips, setBatchSelectedClips] = useState<string[]>([]);
  const [batchIntervalHours, setBatchIntervalHours] = useState<number>(4);
  const [batchVisibility, setBatchVisibility] = useState<VisibilityType>("public");
  const [isBatchScheduling, setIsBatchScheduling] = useState(false);

  // Thumbnail Studio Modal
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);

  // Filter & Search State for History & Queue
  const [searchQuery, setSearchQuery] = useState("");
  const [historyVisibilityFilter, setHistoryVisibilityFilter] = useState<string>("all");
  const [queuePaused, setQueuePaused] = useState(false);

  // Active clip preview
  const activeClip = useMemo(() => {
    return clips.find(c => c.id === selectedClipId) || clips[0];
  }, [clips, selectedClipId]);

  // Load Channel & Jobs on mount
  useEffect(() => {
    loadChannelStatus();
    loadJobs();
    loadCalendar();
  }, []);

  // Update selected clip title if available
  useEffect(() => {
    if (activeClip) {
      if (!videoTitle || videoTitle.includes("The Secret AGI Timeline")) {
        const titleWithShorts = activeClip.title.includes("#Shorts") ? activeClip.title : `${activeClip.title} #Shorts`;
        setVideoTitle(titleWithShorts);
      }
      if (activeClip.summary) {
        setVideoDescription(`${activeClip.summary}\n\n#Shorts #${activeClip.tags?.[0] || 'Viral'} #Tech`);
      }
      if (activeClip.tags && activeClip.tags.length > 0) {
        setTags(activeClip.tags);
        setHashtags(activeClip.tags.map(t => t.startsWith('#') ? t : `#${t}`));
      }
    }
  }, [selectedClipId]);

  // Poll for active uploads every 3 seconds if there are jobs uploading
  useEffect(() => {
    const hasUploading = jobs.some(j => j.status === 'uploading' || j.status === 'processing');
    if (!hasUploading) return;

    const interval = setInterval(() => {
      loadJobs(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [jobs]);

  async function loadChannelStatus() {
    setChannelLoading(true);
    try {
      const res = await fetchChannelStatusApi();
      setChannel(res);
    } catch (err) {
      console.warn("Could not load channel status from API, using fallback demo state", err);
    } finally {
      setChannelLoading(false);
    }
  }

  async function loadJobs(silent: boolean = false) {
    if (!silent) setLoadingJobs(true);
    try {
      const res = await fetchPublishingJobsApi();
      if (res && res.jobs) {
        setJobs(res.jobs);
      }
    } catch (err) {
      console.warn("Could not load publishing jobs from API", err);
    } finally {
      if (!silent) setLoadingJobs(false);
    }
  }

  async function loadCalendar() {
    try {
      const res = await fetchPublishingCalendarApi();
      if (res && res.calendar) {
        setCalendarEntries(res.calendar);
      }
    } catch (err) {
      console.warn("Could not load calendar entries", err);
    }
  }

  async function handleToggleChannel() {
    try {
      if (channel.connected) {
        await disconnectChannelApi();
        setChannel({
          connected: false,
          channel_name: "",
          channel_id: "",
          subscribers: 0,
          avatar_url: ""
        });
        addNotification("YouTube Account Disconnected", "Your Google OAuth credentials have been safely unlinked.", "info");
      } else {
        const res = await connectDemoChannelApi();
        setChannel(res);
        addNotification("YouTube Channel Connected", `Successfully linked ${res.channel_name} (${(res.subscribers / 1000).toFixed(1)}K subscribers).`, "success");
      }
    } catch (err) {
      addNotification("Connection Error", "Failed to update channel connection.", "error");
    }
  }

  async function handleGenerateSeo() {
    if (!activeClip) return;
    setIsGeneratingSeo(true);
    try {
      const res = await suggestSEOMetadataApi(activeClip.id, "general");
      if (res.suggested_titles && res.suggested_titles.length > 0) {
        setSeoSuggestions(res.suggested_titles);
        setVideoTitle(res.suggested_titles[0]);
      }
      if (res.suggested_description) {
        setVideoDescription(res.suggested_description);
      }
      if (res.hashtags) {
        setHashtags(res.hashtags);
      }
      if (res.tags) {
        setTags(res.tags);
      }
      addNotification("AI SEO Metadata Generated", "Generated high-CTR title, keywords, chapters, and hashtags.", "success");
    } catch (err) {
      addNotification("SEO Suggestion Failed", "Using default AI heuristics.", "warning");
    } finally {
      setIsGeneratingSeo(false);
    }
  }

  async function handlePublishOrSchedule() {
    if (!activeClip) {
      addNotification("No Short Selected", "Please select a generated Short first.", "error");
      return;
    }

    if (!channel.connected) {
      addNotification("Channel Not Connected", "Please connect your YouTube channel first.", "warning");
      return;
    }

    setIsPublishing(true);
    try {
      let isoScheduledAt: string | null = null;
      if (isScheduled && scheduleDate && scheduleTime) {
        isoScheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00Z`).toISOString();
      }

      const newJob = await createPublishingJobApi({
        clip_id: activeClip.id,
        project_id: activeClip.project_id,
        video_title: videoTitle,
        video_description: videoDescription,
        tags: tags,
        visibility: isScheduled ? "private" : visibility,
        scheduled_at: isoScheduledAt,
        audience_made_for_kids: audienceMadeForKids
      });

      if (!isScheduled) {
        // Trigger immediate background upload
        await startPublishingJobUploadApi(newJob.id);
        addNotification("Upload Started", `"${videoTitle}" is being uploaded directly to YouTube!`, "info");
      } else {
        addNotification("Short Scheduled", `Scheduled to publish on ${scheduleDate} at ${scheduleTime} ${selectedTimezone}.`, "success");
      }

      await loadJobs();
      await loadCalendar();
      setActiveTab('queue');
    } catch (err: any) {
      addNotification("Publishing Error", err.message || "Failed to create publishing job.", "error");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleStartUpload(jobId: string) {
    try {
      await startPublishingJobUploadApi(jobId);
      addNotification("Upload Initiated", "Direct YouTube Data API v3 upload in progress.", "info");
      await loadJobs();
    } catch (err: any) {
      addNotification("Upload Failed", err.message || "Could not start upload.", "error");
    }
  }

  async function handleRetryUpload(jobId: string) {
    try {
      await retryPublishingJobApi(jobId);
      addNotification("Retrying Upload", "Upload restarted from last completed chunk.", "info");
      await loadJobs();
    } catch (err: any) {
      addNotification("Retry Failed", err.message || "Could not restart upload.", "error");
    }
  }

  async function handleDeleteJob(jobId: string) {
    try {
      await deletePublishingJobApi(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      addNotification("Job Removed", "Publishing job cancelled and removed.", "info");
      if (inspectJob?.id === jobId) setInspectJob(null);
      await loadCalendar();
    } catch (err: any) {
      addNotification("Action Failed", err.message || "Could not delete job.", "error");
    }
  }

  async function handleSaveJobEdit() {
    if (!inspectJob) return;
    setIsSavingEdit(true);
    try {
      await updatePublishingJobApi(inspectJob.id, {
        video_title: inspectJob.video_title,
        video_description: inspectJob.video_description,
        tags: inspectJob.tags,
        visibility: inspectJob.visibility,
        scheduled_at: inspectJob.scheduled_at,
        audience_made_for_kids: inspectJob.audience_made_for_kids
      });
      addNotification("Job Updated", "Metadata and scheduling parameters saved.", "success");
      setInspectJob(null);
      await loadJobs();
      await loadCalendar();
    } catch (err: any) {
      addNotification("Update Failed", err.message || "Could not update job.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleBatchPublish() {
    if (batchSelectedClips.length === 0) {
      addNotification("No Clips Selected", "Please select at least one Short for batch publishing.", "warning");
      return;
    }

    setIsBatchScheduling(true);
    try {
      const res = await batchPublishShortsApi({
        clip_ids: batchSelectedClips,
        schedule_interval_hours: batchIntervalHours,
        visibility: batchVisibility
      });

      addNotification(
        "Batch Publish Scheduled!",
        `Successfully queued ${res.total_scheduled} Shorts spaced ${batchIntervalHours}h apart.`,
        "success"
      );
      setBatchModalOpen(false);
      setBatchSelectedClips([]);
      await loadJobs();
      await loadCalendar();
      setActiveTab('queue');
    } catch (err: any) {
      addNotification("Batch Publish Failed", err.message || "Could not queue batch publish.", "error");
    } finally {
      setIsBatchScheduling(false);
    }
  }

  function addHashtag() {
    if (!newHashtagInput.trim()) return;
    let tag = newHashtagInput.trim();
    if (!tag.startsWith('#')) tag = `#${tag}`;
    if (!hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setNewHashtagInput("");
  }

  function removeHashtag(tagToRemove: string) {
    setHashtags(hashtags.filter(t => t !== tagToRemove));
  }

  function addTag() {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setNewTagInput("");
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove));
  }

  // Derived job categories
  const queueJobs = useMemo(() => {
    return jobs.filter(j => j.status === 'waiting' || j.status === 'uploading' || j.status === 'processing' || j.status === 'failed');
  }, [jobs]);

  const publishedJobs = useMemo(() => {
    let list = jobs.filter(j => j.status === 'published');
    if (searchQuery.trim()) {
      list = list.filter(j => j.video_title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (historyVisibilityFilter !== 'all') {
      list = list.filter(j => j.visibility === historyVisibilityFilter);
    }
    return list;
  }, [jobs, searchQuery, historyVisibilityFilter]);

  const scheduledJobs = useMemo(() => {
    return jobs.filter(j => j.scheduled_at && j.status === 'waiting');
  }, [jobs]);

  const renderStatusBadge = (status: PublishingStatus, percentage: number = 0, speed?: number) => {
    switch (status) {
      case 'published':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Published</span>
          </span>
        );
      case 'uploading':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 animate-pulse">
            <Upload className="w-3.5 h-3.5 animate-bounce" />
            <span>Uploading ({percentage}%{speed ? ` • ${speed} MB/s` : ''})</span>
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 animate-pulse">
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
            <span>YouTube Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Upload Failed</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Scheduled Queue</span>
          </span>
        );
    }
  };

  // Calendar Days Computation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = lastDay.getDate();

    const days = [];
    // Prev month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month padding to fill 35 or 42 cells
    const remainingCells = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* 1. CHANNEL CONNECTION & CONTROL HEADER */}
      <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-blue-600/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-2.5">
              <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
              <span>OFFICIAL YOUTUBE DATA API V3 & GOOGLE OAUTH 2.0</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              YouTube Integration & Publishing Studio
            </h1>
            <p className="text-xs lg:text-sm text-gray-400 mt-1 max-w-2xl">
              Connect your verified channel, generate viral SEO titles and tags, schedule multi-week Shorts campaigns, and monitor live resumable chunk uploads.
            </p>
          </div>

          {/* CHANNEL STATUS PILL / CONNECT TOGGLE */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#0A0C10] border border-[#23293A] shadow-inner">
              <div className="relative">
                {channel.avatar_url ? (
                  <img
                    src={channel.avatar_url}
                    alt={channel.channel_name || "Channel"}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/30"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400">
                    <YoutubeIcon className="w-5 h-5" />
                  </div>
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0A0C10] ${
                    channel.connected ? 'bg-emerald-500' : 'bg-gray-500'
                  }`}
                />
              </div>
              <div className="text-left pr-2">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-white leading-tight">
                    {channel.connected ? channel.channel_name : "No Channel Connected"}
                  </p>
                  {channel.connected && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {channel.connected
                    ? `${(channel.subscribers / 1000).toFixed(1)}K subscribers • ID: ${channel.channel_id.substring(0, 10)}...`
                    : "Authorize via Google OAuth 2.0"}
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleChannel}
              disabled={channelLoading}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                channel.connected
                  ? 'bg-[#1C2130] text-gray-300 hover:text-red-400 hover:bg-red-950/20 border border-[#2A3144]'
                  : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30 active:scale-95'
              }`}
            >
              {channelLoading ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : channel.connected ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </>
              ) : (
                <>
                  <YoutubeIcon className="w-4 h-4 text-white" />
                  <span>Connect YouTube Account</span>
                </>
              )}
            </button>

            <button
              onClick={() => setBatchModalOpen(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-glow-purple flex items-center gap-2 active:scale-95 transition-all"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bulk Publish Shorts</span>
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1C2130] text-xs">
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">Upload Queue</span>
            <span className="font-extrabold text-amber-400 text-lg mt-1">{queueJobs.length} Shorts</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">Scheduled for Future</span>
            <span className="font-extrabold text-purple-400 text-lg mt-1">{scheduledJobs.length} Shorts</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">Total Published</span>
            <span className="font-extrabold text-emerald-400 text-lg mt-1">{publishedJobs.length} Shorts</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">API Daily Quota</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-extrabold text-blue-400 text-lg">3,200 / 10,000</span>
              <span className="text-[10px] text-gray-500 font-mono">32%</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#23293A] pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('studio')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'studio'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-[#161B29]'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>1. Upload Studio & SEO</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'queue'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-[#161B29]'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>2. Upload Queue & Scheduled</span>
          {queueJobs.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center font-mono">
              {queueJobs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'calendar'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-[#161B29]'
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5" />
          <span>3. Publishing Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
              : 'text-gray-400 hover:text-white hover:bg-[#161B29]'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>4. Published Shorts History</span>
          <span className="text-[10px] text-gray-500 font-mono">({publishedJobs.length})</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      {/* ============================================================== */}
      {/* TAB 1: UPLOAD STUDIO */}
      {/* ============================================================== */}
      {activeTab === 'studio' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 5 COLS: SHORT SELECTOR & 9:16 PREVIEW */}
          <div className="lg:col-span-5 space-y-5">
            <div className="p-5 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-purple-400" />
                  <span>Select Short To Upload</span>
                </label>
                <span className="text-[11px] text-gray-500 font-mono">
                  {clips.length} Clips Available
                </span>
              </div>

              {/* Clip Picker Selector */}
              <div className="grid grid-cols-3 gap-2">
                {clips.slice(0, 6).map((c, i) => {
                  const isSelected = selectedClipId === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClipId(c.id)}
                      className={`p-2 rounded-xl border text-left flex flex-col gap-1 transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-purple-900/30 border-purple-500 shadow-md ring-1 ring-purple-500'
                          : 'bg-[#0A0C10] border-[#23293A] hover:border-gray-700'
                      }`}
                    >
                      <div className="w-full aspect-[9/14] bg-black rounded-lg overflow-hidden relative">
                        <img
                          src={c.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                          alt={c.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-black/80 text-[8px] font-mono px-1 rounded text-white">
                          {c.duration_seconds.toFixed(0)}s
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-white line-clamp-1 mt-1">
                        {c.title}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* High-res 9:16 Video Player Container */}
              {activeClip && (
                <div className="pt-2">
                  <div className="w-full max-w-xs mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden border border-white/10 relative shadow-2xl flex items-center justify-center">
                    <video
                      src={activeClip.export_video_url ? resolveMediaUrl(activeClip.export_video_url) : (activeClip.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4")}
                      poster={activeClip.thumbnail_url}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-bold text-white border border-white/20">
                      9:16 Vertical Short
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-xs font-semibold text-white truncate px-4">{activeClip.title}</p>
                    <p className="text-[11px] text-gray-500">
                      Duration: {activeClip.duration_seconds.toFixed(1)}s • Score: {activeClip.engagement_score}/100
                    </p>
                    <button
                      type="button"
                      onClick={() => setThumbnailModalOpen(true)}
                      className="mt-2.5 mx-auto px-4 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/35 text-purple-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Customize Thumbnail & Cover</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 7 COLS: METADATA & PUBLISHING FORM */}
          <div className="lg:col-span-7 space-y-6">
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                    <span>YouTube Metadata Studio</span>
                  </h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Configure titles, SEO descriptions, trending hashtags, and upload parameters.
                  </p>
                </div>

                <button
                  onClick={handleGenerateSeo}
                  disabled={isGeneratingSeo}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGeneratingSeo ? "Generating AI SEO..." : "AI Auto-Suggest SEO"}</span>
                </button>
              </div>

              {/* SUGGESTED TITLES PICKER */}
              {seoSuggestions.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Suggested High-CTR Titles</span>
                    </span>
                    <span className="text-[10px] text-purple-400">Click to apply</span>
                  </div>
                  <div className="space-y-1.5">
                    {seoSuggestions.map((st, i) => (
                      <div
                        key={i}
                        onClick={() => setVideoTitle(st)}
                        className={`p-2 rounded-xl text-xs cursor-pointer border transition-all flex items-center justify-between ${
                          videoTitle === st
                            ? 'bg-purple-900/40 border-purple-400 text-white font-semibold'
                            : 'bg-[#0A0C10]/80 border-purple-500/20 text-gray-300 hover:bg-purple-900/20'
                        }`}
                      >
                        <span className="truncate pr-2">{st}</span>
                        {videoTitle === st && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIDEO TITLE */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Video Title (Must include #Shorts)
                  </label>
                  <span className="text-[10px] font-mono text-gray-500">
                    {videoTitle.length}/100 chars
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={100}
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Catchy Hook Title #Shorts"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">
                    Video Description & Chapters
                  </label>
                  <span className="text-[10px] font-mono text-gray-500">
                    {videoDescription.length}/5000 chars
                  </span>
                </div>
                <textarea
                  rows={4}
                  maxLength={5000}
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Engaging summary, timestamps, credits, and hashtags..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              {/* HASHTAGS & TAGS CHIPS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* HASHTAGS */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-400" />
                    <span>Hashtags (For Algorithmic Shorts Feed)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                    {hashtags.map((h, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-medium"
                      >
                        <span>{h}</span>
                        <button
                          type="button"
                          onClick={() => removeHashtag(h)}
                          className="hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newHashtagInput}
                        onChange={(e) => setNewHashtagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addHashtag();
                          }
                        }}
                        placeholder="+ add #"
                        className="w-16 bg-transparent text-[11px] text-white focus:outline-none placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                {/* SEARCH TAGS */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>YouTube Tags (Search Discovery)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                    {tags.map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[11px] font-medium"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          className="hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        placeholder="+ add tag"
                        className="w-16 bg-transparent text-[11px] text-white focus:outline-none placeholder:text-gray-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* VISIBILITY & AUDIENCE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#1C2130]">
                {/* VISIBILITY */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">
                    Visibility Mode
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
                          onClick={() => setVisibility(vis.id as VisibilityType)}
                          className={`p-2.5 rounded-xl border text-center font-bold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                            visibility === vis.id
                              ? 'bg-purple-600/20 border-purple-500 text-white'
                              : 'bg-[#0A0C10] border-[#23293A] text-gray-400 hover:text-white'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{vis.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* AUDIENCE (COPPA COMPLIANCE) */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300">
                    Audience (Made for Kids)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAudienceMadeForKids(false)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-colors ${
                        !audienceMadeForKids
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-[#0A0C10] border-[#23293A] text-gray-400'
                      }`}
                    >
                      No (13+ Audience)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudienceMadeForKids(true)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-colors ${
                        audienceMadeForKids
                          ? 'bg-purple-600/20 border-purple-500 text-white'
                          : 'bg-[#0A0C10] border-[#23293A] text-gray-400'
                      }`}
                    >
                      Yes, Made for Kids
                    </button>
                  </div>
                </div>
              </div>

              {/* SCHEDULING CONTROLS */}
              <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#23293A] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-xs font-bold text-white">Schedule Short for Future Release</p>
                      <p className="text-[11px] text-gray-400">
                        Uploads as Private first, then switches to Public at your designated time.
                      </p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isScheduled}
                    onChange={(e) => setIsScheduled(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-black border-[#23293A] focus:ring-purple-500"
                  />
                </div>

                {isScheduled && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-[#1C2130]">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">Date</label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#12151E] border border-[#23293A] text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">Time</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#12151E] border border-[#23293A] text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-400 block mb-1">Timezone</label>
                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#12151E] border border-[#23293A] text-white text-xs"
                      >
                        <option value="UTC">UTC (Universal Time)</option>
                        <option value="America/New_York">EST (New York)</option>
                        <option value="America/Los_Angeles">PST (Los Angeles)</option>
                        <option value="Europe/London">GMT (London)</option>
                        <option value="Asia/Kolkata">IST (India)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-2">
                <button
                  onClick={handlePublishOrSchedule}
                  disabled={isPublishing || !channel.connected}
                  className={`w-full py-3.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg ${
                    channel.connected
                      ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-purple-600/30 active:scale-[0.99]'
                      : 'bg-[#1C2130] text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isPublishing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      <span>{isScheduled ? "Scheduling Short on YouTube..." : "Initiating Resumable Direct Upload..."}</span>
                    </>
                  ) : isScheduled ? (
                    <>
                      <CalendarIcon className="w-4 h-4" />
                      <span>Schedule Short for {scheduleDate} at {scheduleTime} ({selectedTimezone})</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Publish Directly to YouTube Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: UPLOAD QUEUE & SCHEDULED */}
      {/* ============================================================== */}
      {activeTab === 'queue' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                <span>Active Upload Queue & Scheduled Jobs</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Real-time tracking of resumable uploads with speed indicators, chunk progression, and retry controls.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => loadJobs()}
                className="px-3 py-1.5 rounded-xl bg-[#12151E] border border-[#23293A] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Queue</span>
              </button>

              <button
                onClick={() => setQueuePaused(!queuePaused)}
                className="px-3 py-1.5 rounded-xl bg-[#12151E] border border-[#23293A] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {queuePaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                <span>{queuePaused ? "Resume Queue" : "Pause Queue"}</span>
              </button>
            </div>
          </div>

          {queueJobs.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-[#12151E] border border-[#23293A] space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">All Queue Tasks Completed</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                There are no pending uploads or scheduled jobs at the moment. Switch to the Upload Studio or Bulk Publish to queue new Shorts.
              </p>
              <button
                onClick={() => setActiveTab('studio')}
                className="mt-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-500"
              >
                Go to Upload Studio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {queueJobs.map((job) => {
                const isUploading = job.status === 'uploading';
                const isScheduledJob = Boolean(job.scheduled_at && job.status === 'waiting');

                return (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-[#12151E] border border-[#23293A] hover:border-gray-700 transition-all space-y-4"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* LEFT: THUMBNAIL & TITLES */}
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-16 h-24 rounded-xl overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                          <img
                            src={job.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                            alt={job.video_title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-1 left-1 bg-black/80 text-[8px] font-mono px-1 rounded text-white">
                            9:16
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1">
                          <h3 className="font-bold text-white text-sm truncate max-w-xl">
                            {job.video_title}
                          </h3>
                          <p className="text-xs text-gray-400 line-clamp-1">
                            {job.video_description}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {renderStatusBadge(job.status, job.progress_percentage, job.upload_speed_mbps)}

                            <span className="px-2 py-0.5 rounded-md bg-[#0A0C10] border border-[#23293A] text-[10px] font-mono text-gray-400">
                              {job.visibility.toUpperCase()}
                            </span>

                            {isScheduledJob && job.scheduled_at && (
                              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-semibold flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                <span>Publishes: {new Date(job.scheduled_at).toLocaleDateString()} {new Date(job.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: CONTROLS */}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetryUpload(job.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-red-950/40 text-red-300 border border-red-500/40 hover:bg-red-900/50 text-xs font-bold flex items-center gap-1.5"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </button>
                        )}

                        {job.status === 'waiting' && !isScheduledJob && (
                          <button
                            onClick={() => handleStartUpload(job.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Now</span>
                          </button>
                        )}

                        <button
                          onClick={() => setInspectJob(job)}
                          className="px-3 py-1.5 rounded-xl bg-[#0A0C10] hover:bg-[#161B29] text-gray-300 hover:text-white border border-[#23293A] text-xs font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1.5 rounded-xl bg-[#0A0C10] hover:bg-red-950/30 text-gray-500 hover:text-red-400 border border-[#23293A]"
                          title="Cancel/Delete Job"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* PROGRESS BAR IF UPLOADING */}
                    {isUploading && (
                      <div className="space-y-1.5 pt-2 border-t border-[#1C2130]">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Resumable Chunk Upload in progress...</span>
                          <span className="font-mono font-bold text-blue-400">
                            {job.progress_percentage}% {job.upload_speed_mbps ? `(${job.upload_speed_mbps} MB/s)` : ''}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#0A0C10] overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400 transition-all duration-300 rounded-full"
                            style={{ width: `${job.progress_percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PUBLISHING CALENDAR */}
      {/* ============================================================== */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-purple-400" />
                <span>Shorts Release Schedule Calendar</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Visual monthly calendar showing planned release days, published archives, and pending uploads.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* MONTH NAVIGATION */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#12151E] border border-[#23293A]">
                <button
                  onClick={() => {
                    const prev = new Date(currentDate);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentDate(prev);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-white min-w-[120px] text-center">
                  {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </span>
                <button
                  onClick={() => {
                    const next = new Date(currentDate);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentDate(next);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 rounded-xl bg-[#12151E] border border-[#23293A] text-xs font-semibold text-gray-300 hover:text-white"
              >
                Today
              </button>
            </div>
          </div>

          {/* CALENDAR GRID */}
          <div className="rounded-3xl bg-[#12151E] border border-[#23293A] overflow-hidden shadow-xl">
            {/* WEEKDAY HEADERS */}
            <div className="grid grid-cols-7 border-b border-[#23293A] bg-[#0A0C10]/60 text-center text-[11px] font-bold text-gray-400 py-3">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* DAY CELLS */}
            <div className="grid grid-cols-7 divide-x divide-y divide-[#1C2130]">
              {calendarDays.map((cell, idx) => {
                const dayStr = cell.date.toISOString().split('T')[0];
                const isToday = dayStr === new Date().toISOString().split('T')[0];

                // Find jobs published or scheduled on this day
                const dayJobs = jobs.filter(j => {
                  if (j.status === 'published' && j.published_at) {
                    return j.published_at.startsWith(dayStr);
                  }
                  if (j.scheduled_at) {
                    return j.scheduled_at.startsWith(dayStr);
                  }
                  return false;
                });

                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                      cell.isCurrentMonth ? 'bg-[#12151E]' : 'bg-[#0D1017]/40 text-gray-600'
                    } ${isToday ? 'ring-1 ring-inset ring-purple-500/50 bg-purple-950/10' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold font-mono ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center'
                            : cell.isCurrentMonth
                            ? 'text-gray-300'
                            : 'text-gray-600'
                        }`}
                      >
                        {cell.date.getDate()}
                      </span>

                      {dayJobs.length > 0 && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                          {dayJobs.length} Short{dayJobs.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* SHORT BADGES INSIDE CALENDAR CELL */}
                    <div className="space-y-1 mt-1">
                      {dayJobs.slice(0, 2).map((dj) => {
                        const isPub = dj.status === 'published';
                        return (
                          <div
                            key={dj.id}
                            onClick={() => setInspectJob(dj)}
                            className={`p-1 rounded-md text-[10px] font-semibold truncate cursor-pointer flex items-center gap-1 border ${
                              isPub
                                ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/30 hover:bg-emerald-900/40'
                                : 'bg-purple-950/30 text-purple-300 border-purple-500/30 hover:bg-purple-900/40'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isPub ? 'bg-emerald-400' : 'bg-purple-400'}`} />
                            <span className="truncate">{dj.video_title}</span>
                          </div>
                        );
                      })}
                      {dayJobs.length > 2 && (
                        <span className="text-[9px] text-gray-400 block text-right pr-1">
                          +{dayJobs.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PUBLISHED SHORTS HISTORY */}
      {/* ============================================================== */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#23293A]">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>YouTube Shorts Publishing History & Audit Log</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Complete historical record of all videos uploaded to your connected YouTube channel.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* SEARCH */}
              <div className="px-3 py-1.5 rounded-xl bg-[#12151E] border border-[#23293A] flex items-center gap-2 w-64">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter published Shorts..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none"
                />
              </div>

              {/* VISIBILITY FILTER */}
              <select
                value={historyVisibilityFilter}
                onChange={(e) => setHistoryVisibilityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#12151E] border border-[#23293A] text-xs font-semibold text-gray-300"
              >
                <option value="all">All Visibility</option>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl bg-[#12151E] border border-[#23293A] overflow-hidden divide-y divide-[#1C2130]">
            {publishedJobs.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-xs">
                No published Shorts found matching current query.
              </div>
            ) : (
              publishedJobs.map((item) => (
                <div
                  key={item.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#161B27] transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                      <img
                        src={item.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                        alt={item.video_title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-black/80 text-[8px] font-mono px-1 rounded text-white">
                        9:16
                      </div>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h4 className="font-bold text-white text-xs truncate max-w-lg">
                        {item.video_title}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-1">
                        {item.video_description}
                      </p>

                      <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-0.5">
                        <span className="font-medium text-gray-400">
                          {item.published_at ? new Date(item.published_at).toLocaleDateString() : "Recently"}
                        </span>
                        <span>•</span>
                        <span className="font-mono uppercase">{item.visibility}</span>
                        <span>•</span>
                        <span className="text-purple-400 font-semibold">{item.channel_name || channel.channel_name}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {item.platform_url ? (
                      <a
                        href={item.platform_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <YoutubeIcon className="w-3.5 h-3.5" />
                        <span>Watch on YouTube</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Published</span>
                      </span>
                    )}

                    <button
                      onClick={() => setInspectJob(item)}
                      className="p-1.5 rounded-xl bg-[#0A0C10] hover:bg-[#1C2130] text-gray-400 hover:text-white border border-[#23293A]"
                      title="Inspect Metadata"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODALS: INSPECT & EDIT JOB MODAL */}
      {/* ============================================================== */}
      {inspectJob && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <YoutubeIcon className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white">Inspect YouTube Short Details</h3>
              </div>
              <button
                onClick={() => setInspectJob(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Short Title</label>
              <input
                type="text"
                value={inspectJob.video_title}
                onChange={(e) => setInspectJob({ ...inspectJob, video_title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400">Description</label>
              <textarea
                rows={4}
                value={inspectJob.video_description}
                onChange={(e) => setInspectJob({ ...inspectJob, video_description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs leading-relaxed"
              />
            </div>

            {/* Visibility & Schedule Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Visibility</label>
                <select
                  value={inspectJob.visibility}
                  onChange={(e) => setInspectJob({ ...inspectJob, visibility: e.target.value as VisibilityType })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">Schedule Timestamp (UTC)</label>
                <input
                  type="datetime-local"
                  value={inspectJob.scheduled_at ? inspectJob.scheduled_at.substring(0, 16) : ""}
                  onChange={(e) => setInspectJob({ ...inspectJob, scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>
            </div>

            {/* YouTube Direct Link if published */}
            {inspectJob.platform_url && (
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between">
                <span className="text-xs text-gray-400 font-mono truncate mr-2">{inspectJob.platform_url}</span>
                <a
                  href={inspectJob.platform_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <span>Open</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-between pt-3 border-t border-[#23293A]">
              <button
                onClick={() => handleDeleteJob(inspectJob.id)}
                className="px-3.5 py-2 rounded-xl bg-red-950/30 text-red-400 border border-red-500/30 hover:bg-red-900/40 text-xs font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Job</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectJob(null)}
                  className="px-4 py-2 rounded-xl bg-[#1C2130] text-gray-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveJobEdit}
                  disabled={isSavingEdit}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  {isSavingEdit ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODALS: BATCH PUBLISH / MULTI-SHORTS MODAL */}
      {/* ============================================================== */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Batch Multi-Shorts Publishing</h3>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Select multiple Shorts to schedule automatically spaced across days or hours to maximize YouTube algorithmic velocity.
            </p>

            {/* Clip Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-400">
                <span>Select Shorts to Publish ({batchSelectedClips.length}/{clips.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    if (batchSelectedClips.length === clips.length) setBatchSelectedClips([]);
                    else setBatchSelectedClips(clips.map(c => c.id));
                  }}
                  className="text-purple-400 hover:underline"
                >
                  {batchSelectedClips.length === clips.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-2xl bg-[#0A0C10] border border-[#23293A]">
                {clips.map((c) => {
                  const isChecked = batchSelectedClips.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (isChecked) {
                          setBatchSelectedClips(batchSelectedClips.filter(id => id !== c.id));
                        } else {
                          setBatchSelectedClips([...batchSelectedClips, c.id]);
                        }
                      }}
                      className={`p-2 rounded-xl flex items-center justify-between cursor-pointer border transition-colors ${
                        isChecked
                          ? 'bg-purple-900/30 border-purple-500/50 text-white'
                          : 'bg-[#12151E] border-transparent text-gray-300 hover:bg-[#161B29]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-purple-600"
                        />
                        <span className="text-xs font-medium truncate">{c.title}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono ml-2">
                        {c.duration_seconds.toFixed(0)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interval Configuration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Interval Spacing Between Shorts
                </label>
                <select
                  value={batchIntervalHours}
                  onChange={(e) => setBatchIntervalHours(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                >
                  <option value={2}>Every 2 Hours</option>
                  <option value={4}>Every 4 Hours (Recommended)</option>
                  <option value={6}>Every 6 Hours</option>
                  <option value={12}>Every 12 Hours (Twice Daily)</option>
                  <option value={24}>Every 24 Hours (Daily)</option>
                  <option value={48}>Every 2 Days</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  Default Visibility
                </label>
                <select
                  value={batchVisibility}
                  onChange={(e) => setBatchVisibility(e.target.value as VisibilityType)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                >
                  <option value="public">Public</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23293A]">
              <button
                onClick={() => setBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1C2130] text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchPublish}
                disabled={isBatchScheduling || batchSelectedClips.length === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-md flex items-center gap-2"
              >
                {isBatchScheduling ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Layers className="w-3.5 h-3.5" />
                )}
                <span>Schedule {batchSelectedClips.length} Shorts</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THUMBNAIL STUDIO MODAL */}
      <ThumbnailStudioModal
        isOpen={thumbnailModalOpen}
        onClose={() => setThumbnailModalOpen(false)}
        clip={activeClip}
        onThumbnailApplied={(newThumb) => {
          if (activeClip) {
            activeClip.thumbnail_url = newThumb;
          }
        }}
      />
    </div>
  );
}
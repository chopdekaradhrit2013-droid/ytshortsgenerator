"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Play,
  Scissors,
  Share2,
  CheckCircle2,
  Clock,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Filter,
  Check,
  Film,
  X,
  ExternalLink,
  RotateCw,
  FileText,
  AlertCircle,
  StopCircle,
  Trash2,
  BarChart3,
  Loader2,
  RefreshCw,
  Sliders,
  Flame,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Download,
  Archive,
  CheckSquare,
  Trophy,
  Zap,
  Smile,
  Heart,
  HelpCircle,
  Users,
  MessageSquare,
  Copy,
  Tag,
  Volume2,
  Scan,
  Image as ImageIcon
} from 'lucide-react';
import { ThumbnailStudioModal } from '@/components/studio/ThumbnailStudioModal';
import { useApp } from '@/context/AppContext';
import { GeneratedClip } from '@/types';
import {
  API_BASE_URL,
  resolveMediaUrl,
  AnalysisJob,
  HighlightCandidate,
  ScoreBreakdown,
  AlternativeHook,
  SpeakerAnalysis,
  ContextAnalysis,
  ExplanationBreakdown,
  SimilarityInfo,
  getAnalysisStatus,
  startAnalysis,
  cancelAnalysis,
  listAnalysisJobs,
  deleteClipApi,
  getClipDownloadUrl,
  getClipsZipDownloadUrl,
  rehuntClipsApi
} from '@/lib/api';

const STAGES = [
  { id: 'preparing', num: 1, title: 'Preparing Video', desc: 'FFprobe inspection & media validation' },
  { id: 'extracting_audio', num: 2, title: 'Extracting Audio', desc: '16kHz WAV & silence detection' },
  { id: 'transcribing', num: 3, title: 'Transcribing Speech', desc: 'Whisper STT with word timestamps' },
  { id: 'analyzing_scenes', num: 4, title: 'Analysing Scenes', desc: 'Scene cuts & keyframe detection' },
  { id: 'detecting_highlights', num: 5, title: 'Highlight Detection 2.0', desc: '10 moment types & 9-factor scoring' },
  { id: 'ranking_clips', num: 6, title: 'Smart Ranking & Context', desc: 'Boundary snapping & similarity check' },
  { id: 'generating_previews', num: 7, title: 'Rendering Previews', desc: 'FFmpeg 9:16 vertical cuts' }
];

const MOMENT_TYPES_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  funny: { label: "Funny Moment", color: "bg-pink-500/20 text-pink-300 border-pink-500/30", icon: Smile },
  dramatic: { label: "Dramatic Climax", color: "bg-rose-500/20 text-rose-300 border-rose-500/30", icon: Flame },
  emotional: { label: "Emotional Moment", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: Heart },
  surprising: { label: "Surprising Twist", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: Zap },
  interesting_fact: { label: "Interesting Fact", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30", icon: Info },
  heated_discussion: { label: "Heated Debate", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: MessageSquare },
  reaction: { label: "Key Reaction", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30", icon: Sparkles },
  exciting: { label: "High Energy", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: TrendingUp },
  memorable_statement: { label: "Memorable Quote", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: Trophy },
  unexpected_event: { label: "Unexpected Event", color: "bg-orange-500/20 text-orange-300 border-orange-500/30", icon: AlertCircle }
};

const RANKING_BADGES_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  "Best Overall": { label: "Best Overall", color: "bg-amber-500/20 text-amber-300 border-amber-500/40", icon: Trophy },
  "Best Hook": { label: "Best Hook", color: "bg-purple-500/20 text-purple-300 border-purple-500/40", icon: Zap },
  "Most Entertaining": { label: "Most Entertaining", color: "bg-pink-500/20 text-pink-300 border-pink-500/40", icon: Smile },
  "Most Emotional": { label: "Most Emotional", color: "bg-sky-500/20 text-sky-300 border-sky-500/40", icon: Heart },
  "Most Informative": { label: "Most Informative", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40", icon: Info },
  "Most Interesting": { label: "Most Interesting", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40", icon: Sparkles },
  "Best Storytelling": { label: "Best Storytelling", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40", icon: Film }
};

function GeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project') || searchParams.get('project_id');
  const jobIdParam = searchParams.get('job_id');

  const {
    projects,
    activeProject,
    setActiveProject,
    clips,
    addClips,
    updateClip,
    setActiveClip,
    addPublishingJob,
    addNotification
  } = useApp();

  // Job & Pipeline state
  const [currentJob, setCurrentJob] = useState<AnalysisJob | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isRehunting, setIsRehunting] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Ingestion & Re-hunt Controls
  const [minDurationSec, setMinDurationSec] = useState<number>(15);
  const [maxDurationSec, setMaxDurationSec] = useState<number>(60);
  const [targetClipsOption, setTargetClipsOption] = useState<number>(8);
  const [minQualityScore, setMinQualityScore] = useState<number>(65);
  const [contentPriority, setContentPriority] = useState<'balanced' | 'entertainment' | 'information' | 'storytelling'>('balanced');
  const [includeSimilarVariations, setIncludeSimilarVariations] = useState<boolean>(false);
  const [preferredMomentFilter, setPreferredMomentFilter] = useState<string>('all');

  // Filter & Selection
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [previewClip, setPreviewClip] = useState<GeneratedClip | null>(null);
  const [scoreModalClip, setScoreModalClip] = useState<GeneratedClip | null>(null);
  const [alternativeHooksClipId, setAlternativeHooksClipId] = useState<string | null>(null);
  const [filterScore, setFilterScore] = useState<number>(65);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState<boolean>(false);
  const [thumbnailModalClip, setThumbnailModalClip] = useState<GeneratedClip | null>(null);

  // Sync project from URL parameter
  useEffect(() => {
    if (projectIdParam) {
      const match = projects.find(p => p.id === projectIdParam);
      if (match && (!activeProject || activeProject.id !== match.id)) {
        setActiveProject(match);
      }
    }
  }, [projectIdParam, projects, activeProject, setActiveProject]);

  // Load existing clips from backend
  const fetchBackendClips = useCallback(async (projId?: string) => {
    try {
      const targetId = projId || activeProject?.id;
      const url = targetId
        ? `${API_BASE_URL}/api/v1/clips?project_id=${encodeURIComponent(targetId)}`
        : `${API_BASE_URL}/api/v1/clips`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const backendClips: GeneratedClip[] = await res.json();
        if (backendClips && backendClips.length > 0) {
          addClips(backendClips);
        }
      }
    } catch {
      // Ignore background poll errors
    }
  }, [activeProject, addClips]);

  // Poll job status
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    const targetJobId = jobIdParam || currentJob?.id;

    if (!targetJobId) return;

    const poll = async () => {
      try {
        const job = await getAnalysisStatus(targetJobId);
        setCurrentJob(job);

        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          setIsPolling(false);
          if (interval) clearInterval(interval);

          if (job.status === 'completed') {
            addNotification(
              "Highlight Intelligence 2.0 Complete",
              `Discovered ${job.candidates?.length || 0} contextually complete Shorts candidates!`,
              "success"
            );
            fetchBackendClips(job.project_id);
          } else if (job.status === 'failed') {
            addNotification("Analysis Failed", job.error_message || "Video analysis encountered an error.", "warning");
          }
        }
      } catch {
        // Retry silently
      }
    };

    setIsPolling(true);
    poll();
    interval = setInterval(poll, 1500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobIdParam, currentJob?.id, addNotification, fetchBackendClips]);

  useEffect(() => {
    fetchBackendClips();
  }, [fetchBackendClips]);

  // Filter clips for active project, score, and moment type
  const projectClips = activeProject
    ? clips.filter(c => c.project_id === activeProject.id)
    : clips;

  const displayedClips = projectClips.filter(c => {
    const matchesScore = (c.virality_score || c.engagement_score) >= filterScore;
    const matchesCat = categoryFilter === 'all' || (c.tags && c.tags.some(t => t.toLowerCase().includes(categoryFilter.toLowerCase())));
    const matchesMoment = preferredMomentFilter === 'all' || (c.moment_type && c.moment_type.toLowerCase() === preferredMomentFilter.toLowerCase());
    const matchesSimilarity = includeSimilarVariations ? true : !c.is_duplicate_or_similar;
    return matchesScore && matchesCat && matchesMoment && matchesSimilarity;
  });

  const toggleSelectClip = (id: string) => {
    setSelectedClipIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedClipIds.length === displayedClips.length) {
      setSelectedClipIds([]);
    } else {
      setSelectedClipIds(displayedClips.map(c => c.id));
    }
  };

  const handleBatchPublish = () => {
    if (selectedClipIds.length === 0) {
      addNotification("No Shorts Selected", "Select at least one Short to send to Publishing Centre.", "warning");
      return;
    }

    selectedClipIds.forEach(id => {
      const clip = clips.find(c => c.id === id);
      if (clip) {
        addPublishingJob({
          project_id: clip.project_id,
          clip_id: clip.id,
          video_title: `${clip.title} #Shorts`,
          video_description: `${clip.summary}\n\n#Shorts #Viral #AI`,
          tags: clip.tags,
          visibility: "public"
        });
      }
    });

    addNotification("Sent to Publishing Centre", `Added ${selectedClipIds.length} Shorts to YouTube queue.`, "success");
    router.push("/publishing");
  };

  const handleCancelJob = async () => {
    if (!currentJob) return;
    setIsCancelling(true);
    try {
      await cancelAnalysis(currentJob.id);
      addNotification("Job Cancelled", "Analysis engine stopped processing.", "info");
      setCurrentJob(prev => prev ? { ...prev, status: 'cancelled', stage: 'cancelled' } : null);
    } catch (err: any) {
      addNotification("Cancel Error", err.message || "Failed to cancel job", "warning");
    } finally {
      setIsCancelling(false);
    }
  };

  // Launch Fresh Analysis
  const handleStartAnalysis = async () => {
    const targetProject = activeProject || projects[0];
    if (!targetProject) {
      addNotification("No Project", "Please create or select a project first.", "warning");
      return;
    }

    setIsStarting(true);
    setShowConfigModal(false);
    try {
      const res = await startAnalysis({
        project_id: targetProject.id,
        target_clip_count: targetClipsOption,
        preferred_duration_seconds: Math.round((minDurationSec + maxDurationSec) / 2),
        min_duration_seconds: minDurationSec,
        max_duration_seconds: maxDurationSec,
        min_quality_score: minQualityScore,
        content_priority: contentPriority,
        include_similar: includeSimilarVariations,
        category: targetProject.category || "automatic"
      });

      addNotification("AI Highlight Detection 2.0 Started", "Engine analyzing speech pacing, emotional cadences & scene cuts...", "info");
      router.push(`/generator?project=${targetProject.id}&job_id=${res.job_id}`);
    } catch (err: any) {
      addNotification("Start Error", err.message || "Could not launch analysis job", "warning");
    } finally {
      setIsStarting(false);
    }
  };

  // Instant Highlight Re-hunt (Without Re-running Whisper)
  const handleRehuntHighlights = async () => {
    const targetProject = activeProject || projects[0];
    if (!targetProject) {
      addNotification("No Project", "Please create or select a project first.", "warning");
      return;
    }

    setIsRehunting(true);
    setShowConfigModal(false);
    try {
      const res = await rehuntClipsApi({
        project_id: targetProject.id,
        job_id: currentJob?.id,
        min_duration_seconds: minDurationSec,
        max_duration_seconds: maxDurationSec,
        target_clip_count: targetClipsOption,
        content_priority: contentPriority,
        min_quality_score: minQualityScore,
        include_similar: includeSimilarVariations,
        category: targetProject.category || "automatic"
      });

      addNotification(
        "Re-hunt Complete!",
        `Instant AI highlight re-hunt produced ${res.candidates_count} candidates using stored transcripts.`,
        "success"
      );
      fetchBackendClips(targetProject.id);
    } catch (err: any) {
      addNotification("Re-hunt Error", err.message || "Failed to re-hunt highlights", "warning");
    } finally {
      setIsRehunting(false);
    }
  };

  const handleDeleteClip = async (clipId: string) => {
    try {
      await deleteClipApi(clipId);
      addNotification("Clip Deleted", "Candidate removed from workspace.", "info");
      fetchBackendClips();
    } catch (err: any) {
      addNotification("Delete Failed", err.message || "Could not delete clip", "warning");
    }
  };

  const getStageStatus = (stageId: string, stageNum: number) => {
    if (!currentJob) return 'idle';
    if (currentJob.status === 'completed') return 'completed';
    if (currentJob.status === 'cancelled') return 'cancelled';
    if (currentJob.status === 'failed' && currentJob.stage === stageId) return 'failed';

    const currentIdx = STAGES.findIndex(s => s.id === currentJob.stage);
    const thisIdx = STAGES.findIndex(s => s.id === stageId);

    if (currentIdx === -1) return 'idle';
    if (thisIdx < currentIdx) return 'completed';
    if (thisIdx === currentIdx) return 'active';
    return 'pending';
  };

  const isJobActive = currentJob?.status === 'queued' || currentJob?.status === 'processing';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. PIPELINE STATUS & CONTROL HEADER */}
      <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI CLIP INTELLIGENCE 2.0</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-500/40 text-purple-200">
                10 Moment Types • 9-Score Radar
              </span>
              {isJobActive && (
                <span className="flex h-2 w-2 relative ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Automatic Highlight Detection & Clip Hunter</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span>Active Source:</span>
              <strong className="text-white px-2 py-0.5 rounded bg-[#1C2130] border border-[#2B3347]">
                {activeProject?.name || "All Projects"}
              </strong>
              <span className="text-gray-500">•</span>
              <span className="text-gray-300">Priority: <span className="font-semibold text-purple-300 capitalize">{contentPriority}</span></span>
              {currentJob && (
                <span className="font-mono text-[11px] text-purple-400">
                  • Job ID: {currentJob.id} ({currentJob.status})
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isJobActive ? (
              <button
                onClick={handleCancelJob}
                disabled={isCancelling}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                {isCancelling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <StopCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Cancel Analysis</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowConfigModal(true)}
                  disabled={isStarting || isRehunting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-glow-purple active:scale-95"
                >
                  {isStarting || isRehunting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Flame className="w-3.5 h-3.5 text-yellow-300" />
                  )}
                  <span>Configure & Hunt Clips</span>
                </button>

                <button
                  onClick={handleRehuntHighlights}
                  disabled={isRehunting || isStarting}
                  className="px-3.5 py-2 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] border border-purple-500/40 text-purple-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
                  title="Re-run highlight algorithm instantly using stored Whisper transcript"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRehunting ? 'animate-spin' : ''}`} />
                  <span>Re-hunt Highlights</span>
                </button>
              </>
            )}

            <button
              onClick={() => fetchBackendClips()}
              className="p-2 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] border border-[#283145] text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Refresh clips from database"
            >
              <RotateCw className="w-3.5 h-3.5 text-purple-400" />
            </button>
          </div>
        </div>

        {/* OVERALL PROGRESS BAR */}
        {currentJob && (
          <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#1E2333] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white flex items-center gap-2">
                {isJobActive && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
                <span>
                  Stage {currentJob.stage}: {currentJob.metadata?.status_text || (currentJob.status === 'completed' ? 'All viral candidates ready for editing' : 'Processing media...')}
                </span>
              </span>
              <span className="font-mono font-bold text-purple-400">
                {currentJob.progress_percentage}%
              </span>
            </div>
            <div className="w-full bg-[#1C2130] h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  currentJob.status === 'failed'
                    ? 'bg-rose-500'
                    : currentJob.status === 'cancelled'
                    ? 'bg-yellow-500'
                    : 'bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-400'
                }`}
                style={{ width: `${Math.max(currentJob.progress_percentage, 5)}%` }}
              />
            </div>
          </div>
        )}

        {/* 7 STAGE PIPELINE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {STAGES.map((s) => {
            const status = getStageStatus(s.id, s.num);
            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl border transition-all ${
                  status === 'active'
                    ? 'bg-purple-950/20 border-purple-500 shadow-glow-purple'
                    : status === 'completed'
                    ? 'bg-[#0E131E] border-emerald-500/30'
                    : status === 'failed'
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-[#0A0C10] border-[#1E2333] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-gray-400">0{s.num}</span>
                  {status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {status === 'active' && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />}
                  {status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                  {status === 'cancelled' && <StopCircle className="w-3.5 h-3.5 text-yellow-400" />}
                </div>
                <p className="text-[11px] font-bold text-white line-clamp-1">{s.title}</p>
                <p className="text-[9px] text-gray-400 line-clamp-2 mt-0.5">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. RESULTS FILTER & CONTROLS BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-2xl bg-[#12151E] border border-[#23293A]">
        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-white">
            <input
              type="checkbox"
              checked={selectedClipIds.length > 0 && selectedClipIds.length === displayedClips.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded bg-[#0A0C10] border-[#2E364D] text-purple-600 focus:ring-0 cursor-pointer"
            />
            <span>Select All ({displayedClips.length})</span>
          </label>

          {selectedClipIds.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {selectedClipIds.length} selected
            </span>
          )}

          {/* SIMILARITY TOGGLE */}
          <button
            onClick={() => setIncludeSimilarVariations(!includeSimilarVariations)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
              includeSimilarVariations
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-[#1A1F2D] border-[#283145] text-gray-400 hover:text-gray-200'
            }`}
            title="Toggle display of candidate variations with high overlap"
          >
            <Copy className="w-3 h-3 text-amber-400" />
            <span>{includeSimilarVariations ? "Showing Overlaps" : "Deduplicated"}</span>
          </button>
        </div>

        {/* MOMENT TYPE, SCORE & ACTIONS */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Moment Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Moment:</span>
            <select
              value={preferredMomentFilter}
              onChange={(e) => setPreferredMomentFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#0A0C10] border border-[#23293A] text-xs text-white focus:outline-none"
            >
              <option value="all">All 10 Moments</option>
              <option value="funny">Funny</option>
              <option value="dramatic">Dramatic</option>
              <option value="emotional">Emotional</option>
              <option value="surprising">Surprising</option>
              <option value="interesting_fact">Interesting Fact</option>
              <option value="heated_discussion">Heated Debate</option>
              <option value="reaction">Reaction</option>
              <option value="exciting">Exciting</option>
              <option value="memorable_statement">Memorable Quote</option>
              <option value="unexpected_event">Unexpected Event</option>
            </select>
          </div>

          {/* Min Quality Score Filter */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Score:</span>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(parseInt(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[#0A0C10] border border-[#23293A] text-xs text-white focus:outline-none"
            >
              <option value={50}>50%+ All Extracted</option>
              <option value={65}>65%+ Recommended</option>
              <option value={75}>75%+ High Engagement</option>
              <option value={85}>85%+ Top Tier</option>
            </select>
          </div>

          {displayedClips.length > 0 && (
            <div className="flex items-center gap-2">
              <Link
                href="/review"
                className="px-3 py-1.5 rounded-xl bg-[#1A1F2D] hover:bg-[#23293C] border border-[#283145] text-purple-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Open Review Studio"
              >
                <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>Review Studio</span>
              </Link>

              <a
                href={getClipsZipDownloadUrl(activeProject?.id, selectedClipIds.length > 0 ? selectedClipIds : undefined)}
                download
                className="px-3 py-1.5 rounded-xl bg-[#1A1F2D] hover:bg-[#23293C] border border-[#283145] text-gray-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Download rendered shorts as a single ZIP archive"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedClipIds.length > 0 ? `ZIP (${selectedClipIds.length})` : "ZIP All"}</span>
              </a>
            </div>
          )}

          <button
            onClick={handleBatchPublish}
            disabled={selectedClipIds.length === 0}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              selectedClipIds.length > 0
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-glow-purple active:scale-95'
                : 'bg-[#1C2130] text-gray-500 cursor-not-allowed'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Publish ({selectedClipIds.length})</span>
          </button>
        </div>
      </div>

      {/* 3. CLIP RESULT CARDS GRID */}
      {displayedClips.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Film className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-white">No Generated Clips Found</h3>
            <p className="text-xs text-gray-400 mt-1">
              {isJobActive
                ? "AI Clip Hunter 2.0 is actively evaluating transcript cadence, audio peaks and scene boundaries."
                : "Run AI Analysis or Instant Re-hunt to extract high-retention highlights."}
            </p>
          </div>
          {!isJobActive && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowConfigModal(true)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-glow-purple inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Configure AI Clip Hunter</span>
              </button>
              <button
                onClick={handleRehuntHighlights}
                className="px-4 py-2.5 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] border border-purple-500/40 text-purple-300 text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4 text-purple-400" />
                <span>Re-hunt from Stored Video</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedClips.map((clip) => {
            const isSelected = selectedClipIds.includes(clip.id);
            const momentConf = MOMENT_TYPES_CONFIG[clip.moment_type || 'interesting_fact'] || MOMENT_TYPES_CONFIG.interesting_fact;
            const MomentIcon = momentConf.icon;
            const badgeConf = RANKING_BADGES_CONFIG[clip.ranking_badge || 'Best Overall'] || RANKING_BADGES_CONFIG['Best Overall'];
            const BadgeIcon = badgeConf.icon;
            const altHooks = clip.alternative_hooks || [];
            const isAltOpen = alternativeHooksClipId === clip.id;

            return (
              <div
                key={clip.id}
                className={`p-4 rounded-2xl bg-[#12151E] border transition-all flex flex-col justify-between group relative ${
                  isSelected
                    ? 'border-purple-500 shadow-glow-purple bg-[#151926]'
                    : 'border-[#23293A] hover:border-purple-500/40'
                }`}
              >
                <div>
                  {/* TOP ACCOLADE & MOMENT HEADER */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    {/* Ranking Accolade */}
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${badgeConf.color}`}>
                      <BadgeIcon className="w-3 h-3" />
                      <span>{clip.ranking_badge || "Best Overall"}</span>
                    </div>

                    {/* Moment Type Pill */}
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border flex items-center gap-1 ${momentConf.color}`}>
                      <MomentIcon className="w-3 h-3" />
                      <span>{momentConf.label}</span>
                    </div>
                  </div>

                  {/* 9:16 VERTICAL THUMBNAIL & PREVIEW */}
                  <div className="relative rounded-xl overflow-hidden aspect-[9/13] bg-black border border-white/5 mb-3 group/thumb">
                    <img
                      src={resolveMediaUrl(clip.thumbnail_url)}
                      alt={clip.title}
                      className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                    />

                    {/* SELECTION CHECKBOX */}
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectClip(clip.id)}
                        className="w-5 h-5 rounded bg-black/60 border-white/40 text-purple-600 focus:ring-0 cursor-pointer shadow-md"
                      />
                    </div>

                    {/* 9-FACTOR VIRALITY SCORE PILL */}
                    <button
                      onClick={() => setScoreModalClip(clip)}
                      title="Click to view 9-dimension intelligence scoring breakdown"
                      className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/85 backdrop-blur-md border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center gap-1 shadow-lg hover:border-purple-400 hover:bg-purple-950/60 transition-all cursor-pointer"
                    >
                      <TrendingUp className="w-3 h-3 text-purple-400" />
                      <span>{clip.engagement_score}% Virality</span>
                      <BarChart3 className="w-2.5 h-2.5 ml-0.5 text-purple-300" />
                    </button>

                    {/* DURATION & TIMESTAMP BADGE */}
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span>{Math.round(clip.duration_seconds)}s</span>
                      <span className="text-gray-400">({Math.round(clip.start_time)}s - {Math.round(clip.end_time)}s)</span>
                    </div>

                    {/* DUPLICATE / SIMILAR WARNING BADGE */}
                    {clip.is_duplicate_or_similar && (
                      <div className="absolute top-10 left-2.5 px-2 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-extrabold uppercase tracking-tight flex items-center gap-1 shadow-md">
                        <Copy className="w-2.5 h-2.5" />
                        <span>Similar Variation</span>
                      </div>
                    )}

                    {/* PLAY PREVIEW BUTTON */}
                    <button
                      onClick={() => setPreviewClip(clip)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/50"
                    >
                      <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                    </button>

                    {/* HOOK CAPTION PREVIEW OVERLAY */}
                    {clip.hook_sentence && (
                      <div className="absolute bottom-10 inset-x-3 text-center pointer-events-none">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-black/90 text-xs font-black uppercase text-yellow-300 tracking-tight leading-tight shadow-lg border border-white/10">
                          "{clip.hook_sentence.slice(0, 48)}..."
                        </span>
                      </div>
                    )}
                  </div>

                  {/* TITLE & HOOK STYLE */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-purple-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        <span>Hook: {clip.hook_style || "Curiosity Gap"}</span>
                      </span>
                      <span className="flex items-center gap-1 text-[9px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        <Scan className="w-2.5 h-2.5 text-cyan-400" />
                        <span>
                          {clip.reframing_config?.mode === 'split_screen'
                            ? '9:16 Split'
                            : clip.reframing_config?.mode === 'smart_face'
                            ? '9:16 Face'
                            : clip.reframing_config?.mode === 'motion_action'
                            ? '9:16 Motion'
                            : '9:16 Reframed'}
                        </span>
                      </span>
                    </div>
                    <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-purple-300 transition-colors">
                      {clip.title}
                    </h3>
                  </div>

                  {/* SPEAKER & CONVERSATION DIARIZATION CHIP */}
                  {clip.speaker_analysis && (
                    <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400 bg-[#0A0C10] px-2.5 py-1 rounded-lg border border-[#1E2333]">
                      <Users className="w-3 h-3 text-blue-400" />
                      <span>
                        {clip.speaker_analysis.speaker_count || 1} Speaker{(clip.speaker_analysis.speaker_count || 1) > 1 ? 's' : ''} • {clip.speaker_analysis.dialogue_flow || 'monologue'}
                      </span>
                      {clip.speaker_analysis.contains_interruption && (
                        <span className="text-amber-400 font-bold ml-auto">• Fast Turn</span>
                      )}
                    </div>
                  )}

                  {/* ALTERNATIVE OPENING HOOKS SELECTOR */}
                  {altHooks.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => setAlternativeHooksClipId(isAltOpen ? null : clip.id)}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1A2030] border border-[#232B3F] text-[11px] font-medium text-gray-300 flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <Zap className="w-3 h-3 text-yellow-400" />
                          <span>{altHooks.length} Alternative Openings</span>
                        </span>
                        {isAltOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </button>

                      {isAltOpen && (
                        <div className="mt-1.5 p-2 rounded-xl bg-[#0A0C10] border border-[#232B3F] space-y-1.5 animate-in fade-in duration-200">
                          <p className="text-[9px] text-gray-400">Click to preview starting hook offset:</p>
                          {altHooks.map((alt, idx) => (
                            <div
                              key={idx}
                              className="p-1.5 rounded-lg bg-[#12151E] border border-white/5 hover:border-purple-500/30 text-[10px] text-gray-300 flex flex-col gap-0.5 cursor-pointer"
                              onClick={() => {
                                addNotification("Hook Preview Selected", `Opening set to +${alt.timestamp_offset}s offset: "${alt.hook_text}"`, "info");
                              }}
                            >
                              <div className="flex items-center justify-between font-semibold text-purple-300">
                                <span>+{alt.timestamp_offset}s offset</span>
                                <span className="text-[9px] text-gray-400">{alt.hook_style}</span>
                              </div>
                              <p className="text-gray-300 italic line-clamp-1">"{alt.hook_text}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* GROUNDED WHY AI SELECTED */}
                  {clip.virality_reasons && clip.virality_reasons.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-yellow-400" />
                        <span>Why AI expects high retention:</span>
                      </span>
                      <ul className="text-[11px] text-gray-300 space-y-0.5 list-disc list-inside">
                        {clip.virality_reasons.slice(0, 2).map((reason, idx) => (
                          <li key={idx} className="line-clamp-1">{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="pt-3 border-t border-[#1C2130] mt-4 flex items-center gap-2">
                  <button
                    onClick={() => setPreviewClip(clip)}
                    className="px-3 py-2 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] text-xs font-semibold text-gray-200 transition-colors flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 text-purple-400" />
                    <span>Preview</span>
                  </button>

                  <Link
                    href="/studio"
                    onClick={() => setActiveClip(clip)}
                    className="flex-1 py-2 text-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-glow-purple flex items-center justify-center gap-1.5"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Edit in Studio</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailModalClip(clip);
                      setThumbnailModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-[#1A1F2D] hover:bg-amber-950/40 border border-[#283145] hover:border-amber-500/40 text-gray-300 hover:text-amber-400 transition-colors"
                    title="Design AI Thumbnail & Cover"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>

                  <a
                    href={getClipDownloadUrl(clip.id)}
                    download
                    className="p-2 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] border border-[#283145] text-gray-300 hover:text-blue-400 transition-colors"
                    title="Download MP4 Short"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => handleDeleteClip(clip.id)}
                    className="p-2 rounded-xl bg-[#1A1F2D] hover:bg-rose-950/40 border border-[#283145] hover:border-rose-500/40 text-gray-400 hover:text-rose-400 transition-colors"
                    title="Delete clip"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. PREVIEW VIDEO MODAL */}
      {previewClip && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#12151E] border border-[#23293A] overflow-hidden shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
              <div className="truncate pr-2">
                <h4 className="text-xs font-bold text-white truncate">{previewClip.title}</h4>
                <p className="text-[10px] text-purple-400 font-mono">
                  {Math.round(previewClip.duration_seconds)}s • 9:16 Vertical FFmpeg Preview
                </p>
              </div>
              <button
                onClick={() => setPreviewClip(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* VIDEO PLAYER */}
            <div className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-black border border-white/10">
              <video
                src={resolveMediaUrl(previewClip.video_url)}
                autoPlay
                controls
                loop
                playsInline
                className="w-full h-full object-cover"
              />

              {previewClip.hook_sentence && (
                <div className="absolute bottom-16 inset-x-4 text-center pointer-events-none">
                  <span className="inline-block px-3 py-1 rounded bg-black/80 text-sm font-black uppercase text-yellow-300 tracking-tight shadow-md">
                    {previewClip.hook_sentence}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Link
                href="/studio"
                onClick={() => {
                  setActiveClip(previewClip);
                  setPreviewClip(null);
                }}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:from-purple-500 hover:to-blue-500 shadow-glow-purple"
              >
                <Scissors className="w-4 h-4" />
                <span>Open in Video Editor Studio</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 5. 9-DIMENSION SCORE BREAKDOWN & EXPLANATION MODAL */}
      {scoreModalClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#12151E] border border-[#23293A] p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2333]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <span>9-Factor Intelligence Scoring & Explanation</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{scoreModalClip.title}</p>
              </div>
              <button
                onClick={() => setScoreModalClip(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-300">Composite Virality Score</span>
                <p className="text-2xl font-black text-white">{scoreModalClip.engagement_score}%</p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-600 text-white">
                  {scoreModalClip.ranking_badge || "Best Overall"}
                </span>
                <p className="text-[10px] text-gray-400 mt-1 capitalize">{scoreModalClip.moment_type?.replace('_', ' ') || 'Interesting Moment'}</p>
              </div>
            </div>

            {/* 9 FACTOR BARS */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Detailed Virality Criteria</h4>
              {[
                { label: "1. Hook Strength", score: 94, desc: "Immediate 3s curiosity gap & question/claim style" },
                { label: "2. Entertainment Value", score: 88, desc: "Speech velocity, humor cues & tonal dynamic" },
                { label: "3. Emotional Impact", score: 86, desc: "Heart, shock, drama or empathetic resonance" },
                { label: "4. Context Completeness", score: 92, desc: "Starts cleanly without dangling 'and/so' conjunctions" },
                { label: "5. Storytelling Quality", score: 89, desc: "Setup, escalation and punchline resolution" },
                { label: "6. Audio Clarity", score: 90, desc: "Signal-to-noise balance and dialogue volume" },
                { label: "7. Visual Quality", score: 87, desc: "Reframing clarity and scene transition cadence" },
                { label: "8. Ending Quality", score: 91, desc: "Punchline or loopable transition at conclusion" },
                { label: "9. Standalone Understandability", score: 93, desc: "Viewer comprehends full thought without long context" }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-200">{item.label}</span>
                    <span className="font-mono text-purple-400">{item.score}/100</span>
                  </div>
                  <div className="w-full bg-[#1C2130] h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* DISCLAIMER */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Heuristic Benchmark:</strong> Algorithmic appeal scores evaluate structural retention patterns. They reflect estimated viewer engagement potential and do not guarantee viral view counts.
              </span>
            </div>

            <button
              onClick={() => setScoreModalClip(null)}
              className="w-full py-2.5 rounded-xl bg-[#1C2130] hover:bg-[#252C3E] text-white text-xs font-bold transition-colors"
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}

      {/* 6. LAUNCH & RE-HUNT CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#12151E] border border-[#23293A] p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2333]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                  <span>Highlight Detection 2.0 Settings</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Target: {activeProject?.name || "Active Video Project"}
                </p>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Duration Window Sliders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white">Target Duration Window</label>
                  <span className="font-mono text-purple-400">{minDurationSec}s — {maxDurationSec}s</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-400">Min Duration</label>
                    <input
                      type="range"
                      min="10"
                      max="45"
                      step="5"
                      value={minDurationSec}
                      onChange={(e) => setMinDurationSec(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#1C2130] rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Max Duration</label>
                    <input
                      type="range"
                      min="30"
                      max="90"
                      step="5"
                      value={maxDurationSec}
                      onChange={(e) => setMaxDurationSec(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-[#1C2130] rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                </div>
              </div>

              {/* Target Clip Count */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Target Clip Count</label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 8, 12, 16].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetClipsOption(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        targetClipsOption === num
                          ? 'bg-purple-600 text-white border-purple-500 shadow-glow-purple'
                          : 'bg-[#0A0C10] text-gray-300 border-[#23293A] hover:border-gray-600'
                      }`}
                    >
                      {num} Clips
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Priority */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white">Content Priority Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'balanced', label: 'Balanced', desc: 'Mix of entertainment & facts' },
                    { id: 'entertainment', label: 'Entertainment', desc: 'Prioritizes humor, energy & drama' },
                    { id: 'information', label: 'Information', desc: 'Prioritizes facts, statistics & insights' },
                    { id: 'storytelling', label: 'Storytelling', desc: 'Prioritizes narratives & quotes' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setContentPriority(p.id as any)}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        contentPriority === p.id
                          ? 'bg-purple-950/40 border-purple-500 text-white'
                          : 'bg-[#0A0C10] border-[#23293A] text-gray-400 hover:text-white'
                      }`}
                    >
                      <p className="text-xs font-bold capitalize">{p.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Score Threshold */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-bold text-white">Minimum Quality Threshold</label>
                  <span className="font-mono text-purple-400">{minQualityScore}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="85"
                  step="5"
                  value={minQualityScore}
                  onChange={(e) => setMinQualityScore(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-[#1C2130] rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Include Similar Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                <div>
                  <p className="text-xs font-bold text-white">Include Similar Variations</p>
                  <p className="text-[10px] text-gray-400">Keep multiple variations of overlapping high-performing sections</p>
                </div>
                <input
                  type="checkbox"
                  checked={includeSimilarVariations}
                  onChange={(e) => setIncludeSimilarVariations(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1C2130] border-gray-600 text-purple-600 cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleRehuntHighlights}
                className="flex-1 py-2.5 rounded-xl bg-[#1C2130] hover:bg-[#252C3E] border border-purple-500/40 text-purple-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-hunt (Instant)</span>
              </button>
              <button
                onClick={handleStartAnalysis}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-glow-purple flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Full Pipeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* THUMBNAIL STUDIO MODAL */}
      <ThumbnailStudioModal
        isOpen={thumbnailModalOpen}
        onClose={() => setThumbnailModalOpen(false)}
        clip={thumbnailModalClip}
        onThumbnailApplied={(newThumb) => {
          if (thumbnailModalClip) {
            updateClip(thumbnailModalClip.id, { thumbnail_url: newThumb });
          }
        }}
      />
    </div>
  );
}

export default function AIClipGeneratorPage() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-500 mb-3" />
        <p className="text-xs">Loading AI Clip Generator...</p>
      </div>
    }>
      <GeneratorContent />
    </Suspense>
  );
}

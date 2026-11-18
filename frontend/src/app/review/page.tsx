"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Download,
  Trash2,
  Edit3,
  Sliders,
  CheckSquare,
  Square,
  Filter,
  ArrowUpDown,
  Sparkles,
  Scissors,
  Film,
  Clock,
  Layers,
  Type,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Share2,
  ExternalLink,
  Eye,
  Archive,
  RefreshCw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
  Check,
  Flame,
  Crop,
  ShieldCheck,
  Scan,
  Image as ImageIcon
} from 'lucide-react';
import { ThumbnailStudioModal } from '@/components/studio/ThumbnailStudioModal';
import { useApp } from '@/context/AppContext';
import { GeneratedClip } from '@/types';
import {
  resolveMediaUrl,
  fetchClipsApi,
  patchClipApi,
  bulkDeleteClipsApi,
  bulkExportClipsApi,
  getClipDownloadUrl,
  getClipsZipDownloadUrl,
  fetchClipCaptions,
  updateClipCaptions,
  ClipCaptionsResponse
} from '@/lib/api';

type FilterType = 'all' | 'edited' | 'not_edited' | 'ready' | 'processing' | 'failed';
type SortType = 'newest' | 'oldest' | 'duration_asc' | 'duration_desc' | 'score_desc';

export default function ReviewStudioPage() {
  const {
    activeProject,
    clips,
    addClips,
    setActiveClip,
    addNotification
  } = useApp();

  // Master clips state
  const [shortsList, setShortsList] = useState<GeneratedClip[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selection & Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkExporting, setIsBulkExporting] = useState<boolean>(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);

  // Filters & Sorting
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeSort, setActiveSort] = useState<SortType>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Detailed Review Modal State
  const [activeReviewClip, setActiveReviewClip] = useState<GeneratedClip | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Editing controls in Review Modal
  const [editTitle, setEditTitle] = useState<string>('');
  const [editTrimStart, setEditTrimStart] = useState<number>(0);
  const [editTrimEnd, setEditTrimEnd] = useState<number>(30);
  const [editAspectRatio, setEditAspectRatio] = useState<string>('9:16');
  const [editCaptionPreset, setEditCaptionPreset] = useState<string>('bold_pop');
  const [editCaptionPlacement, setEditCaptionPlacement] = useState<string>('auto');
  const [editCaptionSize, setEditCaptionSize] = useState<number>(50);
  const [editCaptionTextColor, setEditCaptionTextColor] = useState<string>('#FFFFFF');
  const [editCaptionHighlight, setEditCaptionHighlight] = useState<string>('#FACC15');
  const [editHookSentence, setEditHookSentence] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);
  const [clipCaptionsData, setClipCaptionsData] = useState<ClipCaptionsResponse | null>(null);

  // Thumbnail Studio Modal State
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [thumbnailModalClip, setThumbnailModalClip] = useState<GeneratedClip | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Load clips from backend
  const loadClips = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchClipsApi(activeProject?.id);
      setShortsList(data);
      addClips(data);
    } catch (err) {
      console.error("Failed to load clips for review studio", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProject?.id, addClips]);

  useEffect(() => {
    loadClips();
  }, [loadClips]);

  // Synchronize detailed review modal when a clip is opened
  const openReviewModal = async (clip: GeneratedClip) => {
    setActiveReviewClip(clip);
    setActiveClip(clip);
    setEditTitle(clip.title);
    setEditTrimStart(clip.start_time || 0);
    setEditTrimEnd(clip.end_time || (clip.start_time + clip.duration_seconds));
    setEditAspectRatio(clip.aspect_ratio || '9:16');
    setEditCaptionPreset(clip.caption_preset || 'bold_pop');
    setEditCaptionPlacement(clip.caption_placement || 'auto');
    setEditHookSentence(clip.hook_sentence || '');

    const style = clip.captions_style || {};
    setEditCaptionSize((style as any).fontSize || 52);
    setEditCaptionTextColor((style as any).color || '#FFFFFF');
    setEditCaptionHighlight((style as any).highlightColor || '#FACC15');

    setIsPlaying(false);
    setCurrentTime(clip.start_time || 0);

    // Fetch captions data for inline editing
    try {
      const caps = await fetchClipCaptions(clip.id);
      setClipCaptionsData(caps);
    } catch (err) {
      console.warn("Could not load captions for preview", err);
    }
  };

  const closeReviewModal = () => {
    setActiveReviewClip(null);
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // Video playback time synchronization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeReviewClip) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      // Loop or stop if reaching trimmed boundary
      if (video.currentTime >= editTrimEnd) {
        video.currentTime = editTrimStart;
        if (!isPlaying) {
          video.pause();
        }
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [activeReviewClip, editTrimStart, editTrimEnd, isPlaying]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime < editTrimStart || video.currentTime >= editTrimEnd) {
        video.currentTime = editTrimStart;
      }
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Save changes to backend
  const handleSaveAdjustments = async () => {
    if (!activeReviewClip) return;
    setIsSavingEdit(true);

    const safeDuration = Math.max(1, Math.round((editTrimEnd - editTrimStart) * 10) / 10);

    try {
      // 1. Update clip core metadata
      const updatedClip = await patchClipApi(activeReviewClip.id, {
        title: editTitle.trim(),
        hook_sentence: editHookSentence.trim(),
        start_time: editTrimStart,
        end_time: editTrimEnd,
        aspect_ratio: editAspectRatio,
        caption_preset: editCaptionPreset,
        caption_placement: editCaptionPlacement,
        is_edited: true,
        captions_style: {
          fontFamily: editCaptionPreset === 'cinematic' ? 'Georgia' : editCaptionPreset === 'minimal' ? 'Inter' : 'Montserrat',
          fontSize: editCaptionSize,
          color: editCaptionTextColor,
          highlightColor: editCaptionHighlight,
          animation: 'pop_in',
          position: editCaptionPlacement as any
        }
      });

      // 2. Update caption style overrides
      await updateClipCaptions(activeReviewClip.id, {
        caption_preset: editCaptionPreset,
        caption_placement: editCaptionPlacement,
        custom_overrides: {
          font_size: editCaptionSize,
          primary_color: editCaptionTextColor,
          highlight_color: editCaptionHighlight,
          position: editCaptionPlacement
        }
      });

      // 3. Update local state list
      setShortsList(prev => prev.map(c => c.id === activeReviewClip.id ? { ...updatedClip, duration_seconds: safeDuration, is_edited: true } : c));
      setActiveReviewClip({ ...updatedClip, duration_seconds: safeDuration, is_edited: true });

      addNotification("Changes Saved", `"${editTitle}" updated successfully.`, "success");
    } catch (err: any) {
      addNotification("Save Failed", err.message || "Failed to persist clip updates", "warning");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Bulk Actions
  const handleSelectAll = () => {
    setSelectedIds(filteredShorts.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleToggleSelect = (clipId: string) => {
    setSelectedIds(prev => prev.includes(clipId) ? prev.filter(id => id !== clipId) : [...prev, clipId]);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} selected Shorts?`)) return;

    setIsBulkDeleting(true);
    try {
      await bulkDeleteClipsApi(selectedIds);
      setShortsList(prev => prev.filter(c => !selectedIds.includes(c.id)));
      addNotification("Clips Deleted", `Removed ${selectedIds.length} Shorts from your library.`, "success");
      setSelectedIds([]);
      if (activeReviewClip && selectedIds.includes(activeReviewClip.id)) {
        closeReviewModal();
      }
    } catch (err: any) {
      addNotification("Delete Failed", err.message || "Could not delete selected clips", "warning");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkExport = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkExporting(true);
    try {
      const res = await bulkExportClipsApi(selectedIds);
      addNotification("Export Queued", `${res.message}. High-definition 1080x1920 rendering initiated in background.`, "info");
      loadClips();
    } catch (err: any) {
      addNotification("Export Failed", err.message || "Failed to initiate bulk export", "warning");
    } finally {
      setIsBulkExporting(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  // Filtered and sorted shorts
  const filteredShorts = useMemo(() => {
    let result = [...shortsList];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q) || (c.hook_sentence && c.hook_sentence.toLowerCase().includes(q)));
    }

    // Filter type
    if (activeFilter === 'edited') {
      result = result.filter(c => c.is_edited === true);
    } else if (activeFilter === 'not_edited') {
      result = result.filter(c => !c.is_edited);
    } else if (activeFilter === 'ready') {
      result = result.filter(c => c.status === 'ready' || c.export_status === 'completed');
    } else if (activeFilter === 'processing') {
      result = result.filter(c => c.status === 'rendering' || c.export_status === 'rendering');
    } else if (activeFilter === 'failed') {
      result = result.filter(c => c.status === 'failed' || c.export_status === 'failed');
    }

    // Sorting
    result.sort((a, b) => {
      if (activeSort === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (activeSort === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (activeSort === 'duration_asc') {
        return a.duration_seconds - b.duration_seconds;
      } else if (activeSort === 'duration_desc') {
        return b.duration_seconds - a.duration_seconds;
      } else if (activeSort === 'score_desc') {
        return b.engagement_score - a.engagement_score;
      }
      return 0;
    });

    return result;
  }, [shortsList, searchQuery, activeFilter, activeSort]);

  return (
    <div className="flex flex-col min-h-screen bg-[#07090D] text-gray-200 font-sans select-none pb-20">
      {/* 1. TOP HEADER & STUDIO TITLE */}
      <div className="border-b border-[#1E2333] bg-[#0E1118]/80 backdrop-blur-md sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-glow-purple">
                <CheckSquare className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Shorts Review Studio
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {shortsList.length} Shorts
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Preview, refine captions, trim timing, adjust aspect ratio, and batch-export viral vertical videos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={loadClips}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#141722] hover:bg-[#1A1F2D] border border-[#202534] text-gray-300 transition-colors"
              title="Refresh Shorts Library"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            </button>

            <Link
              href="/studio"
              className="px-3.5 py-2 rounded-xl bg-[#141722] hover:bg-[#1B202E] border border-[#23293A] text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition-colors"
            >
              <Scissors className="w-3.5 h-3.5 text-purple-400" />
              <span>Open Studio Editor</span>
            </Link>

            <Link
              href="/publishing"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-xs font-bold text-white shadow-glow-purple flex items-center gap-1.5 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Publishing Hub</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 w-full space-y-6">
        {/* 2. FILTER & SORT TOOLBAR */}
        <div className="p-4 rounded-2xl bg-[#0E1118] border border-[#1E2333] flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
          {/* SEARCH & FILTER TABS */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search by title or dialogue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-1.5 rounded-xl bg-[#131620] border border-[#202534] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 w-56"
            />

            <div className="h-4 w-px bg-[#202534] hidden sm:block mx-1" />

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: 'all', label: 'All Shorts' },
                { id: 'edited', label: 'Edited' },
                { id: 'not_edited', label: 'Not Edited' },
                { id: 'ready', label: 'Ready to Export' },
                { id: 'processing', label: 'Processing' },
                { id: 'failed', label: 'Failed' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as FilterType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                    activeFilter === tab.id
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-[#131620] hover:bg-[#181C2A] text-gray-400 hover:text-white border border-[#202534]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* SORTING CONTROLS */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <ArrowUpDown className="w-3.5 h-3.5 text-purple-400" />
              <span>Sort:</span>
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value as SortType)}
                className="px-2.5 py-1.5 rounded-xl bg-[#131620] border border-[#202534] text-white text-xs font-semibold focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="score_desc">Viral Score (High to Low)</option>
                <option value="duration_asc">Duration (Shortest)</option>
                <option value="duration_desc">Duration (Longest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. BULK ACTIONS ACTION BAR (SHOWS WHEN CLIPS ARE SELECTED) */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#12151E] border border-[#23293A] text-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedIds.length === filteredShorts.length ? handleDeselectAll : handleSelectAll}
              className="flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-white"
            >
              {selectedIds.length === filteredShorts.length && filteredShorts.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-purple-400" />
              ) : (
                <Square className="w-4 h-4 text-gray-500" />
              )}
              <span>
                {selectedIds.length === filteredShorts.length && filteredShorts.length > 0 ? 'Deselect All' : 'Select All'}
              </span>
            </button>

            {selectedIds.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[11px] border border-purple-500/30">
                {selectedIds.length} Selected
              </span>
            )}
          </div>

          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2">
              <a
                href={getClipsZipDownloadUrl(activeProject?.id, selectedIds)}
                download
                className="px-3 py-1.5 rounded-xl bg-[#1A1F2D] hover:bg-[#252C3E] text-white border border-[#2E364D] font-semibold text-xs flex items-center gap-1.5 transition-colors"
                title="Download selected as ZIP"
              >
                <Archive className="w-3.5 h-3.5 text-blue-400" />
                <span>Bulk Download (ZIP)</span>
              </a>

              <button
                onClick={handleBulkExport}
                disabled={isBulkExporting}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-purple flex items-center gap-1.5 transition-all"
              >
                {isBulkExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Export Selected</span>
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-semibold text-xs flex items-center gap-1.5 transition-colors"
              >
                {isBulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete Selected</span>
              </button>
            </div>
          ) : (
            <span className="text-gray-500 text-[11px]">
              Tip: Select multiple shorts to bulk export, download as ZIP, or delete.
            </span>
          )}
        </div>

        {/* 4. SHORTS GALLERY CARDS */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-300">Loading AI Shorts library...</p>
          </div>
        ) : filteredShorts.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0E1118] border border-[#1E2333] text-center space-y-4 max-w-lg mx-auto">
            <Film className="w-12 h-12 text-gray-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white">No Shorts Found</h3>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery ? "No clips match your search query." : "Generate clips in AI Clip Generator or create a project to review Shorts."}
              </p>
            </div>
            <Link
              href="/generator"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-glow-purple transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Go to AI Clip Generator</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredShorts.map((clip) => {
              const isSelected = selectedIds.includes(clip.id);
              const isEdited = clip.is_edited;
              const captionLabel = clip.caption_preset
                ? clip.caption_preset.charAt(0).toUpperCase() + clip.caption_preset.slice(1).replace('_', ' ')
                : 'Hormozi';

              return (
                <div
                  key={clip.id}
                  className={`rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden group bg-[#0E1118] ${
                    isSelected
                      ? 'border-purple-500 ring-2 ring-purple-500/30 bg-[#141724]'
                      : 'border-[#1E2333] hover:border-[#2D364D] hover:shadow-xl'
                  }`}
                >
                  {/* TOP CARD MEDIA PREVIEW */}
                  <div className="relative aspect-[9/16] bg-black overflow-hidden cursor-pointer" onClick={() => openReviewModal(clip)}>
                    <img
                      src={resolveMediaUrl(clip.thumbnail_url)}
                      alt={clip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* SELECTION CHECKBOX OVERLAY */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(clip.id);
                      }}
                      className="absolute top-2.5 left-2.5 z-20 p-1 rounded-lg bg-black/60 backdrop-blur-md cursor-pointer hover:bg-black/90 transition-colors border border-white/10"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Square className="w-4 h-4 text-white/70" />
                      )}
                    </div>

                    {/* VIRAL SCORE BADGE */}
                    <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/75 backdrop-blur-md text-yellow-300 border border-yellow-400/30 flex items-center gap-1 shadow-lg">
                      <Flame className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span>{clip.engagement_score}%</span>
                    </div>

                    {/* PLAY OVERLAY HOVER BUTTON */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-glow-purple backdrop-blur-sm transform scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 ml-0.5 fill-white" />
                      </div>
                    </div>

                    {/* BOTTOM DURATION & RESOLUTION OVERLAYS */}
                    <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[10px] font-mono font-bold text-white z-10 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10">
                        {Math.round(clip.duration_seconds)}s
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 text-gray-300">
                        {clip.aspect_ratio || '9:16'} • {clip.resolution_width || 1080}p
                      </span>
                    </div>
                  </div>

                  {/* BOTTOM CARD CONTENT & METADATA */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* CAPTION STATUS PILL */}
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {captionLabel}
                        </span>

                        {/* STATUS PILL */}
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {clip.status}
                        </span>

                        {/* REFRAMING TRACKING PILL */}
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Scan className="w-2.5 h-2.5" />
                          {clip.reframing_config?.mode === 'split_screen'
                            ? 'Split-Screen'
                            : clip.reframing_config?.mode === 'smart_face'
                            ? 'Smart Face'
                            : clip.reframing_config?.mode === 'motion_action'
                            ? 'Motion Tracking'
                            : '9:16 Reframed'}
                        </span>

                        {/* EDITED BADGE */}
                        {isEdited && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Edited
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => openReviewModal(clip)}
                        className="font-bold text-sm text-white line-clamp-2 cursor-pointer hover:text-purple-300 transition-colors leading-tight"
                      >
                        {clip.title}
                      </h3>

                      {clip.hook_sentence && (
                        <p className="text-[11px] text-gray-400 line-clamp-1 italic">
                          "{clip.hook_sentence}"
                        </p>
                      )}
                    </div>

                    {/* CARD QUICK ACTIONS */}
                    <div className="pt-3 border-t border-[#1C2130] flex items-center justify-between text-xs">
                      <button
                        onClick={() => openReviewModal(clip)}
                        className="px-3 py-1.5 rounded-xl bg-[#161A26] hover:bg-[#202638] text-purple-300 font-semibold text-xs flex items-center gap-1.5 transition-colors border border-[#242A3D]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review & Edit</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setThumbnailModalClip(clip);
                            setThumbnailModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-[#1A1F2D] transition-colors"
                          title="Design Custom AI Thumbnail"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={getClipDownloadUrl(clip.id)}
                          download
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1F2D] transition-colors"
                          title="Download MP4"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <Link
                          href="/studio"
                          onClick={() => setActiveClip(clip)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-[#1A1F2D] transition-colors"
                          title="Open in Studio Timeline"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. DETAILED VIDEO PREVIEW & ADJUSTMENTS MODAL */}
      {activeReviewClip && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="max-w-5xl w-full max-h-[92vh] rounded-3xl bg-[#0E1118] border border-[#23293A] flex flex-col md:flex-row overflow-hidden shadow-2xl">
            {/* LEFT: LARGE 9:16 VERTICAL VIDEO PLAYER */}
            <div
              ref={playerContainerRef}
              className="flex-1 bg-black flex flex-col items-center justify-center p-4 relative min-h-[380px] md:min-h-[560px]"
            >
              <div
                className={`relative overflow-hidden rounded-2xl shadow-2xl bg-black border border-white/10 ${
                  editAspectRatio === '1:1'
                    ? 'aspect-square max-h-[460px]'
                    : editAspectRatio === '16:9'
                    ? 'aspect-video w-full max-w-[480px]'
                    : 'aspect-[9/16] max-h-[480px]'
                }`}
              >
                <video
                  ref={videoRef}
                  src={resolveMediaUrl(activeReviewClip.export_video_url || activeReviewClip.video_url)}
                  playsInline
                  loop
                  muted={isMuted}
                  className="w-full h-full object-cover"
                />

                {/* OVERLAY HOOK SENTENCE */}
                {editHookSentence && currentTime <= (editTrimStart + 3.5) && (
                  <div className="absolute top-8 inset-x-4 text-center pointer-events-none animate-in fade-in duration-200 z-10">
                    <span className="inline-block px-3 py-1 rounded-xl bg-black/90 text-[11px] font-black uppercase text-yellow-300 tracking-tight shadow-xl border border-yellow-400/30">
                      {editHookSentence}
                    </span>
                  </div>
                )}

                {/* OVERLAY CAPTION PREVIEW */}
                <div
                  className={`absolute inset-x-4 text-center pointer-events-none transition-all z-10 ${
                    editCaptionPlacement === 'top'
                      ? 'top-16'
                      : editCaptionPlacement === 'middle'
                      ? 'top-1/2 -translate-y-1/2'
                      : 'bottom-14'
                  }`}
                >
                  <div className="inline-block px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-sm shadow-xl">
                    <p
                      className="tracking-tight font-black"
                      style={{
                        fontSize: `${Math.max(14, editCaptionSize * 0.36)}px`,
                        color: editCaptionTextColor,
                        textShadow: `-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 3px 6px rgba(0,0,0,0.8)`
                      }}
                    >
                      <span>VIRAL </span>
                      <span style={{ color: editCaptionHighlight }}>HIGHLIGHT</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* VIDEO SCRUBBER & PLAYBACK CONTROLS */}
              <div className="w-full max-w-md mt-4 space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-purple-400 font-bold text-[11px] w-12 text-right">
                    {formatSeconds(currentTime)}
                  </span>

                  <input
                    type="range"
                    min={editTrimStart}
                    max={editTrimEnd}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 accent-purple-500 cursor-pointer h-1.5 bg-[#1F2433] rounded-lg"
                  />

                  <span className="font-mono text-gray-400 font-bold text-[11px] w-12">
                    {formatSeconds(editTrimEnd)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs px-2 text-gray-400">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlay}
                      className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-colors shadow-md"
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 ml-0.5 fill-white" />}
                    </button>

                    <button
                      onClick={() => {
                        if (videoRef.current) videoRef.current.currentTime = editTrimStart;
                        setCurrentTime(editTrimStart);
                      }}
                      className="p-1.5 rounded-lg hover:text-white hover:bg-[#1A1F2D]"
                      title="Restart to trim start"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-lg hover:text-white hover:bg-[#1A1F2D]"
                      title={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg hover:text-white hover:bg-[#1A1F2D]"
                      title="Toggle Fullscreen"
                    >
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>

                    <a
                      href={getClipDownloadUrl(activeReviewClip.id)}
                      download
                      className="px-2.5 py-1.5 rounded-lg bg-[#1C2130] hover:bg-[#252C40] text-white text-[11px] font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: EDITING ADJUSTMENTS PANEL */}
            <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-[#202534] bg-[#0E1118] flex flex-col justify-between max-h-[85vh] overflow-y-auto p-5 space-y-5 text-xs">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E2333]">
                  <div>
                    <h3 className="font-bold text-white text-sm">Fine-Tune Short</h3>
                    <p className="text-[10px] text-gray-400">Final adjustments persist directly to database</p>
                  </div>
                  <button
                    onClick={closeReviewModal}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* TITLE INPUT */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Short Title
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131620] border border-[#202534] text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* HOOK SENTENCE */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Opening Hook (First 3.5s)
                  </label>
                  <input
                    type="text"
                    value={editHookSentence}
                    onChange={(e) => setEditHookSentence(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#131620] border border-[#202534] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* ASPECT RATIO */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Aspect Ratio
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '9:16', label: '9:16 (Shorts)', desc: '1080×1920' },
                      { id: '1:1', label: '1:1 (Square)', desc: '1080×1080' },
                      { id: '16:9', label: '16:9 (Landscape)', desc: '1920×1080' },
                    ].map(ar => (
                      <button
                        key={ar.id}
                        onClick={() => setEditAspectRatio(ar.id)}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          editAspectRatio === ar.id
                            ? 'bg-purple-600/20 border-purple-500 text-white font-bold'
                            : 'bg-[#131620] border-[#202534] text-gray-400 hover:text-white'
                        }`}
                      >
                        <p className="text-xs">{ar.id}</p>
                        <p className="text-[9px] text-gray-500">{ar.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* TRIM TIMING (START & END) */}
                <div className="space-y-2 p-3 rounded-2xl bg-[#131620] border border-[#202534]">
                  <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <span>Trim Duration</span>
                    <span className="text-purple-400 font-mono">
                      {Math.max(1, Math.round((editTrimEnd - editTrimStart) * 10) / 10)}s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[10px] text-gray-400">Start (sec)</span>
                      <input
                        type="number"
                        min={0}
                        max={editTrimEnd - 1}
                        step={0.5}
                        value={editTrimStart}
                        onChange={(e) => setEditTrimStart(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0C10] border border-[#202534] text-white text-xs font-mono font-bold mt-1"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400">End (sec)</span>
                      <input
                        type="number"
                        min={editTrimStart + 1}
                        step={0.5}
                        value={editTrimEnd}
                        onChange={(e) => setEditTrimEnd(Math.max(editTrimStart + 1, parseFloat(e.target.value) || editTrimStart + 1))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0C10] border border-[#202534] text-white text-xs font-mono font-bold mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* CAPTION POSITIONING & FONT SIZE */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Caption Placement
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { id: 'auto', label: 'Auto' },
                        { id: 'bottom', label: 'Bottom' },
                        { id: 'middle', label: 'Middle' },
                        { id: 'top', label: 'Top' },
                      ].map(pos => (
                        <button
                          key={pos.id}
                          onClick={() => setEditCaptionPlacement(pos.id)}
                          className={`py-1.5 rounded-lg border text-xs font-semibold ${
                            editCaptionPlacement === pos.id
                              ? 'bg-purple-600 text-white border-purple-500'
                              : 'bg-[#131620] border-[#202534] text-gray-400 hover:text-white'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-gray-400 font-bold uppercase">
                      <span>Caption Font Size</span>
                      <span className="text-white">{editCaptionSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={65}
                      value={editCaptionSize}
                      onChange={(e) => setEditCaptionSize(parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>

                  {/* CAPTION COLORS */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      Highlight Color
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {['#00FF00', '#FACC15', '#00F0FF', '#38BDF8', '#A855F7', '#EC4899', '#F59E0B'].map(col => (
                        <button
                          key={col}
                          onClick={() => setEditCaptionHighlight(col)}
                          className={`w-6 h-6 rounded-md border-2 transition-transform ${
                            editCaptionHighlight === col ? 'border-white scale-110 shadow-md' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SAVE ACTION BUTTONS */}
              <div className="pt-4 border-t border-[#1E2333] space-y-2">
                <button
                  onClick={handleSaveAdjustments}
                  disabled={isSavingEdit}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-glow-purple flex items-center justify-center gap-2 transition-all"
                >
                  {isSavingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Adjustments...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (activeReviewClip) {
                      setThumbnailModalClip(activeReviewClip);
                      setThumbnailModalOpen(true);
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-600/20 hover:from-amber-500/30 hover:to-purple-600/30 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Design AI Thumbnail & Cover</span>
                </button>

                <div className="flex items-center gap-2">
                  <Link
                    href="/studio"
                    onClick={() => setActiveClip(activeReviewClip)}
                    className="flex-1 py-2 rounded-xl bg-[#141722] hover:bg-[#1B202E] text-gray-300 font-semibold text-xs border border-[#202534] flex items-center justify-center gap-1.5"
                  >
                    <Scissors className="w-3 h-3 text-purple-400" />
                    <span>Open in Studio</span>
                  </Link>

                  <button
                    onClick={closeReviewModal}
                    className="px-4 py-2 rounded-xl bg-[#141722] hover:bg-[#1B202E] text-gray-400 hover:text-white text-xs border border-[#202534]"
                  >
                    Close
                  </button>
                </div>
              </div>
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
          setShortsList((prev) =>
            prev.map((c) => (c.id === thumbnailModalClip?.id ? { ...c, thumbnail_url: newThumb } : c))
          );
          if (activeReviewClip && activeReviewClip.id === thumbnailModalClip?.id) {
            setActiveReviewClip((prev) => (prev ? { ...prev, thumbnail_url: newThumb } : prev));
          }
        }}
      />
    </div>
  );
}


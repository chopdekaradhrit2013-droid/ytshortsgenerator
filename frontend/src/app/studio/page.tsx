"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Scissors,
  Split,
  Crop,
  Type,
  Music,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Sparkles,
  Sliders,
  Layers,
  Settings2,
  FileVideo,
  Download,
  Share2,
  Check,
  Plus,
  Trash2,
  Eye,
  Lock,
  Unlock,
  AlertCircle,
  Flame,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Wand2,
  Languages,
  Save,
  Edit3,
  RefreshCw,
  FolderOpen,
  Film,
  Zap
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  StudioProject,
  TimelineTrack,
  TimelineTrackItem,
  VideoAdjustments,
  CanvasSettings,
  CaptionsState,
  AudioState,
  OverlaysState,
  ExportSettings,
  GeneratedClip,
  ReframingConfig,
  ReframingMode,
  TrackingQualityMode
} from '@/types';
import {
  resolveMediaUrl,
  fetchStudioProjectApi,
  saveStudioProjectApi,
  autosaveStudioProjectApi,
  renameStudioProjectApi,
  duplicateStudioProjectApi,
  fetchStudioPresetsApi,
  saveStudioPresetApi,
  fetchStudioAssetsApi,
  requestAIAssistApi,
  triggerMultiTrackRenderApi,
  getExportStatus,
  fetchClipCaptions,
  updateClipCaptions,
  regenerateClipCaptions,
  fetchClipHooks,
  getClipReframingApi,
  updateClipReframingApi,
  analyzeReframingApi
} from '@/lib/api';

// Subcomponents
import { MultiTrackTimeline } from '@/components/studio/MultiTrackTimeline';
import { VideoPreviewCanvas } from '@/components/studio/VideoPreviewCanvas';
import { PropertiesInspector, InspectorTabType } from '@/components/studio/PropertiesInspector';
import { MediaAndToolsSidebar } from '@/components/studio/MediaAndToolsSidebar';
import { AIAssistantModal } from '@/components/studio/AIAssistantModal';
import { AdvancedExportModal } from '@/components/studio/AdvancedExportModal';
import { StudioProjectsModal } from '@/components/studio/StudioProjectsModal';
import { ThumbnailStudioModal } from '@/components/studio/ThumbnailStudioModal';
import { Image as ImageIcon } from 'lucide-react';

export default function StudioPage() {
  const {
    activeProject,
    activeClip,
    clips,
    setActiveClip,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    addNotification
  } = useApp();

  // ---------------------------------------------------------------------------
  // 1. STUDIO PROJECT PERSISTENT STATE
  // ---------------------------------------------------------------------------
  const [studioProject, setStudioProject] = useState<StudioProject | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutosavedAt, setLastAutosavedAt] = useState<string>("Just now");
  const [projectName, setProjectName] = useState("Untitled AI Short");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Video adjustments & transforms
  const [videoAdjustments, setVideoAdjustments] = useState<VideoAdjustments>({
    brightness: 0,
    contrast: 1.0,
    saturation: 1.0,
    blur: 0,
    speed: 1.0,
    flip_h: false,
    flip_v: false,
    rotate: 0,
    crop_mode: 'smart_face',
    scale: 100,
    fade_in: 0.0,
    fade_out: 0.0,
    transition: 'none'
  });

  // Canvas settings
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    width: 1080,
    height: 1920,
    bg_color: '#090A0F',
    bg_blur: true,
    fit_mode: 'contain_blur',
    show_safe_guides: true
  });
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');

  // Captions state
  const [captionsState, setCaptionsState] = useState<CaptionsState>({
    preset: 'bold_pop',
    font_family: 'Montserrat',
    font_size: 52,
    font_weight: 900,
    primary_color: '#FFFFFF',
    highlight_color: '#FACC15',
    bg_color: '#000000',
    bg_opacity: 0,
    outline_width: 4.5,
    shadow_offset: 2.0,
    placement: 'bottom',
    animation: 'pop',
    uppercase: true,
    words_per_line: 4,
    segments: []
  });

  // Audio state
  const [audioState, setAudioState] = useState<AudioState>({
    video_audio_volume: 1.0,
    video_audio_muted: false,
    bgm_track: 'lofi_chill',
    bgm_volume: 0.14,
    bgm_fade_in: 1.0,
    bgm_fade_out: 2.0,
    loudnorm: true,
    denoise: true,
    speech_boost: true,
    voiceover_volume: 1.0,
    voiceover_file: null
  });

  // Overlays state (titles, stickers, shapes, watermark)
  const [overlaysState, setOverlaysState] = useState<OverlaysState>({
    titles: [],
    stickers: [],
    shapes: [],
    watermark: {
      enabled: false,
      text: '@AiShortsFactory',
      opacity: 0.75,
      position: 'top_right'
    }
  });

  // Timeline tracks
  const [tracks, setTracks] = useState<TimelineTrack[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [timelineZoom, setTimelineZoom] = useState<number>(1.0);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Reframing & Tracking State
  const [reframingConfig, setReframingConfig] = useState<ReframingConfig | null>(null);
  const [isAnalyzingReframing, setIsAnalyzingReframing] = useState(false);

  // UI Panels State
  const [leftTab, setLeftTab] = useState<'clips' | 'audio' | 'text' | 'presets'>('clips');
  const [inspectorTab, setInspectorTab] = useState<InspectorTabType>('video');

  // Modals State
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);
  const [savePresetModalOpen, setSavePresetModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetCategory, setNewPresetCategory] = useState("custom");
  const [studioPresets, setStudioPresets] = useState<any[]>([]);

  // Video Ref
  const videoRef = useRef<HTMLVideoElement>(null);

  const totalDuration = studioProject?.timeline_data?.duration || activeClip?.duration_seconds || 45.0;

  // ---------------------------------------------------------------------------
  // 2. LOAD STUDIO PROJECT FROM API
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!activeClip?.id) return;
    setIsLoadingProject(true);
    fetchStudioProjectApi(activeClip.id, activeProject?.id)
      .then((data: StudioProject) => {
        setStudioProject(data);
        setProjectName(data.name || activeClip.title);
        setAspectRatio((data.aspect_ratio as any) || '9:16');
        if (data.canvas_settings) setCanvasSettings(data.canvas_settings);
        if (data.video_adjustments) setVideoAdjustments(data.video_adjustments);
        if (data.captions_state) setCaptionsState(data.captions_state);
        if (data.audio_state) setAudioState(data.audio_state);
        if (data.overlays_state) setOverlaysState(data.overlays_state);
        if (data.timeline_data?.tracks) {
          setTracks(data.timeline_data.tracks);
          if (data.timeline_data.tracks[0]?.items[0]) {
            setSelectedItemId(data.timeline_data.tracks[0].items[0].id);
          }
        }
        if (data.reframing_settings) {
          setReframingConfig(data.reframing_settings);
        } else if (activeClip.reframing_config) {
          setReframingConfig(activeClip.reframing_config);
        }
        pushToHistory(data);
      })
      .catch((err) => {
        console.error("Failed to load studio project", err);
      })
      .finally(() => setIsLoadingProject(false));
  }, [activeClip?.id]);

  // Fetch latest clip reframing details
  useEffect(() => {
    if (!activeClip?.id) return;
    getClipReframingApi(activeClip.id)
      .then((cfg) => {
        if (cfg && cfg.mode) {
          setReframingConfig(cfg);
        }
      })
      .catch(() => {});
  }, [activeClip?.id]);

  // Load Presets on Mount
  useEffect(() => {
    fetchStudioPresetsApi()
      .then((res) => setStudioPresets(res.presets || []))
      .catch(console.error);
  }, []);

  // ---------------------------------------------------------------------------
  // 3. UNDO / REDO HISTORY STACK
  // ---------------------------------------------------------------------------
  const pushToHistory = (snapshot: any) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, snapshot];
    });
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const snap = history[prevIdx];
      setHistoryIndex(prevIdx);
      applySnapshot(snap);
      addNotification("Undo", "Reverted previous edit", "info");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const snap = history[nextIdx];
      setHistoryIndex(nextIdx);
      applySnapshot(snap);
      addNotification("Redo", "Restored edit", "info");
    }
  };

  const applySnapshot = (snap: any) => {
    if (!snap) return;
    if (snap.video_adjustments) setVideoAdjustments(snap.video_adjustments);
    if (snap.captions_state) setCaptionsState(snap.captions_state);
    if (snap.audio_state) setAudioState(snap.audio_state);
    if (snap.overlays_state) setOverlaysState(snap.overlays_state);
    if (snap.timeline_data?.tracks) setTracks(snap.timeline_data.tracks);
    if (snap.aspect_ratio) setAspectRatio(snap.aspect_ratio);
  };

  // ---------------------------------------------------------------------------
  // 4. AUTOSAVE ENGINE (Every 25 seconds)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!studioProject?.id) return;
    const timer = setInterval(() => {
      const payload = {
        name: projectName,
        aspect_ratio: aspectRatio,
        canvas_settings: canvasSettings,
        timeline_data: {
          duration: totalDuration,
          playhead: currentTime,
          zoom_level: timelineZoom,
          tracks
        },
        video_adjustments: videoAdjustments,
        captions_state: captionsState,
        audio_state: audioState,
        overlays_state: overlaysState
      };
      autosaveStudioProjectApi(studioProject.id, payload)
        .then(() => {
          const now = new Date();
          setLastAutosavedAt(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
        })
        .catch(() => {});
    }, 25000);

    return () => clearInterval(timer);
  }, [
    studioProject?.id,
    projectName,
    aspectRatio,
    canvasSettings,
    totalDuration,
    currentTime,
    timelineZoom,
    tracks,
    videoAdjustments,
    captionsState,
    audioState,
    overlaysState
  ]);

  // ---------------------------------------------------------------------------
  // 5. MANUAL SAVE PROJECT & REFRAMING
  // ---------------------------------------------------------------------------
  const handleSaveProject = async () => {
    if (!studioProject?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        name: projectName,
        aspect_ratio: aspectRatio,
        canvas_settings: canvasSettings,
        timeline_data: {
          duration: totalDuration,
          playhead: currentTime,
          zoom_level: timelineZoom,
          tracks
        },
        video_adjustments: videoAdjustments,
        captions_state: captionsState,
        audio_state: audioState,
        overlays_state: overlaysState,
        reframing_settings: reframingConfig || undefined
      };
      const res = await saveStudioProjectApi(studioProject.id, payload);
      setStudioProject(res.project);
      if (activeClip?.id && reframingConfig) {
        updateClipReframingApi(activeClip.id, reframingConfig).catch(console.error);
      }
      addNotification("Project Saved", "All timeline cuts, audio mixes, styling and reframing saved.", "success");
    } catch (err: any) {
      addNotification("Save Failed", err.message || "Failed to save project.", "warning");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateReframingConfig = (updates: Partial<ReframingConfig>) => {
    setReframingConfig((prev) => {
      const next: ReframingConfig = prev
        ? { ...prev, ...updates }
        : ({
            mode: 'auto',
            quality_mode: 'smart',
            center_x_ratio: 0.5,
            center_y_ratio: 0.5,
            zoom_scale: 1.0,
            smoothness: 0.85,
            safe_headroom: 0.14,
            ...updates
          } as ReframingConfig);

      if (activeClip?.id) {
        updateClipReframingApi(activeClip.id, updates).catch(console.error);
      }
      return next;
    });
  };

  const handleAnalyzeReframing = async (mode?: ReframingMode, quality?: TrackingQualityMode) => {
    if (!activeClip?.id) {
      addNotification("No Active Clip", "Please select a clip to analyze.", "warning");
      return;
    }
    setIsAnalyzingReframing(true);
    try {
      const res = await analyzeReframingApi({
        clip_id: activeClip.id,
        mode: mode || reframingConfig?.mode || 'auto',
        quality_mode: quality || reframingConfig?.quality_mode || 'smart'
      });
      if (res.config) {
        setReframingConfig(res.config);
        addNotification(
          "Reframing Analysis Complete",
          `Detected ${res.config.face_count ?? (res.config.face_detected ? 1 : 0)} face(s), ${res.config.sample_count || 0} track points.`,
          "success"
        );
      }
    } catch (err: any) {
      addNotification("Reframing Error", err.message || "Failed to analyze reframing.", "warning");
    } finally {
      setIsAnalyzingReframing(false);
    }
  };

  // Rename Project
  const handleRenameSubmit = async () => {
    if (!studioProject?.id || !projectName.trim()) return;
    setIsEditingTitle(false);
    try {
      await renameStudioProjectApi(studioProject.id, projectName.trim());
      addNotification("Project Renamed", `Updated title to "${projectName}"`, "success");
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. VIDEO PLAYBACK LOOP & TIMELINE SYNC
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let animFrame: number;
    if (isPlaying) {
      const speed = videoAdjustments.speed || 1.0;
      const startTime = Date.now() - (currentTime * 1000) / speed;
      const updateLoop = () => {
        const elapsed = ((Date.now() - startTime) / 1000) * speed;
        if (elapsed >= totalDuration) {
          setCurrentTime(0);
          setIsPlaying(false);
          if (videoRef.current) videoRef.current.currentTime = 0;
        } else {
          setCurrentTime(elapsed);
          if (videoRef.current && Math.abs(videoRef.current.currentTime - elapsed) > 0.3) {
            videoRef.current.currentTime = elapsed;
          }
          animFrame = requestAnimationFrame(updateLoop);
        }
      };
      animFrame = requestAnimationFrame(updateLoop);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isPlaying, videoAdjustments.speed, totalDuration, currentTime, setCurrentTime, setIsPlaying]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      videoRef.current?.pause();
    } else {
      setIsPlaying(true);
      videoRef.current?.play().catch(() => {});
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // ---------------------------------------------------------------------------
  // 7. KEYBOARD SHORTCUTS (Space, S, Del, M, Ctrl+Z, Ctrl+Y, Arrows)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      // Space: Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      }
      // S: Split clip at playhead
      else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (selectedItemId) {
          let trkId = "";
          for (const t of tracks) {
            if (t.items.some(i => i.id === selectedItemId)) {
              trkId = t.id;
              break;
            }
          }
          if (trkId) handleSplitItem(trkId, selectedItemId, currentTime);
        }
      }
      // Delete / Backspace: Delete item
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        if (selectedItemId) {
          let trkId = "";
          for (const t of tracks) {
            if (t.items.some(i => i.id === selectedItemId)) {
              trkId = t.id;
              break;
            }
          }
          if (trkId) handleDeleteItem(trkId, selectedItemId);
        }
      }
      // M: Mute
      else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setAudioState(prev => ({ ...prev, video_audio_muted: !prev.video_audio_muted }));
      }
      // Ctrl/Cmd + Z: Undo
      else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z: Redo
      else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
      // Left Arrow: Step back 0.1s
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 0.1));
      }
      // Right Arrow: Step forward 0.1s
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(totalDuration, currentTime + 0.1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, isPlaying, selectedItemId, tracks, totalDuration, historyIndex]);

  // ---------------------------------------------------------------------------
  // 8. TIMELINE ITEM MUTATIONS (Split, Delete, Duplicate, Trim)
  // ---------------------------------------------------------------------------
  const handleSplitItem = (trackId: string, itemId: string, splitTime: number) => {
    setTracks(prev =>
      prev.map(trk => {
        if (trk.id !== trackId) return trk;
        const itemIdx = trk.items.findIndex(i => i.id === itemId);
        if (itemIdx === -1) return trk;
        const item = trk.items[itemIdx];

        const itemStart = item.start_time || 0;
        const itemDur = item.duration || 10.0;
        const itemEnd = itemStart + itemDur;

        if (splitTime <= itemStart || splitTime >= itemEnd) {
          addNotification("Invalid Split", "Playhead must be within the selected clip bounds.", "info");
          return trk;
        }

        const durPart1 = splitTime - itemStart;
        const durPart2 = itemEnd - splitTime;

        const part1: TimelineTrackItem = {
          ...item,
          duration: durPart1
        };
        const part2: TimelineTrackItem = {
          ...item,
          id: `${item.id}_part2_${Date.now()}`,
          start_time: splitTime,
          duration: durPart2,
          source_start: (item.source_start || 0) + durPart1
        };

        const newItems = [...trk.items];
        newItems.splice(itemIdx, 1, part1, part2);
        return { ...trk, items: newItems };
      })
    );
    addNotification("Clip Split", `Split clip at ${splitTime.toFixed(1)}s`, "success");
  };

  const handleDeleteItem = (trackId: string, itemId: string) => {
    setTracks(prev =>
      prev.map(trk => {
        if (trk.id !== trackId) return trk;
        return { ...trk, items: trk.items.filter(i => i.id !== itemId) };
      })
    );
    setSelectedItemId(null);
    addNotification("Item Deleted", "Removed timeline element.", "info");
  };

  const handleDuplicateItem = (trackId: string, itemId: string) => {
    setTracks(prev =>
      prev.map(trk => {
        if (trk.id !== trackId) return trk;
        const item = trk.items.find(i => i.id === itemId);
        if (!item) return trk;
        const dup: TimelineTrackItem = {
          ...item,
          id: `${item.id}_dup_${Date.now()}`,
          start_time: (item.start_time || 0) + (item.duration || 3.0),
          title: `${item.title || 'Clip'} (Copy)`
        };
        return { ...trk, items: [...trk.items, dup] };
      })
    );
    addNotification("Duplicated", "Created copy on timeline.", "success");
  };

  const handleToggleMuteTrack = (trackId: string) => {
    setTracks(prev =>
      prev.map(trk => (trk.id === trackId ? { ...trk, muted: !trk.muted } : trk))
    );
  };

  const handleToggleLockTrack = (trackId: string) => {
    setTracks(prev =>
      prev.map(trk => (trk.id === trackId ? { ...trk, locked: !trk.locked } : trk))
    );
  };

  // ---------------------------------------------------------------------------
  // 9. ADD GRAPHIC & AUDIO OVERLAYS TO TIMELINE
  // ---------------------------------------------------------------------------
  const handleAddTitleOverlay = (titleText: string) => {
    const newTitle = {
      id: `title_${Date.now()}`,
      text: titleText,
      start_time: Math.max(0, currentTime),
      duration: 3.5,
      position_y: 18,
      position_x: 50,
      font_family: 'Montserrat',
      font_size: 44,
      color: '#FFFFFF',
      bg_color: '#000000',
      bg_opacity: 0.75,
      animation: 'slide_down'
    };
    setOverlaysState(prev => ({ ...prev, titles: [...(prev.titles || []), newTitle] }));

    // Also add to Timeline track T1
    setTracks(prev =>
      prev.map(trk => {
        if (trk.id === 'track_t1') {
          return {
            ...trk,
            items: [
              ...trk.items,
              {
                id: newTitle.id,
                track_id: 'track_t1',
                type: 'text',
                title: titleText,
                start_time: newTitle.start_time,
                duration: newTitle.duration
              } as any
            ]
          };
        }
        return trk;
      })
    );
    addNotification("Title Added", `Placed "${titleText}" at ${currentTime.toFixed(1)}s`, "success");
  };

  const handleAddEmojiOverlay = (emoji: string) => {
    handleAddTitleOverlay(emoji);
  };

  const handleAddStickerOverlay = (stickerName: string) => {
    handleAddTitleOverlay(`[${stickerName.toUpperCase()}]`);
  };

  // ---------------------------------------------------------------------------
  // 10. APPLY PRESETS
  // ---------------------------------------------------------------------------
  const handleApplyPreset = (presetOrKey: any) => {
    const key = typeof presetOrKey === 'string' ? presetOrKey : presetOrKey.id?.replace('sp_', '');
    if (key === 'mrbeast') {
      setCaptionsState(prev => ({
        ...prev,
        preset: 'mrbeast',
        font_family: 'Impact',
        font_size: 56,
        font_weight: 900,
        primary_color: '#FFFFFF',
        highlight_color: '#00FF00',
        words_per_line: 3,
        animation: 'pop',
        outline_width: 6.0
      }));
      setAudioState(prev => ({ ...prev, bgm_track: 'energetic_trap', bgm_volume: 0.16 }));
    } else if (key === 'gaming') {
      setCaptionsState(prev => ({
        ...prev,
        preset: 'gaming',
        font_family: 'Impact',
        font_size: 54,
        primary_color: '#FFFFFF',
        highlight_color: '#00F0FF',
        placement: 'middle',
        animation: 'pop'
      }));
      setVideoAdjustments(prev => ({ ...prev, contrast: 1.25, saturation: 1.35, speed: 1.0 }));
      setAudioState(prev => ({ ...prev, bgm_track: 'synthwave_hype', bgm_volume: 0.18 }));
    } else if (key === 'cinematic') {
      setCaptionsState(prev => ({
        ...prev,
        preset: 'cinematic',
        font_family: 'Georgia',
        font_size: 38,
        primary_color: '#F3F4F6',
        highlight_color: '#FBBF24',
        animation: 'fade'
      }));
      setVideoAdjustments(prev => ({ ...prev, contrast: 1.15, saturation: 0.9, fade_in: 0.8, fade_out: 0.8, transition: 'dissolve' }));
      setAudioState(prev => ({ ...prev, bgm_track: 'cinematic_ambient', bgm_volume: 0.15 }));
    } else if (key === 'football') {
      setCaptionsState(prev => ({
        ...prev,
        preset: 'mrbeast',
        font_family: 'Impact',
        font_size: 56,
        highlight_color: '#FACC15',
        animation: 'bounce'
      }));
      setVideoAdjustments(prev => ({ ...prev, contrast: 1.2, saturation: 1.25, speed: 1.05 }));
      setAudioState(prev => ({ ...prev, bgm_track: 'energetic_trap', bgm_volume: 0.18 }));
    } else if (key === 'podcast') {
      setCaptionsState(prev => ({
        ...prev,
        preset: 'bold_pop',
        font_family: 'Inter',
        font_size: 46,
        highlight_color: '#F59E0B'
      }));
      setAudioState(prev => ({ ...prev, bgm_track: 'lofi_chill', bgm_volume: 0.10, loudnorm: true, denoise: true }));
    } else if (key === 'minimal') {
      setCaptionsState(prev => ({
        ...prev,
        preset: 'minimal',
        font_family: 'Inter',
        font_size: 38,
        primary_color: '#FFFFFF',
        highlight_color: '#38BDF8',
        bg_color: '#000000',
        bg_opacity: 0.5,
        animation: 'none'
      }));
      setAudioState(prev => ({ ...prev, bgm_track: 'none', bgm_volume: 0.0 }));
    } else {
      // Default / Hormozi bold pop
      setCaptionsState(prev => ({
        ...prev,
        preset: 'bold_pop',
        font_family: 'Montserrat',
        font_size: 52,
        primary_color: '#FFFFFF',
        highlight_color: '#FACC15',
        animation: 'pop'
      }));
      setAudioState(prev => ({ ...prev, bgm_track: 'lofi_chill', bgm_volume: 0.14 }));
    }
    addNotification("Preset Applied", `Applied "${typeof presetOrKey === 'string' ? presetOrKey : presetOrKey.name}" template.`, "success");
  };

  // Save Custom Preset
  const handleSaveCustomPreset = async () => {
    if (!newPresetName.trim()) return;
    try {
      const config = {
        aspect_ratio: aspectRatio,
        video_adjustments: videoAdjustments,
        captions: captionsState,
        audio: audioState
      };
      await saveStudioPresetApi({
        name: newPresetName.trim(),
        category: newPresetCategory,
        config
      });
      setSavePresetModalOpen(false);
      setNewPresetName("");
      addNotification("Preset Saved", `Custom template "${newPresetName}" saved to library.`, "success");
      // Refresh presets
      fetchStudioPresetsApi().then(res => setStudioPresets(res.presets || []));
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to save preset.", "warning");
    }
  };

  // Find active subtitle segment and word
  const activeSegment = (captionsState.segments || []).find(
    (seg: any) => currentTime >= seg.start && currentTime <= seg.end
  );
  const activeWordIdx = activeSegment
    ? (activeSegment.words || []).findIndex(
        (w: any) => currentTime >= w.start && currentTime <= w.end
      )
    : -1;

  // Video URL resolution
  const activeVideoUrl = activeClip?.video_url || `/media/exports/preview_${activeClip?.id}.mp4`;

  return (
    <div className="flex flex-col h-screen bg-[#07080D] text-gray-200 overflow-hidden font-sans select-none">
      {/* --------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & STUDIO CONTROLS BAR */}
      {/* --------------------------------------------------------------------- */}
      <header className="h-14 border-b border-[#1C2030] bg-[#0E111A] px-5 flex items-center justify-between flex-shrink-0 z-20">
        {/* Project Title & Navigation */}
        <div className="flex items-center gap-3">
          <Link
            href="/review"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition"
          >
            ← Review Studio
          </Link>
          <div className="w-[1px] h-4 bg-gray-700" />

          {/* Project Title with inline Rename */}
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit();
                  }}
                  autoFocus
                  className="px-2 py-0.5 bg-[#141824] border border-purple-500 rounded text-xs text-white font-bold"
                />
                <button onClick={handleRenameSubmit} className="text-emerald-400 p-1">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-1.5 cursor-pointer group"
              >
                <h1 className="text-xs font-bold text-white max-w-sm truncate group-hover:text-purple-300 transition">
                  {projectName}
                </h1>
                <Edit3 className="w-3 h-3 text-gray-500 group-hover:text-purple-400" />
              </div>
            )}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25">
              v{studioProject?.version || 1}
            </span>
          </div>
        </div>

        {/* Center Quick Tools: Undo/Redo, Reopen, AI Assistant */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex items-center gap-0.5 bg-[#141824] p-1 rounded-xl border border-[#222738]">
            <button
              type="button"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Reopen Projects */}
          <button
            type="button"
            onClick={() => setProjectsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1C2234] border border-[#222738] text-xs text-gray-300 hover:text-white transition"
          >
            <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
            <span>Projects</span>
          </button>

          {/* AI Assistant Button */}
          <button
            type="button"
            onClick={() => setAiModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-xs font-semibold text-purple-300 hover:text-white transition shadow-sm"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Copilot</span>
          </button>

          {/* AI Thumbnail Studio Button */}
          <button
            type="button"
            onClick={() => setThumbnailModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-semibold text-amber-300 hover:text-white transition shadow-sm"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>Thumbnails</span>
          </button>
        </div>

        {/* Right Actions: Autosave indicator, Save, Export */}
        <div className="flex items-center gap-3">
          {/* Autosaved Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Autosaved: {lastAutosavedAt}</span>
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSaveProject}
            disabled={isSaving}
            className="px-3.5 py-1.5 rounded-xl bg-[#141824] hover:bg-[#1E2436] border border-[#262C40] text-xs font-semibold text-gray-200 flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-blue-400" />}
            <span>Save</span>
          </button>

          {/* Export Short Button */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-600/25"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Short</span>
          </button>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* 2. MAIN WORKSPACE (Left Tools, Center Preview, Right Inspector) */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Media, Audio, Graphics, Presets */}
        <MediaAndToolsSidebar
          leftTab={leftTab}
          onLeftTabChange={setLeftTab}
          clips={clips}
          activeClip={activeClip}
          onSelectClip={(c) => setActiveClip(c)}
          onAddTitleOverlay={handleAddTitleOverlay}
          onAddEmojiOverlay={handleAddEmojiOverlay}
          onAddStickerOverlay={handleAddStickerOverlay}
          onSelectBgmTrack={(trk) => setAudioState(prev => ({ ...prev, bgm_track: trk }))}
          currentBgmTrack={audioState.bgm_track}
          studioPresets={studioPresets}
          onApplyPreset={handleApplyPreset}
          onOpenSavePresetModal={() => setSavePresetModalOpen(true)}
          onOpenAIAssist={() => setAiModalOpen(true)}
        />

        {/* Central Video Preview Canvas */}
        <VideoPreviewCanvas
          videoUrl={activeVideoUrl}
          currentTime={currentTime}
          totalDuration={totalDuration}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          videoRef={videoRef}
          aspectRatio={aspectRatio}
          canvasSettings={canvasSettings}
          videoAdjustments={videoAdjustments}
          captionsState={captionsState}
          overlaysState={overlaysState}
          activeSegment={activeSegment}
          activeWordIdx={activeWordIdx}
          speechVolume={audioState.video_audio_volume}
          isMuted={audioState.video_audio_muted}
          reframingConfig={reframingConfig}
        />

        {/* Right Properties Inspector */}
        <PropertiesInspector
          activeTab={inspectorTab}
          onTabChange={setInspectorTab}
          videoAdjustments={videoAdjustments}
          onUpdateVideoAdjustments={(up) => setVideoAdjustments(prev => ({ ...prev, ...up }))}
          captionsState={captionsState}
          onUpdateCaptionsState={(up) => setCaptionsState(prev => ({ ...prev, ...up }))}
          audioState={audioState}
          onUpdateAudioState={(up) => setAudioState(prev => ({ ...prev, ...up }))}
          overlaysState={overlaysState}
          onUpdateOverlaysState={(up) => setOverlaysState(prev => ({ ...prev, ...up }))}
          canvasSettings={canvasSettings}
          onUpdateCanvasSettings={(up) => setCanvasSettings(prev => ({ ...prev, ...up }))}
          aspectRatio={aspectRatio}
          onUpdateAspectRatio={setAspectRatio}
          onApplyPreset={handleApplyPreset}
          reframingConfig={reframingConfig}
          onUpdateReframingConfig={handleUpdateReframingConfig}
          onAnalyzeReframing={handleAnalyzeReframing}
          isAnalyzingReframing={isAnalyzingReframing}
        />
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. MULTI-TRACK TIMELINE */}
      {/* --------------------------------------------------------------------- */}
      <MultiTrackTimeline
        tracks={tracks}
        currentTime={currentTime}
        totalDuration={totalDuration}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        selectedItemId={selectedItemId}
        onSelectItem={(itemId, trackId) => {
          setSelectedItemId(itemId);
          if (trackId === 'track_v1' || trackId === 'track_v2') setInspectorTab('video');
          else if (trackId === 'track_c1') setInspectorTab('captions');
          else if (trackId.startsWith('track_a')) setInspectorTab('audio');
          else if (trackId === 'track_t1') setInspectorTab('text');
        }}
        onSplitItem={handleSplitItem}
        onDeleteItem={handleDeleteItem}
        onDuplicateItem={handleDuplicateItem}
        onUpdateItemDuration={(trackId, itemId, newStart, newDuration) => {
          setTracks(prev =>
            prev.map(trk => {
              if (trk.id !== trackId) return trk;
              return {
                ...trk,
                items: trk.items.map(item =>
                  item.id === itemId
                    ? { ...item, start_time: newStart, duration: newDuration }
                    : item
                )
              };
            })
          );
        }}
        onToggleMuteTrack={handleToggleMuteTrack}
        onToggleLockTrack={handleToggleLockTrack}
        zoomLevel={timelineZoom}
        onZoomChange={setTimelineZoom}
      />

      {/* --------------------------------------------------------------------- */}
      {/* 4. MODALS & OVERLAYS */}
      {/* --------------------------------------------------------------------- */}
      {/* AI Assistant Modal */}
      {studioProject && (
        <AIAssistantModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          currentState={{
            ...studioProject,
            name: projectName,
            aspect_ratio: aspectRatio,
            canvas_settings: canvasSettings,
            timeline_data: { duration: totalDuration, playhead: currentTime, zoom_level: timelineZoom, tracks },
            video_adjustments: videoAdjustments,
            captions_state: captionsState,
            audio_state: audioState,
            overlays_state: overlaysState
          }}
          onApplyChanges={(updatedState, explanation) => {
            if (updatedState.video_adjustments) setVideoAdjustments(updatedState.video_adjustments);
            if (updatedState.captions_state) setCaptionsState(updatedState.captions_state);
            if (updatedState.audio_state) setAudioState(updatedState.audio_state);
            if (updatedState.overlays_state) setOverlaysState(updatedState.overlays_state);
            if (updatedState.aspect_ratio) setAspectRatio(updatedState.aspect_ratio as any);
            if (updatedState.timeline_data?.tracks) setTracks(updatedState.timeline_data.tracks);
            addNotification("AI Copilot", explanation || "Applied creative modifications.", "success");
          }}
        />
      )}

      {/* Advanced Export Modal */}
      {studioProject && (
        <AdvancedExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          studioProject={{
            ...studioProject,
            name: projectName,
            aspect_ratio: aspectRatio,
            canvas_settings: canvasSettings,
            timeline_data: { duration: totalDuration, playhead: currentTime, zoom_level: timelineZoom, tracks },
            video_adjustments: videoAdjustments,
            captions_state: captionsState,
            audio_state: audioState,
            overlays_state: overlaysState
          }}
          onExportStarted={(jobId) => {
            addNotification("Render Queued", `Background multi-track job ${jobId.slice(0, 8)} started.`, "success");
          }}
        />
      )}

      {/* Studio Projects Modal */}
      {studioProject && (
        <StudioProjectsModal
          isOpen={projectsModalOpen}
          onClose={() => setProjectsModalOpen(false)}
          activeProjectId={studioProject.id}
          onSelectProject={(selectedProj) => {
            setStudioProject(selectedProj);
            setProjectName(selectedProj.name);
            setAspectRatio((selectedProj.aspect_ratio as any) || '9:16');
            if (selectedProj.video_adjustments) setVideoAdjustments(selectedProj.video_adjustments);
            if (selectedProj.captions_state) setCaptionsState(selectedProj.captions_state);
            if (selectedProj.audio_state) setAudioState(selectedProj.audio_state);
            if (selectedProj.overlays_state) setOverlaysState(selectedProj.overlays_state);
            if (selectedProj.timeline_data?.tracks) setTracks(selectedProj.timeline_data.tracks);
            addNotification("Project Switched", `Loaded "${selectedProj.name}".`, "info");
          }}
        />
      )}

      {/* Save Custom Preset Modal */}
      {savePresetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#0F121C] border border-[#262C40] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Save Custom Preset Template</h3>
            <p className="text-xs text-gray-400">Save current color grading, typography, and audio bed as a reusable preset.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Preset Name</label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="e.g. Alex Viral High-Contrast"
                  className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Category</label>
                <select
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white"
                >
                  <option value="custom">Custom</option>
                  <option value="viral">Viral & Pop</option>
                  <option value="cinematic">Cinematic</option>
                  <option value="gaming">Gaming</option>
                  <option value="podcast">Podcast</option>
                  <option value="educational">Educational</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSavePresetModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPresetName.trim()}
                onClick={handleSaveCustomPreset}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition disabled:opacity-40"
              >
                Save Preset
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
        projectId={activeProject?.id}
        onThumbnailApplied={(newThumb) => {
          if (activeClip) {
            setActiveClip({ ...activeClip, thumbnail_url: newThumb });
          }
        }}
      />
    </div>
  );
}

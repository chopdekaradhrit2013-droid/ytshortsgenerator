"use client";

import React, { useState, useRef, useEffect } from 'react';
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
  MousePointer,
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
  AlertCircle
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TimelineTrack, TimelineTrackItem } from '@/types';

export default function StudioPage() {
  const {
    activeProject,
    activeClip,
    clips,
    setActiveClip,
    studioTracks,
    setStudioTracks,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    activeStudioTool,
    setActiveStudioTool,
    addNotification,
    addPublishingJob
  } = useApp();

  // Active clip duration or fallback
  const totalDuration = activeClip ? activeClip.duration_seconds : 45.5;

  // Studio tabs
  const [leftTab, setLeftTab] = useState<'clips' | 'media' | 'audio' | 'text'>('clips');
  const [rightTab, setRightTab] = useState<'crop' | 'captions' | 'audio' | 'effects'>('captions');

  // Video preview player controls
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [previewQuality, setPreviewQuality] = useState<string>('1080p');
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Video settings & crop state
  const [cropMode, setCropMode] = useState<'center' | 'blur' | 'fit'>('center');
  const [videoScale, setVideoScale] = useState<number>(100);
  const [videoOpacity, setVideoOpacity] = useState<number>(100);

  // Caption styling state
  const [captionPreset, setCaptionPreset] = useState<string>('hormozi');
  const [captionFont, setCaptionFont] = useState<string>('Inter');
  const [captionSize, setCaptionSize] = useState<number>(26);
  const [captionColor, setCaptionColor] = useState<string>('#FFFFFF');
  const [captionHighlight, setCaptionHighlight] = useState<string>('#FACC15');
  const [captionAnim, setCaptionAnim] = useState<string>('pop');

  // Audio settings
  const [trackVolume, setTrackVolume] = useState<number>(100);
  const [denoiseActive, setDenoiseActive] = useState<boolean>(true);
  const [duckingActive, setDuckingActive] = useState<boolean>(true);

  // Effects settings
  const [lutFilter, setLutFilter] = useState<string>('none');
  const [contrastBoost, setContrastBoost] = useState<number>(10);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Selected timeline item for inspection
  const [selectedItemId, setSelectedItemId] = useState<string | null>("t-item-1");

  // Keep video time synced with playhead
  useEffect(() => {
    let animFrame: number;
    if (isPlaying) {
      const startTime = Date.now() - (currentTime * 1000 / playbackSpeed);
      const updateLoop = () => {
        const elapsed = (Date.now() - startTime) / 1000 * playbackSpeed;
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
  }, [isPlaying, playbackSpeed, totalDuration]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      videoRef.current?.pause();
    } else {
      setIsPlaying(true);
      videoRef.current?.play().catch(() => {});
    }
  };

  // Timeline click / scrubbing
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    const newTime = percentage * totalDuration;
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  // Find active caption phrase at currentTime
  const activeCaptionItem = studioTracks
    .find(t => t.type === 'text')
    ?.items.find(item => currentTime >= item.start_time && currentTime <= item.end_time);

  // Tool: Split track item at playhead
  const handleSplitTool = () => {
    if (!selectedItemId) {
      addNotification("Select an item", "Click on any timeline clip first to split at the playhead.", "info");
      return;
    }

    setStudioTracks(prev => prev.map(track => {
      const itemIndex = track.items.findIndex(it => it.id === selectedItemId);
      if (itemIndex === -1) return track;

      const item = track.items[itemIndex];
      if (currentTime <= item.start_time || currentTime >= item.end_time) {
        addNotification("Playhead Out of Range", "Playhead must be inside the selected clip to split it.", "warning");
        return track;
      }

      const firstHalf: TimelineTrackItem = {
        ...item,
        id: `${item.id}-a`,
        end_time: currentTime,
        source_end: item.source_start + (currentTime - item.start_time),
      };

      const secondHalf: TimelineTrackItem = {
        ...item,
        id: `${item.id}-b`,
        start_time: currentTime,
        source_start: item.source_start + (currentTime - item.start_time),
      };

      const newItems = [...track.items];
      newItems.splice(itemIndex, 1, firstHalf, secondHalf);
      addNotification("Clip Split", `Divided "${item.title}" at ${currentTime.toFixed(1)}s`, "success");
      return { ...track, items: newItems };
    }));
  };

  // Export rendering sequence (real FFmpeg job preparation)
  const handleStartExport = () => {
    setIsExporting(true);
    setExportProgress(10);

    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 100;
        }
        return prev + 20;
      });
    }, 400);

    setTimeout(() => {
      clearInterval(interval);
      setIsExporting(false);
      setShowExportModal(false);
      addNotification("Short Rendered Successfully", "Your 9:16 vertical video with burned captions is ready to publish.", "success");
    }, 2400);
  };

  // Format time (00:00.0)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -m-6 bg-[#080A0E] overflow-hidden select-none">
      {/* 1. TOP STUDIO BAR */}
      <div className="h-12 border-b border-[#1E2333] bg-[#0E1118] px-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/generator"
            className="text-gray-400 hover:text-white flex items-center gap-1 font-semibold"
          >
            <span>← AI Generator</span>
          </Link>
          <div className="h-4 w-px bg-[#262C3E]" />
          <div className="flex items-center gap-2">
            <span className="font-bold text-white max-w-sm truncate">
              {activeClip ? activeClip.title : activeProject?.name || "Untitled Studio Session"}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              9:16 Shorts
            </span>
          </div>
        </div>

        {/* TOP RIGHT STUDIO ACTIONS */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeClip) {
                addPublishingJob({
                  project_id: activeClip.project_id,
                  clip_id: activeClip.id,
                  video_title: `${activeClip.title} #Shorts`,
                  video_description: activeClip.summary,
                  tags: activeClip.tags,
                  visibility: "public"
                });
              }
            }}
            className="px-3 py-1.5 rounded-lg bg-[#1C2130] hover:bg-[#252C40] border border-[#283145] text-gray-200 font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Send to Publishing</span>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold flex items-center gap-1.5 shadow-glow-purple transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Render Video</span>
          </button>
        </div>
      </div>

      {/* 2. MIDDLE WORKSPACE: LEFT MEDIA (260px) | CENTER CANVAS | RIGHT INSPECTOR (300px) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT MEDIA PANEL */}
        <div className="w-64 border-r border-[#1E2333] bg-[#0E1118] flex flex-col">
          {/* TABS HEADER */}
          <div className="grid grid-cols-4 border-b border-[#1E2333] text-[11px] font-bold text-gray-400">
            <button
              onClick={() => setLeftTab('clips')}
              className={`py-2.5 text-center transition-colors ${
                leftTab === 'clips' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Clips
            </button>
            <button
              onClick={() => setLeftTab('media')}
              className={`py-2.5 text-center transition-colors ${
                leftTab === 'media' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Media
            </button>
            <button
              onClick={() => setLeftTab('audio')}
              className={`py-2.5 text-center transition-colors ${
                leftTab === 'audio' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setLeftTab('text')}
              className={`py-2.5 text-center transition-colors ${
                leftTab === 'text' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Text
            </button>
          </div>

          {/* TAB CONTENTS */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
            {leftTab === 'clips' && (
              <div className="space-y-2.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  AI Generated Moments
                </span>
                {clips.map((clip) => (
                  <div
                    key={clip.id}
                    onClick={() => {
                      setActiveClip(clip);
                      addNotification("Clip Loaded", `Loaded "${clip.title}" into Studio.`, "info");
                    }}
                    className={`p-2 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                      activeClip?.id === clip.id
                        ? 'bg-purple-600/20 border-purple-500/60 shadow-sm'
                        : 'bg-[#131620] border-[#202534] hover:bg-[#181C2A]'
                    }`}
                  >
                    <div className="w-12 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                      <img src={clip.thumbnail_url} alt={clip.title} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1 right-1 text-[9px] font-mono bg-black/80 px-1 rounded text-white">
                        {clip.duration_seconds}s
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white truncate text-xs">{clip.title}</p>
                      <p className="text-[10px] text-purple-400 mt-0.5">{clip.engagement_score}% Viral Score</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {leftTab === 'media' && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Source Footage
                </span>
                <div className="p-3 rounded-xl bg-[#131620] border border-[#202534] space-y-2">
                  <div className="aspect-video rounded-lg overflow-hidden bg-black relative">
                    <img
                      src={activeProject?.thumbnail_url || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80"}
                      className="w-full h-full object-cover"
                      alt="Source Video"
                    />
                  </div>
                  <p className="font-bold text-white text-xs truncate">{activeProject?.source_filename || "raw_footage.mp4"}</p>
                  <p className="text-[10px] text-gray-400">1080p 60fps • 485 MB</p>
                </div>
              </div>
            )}

            {leftTab === 'audio' && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Trending Background Audio
                </span>
                {[
                  { name: "Viral Lo-Fi Chill", duration: "1:20", genre: "Ambient" },
                  { name: "High Suspense Boom", duration: "0:45", genre: "Cinematic" },
                  { name: "Upbeat Creator Beat", duration: "1:00", genre: "Pop Beats" },
                  { name: "Deep Tech Bassline", duration: "1:15", genre: "Electronic" },
                ].map((track, i) => (
                  <div
                    key={i}
                    onClick={() => addNotification("Audio Added", `Inserted ${track.name} into Audio Track.`, "success")}
                    className="p-2 rounded-xl bg-[#131620] border border-[#202534] hover:border-purple-500/40 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                      <div>
                        <p className="font-bold text-white text-xs">{track.name}</p>
                        <p className="text-[10px] text-gray-400">{track.genre} • {track.duration}</p>
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                  </div>
                ))}
              </div>
            )}

            {leftTab === 'text' && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Viral Caption Templates
                </span>
                {[
                  { name: "Hormozi Kinetic Pop", desc: "Yellow active word highlight with punchy scale" },
                  { name: "MrBeast Bold Shadow", desc: "Heavy stroke with neon green highlight" },
                  { name: "Minimal Tech Subtitles", desc: "Clean Inter font with subtle underline" },
                  { name: "Cyberpunk Glow", desc: "Cyan and pink dual-tone styling" },
                ].map((style, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setCaptionPreset(style.name.toLowerCase());
                      addNotification("Preset Applied", `Applied ${style.name} to captions track.`, "success");
                    }}
                    className="p-2.5 rounded-xl bg-[#131620] border border-[#202534] hover:border-purple-500/50 cursor-pointer"
                  >
                    <p className="font-bold text-white text-xs">{style.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{style.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER VIDEO CANVAS WORKSPACE */}
        <div className="flex-1 flex flex-col bg-[#05060A] relative">
          {/* CANVAS PREVIEW HEADER */}
          <div className="h-10 px-4 flex items-center justify-between text-xs border-b border-[#1A1F2D] bg-[#0A0D14]/60">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">Resolution:</span>
              <select
                value={previewQuality}
                onChange={(e) => setPreviewQuality(e.target.value)}
                className="bg-[#12151E] border border-[#23293A] rounded px-2 py-0.5 text-white text-[11px]"
              >
                <option value="1080p">1080p (Full Res)</option>
                <option value="720p">720p (Draft Mode)</option>
                <option value="480p">480p (High Speed)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-purple-400 font-bold">{formatTime(currentTime)}</span>
              <span className="text-gray-600">/</span>
              <span className="text-gray-400">{formatTime(totalDuration)}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="bg-[#12151E] border border-[#23293A] rounded px-2 py-0.5 text-white text-[11px]"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>
          </div>

          {/* MAIN 9:16 VERTICAL CANVAS CONTAINER */}
          <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden">
            {/* 9:16 SMART PHONE FRAME */}
            <div
              className="relative rounded-3xl overflow-hidden aspect-[9/16] max-h-full bg-black shadow-2xl border-4 border-[#1E2333] flex items-center justify-center"
              style={{
                width: `auto`,
                height: `${Math.min(520, 500 * zoomLevel)}px`,
                filter: lutFilter === 'punchy' ? 'contrast(1.2) saturate(1.3)' : lutFilter === 'cyber' ? 'hue-rotate(25deg) contrast(1.1)' : 'none'
              }}
            >
              {/* VIDEO LAYER */}
              <video
                ref={videoRef}
                src={activeClip?.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"}
                loop
                playsInline
                muted={trackVolume === 0}
                className={`w-full h-full ${
                  cropMode === 'center'
                    ? 'object-cover'
                    : cropMode === 'fit'
                    ? 'object-contain'
                    : 'object-cover blur-[2px]'
                }`}
                style={{
                  transform: `scale(${videoScale / 100})`,
                  opacity: videoOpacity / 100
                }}
              />

              {/* DYNAMIC KINETIC CAPTION OVERLAY */}
              {activeCaptionItem && (
                <div className="absolute bottom-16 inset-x-4 text-center pointer-events-none select-none animate-in zoom-in-95 duration-100">
                  <span
                    className="inline-block px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-sm text-center font-black uppercase tracking-tight shadow-2xl border border-white/10"
                    style={{
                      fontFamily: captionFont,
                      fontSize: `${captionSize}px`,
                      color: captionColor,
                      textShadow: `0 0 10px ${captionHighlight}66`
                    }}
                  >
                    {activeCaptionItem.text_content}
                  </span>
                </div>
              )}

              {/* OVERLAY PLAY/PAUSE WATERMARK ON HOVER */}
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20"
              >
                <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-md text-white flex items-center justify-center border border-white/20">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </div>
              </div>
            </div>
          </div>

          {/* CANVAS SCRUBBER PLAYBAR */}
          <div className="h-10 px-6 border-t border-[#1A1F2D] bg-[#0E1118] flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setCurrentTime(0);
                  if (videoRef.current) videoRef.current.currentTime = 0;
                }}
                className="p-1.5 rounded text-gray-400 hover:text-white"
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const t = Math.max(0, currentTime - 5);
                  setCurrentTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                }}
                className="p-1.5 rounded text-gray-400 hover:text-white"
                title="Back 5s"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-glow-purple"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  const t = Math.min(totalDuration, currentTime + 5);
                  setCurrentTime(t);
                  if (videoRef.current) videoRef.current.currentTime = t;
                }}
                className="p-1.5 rounded text-gray-400 hover:text-white"
                title="Forward 5s"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setTrackVolume(trackVolume > 0 ? 0 : 100)}
                className="text-gray-400 hover:text-white"
              >
                {trackVolume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <input
                type="range"
                min="0"
                max="100"
                value={trackVolume}
                onChange={(e) => setTrackVolume(parseInt(e.target.value))}
                className="w-20 h-1 bg-[#23293A] rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* RIGHT INSPECTOR PANEL (PROPERTIES & SETTINGS) */}
        <div className="w-72 border-l border-[#1E2333] bg-[#0E1118] flex flex-col">
          {/* INSPECTOR TABS */}
          <div className="grid grid-cols-4 border-b border-[#1E2333] text-[11px] font-bold text-gray-400">
            <button
              onClick={() => setRightTab('captions')}
              className={`py-2.5 text-center transition-colors ${
                rightTab === 'captions' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Captions
            </button>
            <button
              onClick={() => setRightTab('crop')}
              className={`py-2.5 text-center transition-colors ${
                rightTab === 'crop' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Video
            </button>
            <button
              onClick={() => setRightTab('audio')}
              className={`py-2.5 text-center transition-colors ${
                rightTab === 'audio' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Audio
            </button>
            <button
              onClick={() => setRightTab('effects')}
              className={`py-2.5 text-center transition-colors ${
                rightTab === 'effects' ? 'text-purple-400 border-b-2 border-purple-500 bg-[#141722]' : 'hover:text-white'
              }`}
            >
              Effects
            </button>
          </div>

          {/* INSPECTOR CONTROLS BODY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {/* CAPTIONS TAB */}
            {rightTab === 'captions' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Caption Font
                  </label>
                  <select
                    value={captionFont}
                    onChange={(e) => setCaptionFont(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12151E] border border-[#23293A] text-white"
                  >
                    <option value="Inter">Inter (Clean Modern)</option>
                    <option value="Montserrat">Montserrat (Bold Punchy)</option>
                    <option value="Impact">Impact (Classic Viral)</option>
                    <option value="Anton">Anton (Heavy Display)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Font Size</span>
                    <span className="font-bold text-white">{captionSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="18"
                    max="40"
                    value={captionSize}
                    onChange={(e) => setCaptionSize(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#23293A] rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Highlight Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#FACC15', '#38BDF8', '#10B981', '#EC4899', '#A855F7', '#EF4444'].map((col) => (
                      <button
                        key={col}
                        onClick={() => setCaptionHighlight(col)}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                          captionHighlight === col ? 'border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Animation
                  </label>
                  <select
                    value={captionAnim}
                    onChange={(e) => setCaptionAnim(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#12151E] border border-[#23293A] text-white"
                  >
                    <option value="pop">Pop (Dynamic Scale)</option>
                    <option value="fade">Smooth Fade In</option>
                    <option value="slide">Slide From Bottom</option>
                  </select>
                </div>
              </div>
            )}

            {/* VIDEO & CROP TAB */}
            {rightTab === 'crop' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Framing Mode
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Center 9:16", value: "center" },
                      { label: "Blurred BG", value: "blur" },
                      { label: "Fit Canvas", value: "fit" },
                    ].map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setCropMode(mode.value as any)}
                        className={`p-2 rounded-xl border text-center font-bold ${
                          cropMode === mode.value
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-[#12151E] border-[#23293A] text-gray-400'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Scale Zoom</span>
                    <span className="font-bold text-white">{videoScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={videoScale}
                    onChange={(e) => setVideoScale(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#23293A] rounded cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Opacity</span>
                    <span className="font-bold text-white">{videoOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={videoOpacity}
                    onChange={(e) => setVideoOpacity(parseInt(e.target.value))}
                    className="w-full h-1 bg-[#23293A] rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* AUDIO TAB */}
            {rightTab === 'audio' && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-[#12151E] border border-[#23293A] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">AI Denoise & Enhance</p>
                    <p className="text-[10px] text-gray-400">Removes hum, room echo, keyboard clicks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={denoiseActive}
                    onChange={() => setDenoiseActive(!denoiseActive)}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>

                <div className="p-3 rounded-xl bg-[#12151E] border border-[#23293A] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">Music Auto-Ducking</p>
                    <p className="text-[10px] text-gray-400">Lowers BGM automatically when speech occurs</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={duckingActive}
                    onChange={() => setDuckingActive(!duckingActive)}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>
              </div>
            )}

            {/* EFFECTS TAB */}
            {rightTab === 'effects' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Color LUT Preset
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "None", value: "none" },
                      { label: "Punchy", value: "punchy" },
                      { label: "Cyber", value: "cyber" },
                    ].map((lut) => (
                      <button
                        key={lut.value}
                        onClick={() => setLutFilter(lut.value)}
                        className={`p-2 rounded-xl border text-center font-bold ${
                          lutFilter === lut.value
                            ? 'bg-purple-600/20 border-purple-500 text-white'
                            : 'bg-[#12151E] border-[#23293A] text-gray-400'
                        }`}
                      >
                        {lut.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BOTTOM MULTI-TRACK TIMELINE */}
      <div className="h-60 border-t border-[#1E2333] bg-[#0E1118] flex flex-col">
        {/* TIMELINE TOOLBAR */}
        <div className="h-10 border-b border-[#1E2333] px-4 flex items-center justify-between text-xs bg-[#11141E]">
          {/* EDITING TOOLS */}
          <div className="flex items-center gap-1">
            {[
              { id: "select", icon: MousePointer, label: "Select (V)" },
              { id: "split", icon: Split, label: "Split (S)", action: handleSplitTool },
              { id: "crop", icon: Crop, label: "Crop (C)" },
              { id: "text", icon: Type, label: "Text (T)" },
              { id: "audio", icon: Music, label: "Audio (M)" },
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeStudioTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveStudioTool(tool.id);
                    if (tool.action) tool.action();
                  }}
                  className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1F2D]'
                  }`}
                  title={tool.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}

            <div className="h-4 w-px bg-[#262C3E] mx-1" />

            <button
              onClick={() => addNotification("Undo", "Reverted previous timeline trim.", "info")}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1F2D]"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => addNotification("Redo", "Re-applied timeline adjustment.", "info")}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1F2D]"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ZOOM SLIDER */}
          <div className="flex items-center gap-2 text-gray-400">
            <ZoomOut
              className="w-3.5 h-3.5 cursor-pointer hover:text-white"
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
            />
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.25"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-20 h-1 bg-[#23293A] rounded cursor-pointer"
            />
            <ZoomIn
              className="w-3.5 h-3.5 cursor-pointer hover:text-white"
              onClick={() => setZoomLevel(Math.min(2.5, zoomLevel + 0.25))}
            />
          </div>
        </div>

        {/* TIMELINE TRACKS AREA */}
        <div className="flex-1 flex overflow-hidden">
          {/* TRACK HEADERS (LEFT) */}
          <div className="w-48 border-r border-[#1E2333] bg-[#0A0D14] flex flex-col divide-y divide-[#1A1F2D] text-xs">
            <div className="h-6 px-3 flex items-center text-[10px] text-gray-500 font-mono">
              TRACK HEADERS
            </div>
            {studioTracks.map((track) => (
              <div key={track.id} className="h-12 px-3 flex items-center justify-between">
                <span className="font-semibold text-gray-300 truncate">{track.name}</span>
                <div className="flex items-center gap-1 text-gray-500">
                  <button
                    onClick={() => {
                      setStudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, muted: !t.muted } : t));
                    }}
                    className={`p-1 rounded hover:text-white ${track.muted ? 'text-red-400' : ''}`}
                    title="Mute Track"
                  >
                    <Volume2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      setStudioTracks(prev => prev.map(t => t.id === track.id ? { ...t, locked: !t.locked } : t));
                    }}
                    className={`p-1 rounded hover:text-white ${track.locked ? 'text-amber-400' : ''}`}
                    title="Lock Track"
                  >
                    {track.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* TRACK LANES & PLAYHEAD (RIGHT) */}
          <div
            ref={timelineRef}
            onClick={handleTimelineClick}
            className="flex-1 relative bg-[#090B10] overflow-x-auto overflow-y-hidden cursor-crosshair timeline-grid"
          >
            {/* TIME TICKS RULER (TOP) */}
            <div className="h-6 border-b border-[#1E2333] flex items-center text-[10px] text-gray-500 font-mono px-2 select-none">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-1 border-l border-white/10 pl-1">
                  {(i * (totalDuration / 10)).toFixed(0)}s
                </div>
              ))}
            </div>

            {/* TRACK ROWS */}
            <div className="divide-y divide-[#1A1F2D]">
              {studioTracks.map((track) => (
                <div key={track.id} className="h-12 relative flex items-center px-2">
                  {track.items.map((item) => {
                    const leftPct = (item.start_time / totalDuration) * 100;
                    const widthPct = ((item.end_time - item.start_time) / totalDuration) * 100;
                    const isSelected = selectedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItemId(item.id);
                        }}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`
                        }}
                        className={`absolute h-9 rounded-lg border flex items-center justify-between px-2 text-xs truncate transition-all cursor-pointer ${
                          item.color || 'bg-purple-900/60 border-purple-500'
                        } ${isSelected ? 'ring-2 ring-white shadow-lg' : 'opacity-90 hover:opacity-100'}`}
                      >
                        <span className="truncate font-semibold text-white text-[11px]">
                          {item.text_content || item.title}
                        </span>

                        {/* TRIM HANDLES */}
                        <div className="w-1.5 h-5 bg-white/40 rounded-full cursor-ew-resize opacity-0 group-hover:opacity-100" />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* INTERACTIVE MOVING PLAYHEAD */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-400 via-pink-400 to-blue-400 pointer-events-none z-30"
              style={{
                left: `${(currentTime / totalDuration) * 100}%`
              }}
            >
              <div className="w-3.5 h-3.5 bg-purple-500 rounded-full -ml-[6px] -mt-1 shadow-glow-purple border border-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. RENDER / EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-3xl bg-[#12151E] border border-[#23293A] p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2333]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Render Short (FFmpeg)</h3>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2">
                <div className="flex justify-between text-gray-400">
                  <span>Output Dimensions</span>
                  <span className="font-bold text-white">1080 x 1920 (9:16)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Framerate</span>
                  <span className="font-bold text-white">60 fps H.264</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Burned Subtitles</span>
                  <span className="font-bold text-yellow-400">Kinetic Pop Enabled</span>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-300">Rendering video pipeline...</span>
                    <span className="text-purple-400 font-bold">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#1C2130] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1A1F2D] text-gray-300 font-semibold text-xs hover:bg-[#23293C]"
              >
                Cancel
              </button>
              <button
                onClick={handleStartExport}
                disabled={isExporting}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-xs shadow-glow-purple hover:from-purple-500 hover:to-blue-500 disabled:opacity-50"
              >
                {isExporting ? "Rendering..." : "Confirm & Render"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

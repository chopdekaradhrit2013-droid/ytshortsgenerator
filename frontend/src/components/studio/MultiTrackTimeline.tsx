"use client";

import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Music,
  Video,
  Sparkles,
  Mic,
  Smile,
  Layers
} from 'lucide-react';
import { TimelineTrack, TimelineTrackItem } from '@/types';

interface MultiTrackTimelineProps {
  tracks: TimelineTrack[];
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  selectedItemId: string | null;
  onSelectItem: (itemId: string, trackId: string) => void;
  onSplitItem: (trackId: string, itemId: string, splitTime: number) => void;
  onDeleteItem: (trackId: string, itemId: string) => void;
  onDuplicateItem: (trackId: string, itemId: string) => void;
  onUpdateItemDuration: (trackId: string, itemId: string, newStart: number, newDuration: number) => void;
  onToggleMuteTrack: (trackId: string) => void;
  onToggleLockTrack: (trackId: string) => void;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

export const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  onSeek,
  selectedItemId,
  onSelectItem,
  onSplitItem,
  onDeleteItem,
  onDuplicateItem,
  onUpdateItemDuration,
  onToggleMuteTrack,
  onToggleLockTrack,
  zoomLevel,
  onZoomChange
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Time formatting helper: mm:ss.ms
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // Find currently selected item's track
  let selectedTrackId = "";
  for (const trk of tracks) {
    if (trk.items.some(i => i.id === selectedItemId)) {
      selectedTrackId = trk.id;
      break;
    }
  }

  // Handle timeline scrubbing
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    setIsDraggingPlayhead(true);
    updatePlayheadFromMouse(e.clientX);
  };

  const updatePlayheadFromMouse = (clientX: number) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const clickX = clientX - rect.left + scrollLeft;
    const timelineWidth = rect.width * zoomLevel;
    const pct = Math.max(0, Math.min(1, clickX / timelineWidth));
    onSeek(pct * totalDuration);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingPlayhead) {
        updatePlayheadFromMouse(e.clientX);
      }
    };
    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, totalDuration, zoomLevel]);

  // Track Type Icon Helper
  const getTrackIcon = (type: string, id: string) => {
    if (id === 'track_v1' || id === 'track_v2') return <Video className="w-3.5 h-3.5 text-blue-400" />;
    if (id === 'track_t1') return <Type className="w-3.5 h-3.5 text-amber-400" />;
    if (id === 'track_c1') return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    if (id === 'track_a1') return <Volume2 className="w-3.5 h-3.5 text-emerald-400" />;
    if (id === 'track_a2') return <Music className="w-3.5 h-3.5 text-pink-400" />;
    if (id === 'track_a3') return <Mic className="w-3.5 h-3.5 text-teal-400" />;
    return <Layers className="w-3.5 h-3.5 text-gray-400" />;
  };

  const getTrackColor = (id: string, isSelected: boolean) => {
    if (isSelected) return 'border-white bg-white/20 shadow-lg';
    if (id === 'track_v1') return 'border-blue-500/50 bg-blue-950/40 text-blue-200';
    if (id === 'track_v2') return 'border-sky-500/50 bg-sky-950/40 text-sky-200';
    if (id === 'track_t1') return 'border-amber-500/50 bg-amber-950/40 text-amber-200';
    if (id === 'track_c1') return 'border-purple-500/50 bg-purple-950/40 text-purple-200';
    if (id === 'track_a1') return 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200';
    if (id === 'track_a2') return 'border-pink-500/50 bg-pink-950/40 text-pink-200';
    if (id === 'track_a3') return 'border-teal-500/50 bg-teal-950/40 text-teal-200';
    return 'border-gray-600 bg-gray-800 text-gray-300';
  };

  // Timeline scale ticks: interval based on duration
  const tickInterval = totalDuration > 60 ? 10 : 5;
  const numTicks = Math.ceil(totalDuration / tickInterval);
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => i * tickInterval);

  return (
    <div className="flex flex-col bg-[#0B0D14] border-t border-[#1C2030] h-72 flex-shrink-0 select-none">
      {/* 1. TIMELINE TOOLBAR */}
      <div className="h-10 px-4 bg-[#10131E] border-b border-[#1C2030] flex items-center justify-between text-xs text-gray-300">
        {/* Playback Controls & Time readout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onTogglePlay}
            className="w-7 h-7 rounded-lg bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition shadow-md shadow-purple-600/30"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
          </button>
          <div className="font-mono text-xs text-gray-200 font-bold bg-[#0A0C14] px-2.5 py-1 rounded-md border border-[#202538]">
            <span className="text-purple-400">{formatTime(currentTime)}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
        </div>

        {/* Editing Tools (Split, Duplicate, Delete) */}
        <div className="flex items-center gap-1.5 bg-[#0A0C14] p-1 rounded-xl border border-[#202538]">
          <button
            type="button"
            title="Split Clip at Playhead (S)"
            disabled={!selectedItemId}
            onClick={() => {
              if (selectedItemId && selectedTrackId) {
                onSplitItem(selectedTrackId, selectedItemId, currentTime);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#1E2333] disabled:opacity-40 transition font-medium"
          >
            <Scissors className="w-3.5 h-3.5 text-blue-400" />
            <span>Split (S)</span>
          </button>
          <div className="w-[1px] h-3.5 bg-gray-700" />
          <button
            type="button"
            title="Duplicate Selected"
            disabled={!selectedItemId}
            onClick={() => {
              if (selectedItemId && selectedTrackId) {
                onDuplicateItem(selectedTrackId, selectedItemId);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-[#1E2333] disabled:opacity-40 transition font-medium"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Duplicate</span>
          </button>
          <div className="w-[1px] h-3.5 bg-gray-700" />
          <button
            type="button"
            title="Delete Selected (Del)"
            disabled={!selectedItemId}
            onClick={() => {
              if (selectedItemId && selectedTrackId) {
                onDeleteItem(selectedTrackId, selectedItemId);
              }
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-40 transition font-medium"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(0.5, zoomLevel - 0.25))}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] text-gray-400 w-9 text-center">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(3.0, zoomLevel + 0.25))}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/5"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. TIMELINE BODY (Track Headers + Scrollable Lanes) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Headers (Left sidebar) */}
        <div className="w-48 bg-[#0E111A] border-r border-[#1C2030] flex flex-col flex-shrink-0 z-10">
          {/* Header spacer for ruler */}
          <div className="h-6 border-b border-[#1C2030] px-3 flex items-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            Track Layers
          </div>

          {/* Track Headers list */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#181C28]">
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`h-9 px-3 flex items-center justify-between text-xs transition ${
                  track.id === selectedTrackId ? 'bg-purple-950/20' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {getTrackIcon(track.type, track.id)}
                  <span className="font-medium text-gray-300 truncate text-[11px]">{track.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleMuteTrack(track.id)}
                    className="p-1 text-gray-500 hover:text-white rounded"
                    title={track.muted ? "Unmute" : "Mute"}
                  >
                    {track.muted ? <VolumeX className="w-3 h-3 text-red-400" /> : <Volume2 className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLockTrack(track.id)}
                    className="p-1 text-gray-500 hover:text-white rounded"
                    title={track.locked ? "Unlock" : "Lock"}
                  >
                    {track.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Tracks Canvas (Right main area) */}
        <div
          ref={timelineRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#090B10] cursor-crosshair"
        >
          <div
            className="h-full relative flex flex-col"
            style={{ width: `${100 * zoomLevel}%`, minWidth: '100%' }}
          >
            {/* Timeline Ruler Header */}
            <div className="h-6 border-b border-[#1C2030] relative bg-[#0C0E16] flex items-center">
              {ticks.map((t) => {
                const leftPct = (t / totalDuration) * 100;
                return (
                  <div
                    key={t}
                    className="absolute top-0 bottom-0 flex flex-col items-center"
                    style={{ left: `${leftPct}%` }}
                  >
                    <div className="h-2 w-[1px] bg-[#2A3144]" />
                    <span className="text-[9px] font-mono text-gray-500 -ml-2 select-none">
                      {formatTime(t)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Track Lanes */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#141824] relative">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="h-9 relative bg-[#090B10] flex items-center px-1"
                >
                  {/* Track lane background stripes */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none" />

                  {/* Render Track Items */}
                  {track.items.map((item) => {
                    const start = item.start_time || 0;
                    const dur = item.duration || (item.end_time ? item.end_time - item.start_time : 3.0);
                    const leftPct = (start / totalDuration) * 100;
                    const widthPct = Math.max(1.0, (dur / totalDuration) * 100);
                    const isSelected = selectedItemId === item.id;

                    return (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectItem(item.id, track.id);
                        }}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`
                        }}
                        className={`absolute h-7 rounded-lg border px-2 flex items-center justify-between text-[11px] font-medium transition cursor-pointer select-none truncate ${getTrackColor(
                          track.id,
                          isSelected
                        )}`}
                      >
                        <span className="truncate">{item.title || item.text || track.name}</span>

                        {/* Audio Waveform visualization bar */}
                        {track.type === 'audio' && (
                          <div className="flex items-center gap-0.5 opacity-60 ml-2">
                            <span className="w-0.5 h-3 bg-current rounded-full animate-pulse" />
                            <span className="w-0.5 h-4 bg-current rounded-full" />
                            <span className="w-0.5 h-2 bg-current rounded-full" />
                            <span className="w-0.5 h-5 bg-current rounded-full" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Red Playhead Line */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-red-500 pointer-events-none z-30 flex flex-col items-center"
                style={{ left: `${(currentTime / totalDuration) * 100}%` }}
              >
                {/* Playhead marker pin */}
                <div className="w-3.5 h-3.5 bg-red-500 rounded-b-md shadow-lg shadow-red-500/50 -mt-0.5 border border-white/40 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


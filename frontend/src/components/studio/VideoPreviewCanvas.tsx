"use client";

import React, { useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Sparkles,
  Layers,
  ShieldCheck,
  Flame,
  ThumbsUp,
  MessageSquare,
  Share2,
  Scan
} from 'lucide-react';
import { resolveMediaUrl } from '@/lib/api';
import {
  VideoAdjustments,
  CanvasSettings,
  CaptionsState,
  OverlaysState,
  ReframingConfig
} from '@/types';

interface VideoPreviewCanvasProps {
  videoUrl?: string;
  currentTime: number;
  totalDuration: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | 'custom';
  canvasSettings: CanvasSettings;
  videoAdjustments: VideoAdjustments;
  captionsState: CaptionsState;
  overlaysState: OverlaysState;
  activeSegment?: any;
  activeWordIdx?: number;
  speechVolume: number;
  isMuted: boolean;
  reframingConfig?: ReframingConfig | null;
}

export const VideoPreviewCanvas: React.FC<VideoPreviewCanvasProps> = ({
  videoUrl,
  currentTime,
  totalDuration,
  isPlaying,
  onTogglePlay,
  videoRef,
  aspectRatio,
  canvasSettings,
  videoAdjustments,
  captionsState,
  overlaysState,
  activeSegment,
  activeWordIdx = -1,
  speechVolume,
  isMuted,
  reframingConfig
}) => {
  // Compute aspect ratio dimensions for CSS container
  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '9:16':
        return 'aspect-[9/16] max-h-[82%]';
      case '16:9':
        return 'aspect-[16/9] max-h-[75%]';
      case '1:1':
        return 'aspect-square max-h-[75%]';
      case '4:5':
        return 'aspect-[4/5] max-h-[80%]';
      default:
        return 'aspect-[9/16] max-h-[82%]';
    }
  };

  // Sync volume and mute with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : Math.min(1.0, speechVolume);
      videoRef.current.muted = isMuted;
    }
  }, [isMuted, speechVolume, videoRef]);

  // Sync playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = videoAdjustments.speed || 1.0;
    }
  }, [videoAdjustments.speed, videoRef]);

  // CSS Filters & Transforms
  const c = videoAdjustments.contrast ?? 1.0;
  const b = 1 + (videoAdjustments.brightness ?? 0) / 100;
  const s = videoAdjustments.saturation ?? 1.0;
  const blurPx = videoAdjustments.blur ?? 0;
  const scalePct = (videoAdjustments.scale ?? 100) / 100;
  const rotDeg = videoAdjustments.rotate ?? 0;
  const flipH = videoAdjustments.flip_h ? -1 : 1;
  const flipV = videoAdjustments.flip_v ? -1 : 1;

  const videoFilterStyle = `contrast(${c}) brightness(${b}) saturate(${s}) blur(${blurPx}px)`;
  const videoTransformStyle = `scale(${scalePct}) rotate(${rotDeg}deg) scaleX(${flipH}) scaleY(${flipV})`;

  // Subtitle Placement
  const getPlacementClass = () => {
    switch (captionsState.placement) {
      case 'top':
        return 'top-16';
      case 'middle':
        return 'top-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-20';
    }
  };

  // Find active titles for current time
  const visibleTitles = (overlaysState.titles || []).filter(
    t => currentTime >= t.start_time && currentTime <= t.start_time + t.duration
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-[#07080D]">
      {/* Aspect Ratio & Resolution Pill Overlay */}
      <div className="absolute top-4 left-6 z-20 flex items-center gap-2">
        <span className="px-2.5 py-1 rounded-full bg-[#141824]/80 backdrop-blur border border-[#262C40] text-[11px] font-mono text-gray-300 font-semibold shadow-lg">
          {aspectRatio} • {aspectRatio === '9:16' ? '1080×1920' : aspectRatio === '16:9' ? '1920×1080' : '1080×1080'}
        </span>
        {reframingConfig && (
          <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 backdrop-blur border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold shadow-lg flex items-center gap-1.5">
            <Scan className="w-3 h-3 text-cyan-400" />
            <span>
              {reframingConfig.mode === 'split_screen'
                ? '9:16 Split Screen'
                : reframingConfig.mode === 'smart_face'
                ? '9:16 Smart Face'
                : reframingConfig.mode === 'motion_action'
                ? '9:16 Motion Tracking'
                : '9:16 AI Reframed'}
            </span>
          </span>
        )}
        {videoAdjustments.speed !== 1.0 && (
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono text-[10px] font-bold">
            {videoAdjustments.speed}x Speed
          </span>
        )}
      </div>

      {/* Main Canvas Box */}
      <div
        className={`relative rounded-3xl overflow-hidden shadow-2xl border border-[#262C40] flex items-center justify-center ${getAspectRatioClasses()}`}
        style={{
          backgroundColor: canvasSettings.bg_color || '#090A0F',
          width: 'auto',
          height: '100%'
        }}
      >
        {/* Optional Blurred Background Fill for non-vertical videos */}
        {canvasSettings.bg_blur && videoUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-40 scale-125 pointer-events-none"
            style={{
              backgroundImage: `url(${resolveMediaUrl(videoUrl)})`
            }}
          />
        )}

        {/* Video Player */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={resolveMediaUrl(videoUrl)}
              onClick={onTogglePlay}
              playsInline
              preload="auto"
              className="w-full h-full object-cover transition-all duration-75 cursor-pointer"
              style={{
                filter: videoFilterStyle,
                transform: videoTransformStyle
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
              <Layers className="w-10 h-10 opacity-30" />
              <span className="text-xs">No media loaded in video track</span>
            </div>
          )}
        </div>

        {/* 2-Speaker Split Screen Divider Wireframe */}
        {reframingConfig?.mode === 'split_screen' && (
          <div
            className="absolute left-0 right-0 h-1 z-20 pointer-events-none shadow-sm"
            style={{
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: reframingConfig.split_divider_color || '#3B82F6'
            }}
          />
        )}

        {/* Safe-Area Guides (YouTube Shorts Overlay UI) */}
        {canvasSettings.show_safe_guides && (
          <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 border border-dashed border-red-500/25">
            {/* Top Sound Bar Zone */}
            <div className="flex justify-center">
              <div className="px-3 py-1 rounded-full bg-black/40 backdrop-blur border border-white/10 text-[10px] text-gray-400">
                Safe Area: Top Header
              </div>
            </div>

            {/* Right-Side Engagement Icons Overlay */}
            <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 text-white/70">
              <div className="flex flex-col items-center">
                <ThumbsUp className="w-5 h-5" />
                <span className="text-[9px]">Like</span>
              </div>
              <div className="flex flex-col items-center">
                <MessageSquare className="w-5 h-5" />
                <span className="text-[9px]">Chat</span>
              </div>
              <div className="flex flex-col items-center">
                <Share2 className="w-5 h-5" />
                <span className="text-[9px]">Share</span>
              </div>
            </div>

            {/* Bottom Title & Channel Bar Zone */}
            <div className="w-[75%] space-y-1">
              <div className="h-2.5 bg-white/20 rounded w-1/2" />
              <div className="h-2 bg-white/10 rounded w-3/4" />
            </div>
          </div>
        )}

        {/* Channel Watermark Overlay */}
        {overlaysState.watermark?.enabled && (
          <div
            className={`absolute z-30 font-bold font-mono text-[11px] px-2.5 py-1 rounded-md bg-black/50 backdrop-blur border border-white/20 text-white pointer-events-none ${
              overlaysState.watermark.position === 'top_left'
                ? 'top-4 left-4'
                : overlaysState.watermark.position === 'bottom_left'
                ? 'bottom-4 left-4'
                : overlaysState.watermark.position === 'bottom_right'
                ? 'bottom-4 right-4'
                : 'top-4 right-4'
            }`}
            style={{ opacity: overlaysState.watermark.opacity || 0.75 }}
          >
            {overlaysState.watermark.text || '@AiShortsFactory'}
          </div>
        )}

        {/* Title & Banner Overlays (T1 Track) */}
        {visibleTitles.map((tItem) => (
          <div
            key={tItem.id}
            className="absolute z-30 text-center px-4 py-2 pointer-events-none animate-in fade-in zoom-in duration-200"
            style={{
              top: `${tItem.position_y ?? 18}%`,
              left: `${tItem.position_x ?? 50}%`,
              transform: 'translate(-50%, -50%)',
              fontFamily: tItem.font_family || 'Montserrat',
              fontSize: `${(tItem.font_size || 42) * 0.45}px`,
              fontWeight: tItem.font_weight || 900,
              color: tItem.color || '#FFFFFF',
              backgroundColor: tItem.bg_opacity ? `${tItem.bg_color || '#000000'}b3` : 'transparent',
              borderRadius: '12px'
            }}
          >
            {tItem.text}
          </div>
        ))}

        {/* Dynamic ASS Captions Subtitles Overlay (C1 Track) */}
        {activeSegment && (
          <div
            className={`absolute z-30 left-4 right-4 text-center px-3 pointer-events-none select-none ${getPlacementClass()}`}
          >
            <div
              className="inline-block p-2 rounded-xl transition-all"
              style={{
                fontFamily: captionsState.font_family || 'Montserrat',
                fontSize: `${(captionsState.font_size || 52) * 0.42}px`,
                fontWeight: captionsState.font_weight || 900,
                color: captionsState.primary_color || '#FFFFFF',
                backgroundColor:
                  captionsState.bg_opacity > 0
                    ? `${captionsState.bg_color || '#000000'}${Math.round(captionsState.bg_opacity * 255)
                        .toString(16)
                        .padStart(2, '0')}`
                    : 'transparent',
                textShadow: `${captionsState.shadow_offset || 2}px ${captionsState.shadow_offset || 2}px 0 #000, -${
                  captionsState.outline_width || 3
                }px -${captionsState.outline_width || 3}px 0 #000, ${captionsState.outline_width || 3}px -${
                  captionsState.outline_width || 3
                }px 0 #000, -${captionsState.outline_width || 3}px ${captionsState.outline_width || 3}px 0 #000, ${
                  captionsState.outline_width || 3
                }px ${captionsState.outline_width || 3}px 0 #000`,
                textTransform: captionsState.uppercase ? 'uppercase' : 'none',
                lineHeight: 1.25
              }}
            >
              {activeSegment.words && activeSegment.words.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  {activeSegment.words.map((w: any, wIdx: number) => {
                    const isActive = wIdx === activeWordIdx;
                    return (
                      <span
                        key={w.id || wIdx}
                        className={`transition-all duration-100 ${
                          isActive
                            ? 'scale-110 inline-block origin-center font-black drop-shadow-lg'
                            : 'opacity-90'
                        }`}
                        style={{
                          color: isActive
                            ? captionsState.highlight_color || '#FACC15'
                            : captionsState.primary_color || '#FFFFFF'
                        }}
                      >
                        {w.word}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <span>{activeSegment.text}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


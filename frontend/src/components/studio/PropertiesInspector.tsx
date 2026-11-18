"use client";

import React from 'react';
import {
  Sliders,
  Type,
  Music,
  Video,
  Crop,
  Layers,
  Sparkles,
  Maximize2,
  Volume2,
  VolumeX,
  RotateCw,
  Sun,
  Eye,
  ShieldCheck,
  Zap,
  Check,
  Scan,
  Crosshair,
  Users,
  Activity,
  RefreshCw
} from 'lucide-react';
import {
  VideoAdjustments,
  CanvasSettings,
  CaptionsState,
  AudioState,
  OverlaysState,
  ReframingConfig,
  ReframingMode,
  TrackingQualityMode
} from '@/types';

export type InspectorTabType = 'video' | 'reframing' | 'captions' | 'audio' | 'text' | 'canvas';

interface PropertiesInspectorProps {
  activeTab: InspectorTabType;
  onTabChange: (tab: InspectorTabType) => void;
  videoAdjustments: VideoAdjustments;
  onUpdateVideoAdjustments: (updates: Partial<VideoAdjustments>) => void;
  captionsState: CaptionsState;
  onUpdateCaptionsState: (updates: Partial<CaptionsState>) => void;
  audioState: AudioState;
  onUpdateAudioState: (updates: Partial<AudioState>) => void;
  overlaysState: OverlaysState;
  onUpdateOverlaysState: (updates: Partial<OverlaysState>) => void;
  canvasSettings: CanvasSettings;
  onUpdateCanvasSettings: (updates: Partial<CanvasSettings>) => void;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | 'custom';
  onUpdateAspectRatio: (ratio: '9:16' | '16:9' | '1:1' | '4:5') => void;
  onApplyPreset: (presetKey: string) => void;
  reframingConfig?: ReframingConfig | null;
  onUpdateReframingConfig?: (updates: Partial<ReframingConfig>) => void;
  onAnalyzeReframing?: (mode?: ReframingMode, quality?: TrackingQualityMode) => Promise<void>;
  isAnalyzingReframing?: boolean;
}

const FONTS = ['Montserrat', 'Impact', 'Inter', 'Arial', 'Georgia', 'Roboto'];
const TRANSITIONS = [
  { id: 'none', label: 'None (Direct Cut)' },
  { id: 'cut', label: 'Jump Cut' },
  { id: 'dissolve', label: 'Cross Dissolve' },
  { id: 'fade_black', label: 'Fade to Black' },
  { id: 'slide_left', label: 'Slide Left' },
  { id: 'slide_right', label: 'Slide Right' },
  { id: 'zoom_in', label: 'Zoom Punch In' },
  { id: 'wipe', label: 'Wipe' }
];

export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  activeTab,
  onTabChange,
  videoAdjustments,
  onUpdateVideoAdjustments,
  captionsState,
  onUpdateCaptionsState,
  audioState,
  onUpdateAudioState,
  overlaysState,
  onUpdateOverlaysState,
  canvasSettings,
  onUpdateCanvasSettings,
  aspectRatio,
  onUpdateAspectRatio,
  onApplyPreset,
  reframingConfig,
  onUpdateReframingConfig,
  onAnalyzeReframing,
  isAnalyzingReframing = false
}) => {
  const currentMode = reframingConfig?.mode || 'auto';
  const currentQuality = reframingConfig?.quality_mode || 'smart';
  const centerX = Math.round((reframingConfig?.center_x_ratio ?? 0.5) * 100);
  const safeHeadroom = Math.round((reframingConfig?.safe_headroom ?? 0.14) * 100);
  const zoomScale = reframingConfig?.zoom_scale ?? 1.0;
  const smoothness = reframingConfig?.smoothness ?? 0.85;
  const isSplitRecommended = reframingConfig?.split_screen_recommended;
  const splitLayout = reframingConfig?.split_layout || 'stacked_top_bottom';
  const speaker1X = Math.round((reframingConfig?.speaker1_x_ratio ?? 0.35) * 100);
  const speaker2X = Math.round((reframingConfig?.speaker2_x_ratio ?? 0.65) * 100);
  const dividerColor = reframingConfig?.split_divider_color || '#3B82F6';

  return (
    <div className="w-80 bg-[#0E111A] border-l border-[#1C2030] flex flex-col h-full flex-shrink-0 text-xs text-gray-300">
      {/* 1. INSPECTOR TABS BAR */}
      <div className="h-11 px-2 border-b border-[#1C2030] flex items-center justify-between bg-[#121622] flex-shrink-0">
        {[
          { id: 'video', label: 'Video', icon: Video },
          { id: 'reframing', label: 'Framing', icon: Scan },
          { id: 'captions', label: 'Captions', icon: Type },
          { id: 'audio', label: 'Audio', icon: Music },
          { id: 'text', label: 'Overlays', icon: Layers },
          { id: 'canvas', label: 'Canvas', icon: Crop }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id as any)}
              className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-semibold transition ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. TAB CONTENT BODY */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* TAB 1: VIDEO ADJUSTMENTS */}
        {activeTab === 'video' && (
          <div className="space-y-4 animate-in fade-in-50">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-400" />
              <span>Video & Transform Settings</span>
            </h3>

            {/* Playback Speed */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-gray-300">Playback Speed</span>
                <span className="font-mono text-blue-400 font-bold">{videoAdjustments.speed}x</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[0.75, 1.0, 1.25, 1.5].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onUpdateVideoAdjustments({ speed: spd })}
                    className={`py-1 rounded-lg border text-[11px] font-mono transition ${
                      videoAdjustments.speed === spd
                        ? 'bg-blue-600 text-white border-blue-400 font-bold'
                        : 'bg-[#141824] border-[#222738] text-gray-300 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Scale & Resize */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold text-gray-300">Scale / Zoom</span>
                <span className="font-mono text-gray-400">{videoAdjustments.scale}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="200"
                step="5"
                value={videoAdjustments.scale}
                onChange={(e) => onUpdateVideoAdjustments({ scale: Number(e.target.value) })}
                className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
              />
            </div>

            {/* Rotation & Flip */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-300">Transform & Orientation</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateVideoAdjustments({ rotate: (videoAdjustments.rotate + 90) % 360 })}
                  className="p-2 rounded-xl bg-[#141824] border border-[#222738] hover:border-blue-500/50 flex items-center justify-center gap-1.5 text-[11px]"
                >
                  <RotateCw className="w-3.5 h-3.5 text-blue-400" />
                  <span>{videoAdjustments.rotate}°</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateVideoAdjustments({ flip_h: !videoAdjustments.flip_h })}
                  className={`p-2 rounded-xl border text-[11px] transition ${
                    videoAdjustments.flip_h
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-[#141824] border-[#222738] text-gray-300'
                  }`}
                >
                  Flip H
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateVideoAdjustments({ flip_v: !videoAdjustments.flip_v })}
                  className={`p-2 rounded-xl border text-[11px] transition ${
                    videoAdjustments.flip_v
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                      : 'bg-[#141824] border-[#222738] text-gray-300'
                  }`}
                >
                  Flip V
                </button>
              </div>
            </div>

            {/* Color Grading: Brightness, Contrast, Saturation */}
            <div className="pt-2 border-t border-[#1C2030] space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Color Grading
              </span>

              {/* Brightness */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Brightness</span>
                  <span className="font-mono text-gray-400">{videoAdjustments.brightness > 0 ? `+${videoAdjustments.brightness}` : videoAdjustments.brightness}</span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={videoAdjustments.brightness}
                  onChange={(e) => onUpdateVideoAdjustments({ brightness: Number(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>

              {/* Contrast */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Contrast</span>
                  <span className="font-mono text-gray-400">{videoAdjustments.contrast.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={videoAdjustments.contrast}
                  onChange={(e) => onUpdateVideoAdjustments({ contrast: Number(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>

              {/* Saturation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Saturation</span>
                  <span className="font-mono text-gray-400">{videoAdjustments.saturation.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  value={videoAdjustments.saturation}
                  onChange={(e) => onUpdateVideoAdjustments({ saturation: Number(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>

              {/* Blur */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Blur</span>
                  <span className="font-mono text-gray-400">{videoAdjustments.blur}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={videoAdjustments.blur}
                  onChange={(e) => onUpdateVideoAdjustments({ blur: Number(e.target.value) })}
                  className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>
            </div>

            {/* Transitions & Fade In/Out */}
            <div className="pt-2 border-t border-[#1C2030] space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Transitions & Fades
              </span>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Transition Cut Effect</label>
                <select
                  value={videoAdjustments.transition || 'none'}
                  onChange={(e) => onUpdateVideoAdjustments({ transition: e.target.value as any })}
                  className="w-full px-3 py-1.5 bg-[#141824] border border-[#222738] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {TRANSITIONS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400">Fade In ({videoAdjustments.fade_in}s)</span>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.1"
                    value={videoAdjustments.fade_in}
                    onChange={(e) => onUpdateVideoAdjustments({ fade_in: Number(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-400">Fade Out ({videoAdjustments.fade_out}s)</span>
                  <input
                    type="range"
                    min="0"
                    max="3.0"
                    step="0.1"
                    value={videoAdjustments.fade_out}
                    onChange={(e) => onUpdateVideoAdjustments({ fade_out: Number(e.target.value) })}
                    className="w-full accent-blue-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CAPTIONS CUSTOMIZATION */}
        {activeTab === 'captions' && (
          <div className="space-y-4 animate-in fade-in-50">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-purple-400" />
              <span>Smart Captions Studio</span>
            </h3>

            {/* Presets Grid */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-300">Style Presets</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'bold_pop', label: 'Hormozi Pop' },
                  { id: 'mrbeast', label: 'MrBeast' },
                  { id: 'minimal', label: 'Minimal' },
                  { id: 'gaming', label: 'Gaming' },
                  { id: 'cinematic', label: 'Cinematic' },
                  { id: 'karaoke', label: 'Karaoke' }
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onApplyPreset(p.id)}
                    className={`p-2 rounded-xl border text-[11px] font-semibold transition truncate ${
                      captionsState.preset === p.id
                        ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                        : 'bg-[#141824] border-[#222738] text-gray-300 hover:border-[#353D58]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Family & Size */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Font</label>
                <select
                  value={captionsState.font_family}
                  onChange={(e) => onUpdateCaptionsState({ font_family: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#141824] border border-[#222738] rounded-xl text-xs text-white"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Size</span>
                  <span className="font-mono text-purple-400 font-bold">{captionsState.font_size}pt</span>
                </div>
                <input
                  type="range"
                  min="32"
                  max="72"
                  value={captionsState.font_size}
                  onChange={(e) => onUpdateCaptionsState({ font_size: Number(e.target.value) })}
                  className="w-full accent-purple-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>
            </div>

            {/* Colors: Text & Highlight */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Primary Color</label>
                <div className="flex items-center gap-2 bg-[#141824] p-1.5 rounded-xl border border-[#222738]">
                  <input
                    type="color"
                    value={captionsState.primary_color}
                    onChange={(e) => onUpdateCaptionsState({ primary_color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-gray-300 uppercase">
                    {captionsState.primary_color}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Highlight Color</label>
                <div className="flex items-center gap-2 bg-[#141824] p-1.5 rounded-xl border border-[#222738]">
                  <input
                    type="color"
                    value={captionsState.highlight_color}
                    onChange={(e) => onUpdateCaptionsState({ highlight_color: e.target.value })}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="font-mono text-[11px] text-yellow-400 uppercase">
                    {captionsState.highlight_color}
                  </span>
                </div>
              </div>
            </div>

            {/* Animation & Placement */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Animation</label>
                <select
                  value={captionsState.animation || 'pop'}
                  onChange={(e) => onUpdateCaptionsState({ animation: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-[#141824] border border-[#222738] rounded-xl text-xs text-white"
                >
                  <option value="pop">Active Word Pop</option>
                  <option value="karaoke">Karaoke Highlight</option>
                  <option value="bounce">Word Bounce</option>
                  <option value="wave">Wave</option>
                  <option value="fade">Smooth Fade</option>
                  <option value="none">Static Subtitle</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Placement</label>
                <select
                  value={captionsState.placement || 'bottom'}
                  onChange={(e) => onUpdateCaptionsState({ placement: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-[#141824] border border-[#222738] rounded-xl text-xs text-white"
                >
                  <option value="bottom">Bottom (Safe Zone)</option>
                  <option value="middle">Center Screen</option>
                  <option value="top">Top Header</option>
                </select>
              </div>
            </div>

            {/* Outline & Shadow Sliders */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Outline</span>
                  <span className="font-mono text-gray-400">{captionsState.outline_width}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="0.5"
                  value={captionsState.outline_width}
                  onChange={(e) => onUpdateCaptionsState({ outline_width: Number(e.target.value) })}
                  className="w-full accent-purple-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Shadow</span>
                  <span className="font-mono text-gray-400">{captionsState.shadow_offset}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="0.5"
                  value={captionsState.shadow_offset}
                  onChange={(e) => onUpdateCaptionsState({ shadow_offset: Number(e.target.value) })}
                  className="w-full accent-purple-500 h-1.5 bg-[#1A1F2E] rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIO CONTROLS */}
        {activeTab === 'audio' && (
          <div className="space-y-4 animate-in fade-in-50">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-pink-400" />
              <span>Broadcast Audio Suite</span>
            </h3>

            {/* Speech Video Audio Volume & Mute */}
            <div className="p-3 bg-[#141824] border border-[#222738] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  Voice Speech Track (A1)
                </span>
                <button
                  type="button"
                  onClick={() => onUpdateAudioState({ video_audio_muted: !audioState.video_audio_muted })}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                    audioState.video_audio_muted
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {audioState.video_audio_muted ? 'Muted' : 'Active'}
                </button>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Volume Level</span>
                  <span className="font-mono">{Math.round((audioState.video_audio_volume || 1.0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2.0"
                  step="0.05"
                  disabled={audioState.video_audio_muted}
                  value={audioState.video_audio_volume || 1.0}
                  onChange={(e) => onUpdateAudioState({ video_audio_volume: Number(e.target.value) })}
                  className="w-full accent-emerald-500 h-1.5 bg-[#1A1F2E] rounded-lg disabled:opacity-40"
                />
              </div>
            </div>

            {/* Background Music Soundtrack */}
            <div className="p-3 bg-[#141824] border border-[#222738] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-pink-400" />
                  BGM Soundtrack (A2)
                </span>
                <span className="font-mono text-pink-400 text-[11px]">
                  {Math.round((audioState.bgm_volume || 0.14) * 100)}%
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-400">Select Soundtrack Bed</label>
                <select
                  value={audioState.bgm_track || 'lofi_chill'}
                  onChange={(e) => onUpdateAudioState({ bgm_track: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-[#0A0C14] border border-[#222738] rounded-xl text-xs text-white"
                >
                  <option value="none">No Background Music</option>
                  <option value="lofi_chill">Upbeat Lo-Fi Chill Hop</option>
                  <option value="cinematic_ambient">Deep Atmospheric Cinematic</option>
                  <option value="energetic_trap">High-Octane Phonk & Trap</option>
                  <option value="synthwave_hype">Cyber Synthwave Drive</option>
                  <option value="acoustic_ambient">Warm Acoustic Sunshine</option>
                  <option value="cyber_beats">Deep Tech Minimal Pulse</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-gray-400">
                  <span>Ducking Volume</span>
                  <span className="font-mono text-pink-300">
                    {Math.round((audioState.bgm_volume || 0.14) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.4"
                  step="0.02"
                  disabled={audioState.bgm_track === 'none'}
                  value={audioState.bgm_volume || 0.14}
                  onChange={(e) => onUpdateAudioState({ bgm_volume: Number(e.target.value) })}
                  className="w-full accent-pink-500 h-1.5 bg-[#1A1F2E] rounded-lg disabled:opacity-40"
                />
              </div>
            </div>

            {/* Broadcast Enhancers (Loudnorm, Denoise, EQ) */}
            <div className="space-y-2 pt-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Broadcast DSP Enhancements
              </span>
              {[
                {
                  key: 'loudnorm',
                  label: 'EBU R128 Loudness Normalizer',
                  desc: 'Normalizes speech to -16 LUFS for consistent mobile playback'
                },
                {
                  key: 'denoise',
                  label: 'Vocal Background Denoise',
                  desc: 'Removes ambient room reverb and fan hum'
                },
                {
                  key: 'speech_boost',
                  label: 'Dynamic Speech Clarity EQ',
                  desc: 'Boosts 3-5 kHz presence for crisp vocal delivery'
                }
              ].map((enh) => (
                <div
                  key={enh.key}
                  onClick={() =>
                    onUpdateAudioState({
                      [enh.key]: !audioState[enh.key as keyof AudioState]
                    } as any)
                  }
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] border border-[#222738] cursor-pointer hover:border-[#353D58] transition"
                >
                  <div className="pr-2">
                    <h5 className="text-[11px] font-semibold text-white">{enh.label}</h5>
                    <p className="text-[10px] text-gray-400">{enh.desc}</p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                      audioState[enh.key as keyof AudioState]
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'border-gray-600'
                    }`}
                  >
                    {audioState[enh.key as keyof AudioState] && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: TEXT & OVERLAYS */}
        {activeTab === 'text' && (
          <div className="space-y-4 animate-in fade-in-50">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Text & Graphic Overlays</span>
            </h3>

            {/* Watermark Controls */}
            <div className="p-3 bg-[#141824] border border-[#222738] rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Channel Watermark</span>
                <input
                  type="checkbox"
                  checked={overlaysState.watermark?.enabled || false}
                  onChange={(e) =>
                    onUpdateOverlaysState({
                      watermark: {
                        ...overlaysState.watermark,
                        enabled: e.target.checked,
                        text: overlaysState.watermark?.text || '@AiShortsFactory',
                        opacity: overlaysState.watermark?.opacity || 0.75,
                        position: overlaysState.watermark?.position || 'top_right'
                      }
                    })
                  }
                  className="accent-purple-500 rounded"
                />
              </div>

              {overlaysState.watermark?.enabled && (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={overlaysState.watermark.text}
                    onChange={(e) =>
                      onUpdateOverlaysState({
                        watermark: { ...overlaysState.watermark, text: e.target.value }
                      })
                    }
                    placeholder="@YourChannel"
                    className="w-full px-3 py-1.5 bg-[#0A0C14] border border-[#222738] rounded-xl text-xs text-white"
                  />
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span>Position</span>
                    <select
                      value={overlaysState.watermark.position}
                      onChange={(e) =>
                        onUpdateOverlaysState({
                          watermark: { ...overlaysState.watermark, position: e.target.value as any }
                        })
                      }
                      className="px-2 py-1 bg-[#0A0C14] border border-[#222738] rounded text-white"
                    >
                      <option value="top_right">Top Right</option>
                      <option value="top_left">Top Left</option>
                      <option value="bottom_right">Bottom Right</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Active Titles List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Active Title Overlays
              </span>
              {overlaysState.titles?.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No text titles on timeline yet.</p>
              ) : (
                overlaysState.titles?.map((title, tIdx) => (
                  <div
                    key={title.id || tIdx}
                    className="p-3 bg-[#141824] border border-[#222738] rounded-xl space-y-2 text-xs"
                  >
                    <input
                      type="text"
                      value={title.text}
                      onChange={(e) => {
                        const updated = overlaysState.titles.map((item, idx) =>
                          idx === tIdx ? { ...item, text: e.target.value } : item
                        );
                        onUpdateOverlaysState({ titles: updated });
                      }}
                      className="w-full px-2.5 py-1.5 bg-[#0A0C14] border border-[#222738] rounded-lg text-white font-semibold"
                    />
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span>In: {title.start_time.toFixed(1)}s</span>
                      <span>Dur: {title.duration.toFixed(1)}s</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = overlaysState.titles.filter((_, idx) => idx !== tIdx);
                          onUpdateOverlaysState({ titles: updated });
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI SMART AUTO-REFRAMING & TRACKING */}
        {activeTab === 'reframing' && (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Auto-Reframing & Tracking</span>
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                CV Engine
              </span>
            </div>

            {/* AI Visual Detection Summary Card */}
            <div className="p-3 bg-[#141824] border border-[#222738] rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-purple-400" />
                  Visual Subjects Detected
                </span>
                <span className="font-mono font-bold text-white">
                  {reframingConfig?.face_count ?? (reframingConfig?.face_detected ? 1 : 0)} Face(s)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 pt-1 border-t border-[#1C2030]">
                <div>
                  <span className="text-gray-500">Scene Cuts: </span>
                  <span className="font-mono text-gray-300 font-semibold">{reframingConfig?.scene_cuts?.length ?? 0}</span>
                </div>
                <div>
                  <span className="text-gray-500">Track Points: </span>
                  <span className="font-mono text-gray-300 font-semibold">
                    {reframingConfig?.sample_count ?? reframingConfig?.trajectory?.length ?? 0}
                  </span>
                </div>
              </div>
              {isSplitRecommended && (
                <div className="mt-1 px-2.5 py-1 rounded-xl bg-purple-500/15 border border-purple-500/30 text-[10px] text-purple-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  <span>2 distinct speakers detected: Split-Screen recommended!</span>
                </div>
              )}
            </div>

            {/* Framing Mode Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-300">Tracking & Framing Mode</label>
                <span className="text-[10px] font-mono text-cyan-400 font-semibold">{currentMode}</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'auto', label: 'AI Auto (Smart)', desc: 'Adaptive Face + Motion' },
                  { id: 'smart_face', label: 'Smart Face', desc: 'Speaker Lock & Headroom' },
                  { id: 'motion_action', label: 'Motion Action', desc: 'Centroid Energy Tracking' },
                  { id: 'split_screen', label: '2-Speaker Split', desc: 'Stacked 9:16 Duo View' },
                  { id: 'manual_center', label: 'Center Static', desc: 'Fixed 9:16 Center Crop' },
                  { id: 'manual_left', label: 'Left Static', desc: 'Fixed 9:16 Left Anchor' },
                  { id: 'manual_right', label: 'Right Static', desc: 'Fixed 9:16 Right Anchor' },
                  { id: 'custom', label: 'Custom Pan/Zoom', desc: 'Manual Precision Offsets' }
                ].map((modeItem) => {
                  const isSelected = currentMode === modeItem.id;
                  return (
                    <button
                      key={modeItem.id}
                      type="button"
                      onClick={() => onUpdateReframingConfig?.({ mode: modeItem.id as any })}
                      className={`p-2 rounded-xl border text-left transition ${
                        isSelected
                          ? 'bg-cyan-600/20 border-cyan-500 text-white shadow-sm'
                          : 'bg-[#141824] border-[#222738] text-gray-300 hover:border-[#353D58]'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{modeItem.label}</div>
                      <div className="text-[9px] text-gray-400 truncate">{modeItem.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality Analysis Mode */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-gray-300">Tracking Quality</label>
                <span className="text-[10px] text-gray-400">Sampling Density</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'standard', label: 'Standard', sub: '1.5 fps' },
                  { id: 'smart', label: 'Smart AI', sub: '4.0 fps' },
                  { id: 'precision', label: 'Precision', sub: '8.0 fps' }
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => onUpdateReframingConfig?.({ quality_mode: q.id as any })}
                    className={`py-1.5 px-2 rounded-xl border text-center transition ${
                      currentQuality === q.id
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold'
                        : 'bg-[#141824] border-[#222738] text-gray-300 hover:text-white'
                    }`}
                  >
                    <div className="text-[10px] font-bold">{q.label}</div>
                    <div className="text-[9px] text-gray-400 font-mono">{q.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Framing & Camera Sliders */}
            <div className="pt-2 border-t border-[#1C2030] space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Camera & Framing Tuning
              </span>

              {/* Horizontal Center Pan */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Horizontal Pan Position</span>
                  <span className="font-mono text-cyan-400 font-semibold">{centerX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={centerX}
                  onChange={(e) =>
                    onUpdateReframingConfig?.({
                      center_x_ratio: Number(e.target.value) / 100,
                      mode: currentMode === 'auto' ? 'custom' : currentMode
                    })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A1F2E] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-gray-500 font-mono">
                  <span>0% Left</span>
                  <span>50% Center</span>
                  <span>100% Right</span>
                </div>
              </div>

              {/* Safe Headroom Margin */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Safe Headroom Margin</span>
                  <span className="font-mono text-cyan-400 font-semibold">{safeHeadroom}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={safeHeadroom}
                  onChange={(e) =>
                    onUpdateReframingConfig?.({ safe_headroom: Number(e.target.value) / 100 })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A1F2E] rounded-lg cursor-pointer"
                />
                <p className="text-[9px] text-gray-500">
                  Preserves golden-ratio portrait headroom (10% - 18% standard, face in upper 20%-45%).
                </p>
              </div>

              {/* Zoom Scale */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Zoom Punch-In</span>
                  <span className="font-mono text-cyan-400 font-semibold">{zoomScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) =>
                    onUpdateReframingConfig?.({ zoom_scale: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A1F2E] rounded-lg cursor-pointer"
                />
              </div>

              {/* Camera Smoothing Damping */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span>Camera Movement Smoothing</span>
                  <span className="font-mono text-cyan-400 font-semibold">
                    {Math.round(smoothness * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="0.98"
                  step="0.02"
                  value={smoothness}
                  onChange={(e) =>
                    onUpdateReframingConfig?.({ smoothness: Number(e.target.value) })
                  }
                  className="w-full accent-cyan-400 h-1.5 bg-[#1A1F2E] rounded-lg cursor-pointer"
                />
                <p className="text-[9px] text-gray-500">
                  Exponential Moving Average damping. Resets cleanly at shot boundaries to prevent dizzy pans.
                </p>
              </div>
            </div>

            {/* Split-Screen Settings (If split mode or 2 speakers detected) */}
            {(currentMode === 'split_screen' || isSplitRecommended) && (
              <div className="pt-2 border-t border-[#1C2030] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    2-Speaker Split-Screen
                  </span>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Stacked 9:16
                  </span>
                </div>

                {/* Split Layout Mode */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-400">Layout Format</label>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: 'stacked_top_bottom', label: 'Top / Bottom' },
                      { id: 'dynamic_switch', label: 'Dynamic Switch' },
                      { id: 'single_focus', label: 'Active Focus' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => onUpdateReframingConfig?.({ split_layout: fmt.id as any })}
                        className={`py-1 rounded text-[10px] font-semibold border ${
                          splitLayout === fmt.id
                            ? 'bg-purple-600 text-white border-purple-400'
                            : 'bg-[#141824] border-[#222738] text-gray-300'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Speaker 1 Horizontal Pan */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-300">Speaker 1 Position (Top)</span>
                    <span className="font-mono text-purple-300">{speaker1X}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speaker1X}
                    onChange={(e) =>
                      onUpdateReframingConfig?.({ speaker1_x_ratio: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-purple-400 h-1.5 bg-[#1A1F2E] rounded-lg"
                  />
                </div>

                {/* Speaker 2 Horizontal Pan */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-300">Speaker 2 Position (Bottom)</span>
                    <span className="font-mono text-purple-300">{speaker2X}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={speaker2X}
                    onChange={(e) =>
                      onUpdateReframingConfig?.({ speaker2_x_ratio: Number(e.target.value) / 100 })
                    }
                    className="w-full accent-purple-400 h-1.5 bg-[#1A1F2E] rounded-lg"
                  />
                </div>

                {/* Divider Line Color */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-gray-400 block">Split Divider Line Color</span>
                  <div className="flex items-center gap-2">
                    {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#FFFFFF', '#000000'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => onUpdateReframingConfig?.({ split_divider_color: color })}
                        style={{ backgroundColor: color }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          dividerColor === color ? 'border-white scale-110 shadow-md' : 'border-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons: Re-analyze & Reset */}
            <div className="pt-3 border-t border-[#1C2030] space-y-2">
              <button
                type="button"
                onClick={() => onAnalyzeReframing?.(currentMode, currentQuality)}
                disabled={isAnalyzingReframing}
                className="w-full py-2.5 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-cyan-600/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingReframing ? 'animate-spin' : ''}`} />
                <span>{isAnalyzingReframing ? 'Tracking Visual Subjects...' : 'Re-Analyze Visual Subjects'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateReframingConfig?.({
                    mode: 'auto',
                    quality_mode: 'smart',
                    center_x_ratio: 0.5,
                    center_y_ratio: 0.5,
                    zoom_scale: 1.0,
                    safe_headroom: 0.14,
                    smoothness: 0.85
                  })
                }
                className="w-full py-2 px-3 rounded-xl bg-[#141824] hover:bg-[#1A2030] border border-[#222738] text-gray-400 hover:text-white text-xs font-semibold transition"
              >
                Reset to AI Defaults
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: CANVAS & ASPECT RATIO */}
        {activeTab === 'canvas' && (
          <div className="space-y-4 animate-in fade-in-50">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-emerald-400" />
              <span>Canvas & Framing Layout</span>
            </h3>

            {/* Aspect Ratio Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-gray-300">Aspect Ratio</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '9:16', label: '9:16 Vertical (Shorts)', desc: '1080 × 1920' },
                  { id: '16:9', label: '16:9 Landscape', desc: '1920 × 1080' },
                  { id: '1:1', label: '1:1 Square (Instagram)', desc: '1080 × 1080' },
                  { id: '4:5', label: '4:5 Portrait (Feed)', desc: '1080 × 1350' }
                ].map((ar) => (
                  <button
                    key={ar.id}
                    type="button"
                    onClick={() => onUpdateAspectRatio(ar.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      aspectRatio === ar.id
                        ? 'bg-purple-600/25 border-purple-500 shadow-glow-purple text-white'
                        : 'bg-[#141824] border-[#222738] text-gray-300 hover:border-[#353D58]'
                    }`}
                  >
                    <div className="text-xs font-bold">{ar.label}</div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">{ar.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Blurred Background Fill */}
            <div className="p-3 bg-[#141824] border border-[#222738] rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="text-xs font-semibold text-white">Blurred Background Fill</h5>
                <p className="text-[10px] text-gray-400">Blurs source edges when fitting non-vertical video</p>
              </div>
              <input
                type="checkbox"
                checked={canvasSettings.bg_blur}
                onChange={(e) => onUpdateCanvasSettings({ bg_blur: e.target.checked })}
                className="accent-purple-500 rounded"
              />
            </div>

            {/* Safe-Area Guides */}
            <div className="p-3 bg-[#141824] border border-[#222738] rounded-2xl flex items-center justify-between">
              <div>
                <h5 className="text-xs font-semibold text-white">YouTube Shorts Safe Guides</h5>
                <p className="text-[10px] text-gray-400">Overlays like/comment buttons and title zones</p>
              </div>
              <input
                type="checkbox"
                checked={canvasSettings.show_safe_guides}
                onChange={(e) => onUpdateCanvasSettings({ show_safe_guides: e.target.checked })}
                className="accent-purple-500 rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


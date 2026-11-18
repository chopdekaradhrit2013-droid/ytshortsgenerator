"use client";

import React, { useState } from 'react';
import {
  Film,
  Music,
  Type,
  Smile,
  Bookmark,
  Sparkles,
  Plus,
  Play,
  Pause,
  Mic,
  Radio,
  Sliders,
  CheckCircle2,
  Layers,
  Wand2
} from 'lucide-react';
import { GeneratedClip } from '@/types';

interface MediaAndToolsSidebarProps {
  leftTab: 'clips' | 'audio' | 'text' | 'presets';
  onLeftTabChange: (tab: 'clips' | 'audio' | 'text' | 'presets') => void;
  clips: GeneratedClip[];
  activeClip: GeneratedClip | null;
  onSelectClip: (clip: GeneratedClip) => void;
  onAddTitleOverlay: (titleText: string) => void;
  onAddEmojiOverlay: (emoji: string) => void;
  onAddStickerOverlay: (stickerName: string) => void;
  onSelectBgmTrack: (trackKey: string) => void;
  currentBgmTrack: string;
  studioPresets: any[];
  onApplyPreset: (preset: any) => void;
  onOpenSavePresetModal: () => void;
  onOpenAIAssist: () => void;
}

const EMOJIS = ['🔥', '🚀', '💡', '⚡', '🤯', '🎯', '💯', '👑', '⚠️', '👀', '✨', '💰'];

const STICKERS = [
  { id: 'stk_sub', name: 'Subscribe Pill', tag: 'CTA' },
  { id: 'stk_fire', name: 'Fire Flame Glow', tag: 'Hype' },
  { id: 'stk_rocket', name: 'Rocket Launch', tag: 'Growth' },
  { id: 'stk_warning', name: 'Caution Warning', tag: 'Alert' }
];

const BGM_TRACKS = [
  { id: 'none', name: 'No Soundtrack', mood: 'Silent', bpm: 0 },
  { id: 'lofi_chill', name: 'Upbeat Lo-Fi Chill Hop', mood: 'Chill & Focus', bpm: 85 },
  { id: 'cinematic_ambient', name: 'Deep Cinematic Ambient', mood: 'Dramatic & Epic', bpm: 70 },
  { id: 'energetic_trap', name: 'High-Octane Phonk & Trap', mood: 'Intense Viral', bpm: 130 },
  { id: 'synthwave_hype', name: 'Cyber Synthwave Drive', mood: 'Retro Gaming', bpm: 120 },
  { id: 'acoustic_ambient', name: 'Warm Acoustic Sunshine', mood: 'Uplifting & Clean', bpm: 92 },
  { id: 'cyber_beats', name: 'Deep Tech Minimal Pulse', mood: 'Futuristic AI', bpm: 124 }
];

export const MediaAndToolsSidebar: React.FC<MediaAndToolsSidebarProps> = ({
  leftTab,
  onLeftTabChange,
  clips,
  activeClip,
  onSelectClip,
  onAddTitleOverlay,
  onAddEmojiOverlay,
  onAddStickerOverlay,
  onSelectBgmTrack,
  currentBgmTrack,
  studioPresets,
  onApplyPreset,
  onOpenSavePresetModal,
  onOpenAIAssist
}) => {
  const [customTitleInput, setCustomTitleInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);

  const handleToggleVoiceover = () => {
    if (isRecording) {
      setIsRecording(false);
      setRecSeconds(0);
    } else {
      setIsRecording(true);
      // Simulated mic meter increment
      let s = 0;
      const interval = setInterval(() => {
        s += 1;
        setRecSeconds(s);
        if (s >= 30) clearInterval(interval);
      }, 1000);
    }
  };

  return (
    <div className="w-72 bg-[#0E111A] border-r border-[#1C2030] flex flex-col h-full flex-shrink-0 text-xs text-gray-300">
      {/* 1. SIDEBAR NAV ICONS */}
      <div className="h-11 px-2 border-b border-[#1C2030] flex items-center justify-between bg-[#121622] flex-shrink-0">
        {[
          { id: 'clips', label: 'Clips', icon: Film },
          { id: 'audio', label: 'Audio', icon: Music },
          { id: 'text', label: 'Graphics', icon: Type },
          { id: 'presets', label: 'Presets', icon: Bookmark }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = leftTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onLeftTabChange(tab.id as any)}
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

      {/* 2. TAB BODY */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* TAB 1: PROJECT CLIPS */}
        {leftTab === 'clips' && (
          <div className="space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Clip Candidates ({clips.length})
              </span>
            </div>

            <div className="space-y-2">
              {clips.map((c) => {
                const isSelected = activeClip?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectClip(c)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-purple-950/25 border-purple-500 shadow-glow-purple'
                        : 'bg-[#141824] border-[#222738] hover:border-[#353D58]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-white truncate max-w-[170px]">{c.title}</span>
                      <span className="font-mono text-purple-400 font-bold">{c.duration_seconds}s</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
                      <span>Virality: {c.virality_score || c.engagement_score || 90}%</span>
                      <span className="text-emerald-400">Ready to Edit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: AUDIO & SFX LIBRARY */}
        {leftTab === 'audio' && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* Voiceover Recording Tool */}
            <div className="p-3 bg-gradient-to-br from-[#181D2C] to-[#121624] border border-[#2A3148] rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-teal-400" />
                  Voice-Over Recorder
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono animate-pulse">
                    <Radio className="w-3 h-3" />
                    REC {recSeconds}s
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400">Record spoken narration directly to Timeline Track A3</p>
              <button
                type="button"
                onClick={handleToggleVoiceover}
                className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                    : 'bg-[#22283A] hover:bg-[#2C344C] text-gray-200 border border-[#333C56]'
                }`}
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{isRecording ? 'Stop Recording' : 'Start Voiceover'}</span>
              </button>
            </div>

            {/* Royalty-Free Soundtracks */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Royalty-Free BGM Tracks
              </span>
              <div className="space-y-1.5">
                {BGM_TRACKS.map((trk) => {
                  const isCurrent = currentBgmTrack === trk.id;
                  return (
                    <div
                      key={trk.id}
                      onClick={() => onSelectBgmTrack(trk.id)}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                        isCurrent
                          ? 'bg-pink-950/25 border-pink-500 shadow-glow-pink'
                          : 'bg-[#141824] border-[#222738] hover:border-[#353D58]'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{trk.name}</div>
                        <div className="text-[10px] text-gray-400">{trk.mood}</div>
                      </div>
                      {isCurrent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold">
                          Active
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GRAPHICS & TEXT OVERLAYS */}
        {leftTab === 'text' && (
          <div className="space-y-4 animate-in fade-in-50">
            {/* Quick Title / Lower-Third Input */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Add Title & Banner (T1)
              </span>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={customTitleInput}
                  onChange={(e) => setCustomTitleInput(e.target.value)}
                  placeholder="e.g. 3 REASONS WHY"
                  className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white"
                />
                <button
                  type="button"
                  disabled={!customTitleInput.trim()}
                  onClick={() => {
                    onAddTitleOverlay(customTitleInput.trim());
                    setCustomTitleInput("");
                  }}
                  className="w-full py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Timeline</span>
                </button>
              </div>
            </div>

            {/* Viral Emojis Grid */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Click-to-Add Viral Emojis
              </span>
              <div className="grid grid-cols-4 gap-2">
                {EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onAddEmojiOverlay(emoji)}
                    className="h-10 text-xl flex items-center justify-center rounded-xl bg-[#141824] border border-[#222738] hover:scale-110 hover:border-purple-500 transition"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Stickers List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Engagement Stickers
              </span>
              <div className="space-y-1.5">
                {STICKERS.map((stk) => (
                  <div
                    key={stk.id}
                    onClick={() => onAddStickerOverlay(stk.name)}
                    className="p-2.5 rounded-xl bg-[#141824] border border-[#222738] hover:border-[#353D58] cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{stk.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{stk.tag}</div>
                    </div>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EDITING PRESETS & TEMPLATES */}
        {leftTab === 'presets' && (
          <div className="space-y-4 animate-in fade-in-50">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Editing Templates ({studioPresets.length})
              </span>
              <button
                type="button"
                onClick={onOpenSavePresetModal}
                className="text-purple-400 hover:text-purple-300 text-[11px] font-semibold"
              >
                + Save Custom
              </button>
            </div>

            <div className="space-y-2">
              {studioPresets.map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => onApplyPreset(preset)}
                  className="p-3 rounded-xl bg-[#141824] border border-[#222738] hover:border-purple-500/60 hover:bg-[#181D2C] cursor-pointer transition space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white">{preset.name}</h5>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 uppercase font-mono font-bold">
                      {preset.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 line-clamp-2">{preset.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. AI COPILOT SHORTCUT BANNER */}
      <div className="p-3 border-t border-[#1C2030] bg-[#121622] flex-shrink-0">
        <button
          type="button"
          onClick={onOpenAIAssist}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-purple-600/20"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Ask AI Editor Assistant</span>
        </button>
      </div>
    </div>
  );
};


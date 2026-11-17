"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  FileText
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { GeneratedClip } from '@/types';

export default function AIClipGeneratorPage() {
  const router = useRouter();
  const {
    projects,
    activeProject,
    setActiveProject,
    clips,
    setActiveClip,
    addPublishingJob,
    addNotification
  } = useApp();

  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [previewClip, setPreviewClip] = useState<GeneratedClip | null>(null);
  const [filterScore, setFilterScore] = useState<number>(80);

  // Filter clips for active project or all clips
  const projectClips = activeProject
    ? clips.filter(c => c.project_id === activeProject.id)
    : clips;

  const displayedClips = projectClips.filter(c => c.engagement_score >= filterScore);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. PIPELINE STATUS HEADER */}
      <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI VIRALITY PIPELINE ENGINE</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI Clip Generator & Moments Analyzer
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Active Source: <strong className="text-white">{activeProject?.name || "All Projects"}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => addNotification("Pipeline Resynced", "Refreshed AI virality models and transcript moments.", "info")}
              className="p-2 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] border border-[#283145] text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Re-run Analysis</span>
            </button>
          </div>
        </div>

        {/* 4 STAGE PROGRESS PIPELINE CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* STAGE 1: TRANSCRIPTION */}
          <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">1. Audio Transcription</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-white">Whisper Speech-To-Text</p>
            <div className="w-full bg-[#1C2130] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-full" />
            </div>
            <p className="text-[10px] text-gray-500 font-mono">100% • 5,420 words indexed</p>
          </div>

          {/* STAGE 2: AI ANALYSIS */}
          <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">2. Hook & Virality Analysis</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-white">LLM Hook Sentiment</p>
            <div className="w-full bg-[#1C2130] h-1.5 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full w-full" />
            </div>
            <p className="text-[10px] text-gray-500 font-mono">100% • 18 candidates ranked</p>
          </div>

          {/* STAGE 3: CLIP DETECTION */}
          <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">3. Clip Framing</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xs font-bold text-white">9:16 Center Tracking</p>
            <div className="w-full bg-[#1C2130] h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-full" />
            </div>
            <p className="text-[10px] text-gray-500 font-mono">100% • Face-tracking active</p>
          </div>

          {/* STAGE 4: RENDERING STATUS */}
          <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">4. Render Engine</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Ready
              </span>
            </div>
            <p className="text-xs font-bold text-white">Full HD 60fps Previews</p>
            <div className="w-full bg-[#1C2130] h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full w-full" />
            </div>
            <p className="text-[10px] text-gray-500 font-mono">{displayedClips.length} Shorts available</p>
          </div>
        </div>
      </div>

      {/* 2. RESULTS FILTER & BULK ACTIONS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-[#12151E] border border-[#23293A]">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-white">
            <input
              type="checkbox"
              checked={selectedClipIds.length > 0 && selectedClipIds.length === displayedClips.length}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded bg-[#0A0C10] border-[#2E364D] text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <span>Select All ({displayedClips.length})</span>
          </label>

          {selectedClipIds.length > 0 && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {selectedClipIds.length} selected
            </span>
          )}
        </div>

        {/* BULK ACTIONS & SCORE FILTER */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Min Score:</span>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(parseInt(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg bg-[#0A0C10] border border-[#23293A] text-xs text-white focus:outline-none"
            >
              <option value={70}>70%+ Viral Score</option>
              <option value={85}>85%+ High Potential</option>
              <option value={90}>90%+ Top 5% Viral</option>
            </select>
          </div>

          <button
            onClick={handleBatchPublish}
            disabled={selectedClipIds.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              selectedClipIds.length > 0
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-glow-purple active:scale-95'
                : 'bg-[#1C2130] text-gray-500 cursor-not-allowed'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Publish Selected ({selectedClipIds.length})</span>
          </button>
        </div>
      </div>

      {/* 3. CLIP RESULT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedClips.map((clip) => {
          const isSelected = selectedClipIds.includes(clip.id);
          
          return (
            <div
              key={clip.id}
              className={`p-4 rounded-2xl bg-[#12151E] border transition-all flex flex-col justify-between group ${
                isSelected
                  ? 'border-purple-500 shadow-glow-purple bg-[#151926]'
                  : 'border-[#23293A] hover:border-purple-500/40'
              }`}
            >
              <div>
                {/* 9:16 VERTICAL THUMBNAIL & PREVIEW */}
                <div className="relative rounded-xl overflow-hidden aspect-[9/13] bg-black border border-white/5 mb-3 group/thumb">
                  <img
                    src={clip.thumbnail_url}
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

                  {/* ENGAGEMENT SCORE PILL */}
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center gap-1 shadow-lg">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span>{clip.engagement_score}% Viral</span>
                  </div>

                  {/* DURATION BADGE */}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white">
                    {clip.duration_seconds}s
                  </div>

                  {/* PLAY PREVIEW BUTTON */}
                  <button
                    onClick={() => setPreviewClip(clip)}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/50"
                  >
                    <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </button>

                  {/* HORMOZI CAPTION PREVIEW OVERLAY */}
                  <div className="absolute bottom-10 inset-x-3 text-center pointer-events-none">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-black/90 text-xs font-black uppercase text-yellow-300 tracking-tight leading-tight shadow-lg border border-white/10">
                      "{clip.hook_sentence.slice(0, 42)}..."
                    </span>
                  </div>
                </div>

                {/* DETAILS */}
                <h3 className="font-bold text-white text-sm line-clamp-2 group-hover:text-purple-300 transition-colors">
                  {clip.title}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {clip.summary}
                </p>

                {/* VIRALITY REASONS LIST */}
                <div className="mt-3 p-2.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Why AI expects this to perform:
                  </span>
                  <ul className="text-[11px] text-gray-300 space-y-0.5 list-disc list-inside">
                    {clip.virality_reasons.slice(0, 2).map((reason, idx) => (
                      <li key={idx} className="line-clamp-1">{reason}</li>
                    ))}
                  </ul>
                </div>
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
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. PREVIEW MODAL */}
      {previewClip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-3xl bg-[#12151E] border border-[#23293A] overflow-hidden shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E2333]">
              <div className="truncate pr-2">
                <h4 className="text-xs font-bold text-white truncate">{previewClip.title}</h4>
                <p className="text-[10px] text-purple-400 font-mono">{previewClip.duration_seconds}s • 9:16 Vertical</p>
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
                src={previewClip.video_url}
                autoPlay
                controls
                loop
                className="w-full h-full object-cover"
              />
              
              {/* Overlay sample caption */}
              <div className="absolute bottom-16 inset-x-4 text-center pointer-events-none">
                <span className="inline-block px-3 py-1 rounded bg-black/80 text-sm font-black uppercase text-yellow-300 tracking-tight shadow-md">
                  {previewClip.hook_sentence}
                </span>
              </div>
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
    </div>
  );
}

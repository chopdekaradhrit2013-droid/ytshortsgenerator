"use client";

import React, { useState } from 'react';
import {
  Wand2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  X,
  Sliders,
  Type,
  Music,
  Scissors,
  RotateCcw,
  Zap
} from 'lucide-react';
import { requestAIAssistApi } from '@/lib/api';
import { AIAssistResponse, StudioProject } from '@/types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: StudioProject;
  onApplyChanges: (updatedState: StudioProject, explanation: string) => void;
}

const QUICK_PROMPTS = [
  { label: "Make captions bigger", icon: Type, prompt: "Make captions bigger" },
  { label: "Highlight words in yellow", icon: Sparkles, prompt: "Highlight important words in yellow" },
  { label: "Add hook title at start", icon: Zap, prompt: "Add a title at the beginning" },
  { label: "Trim first 2 seconds", icon: Scissors, prompt: "Remove the first 2 seconds" },
  { label: "Speed up video (1.25x)", icon: Sliders, prompt: "Make the video faster (1.25x)" },
  { label: "Add smooth transition", icon: RotateCcw, prompt: "Add a smooth transition" },
  { label: "Word-by-word active pop", icon: Type, prompt: "Make the captions appear word by word" },
  { label: "Add upbeat lo-fi music", icon: Music, prompt: "Add upbeat lo-fi music" },
  { label: "Set 9:16 vertical canvas", icon: Sliders, prompt: "Change aspect ratio to 9:16 vertical" },
  { label: "Mute video speech audio", icon: Music, prompt: "Mute video original audio" }
];

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  currentState,
  onApplyChanges
}) => {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIAssistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (cmdToRun?: string) => {
    const cmd = cmdToRun || prompt;
    if (!cmd.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await requestAIAssistApi(cmd, currentState);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Failed to process AI command.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!result) return;
    onApplyChanges(result.updated_state, result.explanation);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#0F121C] border border-[#262C40] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2333] flex items-center justify-between bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                AI Editing Assistant
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Interactive Copilot
                </span>
              </h2>
              <p className="text-xs text-gray-400">Describe creative modifications in natural language</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Quick Prompts */}
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
              Popular Creative Requests
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((qp, idx) => {
                const Icon = qp.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(qp.prompt);
                      handleSubmit(qp.prompt);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1A1F2E] hover:bg-[#252C42] border border-[#262C40] text-xs text-gray-300 hover:text-white transition group"
                  >
                    <Icon className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-300" />
                    <span>{qp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prompt Input Form */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300">
              Your Editing Command
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit();
                }}
                placeholder="e.g. Make captions bigger, highlight words in yellow, and add lo-fi music"
                className="flex-1 px-4 py-2.5 bg-[#0A0C14] border border-[#262C40] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
              />
              <button
                type="button"
                disabled={isLoading || !prompt.trim()}
                onClick={() => handleSubmit()}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-purple-600/30"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Proposed Modifications Diff View */}
          {result && (
            <div className="p-4 bg-[#141824] border border-purple-500/30 rounded-2xl space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Proposed Modifications ({result.modifications_count})
                </span>
                <span className="text-[11px] text-gray-400">Review before applying</span>
              </div>

              <p className="text-xs text-gray-300 bg-[#0C0E16] p-3 rounded-xl border border-[#202538] leading-relaxed">
                {result.explanation}
              </p>

              <div className="space-y-2 pt-1">
                {result.modifications.map((mod, mIdx) => (
                  <div
                    key={mIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#1A1F2E] border border-[#262C40] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono text-[10px] uppercase font-bold">
                        {mod.target}
                      </span>
                      <span className="text-gray-200">{mod.description}</span>
                    </div>
                    {mod.new_value !== undefined && (
                      <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                        ✓ Applied
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1E2333] flex items-center justify-between bg-[#121622]">
          <span className="text-xs text-gray-400">
            Non-destructive: original video remains untouched
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              disabled={!result}
              onClick={handleApply}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-purple-600/30"
            >
              <span>Apply to Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


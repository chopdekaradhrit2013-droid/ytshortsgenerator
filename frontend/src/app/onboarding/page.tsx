"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Target,
  Clock,
  Type,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Flame,
  Check,
  RotateCw
} from 'lucide-react';
import { completeOnboardingApi } from '@/lib/api';
import { useApp } from '@/context/AppContext';

const NICHES = [
  { id: "ai_tech", label: "AI & Emerging Tech", desc: "Agents, coding, AI news & tech breakdowns", icon: Sparkles },
  { id: "gaming", label: "Gaming & Live Streams", desc: "Clips, boss fights, funny reactions & highlights", icon: Flame },
  { id: "business", label: "Business & Finance", desc: "Creator economy, crypto, side hustles & wealth", icon: Target },
  { id: "education", label: "Educational & Science", desc: "Quick explainer videos, interesting facts & hacks", icon: CheckCircle2 },
  { id: "podcast", label: "Podcasts & Interviews", desc: "Thought-provoking quotes, heated debates & stories", icon: Clock },
  { id: "entertainment", label: "Comedy & Entertainment", desc: "Memes, sketches, reactions & viral stories", icon: Sparkles }
];

const CAPTION_STYLES = [
  { id: "hormozi", label: "Hormozi Viral", desc: "Bold uppercase, high-contrast yellow keyword pop", color: "text-amber-300" },
  { id: "mrbeast", label: "MrBeast Dynamic", desc: "Massive scale, neon-green accents & punchy bounce", color: "text-emerald-300" },
  { id: "karaoke", label: "Karaoke Sync", desc: "Word-by-word purple illumination with voice sync", color: "text-purple-300" },
  { id: "cinematic", label: "Clean Cinematic", desc: "Elegant spaced typography, lower-third placement", color: "text-blue-300" }
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refreshAuthData, addNotification } = useApp();

  const [step, setStep] = useState<number>(1);
  const [selectedNiche, setSelectedNiche] = useState<string>("ai_tech");
  const [targetDuration, setTargetDuration] = useState<number>(45);
  const [selectedCaption, setSelectedCaption] = useState<string>("hormozi");
  const [primaryGoal, setPrimaryGoal] = useState<string>("Grow subscriber base with viral clips");
  const [saving, setSaving] = useState<boolean>(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await completeOnboardingApi({
        niche: selectedNiche,
        primary_goal: primaryGoal,
        target_duration_sec: targetDuration,
        preferred_caption_style: selectedCaption
      });
      await refreshAuthData();
      addNotification("Onboarding Complete", "Your personal studio workspace is ready!", "success");
      router.push('/account');
    } catch {
      router.push('/account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl bg-[#12151E] border border-[#202638] rounded-2xl p-8 shadow-2xl space-y-7">
        {/* STEP PROGRESS BAR */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 font-semibold">
            <span className="text-purple-400 uppercase tracking-wider">Step {step} of 3</span>
            <span>{step === 1 ? "Creator Niche" : step === 2 ? "Video Preferences" : "Ready to Launch"}</span>
          </div>
          <div className="h-1.5 w-full bg-[#1A1F2E] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: NICHE SELECTION */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white tracking-tight">Select Your Channel Niche</h1>
              <p className="text-xs text-gray-400">
                This helps our AI highlight detector identify the peak viral moments tailored to your audience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {NICHES.map((n) => {
                const Icon = n.icon;
                const isSelected = selectedNiche === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedNiche(n.id)}
                    className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-600/15 border-purple-500 shadow-md shadow-purple-600/20 ring-1 ring-purple-500/50'
                        : 'bg-[#161B29] border-[#252C40] hover:border-purple-500/40 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-purple-600 text-white' : 'bg-[#1F2538] text-purple-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white mb-0.5">{n.label}</h3>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{n.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: VIDEO PREFERENCES */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white tracking-tight">Shorts Duration & Caption Preset</h1>
              <p className="text-xs text-gray-400">
                Configure your target clip duration and signature subtitle typography style.
              </p>
            </div>

            {/* DURATION SLIDER */}
            <div className="p-4 rounded-xl bg-[#161B29] border border-[#252C40] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-200 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  Target Shorts Duration
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-600/20 text-purple-300 font-bold font-mono">
                  {targetDuration} seconds
                </span>
              </div>
              <input
                type="range"
                min={15}
                max={60}
                step={5}
                value={targetDuration}
                onChange={(e) => setTargetDuration(parseInt(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500">
                <span>15s (Quick Hook)</span>
                <span>30s (Balanced)</span>
                <span>45s (Story Arc)</span>
                <span>60s (Maximum Retention)</span>
              </div>
            </div>

            {/* CAPTION STYLES */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 block flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-400" />
                Default Subtitle Preset
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CAPTION_STYLES.map((c) => {
                  const isSelected = selectedCaption === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCaption(c.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-purple-600/15 border-purple-500 ring-1 ring-purple-500/50'
                          : 'bg-[#161B29] border-[#252C40] hover:border-purple-500/40 text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${c.color}`}>{c.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{c.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: READY TO LAUNCH */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200 text-center">
            <div className="w-16 h-16 rounded-full bg-purple-600/20 border border-purple-500/40 text-purple-400 mx-auto flex items-center justify-center shadow-xl shadow-purple-600/25">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-white tracking-tight">Your Studio is Configured!</h1>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                AI Shorts Factory is now customized for your channel. You can upload long videos, auto-detect highlights, reframe faces, and package thumbnails.
              </p>
            </div>

            {/* SUMMARY PILLS */}
            <div className="p-4 rounded-xl bg-[#161B29] border border-[#252C40] grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Niche</span>
                <span className="text-white font-semibold capitalize">{selectedNiche.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Target Length</span>
                <span className="text-purple-300 font-semibold">{targetDuration}s</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-500 block">Captions</span>
                <span className="text-amber-300 font-semibold capitalize">{selectedCaption}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Preparing Dashboard...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Personal Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


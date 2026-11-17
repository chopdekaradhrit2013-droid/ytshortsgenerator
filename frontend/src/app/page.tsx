"use client";

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  FolderKanban,
  Film,
  Scissors,
  Share2,
  TrendingUp,
  Clock,
  Play,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Zap,
  ExternalLink
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function DashboardPage() {
  const {
    projects,
    clips,
    publishingJobs,
    setActiveProject,
    setActiveClip
  } = useApp();

  const totalProjects = projects.length;
  const totalClips = clips.length;
  const readyToPublish = clips.filter(c => c.status === 'ready').length;
  const publishedCount = publishingJobs.filter(j => j.status === 'published').length;

  const recentProjects = projects.slice(0, 3);
  const recentClips = clips.slice(0, 4);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. HERO SECTION */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181B28] via-[#141722] to-[#0D1017] border border-[#262C3E] p-8 md:p-10 shadow-2xl">
        {/* Subtle background ambient light */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-20 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>AI-POWERED VIRAL SHORT ENGINE</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Turn long videos into <br />
            <span className="bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400 bg-clip-text text-transparent">
              viral-ready Shorts.
            </span>
          </h1>

          <p className="text-gray-300 text-base md:text-lg max-w-2xl font-normal leading-relaxed">
            Your personal AI-powered video production studio. Automatically isolate high-retention moments, apply Hormozi-style captions, edit in a dedicated Studio, and publish directly to YouTube.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/projects/create"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white font-semibold text-sm hover:from-purple-500 hover:to-blue-500 shadow-glow-purple transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </Link>

            <Link
              href="/studio"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1C2130] hover:bg-[#23293D] border border-[#2E364D] text-gray-200 font-semibold text-sm transition-colors"
            >
              <Scissors className="w-4 h-4 text-purple-400" />
              <span>Open Studio Editor</span>
            </Link>

            <Link
              href="/publishing"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#161A26] hover:bg-[#1C2130] border border-[#23293A] text-gray-300 font-semibold text-sm transition-colors"
            >
              <Share2 className="w-4 h-4 text-blue-400" />
              <span>Publishing Hub</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. CORE STATISTICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL PROJECTS */}
        <div className="p-5 rounded-2xl bg-[#131722] border border-[#202636] hover:border-purple-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Projects</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalProjects}</span>
            <span className="text-xs text-emerald-400 font-medium">Active workspace</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Long-form video pipelines</p>
        </div>

        {/* TOTAL CLIPS GENERATED */}
        <div className="p-5 rounded-2xl bg-[#131722] border border-[#202636] hover:border-blue-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Clips Generated</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
              <Film className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{totalClips}</span>
            <span className="text-xs text-blue-400 font-medium">AI detected</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Short-form moments isolated</p>
        </div>

        {/* CLIPS READY TO PUBLISH */}
        <div className="p-5 rounded-2xl bg-[#131722] border border-[#202636] hover:border-amber-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ready To Publish</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{readyToPublish}</span>
            <span className="text-xs text-amber-400 font-medium">Rendered</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Captions & framing synced</p>
        </div>

        {/* SUCCESSFULLY PUBLISHED */}
        <div className="p-5 rounded-2xl bg-[#131722] border border-[#202636] hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Published Clips</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{publishedCount}</span>
            <span className="text-xs text-emerald-400 font-medium">Live on YouTube</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">100% verified upload queue</p>
        </div>
      </div>

      {/* 3. RECENT PROJECTS & RECENT CLIPS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: RECENT PROJECTS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-purple-400" />
                <span>Recent Projects</span>
              </h2>
              <p className="text-xs text-gray-400">Your recent long-form source videos and workflows</p>
            </div>
            <Link
              href="/projects"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#131722] border border-[#202636] text-center space-y-3">
              <Film className="w-10 h-10 text-gray-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No projects yet</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Upload your first long video (podcast, gaming stream, or interview) to begin automated clip generation.
              </p>
              <Link
                href="/projects/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Project</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((proj) => {
                const isCompleted = proj.status === 'completed';
                const isProcessing = proj.status === 'processing' || proj.status === 'analysing';
                
                return (
                  <div
                    key={proj.id}
                    className="p-4 rounded-2xl bg-[#131722] border border-[#202636] hover:border-[#2D354A] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Thumbnail & Status */}
                      <div className="relative rounded-xl overflow-hidden aspect-video bg-[#0A0C10] border border-white/5 mb-3">
                        <img
                          src={proj.thumbnail_url}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-white border border-white/10">
                          {proj.category}
                        </div>
                        <div className="absolute top-2 right-2">
                          {isCompleted ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              Completed
                            </span>
                          ) : isProcessing ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                              {proj.status}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              {proj.status}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-semibold text-white text-sm line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {proj.name}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {proj.description || "No description provided."}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-[#1C2130] mt-4 flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-medium">
                        {proj.clip_count} viral clips
                      </span>
                      <div className="flex items-center gap-2">
                        <Link
                          href="/generator"
                          onClick={() => setActiveProject(proj)}
                          className="px-2.5 py-1 rounded-lg bg-[#1C2130] hover:bg-[#252C40] text-gray-200 text-xs font-medium transition-colors"
                        >
                          View Clips
                        </Link>
                        <Link
                          href="/studio"
                          onClick={() => setActiveProject(proj)}
                          className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition-colors"
                          title="Open in Studio"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT 1 COL: PROCESSING ACTIVITY FEED & QUICK ACTIONS */}
        <div className="space-y-6">
          {/* QUICK ACTIONS */}
          <div className="p-5 rounded-2xl bg-[#131722] border border-[#202636] space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Studio Quick Actions</span>
            </h3>
            <div className="space-y-2">
              <Link
                href="/projects/create"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] text-xs font-semibold text-gray-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-purple-400" />
                  <span>Upload New Long Video</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/studio"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] text-xs font-semibold text-gray-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Scissors className="w-4 h-4 text-blue-400" />
                  <span>Launch Video Editor</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
              </Link>

              <Link
                href="/publishing"
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[#1A1F2D] hover:bg-[#22293C] text-xs font-semibold text-gray-200 transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>Batch Publish to YouTube</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white transition-colors" />
              </Link>
            </div>
          </div>

          {/* ACTIVITY FEED */}
          <div className="p-5 rounded-2xl bg-[#131722] border border-[#202636] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Processing Activity</span>
              </h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#1E2333]">
                <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-medium text-white">AI Virality Analysis Completed</p>
                  <p className="text-[11px] text-gray-400">Future of AGI Podcast • 3 Shorts ready</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#1E2333]">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Film className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-medium text-white">Transcribing Audio Track</p>
                  <p className="text-[11px] text-gray-400">Elden Ring Boss Fights (72% complete)</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                </div>
                <div>
                  <p className="font-medium text-white">YouTube Upload Succeeded</p>
                  <p className="text-[11px] text-gray-400">"The Secret AGI Timeline" is live</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RECENTLY GENERATED CLIPS SHELF */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Recently Generated Shorts</span>
            </h2>
            <p className="text-xs text-gray-400">High engagement segments scored by the AI hook analyzer</p>
          </div>
          <Link
            href="/generator"
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
          >
            <span>Open AI Generator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {recentClips.map((clip) => (
            <div
              key={clip.id}
              className="rounded-2xl bg-[#131722] border border-[#202636] hover:border-purple-500/40 transition-all p-3 flex flex-col justify-between group"
            >
              <div>
                {/* 9:16 Vertical Preview Frame Card */}
                <div className="relative rounded-xl overflow-hidden aspect-[9/14] bg-black border border-white/10 mb-3 group/thumb">
                  <img
                    src={clip.thumbnail_url}
                    alt={clip.title}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Viral Score Pill */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-purple-500/40 text-[10px] font-bold text-purple-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-purple-400" />
                    <span>{clip.engagement_score}% Viral</span>
                  </div>

                  {/* Duration Pill */}
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-white">
                    {clip.duration_seconds}s
                  </div>

                  {/* Play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity bg-black/40">
                    <div className="w-10 h-10 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg">
                      <Play className="w-5 h-5 ml-0.5" />
                    </div>
                  </div>

                  {/* Hormozi Caption Simulation on card */}
                  <div className="absolute bottom-3 inset-x-2 text-center">
                    <span className="inline-block px-2 py-0.5 rounded bg-black/80 text-[10px] font-extrabold uppercase text-yellow-300 tracking-tight leading-tight">
                      "{clip.hook_sentence.slice(0, 38)}..."
                    </span>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
                  {clip.title}
                </h4>
              </div>

              <div className="pt-3 border-t border-[#1C2130] mt-3 flex items-center gap-2">
                <Link
                  href="/studio"
                  onClick={() => setActiveClip(clip)}
                  className="flex-1 py-1.5 text-center rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Edit in Studio</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

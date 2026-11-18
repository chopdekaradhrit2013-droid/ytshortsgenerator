"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FolderKanban,
  Search,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Filter,
  ArrowUpDown,
  Scissors,
  Sparkles,
  Trash2,
  Clock,
  Film,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ProjectStatus, Project } from '@/types';
import { resolveMediaUrl } from '@/lib/api';

export default function MyProjectsPage() {
  const {
    projects,
    setActiveProject,
    deleteProject
  } = useApp();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "clips">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtering & Sorting
  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === "all" || p.status === selectedStatus;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "clips") return b.clip_count - a.clip_count;
    return 0;
  });

  const statuses: { label: string; value: string }[] = [
    { label: "All Statuses", value: "all" },
    { label: "Draft", value: "draft" },
    { label: "Uploading", value: "uploading" },
    { label: "Analysing", value: "analysing" },
    { label: "Processing", value: "processing" },
    { label: "Completed", value: "completed" },
    { label: "Failed", value: "failed" },
  ];

  const renderStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Completed
          </span>
        );
      case 'analysing':
      case 'processing':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
            {status}
          </span>
        );
      case 'uploading':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
            Uploading
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-gray-500/20 text-gray-400 border border-gray-500/30">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2333]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-purple-400" />
            <span>My Projects Library</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse and manage your long-form video archives, AI clip segments and editing workspaces.
          </p>
        </div>

        <Link
          href="/projects/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold hover:from-purple-500 hover:to-blue-500 shadow-glow-purple transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Link>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-[#12151E] border border-[#23293A]">
        {/* SEARCH BAR */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title or description..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>

        {/* STATUS DROPDOWN & SORTING & VIEW TOGGLE */}
        <div className="flex flex-wrap items-center gap-2">
          {/* STATUS FILTER */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-xs text-gray-300 focus:outline-none focus:border-purple-500"
          >
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          {/* SORT FILTER */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-xs text-gray-300 focus:outline-none focus:border-purple-500"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
            <option value="clips">Sort: Most Clips</option>
          </select>

          {/* VIEW TOGGLE */}
          <div className="flex items-center rounded-xl bg-[#0A0C10] border border-[#23293A] p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "grid" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === "list" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PROJECT RESULTS */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#12151E] border border-[#23293A] text-center space-y-3">
          <Film className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No projects found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            No projects matched your search criteria. Try loosening filters or create a new project.
          </p>
          <button
            onClick={() => { setSearchQuery(""); setSelectedStatus("all"); }}
            className="px-4 py-2 rounded-xl bg-[#1C2130] text-purple-300 text-xs font-semibold hover:bg-[#252C40] transition-colors"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-4 rounded-2xl bg-[#12151E] border border-[#23293A] hover:border-purple-500/40 transition-all flex flex-col justify-between group shadow-sm hover:shadow-glow-purple"
            >
              <div>
                {/* VIDEO THUMBNAIL */}
                <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-white/5 mb-3 group/thumb">
                  <img
                    src={resolveMediaUrl(proj.thumbnail_url)}
                    alt={proj.name}
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-black/80 backdrop-blur-md text-white border border-white/10">
                    {proj.category}
                  </div>
                  <div className="absolute top-2 right-2">
                    {renderStatusBadge(proj.status)}
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-gray-300">
                    {proj.source_filename || "raw_video.mp4"}
                  </div>
                </div>

                <h3 className="font-bold text-white text-sm line-clamp-1 group-hover:text-purple-300 transition-colors">
                  {proj.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  {proj.description || "Source video project without description."}
                </p>

                <div className="flex flex-wrap gap-1 mt-3">
                  {proj.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-[#1A1F2D] border border-[#283145] text-[10px] font-medium text-gray-400"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-4 border-t border-[#1C2130] mt-4 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">
                  {proj.clip_count} Shorts generated
                </span>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/generator?project=${proj.id}`}
                    onClick={() => setActiveProject(proj)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1C2130] hover:bg-[#252C40] text-gray-200 text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Clips</span>
                  </Link>

                  <Link
                    href="/studio"
                    onClick={() => setActiveProject(proj)}
                    className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition-colors"
                    title="Open Studio Workspace"
                  >
                    <Scissors className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => deleteProject(proj.id)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                    title="Delete Project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="rounded-2xl bg-[#12151E] border border-[#23293A] overflow-hidden divide-y divide-[#1C2130]">
          {filteredProjects.map((proj) => (
            <div
              key={proj.id}
              className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#161B27] transition-colors group"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-24 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 relative border border-white/5">
                  <img
                    src={resolveMediaUrl(proj.thumbnail_url)}
                    alt={proj.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-purple-300 transition-colors">
                      {proj.name}
                    </h3>
                    {renderStatusBadge(proj.status)}
                  </div>
                  <p className="text-xs text-gray-400 truncate max-w-lg">
                    {proj.description || "No description."}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Created {new Date(proj.created_at).toLocaleDateString()} • {proj.category.toUpperCase()} • {proj.source_file_size_mb || 400} MB
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <div className="text-right mr-2 hidden sm:block">
                  <p className="text-xs font-bold text-white">{proj.clip_count} Shorts</p>
                  <p className="text-[10px] text-gray-500">AI moments</p>
                </div>

                <Link
                  href={`/generator?project=${proj.id}`}
                  onClick={() => setActiveProject(proj)}
                  className="px-3 py-1.5 rounded-lg bg-[#1C2130] hover:bg-[#252C40] text-gray-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Review Clips</span>
                </Link>

                <Link
                  href="/studio"
                  onClick={() => setActiveProject(proj)}
                  className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 transition-colors"
                  title="Open in Studio"
                >
                  <Scissors className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => deleteProject(proj.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


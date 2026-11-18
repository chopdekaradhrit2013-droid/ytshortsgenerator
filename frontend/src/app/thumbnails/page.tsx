"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Image as ImageIcon,
  Grid,
  Filter,
  Download,
  Trash2,
  Copy,
  Star,
  Search,
  ExternalLink,
  Smartphone,
  Monitor,
  TrendingUp,
  RefreshCw,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import {
  ThumbnailDesign,
  ThumbnailTemplate
} from '@/types';
import {
  fetchThumbnailDesignsApi,
  deleteThumbnailDesignApi,
  duplicateThumbnailDesignApi,
  toggleFavoriteThumbnailApi,
  fetchThumbnailTemplatesApi,
  resolveMediaUrl
} from '@/lib/api';
import { ThumbnailStudioModal } from '@/components/studio/ThumbnailStudioModal';
import { useApp } from '@/context/AppContext';

export default function ThumbnailsPage() {
  const { addNotification } = useApp();

  const [designs, setDesigns] = useState<ThumbnailDesign[]>([]);
  const [templates, setTemplates] = useState<ThumbnailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'library' | 'templates'>('library');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRatio, setFilterRatio] = useState<'all' | '9:16' | '16:9'>('all');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Studio Modal State
  const [studioModalOpen, setStudioModalOpen] = useState(false);
  const [activeEditingDesign, setActiveEditingDesign] = useState<ThumbnailDesign | null>(null);

  useEffect(() => {
    loadData();
  }, [favoritesOnly]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [desRes, tplRes] = await Promise.all([
        fetchThumbnailDesignsApi({ favorites_only: favoritesOnly }),
        fetchThumbnailTemplatesApi()
      ]);
      setDesigns(desRes.designs || []);
      setTemplates(tplRes.templates || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (designId: string) => {
    if (!confirm("Are you sure you want to delete this thumbnail design?")) return;
    try {
      await deleteThumbnailDesignApi(designId);
      setDesigns((prev) => prev.filter((d) => d.id !== designId));
      addNotification("Deleted", "Thumbnail design removed.", "info");
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to delete design", "warning");
    }
  };

  const handleDuplicate = async (designId: string) => {
    try {
      const res = await duplicateThumbnailDesignApi(designId);
      if (res.design) {
        setDesigns((prev) => [res.design, ...prev]);
        addNotification("Duplicated", "Created copy of thumbnail design.", "success");
      }
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to duplicate design", "warning");
    }
  };

  const handleToggleFavorite = async (designId: string) => {
    try {
      const res = await toggleFavoriteThumbnailApi(designId);
      if (res.design) {
        setDesigns((prev) =>
          prev.map((d) => (d.id === designId ? { ...d, is_favorite: res.design.is_favorite } : d))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Designs
  const filteredDesigns = designs.filter((d) => {
    const matchesSearch = !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRatio = filterRatio === 'all' || d.aspect_ratio === filterRatio;
    return matchesSearch && matchesRatio;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[#07090F] text-gray-200 font-sans">
      {/* ------------------------------------------------------------------- */}
      {/* 1. TOP HEADER */}
      {/* ------------------------------------------------------------------- */}
      <header className="h-16 px-6 border-b border-[#1A2032] bg-[#0E121E] flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white tracking-wide">
                Thumbnail & Visual Packaging Library
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono text-purple-300 font-semibold">
                Studio Suite
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Create, customize, quality-score, and export high-CTR thumbnails for your YouTube Shorts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveEditingDesign(null);
              setStudioModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition shadow-lg shadow-purple-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Thumbnail</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------------- */}
      {/* 2. SUBHEADER FILTERS & TAB SWITCHER */}
      {/* ------------------------------------------------------------------- */}
      <div className="border-b border-[#1A2032] bg-[#0A0D16] px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="flex items-center bg-[#141826] p-1 rounded-xl border border-[#23293D]">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'library'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>My Designs ({designs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'templates'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Templates ({templates.length})</span>
          </button>
        </div>

        {/* Filter Controls (for Library Tab) */}
        {activeTab === 'library' && (
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search thumbnails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#141826] border border-[#23293D] rounded-xl text-xs text-white placeholder-gray-500 w-48 focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Aspect Ratio Filter */}
            <div className="flex items-center bg-[#141826] p-1 rounded-xl border border-[#23293D] text-xs">
              {(['all', '9:16', '16:9'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRatio(r)}
                  className={`px-2.5 py-1 rounded-lg uppercase font-semibold transition ${
                    filterRatio === r
                      ? 'bg-[#2A324B] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Favorites Toggle */}
            <button
              type="button"
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
                favoritesOnly
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-[#141826] border-[#23293D] text-gray-400 hover:text-white'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Favorites</span>
            </button>
          </div>
        )}

        {/* Categories (for Templates Tab) */}
        {activeTab === 'templates' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            {['all', 'viral_shorts', 'gaming', 'football', 'podcast', 'reactions', 'educational', 'entertainment', 'interviews'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-xl capitalize font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white font-bold'
                    : 'bg-[#141826] border border-[#23293D] text-gray-400 hover:text-white'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 3. MAIN GALLERY GRID */}
      {/* ------------------------------------------------------------------- */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* TAB 1: USER DESIGNS LIBRARY */}
        {activeTab === 'library' && (
          <div>
            {filteredDesigns.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-[#141826] border border-[#23293D] flex items-center justify-center text-gray-500">
                  <ImageIcon className="w-8 h-8 opacity-40" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">No Thumbnails Found</h3>
                  <p className="text-xs text-gray-400 max-w-sm">
                    {searchQuery
                      ? "No thumbnails matched your search filters."
                      : "Generate your first high-CTR thumbnail using AI moment detection and quality scoring."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStudioModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition shadow-md"
                >
                  Open Thumbnail Studio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredDesigns.map((des) => (
                  <div
                    key={des.id}
                    className="group rounded-2xl overflow-hidden bg-[#0E121E] border border-[#1A2032] hover:border-purple-500/50 transition-all flex flex-col shadow-lg"
                  >
                    {/* Thumbnail Image Preview */}
                    <div
                      className={`relative bg-black overflow-hidden cursor-pointer ${
                        des.aspect_ratio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'
                      }`}
                      onClick={() => {
                        setActiveEditingDesign(des);
                        setStudioModalOpen(true);
                      }}
                    >
                      {des.rendered_image_url ? (
                        <img
                          src={resolveMediaUrl(des.rendered_image_url)}
                          alt={des.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-600">
                          <ImageIcon className="w-8 h-8 opacity-30" />
                        </div>
                      )}

                      {/* Favorite Button Overlay */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(des.id);
                        }}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/70 backdrop-blur text-gray-400 hover:text-amber-400 transition"
                      >
                        <Star className={`w-3.5 h-3.5 ${des.is_favorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Quality Score Pill */}
                      <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] font-mono font-bold text-white flex items-center gap-1 border border-white/10">
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                        <span>{des.quality_score}/100</span>
                      </div>

                      {/* Aspect Ratio Badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur text-[10px] font-mono text-gray-300 border border-white/10">
                        {des.aspect_ratio}
                      </div>
                    </div>

                    {/* Card Content & Action Buttons */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4
                          onClick={() => {
                            setActiveEditingDesign(des);
                            setStudioModalOpen(true);
                          }}
                          className="text-xs font-bold text-white line-clamp-1 hover:text-purple-300 cursor-pointer transition"
                        >
                          {des.title}
                        </h4>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {des.width} × {des.height}
                        </span>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#1C2030] text-xs">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicate(des.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {des.rendered_image_url && (
                            <a
                              href={resolveMediaUrl(des.rendered_image_url)}
                              download={`thumbnail_${des.id}.jpg`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-white/5 transition"
                              title="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(des.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveEditingDesign(des);
                            setStudioModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-[11px] font-bold text-purple-300 border border-purple-500/30 transition"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TEMPLATES GALLERY */}
        {activeTab === 'templates' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {templates
              .filter((t) => selectedCategory === 'all' || t.category === selectedCategory)
              .map((tpl) => (
                <div
                  key={tpl.id}
                  className="rounded-2xl overflow-hidden bg-[#0E121E] border border-[#1A2032] hover:border-purple-500/50 transition p-4 flex flex-col justify-between space-y-3 group"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[9px] font-mono text-blue-300 capitalize">
                        {tpl.category.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">{tpl.aspect_ratio}</span>
                    </div>

                    <h4 className="font-bold text-sm text-white group-hover:text-purple-300 transition">
                      {tpl.name}
                    </h4>

                    <p className="text-xs text-gray-400 line-clamp-3">
                      {tpl.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setStudioModalOpen(true);
                    }}
                    className="w-full py-2 bg-[#141826] hover:bg-purple-600 border border-[#23293D] hover:border-purple-500 text-xs font-bold text-gray-200 hover:text-white rounded-xl transition"
                  >
                    Use Template in Studio
                  </button>
                </div>
              ))}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* 4. MODAL: AI THUMBNAIL STUDIO */}
      {/* ------------------------------------------------------------------- */}
      <ThumbnailStudioModal
        isOpen={studioModalOpen}
        onClose={() => {
          setStudioModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}


"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Download,
  Save,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Type,
  Sliders,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Eye,
  ShieldCheck,
  Copy,
  Trash2,
  Plus,
  Maximize2,
  Smartphone,
  Grid,
  Monitor,
  Flame,
  Zap,
  RotateCw,
  SlidersHorizontal,
  ChevronRight,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import {
  GeneratedClip,
  ThumbnailCandidateFrame,
  ThumbnailCanvasData,
  ThumbnailTemplate,
  ThumbnailQualityReport,
  ThumbnailTextLayer
} from '@/types';
import {
  extractThumbnailFramesApi,
  suggestThumbnailTextApi,
  renderThumbnailApi,
  analyzeThumbnailQualityApi,
  fetchThumbnailTemplatesApi,
  saveThumbnailDesignApi,
  applyThumbnailToClipApi,
  uploadThumbnailAssetApi,
  resolveMediaUrl
} from '@/lib/api';
import { useApp } from '@/context/AppContext';

interface ThumbnailStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  clip?: GeneratedClip | null;
  projectId?: string;
  onThumbnailApplied?: (thumbnailUrl: string) => void;
}

export const ThumbnailStudioModal: React.FC<ThumbnailStudioModalProps> = ({
  isOpen,
  onClose,
  clip,
  projectId,
  onThumbnailApplied
}) => {
  const { addNotification } = useApp();

  // Mode & Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9'>('9:16');
  const [activeTab, setActiveTab] = useState<'frames' | 'templates' | 'text' | 'layers' | 'adjustments'>('frames');
  const [previewContext, setPreviewContext] = useState<'canvas' | 'shorts_feed' | 'channel_grid' | 'search_feed'>('canvas');

  // Candidate Frames
  const [candidateFrames, setCandidateFrames] = useState<ThumbnailCandidateFrame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<ThumbnailCandidateFrame | null>(null);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<ThumbnailTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // AI Text Suggestions
  const [textSuggestions, setTextSuggestions] = useState<any[]>([]);
  const [isLoadingTextSuggestions, setIsLoadingTextSuggestions] = useState(false);

  // Active Canvas State
  const [canvasData, setCanvasData] = useState<ThumbnailCanvasData>({
    theme: 'viral_shorts',
    background: {
      type: 'frame',
      color: '#0B0F19',
      overlay_opacity: 0.25,
      vignette: true
    },
    adjustments: {
      brightness: 1.05,
      contrast: 1.25,
      saturation: 1.2,
      blur: 0
    },
    text_layers: [
      {
        id: 't1',
        text: 'DO NOT DO THIS!',
        font_family: 'Impact',
        font_size: 96,
        color: '#FACC15',
        stroke_color: '#000000',
        stroke_width: 12,
        shadow_color: '#000000',
        shadow_offset: [6, 8],
        position_x: 50,
        position_y: 20,
        rotation: -2,
        uppercase: true,
        bg_banner: true,
        bg_color: '#000000',
        bg_opacity: 0.85
      },
      {
        id: 't2',
        text: '100X MISTAKE',
        font_family: 'Impact',
        font_size: 104,
        color: '#FFFFFF',
        stroke_color: '#EF4444',
        stroke_width: 10,
        position_x: 50,
        position_y: 32,
        rotation: 1,
        uppercase: true
      }
    ],
    shapes: [
      {
        id: 's1',
        type: 'pill',
        color: '#DC2626',
        position_x: 50,
        position_y: 90,
        width: 360,
        height: 60,
        opacity: 0.95
      }
    ],
    arrows: [
      {
        id: 'a1',
        start_x: 82,
        start_y: 68,
        end_x: 55,
        end_y: 50,
        color: '#EF4444',
        width: 16,
        curved: true
      }
    ],
    stickers: [
      {
        id: 'stk1',
        emoji: '⚠️',
        position_x: 16,
        position_y: 16,
        scale: 1.2
      }
    ]
  });

  // Selected Text Layer for editing
  const [selectedLayerId, setSelectedLayerId] = useState<string>('t1');

  // Rendered Output & Quality State
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [qualityReport, setQualityReport] = useState<ThumbnailQualityReport | null>(null);
  const [isAnalyzingQuality, setIsAnalyzingQuality] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // File Upload Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Initial Load: Load templates and extract frames for clip
  useEffect(() => {
    if (!isOpen) return;

    // Load templates
    fetchThumbnailTemplatesApi()
      .then((res) => setTemplates(res.templates || []))
      .catch(console.error);

    // Extract frames if clip is provided
    if (clip?.id) {
      loadCandidateFrames(clip.id);
      loadTextSuggestions(clip.title, clip.hook_sentence);
    } else {
      // Auto-render default canvas
      handleLiveRender();
    }
  }, [isOpen, clip?.id]);

  const loadCandidateFrames = async (clipId: string) => {
    setIsLoadingFrames(true);
    try {
      const res = await extractThumbnailFramesApi({
        clip_id: clipId,
        count: 6
      });
      const cands: ThumbnailCandidateFrame[] = res.candidates || [];
      setCandidateFrames(cands);
      if (cands.length > 0) {
        const rec = cands.find((c) => c.is_recommended) || cands[0];
        setSelectedFrame(rec);
        // Trigger live render with the extracted frame
        triggerRenderWithFrame(rec.image_url);
      }
    } catch (err: any) {
      console.warn("Could not extract video frames, using fallback canvas", err);
      handleLiveRender();
    } finally {
      setIsLoadingFrames(false);
    }
  };

  const loadTextSuggestions = async (title?: string, hook?: string) => {
    setIsLoadingTextSuggestions(true);
    try {
      const res = await suggestThumbnailTextApi({
        title: title || "Viral Short",
        hook: hook || "",
        count: 6
      });
      setTextSuggestions(res.suggestions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingTextSuggestions(false);
    }
  };

  // 2. Trigger Live Render
  const triggerRenderWithFrame = async (frameUrl?: string) => {
    setIsRendering(true);
    try {
      const res = await renderThumbnailApi({
        base_image_path: frameUrl || selectedFrame?.image_url,
        canvas_data: canvasData,
        aspect_ratio: aspectRatio,
        width: aspectRatio === '9:16' ? 1080 : 1280,
        height: aspectRatio === '9:16' ? 1920 : 720
      });
      if (res.image_url) {
        setRenderedImageUrl(res.image_url);
        // Run quality check on the newly rendered image
        runQualityCheck(res.image_url);
      }
    } catch (err: any) {
      console.error("Render failed", err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleLiveRender = () => {
    triggerRenderWithFrame(selectedFrame?.image_url);
  };

  // 3. Run Quality Analysis
  const runQualityCheck = async (imgUrl: string) => {
    setIsAnalyzingQuality(true);
    try {
      const res = await analyzeThumbnailQualityApi({
        image_url: imgUrl,
        canvas_data: canvasData,
        context_title: clip?.title || "",
        context_transcript: clip?.summary || ""
      });
      if (res.quality) {
        setQualityReport(res.quality);
      }
    } catch (err) {
      console.error("Quality analysis failed", err);
    } finally {
      setIsAnalyzingQuality(false);
    }
  };

  // 4. Select Candidate Frame
  const handleSelectFrame = (frame: ThumbnailCandidateFrame) => {
    setSelectedFrame(frame);
    triggerRenderWithFrame(frame.image_url);
    addNotification("Frame Selected", `Selected frame at ${frame.timestamp_sec.toFixed(1)}s (Score: ${Math.round(frame.total_score)})`, "info");
  };

  // 5. Select Template
  const handleApplyTemplate = (tpl: ThumbnailTemplate) => {
    setCanvasData({
      ...tpl.canvas_data,
      adjustments: tpl.canvas_data.adjustments || canvasData.adjustments
    });
    setAspectRatio(tpl.aspect_ratio || '9:16');
    addNotification("Template Applied", `Applied ${tpl.name} layout`, "success");
    setTimeout(handleLiveRender, 50);
  };

  // 6. Apply AI Suggested Text Hook
  const handleApplyTextSuggestion = (sug: any) => {
    const updatedLayers = [...canvasData.text_layers];
    if (updatedLayers.length > 0) {
      updatedLayers[0] = { ...updatedLayers[0], text: sug.text };
    } else {
      updatedLayers.push({
        id: `t_${Date.now()}`,
        text: sug.text,
        font_family: 'Impact',
        font_size: 96,
        color: '#FACC15',
        stroke_color: '#000000',
        stroke_width: 12,
        position_x: 50,
        position_y: 20,
        uppercase: true,
        bg_banner: true,
        bg_color: '#000000'
      });
    }
    setCanvasData((prev) => ({ ...prev, text_layers: updatedLayers }));
    addNotification("Text Hook Applied", `Set thumbnail text to "${sug.text}"`, "info");
    setTimeout(handleLiveRender, 50);
  };

  // 7. Custom Image Upload
  const handleUploadCustomImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadThumbnailAssetApi(file);
      if (res.image_url) {
        const customFrame: ThumbnailCandidateFrame = {
          id: `custom_${Date.now()}`,
          timestamp_sec: 0,
          image_url: res.image_url,
          sharpness_score: 90,
          face_score: 85,
          face_detected: true,
          face_count: 1,
          has_expression: true,
          composition_score: 90,
          total_score: 88,
          is_recommended: true
        };
        setSelectedFrame(customFrame);
        triggerRenderWithFrame(res.image_url);
        addNotification("Image Uploaded", "Custom background set", "success");
      }
    } catch (err: any) {
      addNotification("Upload Failed", err.message || "Could not upload image", "warning");
    }
  };

  // 8. Save Thumbnail Design
  const handleSaveDesign = async () => {
    if (!renderedImageUrl) return;
    setIsSaving(true);
    try {
      const designPayload = {
        project_id: projectId || clip?.project_id,
        clip_id: clip?.id,
        title: clip?.title ? `${clip.title} (Thumbnail)` : "Custom Thumbnail Design",
        aspect_ratio: aspectRatio,
        width: aspectRatio === '9:16' ? 1080 : 1280,
        height: aspectRatio === '9:16' ? 1920 : 720,
        source_frame_path: selectedFrame?.image_url,
        rendered_image_url: renderedImageUrl,
        canvas_data: canvasData,
        quality_score: qualityReport?.overall_score || 85,
        quality_report: qualityReport || undefined
      };
      await saveThumbnailDesignApi(designPayload);
      addNotification("Thumbnail Saved", "Design saved to your visual packaging library.", "success");
    } catch (err: any) {
      addNotification("Save Failed", err.message || "Failed to save design", "warning");
    } finally {
      setIsSaving(false);
    }
  };

  // 9. Apply to Generated Clip
  const handleApplyToClip = async () => {
    if (!clip?.id || !renderedImageUrl) return;
    try {
      await applyThumbnailToClipApi(clip.id, renderedImageUrl);
      if (onThumbnailApplied) onThumbnailApplied(renderedImageUrl);
      addNotification("Cover Updated", "Applied high-res thumbnail as Short cover.", "success");
      onClose();
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to apply cover to clip", "warning");
    }
  };

  // Active Selected Layer
  const activeLayer = canvasData.text_layers.find((t) => t.id === selectedLayerId) || canvasData.text_layers[0];

  const updateActiveTextLayer = (updates: Partial<ThumbnailTextLayer>) => {
    if (!activeLayer) return;
    const updated = canvasData.text_layers.map((t) =>
      t.id === activeLayer.id ? { ...t, ...updates } : t
    );
    setCanvasData((prev) => ({ ...prev, text_layers: updated }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[94vh] bg-[#0A0D16] border border-[#1E2436] rounded-3xl shadow-2xl flex flex-col overflow-hidden text-gray-200 font-sans select-none">
        
        {/* =================================================================== */}
        {/* TOP CONTROLS & HEADER BAR */}
        {/* =================================================================== */}
        <header className="h-16 px-6 border-b border-[#1A2032] bg-[#0E121E] flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">
                  AI Thumbnail & Visual Packaging Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono text-purple-300 font-semibold">
                  Studio 2.0
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate max-w-md">
                {clip?.title || "Craft high-CTR custom covers with AI moment detection & quality scoring"}
              </p>
            </div>
          </div>

          {/* Aspect Ratio Switcher & Quality Score Pill */}
          <div className="flex items-center gap-3">
            {/* Aspect Ratio Switcher */}
            <div className="flex items-center bg-[#141826] p-1 rounded-xl border border-[#23293D]">
              <button
                type="button"
                onClick={() => {
                  setAspectRatio('9:16');
                  setTimeout(handleLiveRender, 50);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  aspectRatio === '9:16'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>9:16 Shorts</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAspectRatio('16:9');
                  setTimeout(handleLiveRender, 50);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  aspectRatio === '16:9'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>16:9 Standard</span>
              </button>
            </div>

            {/* Quality Score Indicator */}
            {qualityReport && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-[#141826] border border-[#23293D]">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    qualityReport.overall_score >= 88
                      ? 'bg-emerald-400 animate-pulse'
                      : qualityReport.overall_score >= 75
                      ? 'bg-amber-400'
                      : 'bg-red-400'
                  }`}
                />
                <span className="text-xs font-mono font-bold text-white">
                  {qualityReport.overall_score}/100
                </span>
                <span className="text-[10px] text-gray-400">
                  {qualityReport.rating_tier}
                </span>
              </div>
            )}

            {/* Quick Actions */}
            <button
              type="button"
              onClick={handleLiveRender}
              disabled={isRendering}
              className="p-2 rounded-xl bg-[#141826] hover:bg-[#1E2436] border border-[#23293D] text-gray-300 hover:text-white transition"
              title="Re-render preview"
            >
              <RefreshCw className={`w-4 h-4 ${isRendering ? 'animate-spin' : ''}`} />
            </button>

            {renderedImageUrl && (
              <a
                href={resolveMediaUrl(renderedImageUrl)}
                download={`thumbnail_${aspectRatio === '9:16' ? 'shorts' : 'video'}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141826] hover:bg-[#1E2436] border border-[#23293D] text-xs font-semibold text-gray-200 hover:text-white transition"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Download</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleSaveDesign}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141826] hover:bg-[#1E2436] border border-[#23293D] text-xs font-semibold text-gray-200 hover:text-white transition"
            >
              <Save className="w-3.5 h-3.5 text-purple-400" />
              <span>{isSaving ? 'Saving...' : 'Save Design'}</span>
            </button>

            {clip?.id && (
              <button
                type="button"
                onClick={handleApplyToClip}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition shadow-lg shadow-purple-600/25"
              >
                <Check className="w-4 h-4" />
                <span>Apply as Cover</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* =================================================================== */}
        {/* MAIN BODY: 3-COLUMN WORKSPACE */}
        {/* =================================================================== */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ----------------------------------------------------------------- */}
          {/* COLUMN 1: LEFT TOOLBAR & CUSTOMIZATION CONTROLS */}
          {/* ----------------------------------------------------------------- */}
          <aside className="w-96 border-r border-[#1A2032] bg-[#0E121E] flex flex-col flex-shrink-0">
            {/* Tool Tabs Bar */}
            <div className="h-11 border-b border-[#1A2032] px-2 flex items-center justify-between bg-[#0A0D16]">
              {[
                { id: 'frames', label: 'Frames', icon: ImageIcon },
                { id: 'templates', label: 'Presets', icon: Grid },
                { id: 'text', label: 'Hooks', icon: Zap },
                { id: 'layers', label: 'Layers', icon: Type },
                { id: 'adjustments', label: 'Filter', icon: SlidersHorizontal }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 py-1 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-semibold transition ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              
              {/* TAB 1: EXTRACTED VIDEO FRAMES */}
              {activeTab === 'frames' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>AI Extracted Moments</span>
                    </h4>
                    {clip?.id && (
                      <button
                        type="button"
                        onClick={() => loadCandidateFrames(clip.id)}
                        disabled={isLoadingFrames}
                        className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingFrames ? 'animate-spin' : ''}`} />
                        <span>Re-scan</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-gray-400">
                    OpenCV analyzed facial reactions, sharpness, and focal composition to pick the strongest frames:
                  </p>

                  {/* Candidate Frames Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {candidateFrames.map((frame) => {
                      const isSelected = selectedFrame?.id === frame.id;
                      return (
                        <div
                          key={frame.id}
                          onClick={() => handleSelectFrame(frame)}
                          className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all aspect-[9/14] bg-black ${
                            isSelected
                              ? 'border-purple-500 shadow-glow-purple scale-[1.02]'
                              : 'border-[#23293D] hover:border-gray-500'
                          }`}
                        >
                          <img
                            src={resolveMediaUrl(frame.image_url)}
                            alt="Candidate Frame"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Score Badge */}
                          <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[9px] font-mono text-purple-300 font-bold border border-white/10">
                            {Math.round(frame.total_score)}pts
                          </div>

                          {/* Recommended Pill */}
                          {frame.is_recommended && (
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-emerald-500/90 text-[8px] font-bold text-black uppercase tracking-tight shadow">
                              Best
                            </div>
                          )}

                          {/* Timestamp */}
                          <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur text-[9px] font-mono text-gray-300">
                            {frame.timestamp_sec.toFixed(1)}s
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Upload Custom Image Button */}
                  <div className="pt-2 border-t border-[#1C2030]">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleUploadCustomImage}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#141826] hover:bg-[#1E2436] border border-dashed border-[#2A324B] text-gray-300 hover:text-white flex items-center justify-center gap-2 transition"
                    >
                      <Plus className="w-4 h-4 text-purple-400" />
                      <span>Upload Custom Background Image</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: TEMPLATES PRESETS */}
              {activeTab === 'templates' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-blue-400" />
                      <span>Thumbnail Presets</span>
                    </h4>
                  </div>

                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px]">
                    {['all', 'viral_shorts', 'gaming', 'football', 'podcast', 'reactions', 'educational', 'entertainment', 'interviews'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition ${
                          selectedCategory === cat
                            ? 'bg-blue-600 text-white font-bold'
                            : 'bg-[#141826] border border-[#222738] text-gray-400 hover:text-white'
                        }`}
                      >
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Templates List */}
                  <div className="space-y-2">
                    {templates
                      .filter((t) => selectedCategory === 'all' || t.category === selectedCategory)
                      .map((tpl) => (
                        <div
                          key={tpl.id}
                          onClick={() => handleApplyTemplate(tpl)}
                          className="p-3 rounded-2xl bg-[#141826] hover:bg-[#1C2236] border border-[#23293D] hover:border-purple-500/50 cursor-pointer transition space-y-1.5 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white group-hover:text-purple-300 transition">
                              {tpl.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-[9px] font-mono text-blue-300 capitalize">
                              {tpl.category.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 line-clamp-2">
                            {tpl.description}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 3: AI TEXT HOOKS */}
              {activeTab === 'text' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      <span>AI Suggested Text Hooks</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => loadTextSuggestions(clip?.title, clip?.hook_sentence)}
                      disabled={isLoadingTextSuggestions}
                      className="text-[10px] text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingTextSuggestions ? 'animate-spin' : ''}`} />
                      <span>Regenerate</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-gray-400">
                    Short, compelling 2-5 word hooks derived directly from video transcript to maximize click-through without clickbait:
                  </p>

                  <div className="space-y-2">
                    {textSuggestions.map((sug, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleApplyTextSuggestion(sug)}
                        className="p-3 rounded-2xl bg-[#141826] hover:bg-[#1C2236] border border-[#23293D] hover:border-yellow-500/50 cursor-pointer transition space-y-1.5 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-sm text-yellow-300 tracking-tight">
                            "{sug.text}"
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-[9px] font-bold text-yellow-300">
                            {sug.estimated_ctr_rating}% CTR
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>{sug.category}</span>
                          <span className="text-gray-500">{sug.word_count} words</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: LAYERS & TYPOGRAPHY EDITOR */}
              {activeTab === 'layers' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Typography & Text Elements</span>
                  </h4>

                  {/* Active Text Input */}
                  {activeLayer && (
                    <div className="space-y-3 p-3 bg-[#141824] border border-[#23293D] rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-300">Text Hook</label>
                        <input
                          type="text"
                          value={activeLayer.text}
                          onChange={(e) => updateActiveTextLayer({ text: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#0A0D16] border border-[#2A324B] rounded-xl text-white font-bold text-xs"
                        />
                      </div>

                      {/* Font Family Selection */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-300">Font Family</label>
                        <select
                          value={activeLayer.font_family}
                          onChange={(e) => updateActiveTextLayer({ font_family: e.target.value })}
                          className="w-full px-3 py-1.5 bg-[#0A0D16] border border-[#2A324B] rounded-xl text-white text-xs"
                        >
                          <option value="Impact">Impact (Bold MrBeast Viral)</option>
                          <option value="Montserrat">Montserrat (Modern Heavy)</option>
                          <option value="Inter">Inter (Clean Tech)</option>
                          <option value="Arial">Arial Black (Bold Sans)</option>
                          <option value="Georgia">Georgia (Editorial Serif)</option>
                        </select>
                      </div>

                      {/* Font Size & Position Y */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span>Font Size</span>
                            <span className="font-mono text-cyan-400">{activeLayer.font_size}px</span>
                          </div>
                          <input
                            type="range"
                            min="40"
                            max="140"
                            value={activeLayer.font_size}
                            onChange={(e) => updateActiveTextLayer({ font_size: Number(e.target.value) })}
                            className="w-full accent-cyan-400 h-1 bg-[#1A2032] rounded-lg"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span>Vertical Y</span>
                            <span className="font-mono text-cyan-400">{activeLayer.position_y}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="90"
                            value={activeLayer.position_y}
                            onChange={(e) => updateActiveTextLayer({ position_y: Number(e.target.value) })}
                            className="w-full accent-cyan-400 h-1 bg-[#1A2032] rounded-lg"
                          />
                        </div>
                      </div>

                      {/* Text Color & Outline Stroke */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-300 block">Text Colors & Outline</span>
                        <div className="flex items-center gap-2">
                          {['#FACC15', '#FFFFFF', '#00F0FF', '#EF4444', '#10B981', '#A855F7'].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => updateActiveTextLayer({ color: c })}
                              style={{ backgroundColor: c }}
                              className={`w-6 h-6 rounded-full border-2 transition ${
                                activeLayer.color === c ? 'border-white scale-110 shadow-md' : 'border-gray-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Outline Stroke Width */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                          <span>Stroke Outline</span>
                          <span className="font-mono text-cyan-400">{activeLayer.stroke_width || 10}px</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="20"
                          value={activeLayer.stroke_width || 10}
                          onChange={(e) => updateActiveTextLayer({ stroke_width: Number(e.target.value) })}
                          className="w-full accent-cyan-400 h-1 bg-[#1A2032] rounded-lg"
                        />
                      </div>

                      {/* Background Banner Box */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-gray-300">Dark Banner Behind Text</span>
                        <input
                          type="checkbox"
                          checked={activeLayer.bg_banner || false}
                          onChange={(e) => updateActiveTextLayer({ bg_banner: e.target.checked })}
                          className="accent-purple-500 rounded"
                        />
                      </div>

                      {/* Apply changes button */}
                      <button
                        type="button"
                        onClick={handleLiveRender}
                        className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        Update Preview
                      </button>
                    </div>
                  )}

                  {/* Add Directional Arrow & Stickers */}
                  <div className="p-3 bg-[#141824] border border-[#23293D] rounded-2xl space-y-2">
                    <span className="text-[10px] font-bold text-gray-300 block">Visual Accents</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const newArrows = [...(canvasData.arrows || [])];
                          newArrows.push({
                            id: `a_${Date.now()}`,
                            start_x: 80,
                            start_y: 65,
                            end_x: 52,
                            end_y: 48,
                            color: '#EF4444',
                            width: 16
                          });
                          setCanvasData((prev) => ({ ...prev, arrows: newArrows }));
                          setTimeout(handleLiveRender, 50);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-[#0A0D16] border border-[#2A324B] hover:border-red-400 text-[10px] font-bold text-red-400 flex items-center justify-center gap-1.5"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Add Red Arrow</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const newStickers = [...(canvasData.stickers || [])];
                          newStickers.push({
                            id: `stk_${Date.now()}`,
                            emoji: '🔥',
                            position_x: 16,
                            position_y: 16,
                            scale: 1.2
                          });
                          setCanvasData((prev) => ({ ...prev, stickers: newStickers }));
                          setTimeout(handleLiveRender, 50);
                        }}
                        className="py-1.5 px-2 rounded-xl bg-[#0A0D16] border border-[#2A324B] hover:border-yellow-400 text-[10px] font-bold text-yellow-400 flex items-center justify-center gap-1.5"
                      >
                        <Flame className="w-3.5 h-3.5" />
                        <span>Add Fire Emoji</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: IMAGE ADJUSTMENTS & VIGNETTE */}
              {activeTab === 'adjustments' && (
                <div className="space-y-4 animate-in fade-in-50">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Image Grading & Effects</span>
                  </h4>

                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>Brightness</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round((canvasData.adjustments?.brightness || 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={canvasData.adjustments?.brightness || 1.0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCanvasData((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, brightness: val, contrast: prev.adjustments?.contrast || 1.0, saturation: prev.adjustments?.saturation || 1.0, blur: prev.adjustments?.blur || 0 }
                        }));
                      }}
                      className="w-full accent-emerald-400 h-1 bg-[#1A2032] rounded-lg"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>Contrast</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round((canvasData.adjustments?.contrast || 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.05"
                      value={canvasData.adjustments?.contrast || 1.0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCanvasData((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, contrast: val, brightness: prev.adjustments?.brightness || 1.0, saturation: prev.adjustments?.saturation || 1.0, blur: prev.adjustments?.blur || 0 }
                        }));
                      }}
                      className="w-full accent-emerald-400 h-1 bg-[#1A2032] rounded-lg"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>Color Saturation</span>
                      <span className="font-mono text-emerald-400">
                        {Math.round((canvasData.adjustments?.saturation || 1.0) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.05"
                      value={canvasData.adjustments?.saturation || 1.0}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCanvasData((prev) => ({
                          ...prev,
                          adjustments: { ...prev.adjustments, saturation: val, brightness: prev.adjustments?.brightness || 1.0, contrast: prev.adjustments?.contrast || 1.0, blur: prev.adjustments?.blur || 0 }
                        }));
                      }}
                      className="w-full accent-emerald-400 h-1 bg-[#1A2032] rounded-lg"
                    />
                  </div>

                  {/* Vignette Toggle */}
                  <div className="p-3 bg-[#141824] border border-[#23293D] rounded-2xl flex items-center justify-between">
                    <div>
                      <h5 className="text-[11px] font-bold text-white">Edge Vignette Shadow</h5>
                      <p className="text-[9px] text-gray-400">Darkens outer boundaries to pull focus to center</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={canvasData.background?.vignette !== false}
                      onChange={(e) => {
                        setCanvasData((prev) => ({
                          ...prev,
                          background: { ...prev.background, vignette: e.target.checked }
                        }));
                      }}
                      className="accent-emerald-400 rounded"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleLiveRender}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    Apply Filter Adjustments
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* ----------------------------------------------------------------- */}
          {/* COLUMN 2: CENTER LIVE CANVAS & CONTEXT SIMULATION */}
          {/* ----------------------------------------------------------------- */}
          <main className="flex-1 flex flex-col bg-[#07090F] relative overflow-hidden">
            {/* Simulation Context Tabs Bar */}
            <div className="h-11 border-b border-[#1A2032] px-4 flex items-center justify-between bg-[#0A0D16]">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'canvas', label: 'Studio Canvas', icon: Maximize2 },
                  { id: 'shorts_feed', label: 'Shorts Feed Simulation', icon: Smartphone },
                  { id: 'channel_grid', label: 'Channel Grid Shelf', icon: Grid },
                  { id: 'search_feed', label: 'Search Results', icon: Monitor }
                ].map((ctx) => {
                  const Icon = ctx.icon;
                  const isSel = previewContext === ctx.id;
                  return (
                    <button
                      key={ctx.id}
                      type="button"
                      onClick={() => setPreviewContext(ctx.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        isSel
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{ctx.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] font-mono text-gray-500 font-semibold">
                {aspectRatio === '9:16' ? '1080 × 1920 (Shorts)' : '1280 × 720 (Landscape)'}
              </div>
            </div>

            {/* Central Canvas Viewport */}
            <div className="flex-1 flex items-center justify-center p-6 relative overflow-hidden">
              {/* Context 1: Raw Studio Canvas */}
              {previewContext === 'canvas' && (
                <div
                  className={`relative rounded-3xl overflow-hidden shadow-2xl border border-[#23293D] flex items-center justify-center bg-black ${
                    aspectRatio === '9:16'
                      ? 'aspect-[9/16] max-h-[82vh]'
                      : 'aspect-[16/9] w-[75%] max-w-4xl'
                  }`}
                >
                  {renderedImageUrl ? (
                    <img
                      src={resolveMediaUrl(renderedImageUrl)}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover select-none"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                      <Sparkles className="w-8 h-8 opacity-40 animate-pulse text-purple-400" />
                      <span className="text-xs">Rendering thumbnail composite...</span>
                    </div>
                  )}
                </div>
              )}

              {/* Context 2: YouTube Shorts Mobile Mockup */}
              {previewContext === 'shorts_feed' && (
                <div className="relative rounded-[40px] p-3 border-4 border-gray-700 bg-gray-900 shadow-2xl aspect-[9/18] max-h-[84vh] flex items-center justify-center">
                  <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-black flex items-center justify-center">
                    {renderedImageUrl && (
                      <img
                        src={resolveMediaUrl(renderedImageUrl)}
                        alt="Shorts Preview"
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* YouTube Shorts UI Overlay Simulation */}
                    <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between text-white/80 pt-2">
                        <span className="text-xs font-bold">Shorts</span>
                        <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center">
                          <Eye className="w-3.5 h-3.5" />
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-4 text-white">
                        <div className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                            👍
                          </div>
                          <span className="text-[9px] font-bold">14.2K</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                            💬
                          </div>
                          <span className="text-[9px] font-bold">382</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                            ↪️
                          </div>
                          <span className="text-[9px] font-bold">Share</span>
                        </div>
                      </div>

                      {/* Bottom Channel Info */}
                      <div className="w-[75%] space-y-1.5 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-500" />
                          <span className="text-xs font-bold text-white">@YourChannel</span>
                          <span className="px-2 py-0.5 rounded-full bg-red-600 text-[9px] font-bold text-white">Subscribe</span>
                        </div>
                        <p className="text-[11px] text-white font-medium line-clamp-2">
                          {clip?.title || "How to scale with autonomous agents"} #shorts #ai
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Context 3: Channel Grid Shelf */}
              {previewContext === 'channel_grid' && (
                <div className="w-[85%] max-w-3xl space-y-3 p-4 bg-[#0A0D16] border border-[#1A2032] rounded-2xl">
                  <span className="text-xs font-bold text-gray-300 block">Shorts Shelf on Channel Page</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="aspect-[9/16] rounded-xl overflow-hidden border-2 border-purple-500 shadow-lg relative bg-black">
                      {renderedImageUrl && <img src={resolveMediaUrl(renderedImageUrl)} alt="Card 1" className="w-full h-full object-cover" />}
                      <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white drop-shadow">Active Short</span>
                    </div>
                    <div className="aspect-[9/16] rounded-xl overflow-hidden border border-[#23293D] opacity-60 bg-gradient-to-br from-gray-800 to-black p-2 flex items-end">
                      <span className="text-[10px] text-gray-400">Previous Short • 42K views</span>
                    </div>
                    <div className="aspect-[9/16] rounded-xl overflow-hidden border border-[#23293D] opacity-40 bg-gradient-to-br from-gray-800 to-black p-2 flex items-end">
                      <span className="text-[10px] text-gray-500">Short #3 • 18K views</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Context 4: Standard Search Feed */}
              {previewContext === 'search_feed' && (
                <div className="w-[80%] max-w-2xl p-4 bg-[#0A0D16] border border-[#1A2032] rounded-2xl flex gap-4">
                  <div className="w-56 aspect-video rounded-xl overflow-hidden border border-purple-500/50 bg-black flex-shrink-0 relative">
                    {renderedImageUrl && <img src={resolveMediaUrl(renderedImageUrl)} alt="Search Card" className="w-full h-full object-cover" />}
                    <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-white">0:45</span>
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-sm text-white line-clamp-2">
                      {clip?.title || "Why Traditional Coding Is Changing Forever"}
                    </h4>
                    <p className="text-[10px] text-gray-400">AI Shorts Factory • 85K views • 2 days ago</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2">
                      Full breakdown of the high-velocity creator workflow powering viral vertical videos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* ----------------------------------------------------------------- */}
          {/* COLUMN 3: RIGHT AI QUALITY ANALYZER & PUBLISHING CONTEXT */}
          {/* ----------------------------------------------------------------- */}
          <aside className="w-84 border-l border-[#1A2032] bg-[#0E121E] flex flex-col flex-shrink-0 p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                <span>AI Quality Checker</span>
              </h4>
              <button
                type="button"
                onClick={() => renderedImageUrl && runQualityCheck(renderedImageUrl)}
                disabled={isAnalyzingQuality || !renderedImageUrl}
                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzingQuality ? 'animate-spin' : ''}`} />
                <span>Re-score</span>
              </button>
            </div>

            {/* Quality Score Big Card */}
            {qualityReport && (
              <div className="p-4 rounded-2xl bg-[#141824] border border-[#23293D] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Overall CTR Score
                    </span>
                    <span className="text-2xl font-black font-mono text-white">
                      {qualityReport.overall_score}
                      <span className="text-xs font-normal text-gray-400">/100</span>
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      qualityReport.overall_score >= 88
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : qualityReport.overall_score >= 75
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-red-500/15 border-red-500/30 text-red-300'
                    }`}
                  >
                    {qualityReport.rating_tier}
                  </span>
                </div>

                <p className="text-[11px] text-gray-300 leading-snug">
                  {qualityReport.summary}
                </p>

                {/* Metrics Breakdown Bars */}
                <div className="space-y-2 pt-2 border-t border-[#1C2030]">
                  {[
                    { label: 'Readability', val: qualityReport.metrics?.readability || 85 },
                    { label: 'Contrast', val: qualityReport.metrics?.contrast || 80 },
                    { label: 'Clarity / Sharpness', val: qualityReport.metrics?.clarity || 88 },
                    { label: 'Focal Subject', val: qualityReport.metrics?.subject_visibility || 75 },
                    { label: 'Clutter Control', val: qualityReport.metrics?.clutter_management || 90 }
                  ].map((m) => (
                    <div key={m.label} className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-gray-400">{m.label}</span>
                        <span className="font-mono text-white font-bold">{Math.round(m.val)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#0A0D16] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, m.val))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Improvement Tips */}
            {qualityReport?.suggestions && qualityReport.suggestions.length > 0 && (
              <div className="p-3 bg-[#141824] border border-[#23293D] rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Actionable CTR Tips
                </span>
                <ul className="space-y-1.5 text-[11px] text-gray-300">
                  {qualityReport.suggestions.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 leading-snug">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* YouTube Shorts Packaging Capabilities Note */}
            <div className="p-3 bg-[#0A0D16] border border-[#1E2436] rounded-2xl space-y-1.5 text-[10px] text-gray-400">
              <span className="font-bold text-gray-300 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-blue-400" />
                Shorts Cover vs Custom Thumbnails
              </span>
              <p className="leading-snug">
                • Standard videos & YouTube Data API uploads support setting custom thumbnails directly via <span className="text-white font-mono">thumbnails.set</span>.
              </p>
              <p className="leading-snug">
                • On mobile YouTube Shorts, creators choose the display cover from any frame during upload.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};


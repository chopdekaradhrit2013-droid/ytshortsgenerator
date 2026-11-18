"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  Film,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Play,
  FileVideo,
  Clock,
  Layers,
  ArrowRight,
  X,
  Info,
  Loader2
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { VideoCategory } from '@/types';
import { uploadProjectVideo, startAnalysis } from '@/lib/api';

export default function CreateProjectPage() {
  const router = useRouter();
  const { addProject, addNotification } = useApp();

  // Form states
  const [projectName, setProjectName] = useState("");
  const [category, setCategory] = useState<VideoCategory>("automatic");
  const [clipCountOption, setClipCountOption] = useState<string>("10");
  const [customClipCount, setCustomClipCount] = useState<number>(12);
  const [preferredDuration, setPreferredDuration] = useState<number>(45);
  
  // File upload states
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: { label: string; value: VideoCategory; desc: string }[] = [
    { label: "Automatic", value: "automatic", desc: "AI auto-detects genre, hooks & pacing" },
    { label: "Podcast", value: "podcast", desc: "Optimized for speech, conversation & debates" },
    { label: "Gaming", value: "gaming", desc: "Prioritizes hype moments, scream peaks & clutches" },
    { label: "Interview", value: "interview", desc: "Key quotes, questions & profound answers" },
    { label: "Entertainment", value: "entertainment", desc: "Humor, storytelling & emotional reactions" },
    { label: "Other", value: "other", desc: "Custom educational or vlog content" },
  ];

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (selectedFile: File) => {
    setValidationError(null);
    const validExtensions = ['video/mp4', 'video/quicktime', 'video/webm'];
    const isExtensionValid = validExtensions.includes(selectedFile.type) || 
      selectedFile.name.endsWith('.mp4') || 
      selectedFile.name.endsWith('.mov') || 
      selectedFile.name.endsWith('.webm');

    if (!isExtensionValid) {
      setValidationError("Unsupported format. Please upload MP4, MOV, or WebM video.");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024 * 1024) { // 2 GB limit
      setValidationError("File exceeds maximum upload size (2 GB).");
      return;
    }

    setFile(selectedFile);
    // Create preview blob URL
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    // Auto-populate project name if empty
    if (!projectName) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setProjectName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleCreateProject = async () => {
    if (!file && !previewUrl) {
      setValidationError("Please select or drop a source video to continue.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);
    const targetCount = clipCountOption === "custom" ? customClipCount : parseInt(clipCountOption);

    try {
      if (file instanceof File) {
        setUploadProgress(30);
        addNotification(
          "Ingesting Video",
          "Uploading file to AI Shorts Factory media pipeline and inspecting codecs with FFprobe...",
          "info"
        );

        const uploadRes = await uploadProjectVideo(file, {
          name: projectName || file.name.replace(/\.[^/.]+$/, ""),
          category,
          target_clip_count: targetCount,
          preferred_duration_seconds: preferredDuration,
        });

        setUploadProgress(70);
        addNotification(
          "Video Ingested",
          `Detected ${uploadRes.metadata.width}x${uploadRes.metadata.height} (${round(uploadRes.metadata.fps || 30)}fps, ${round(uploadRes.metadata.duration || 0)}s). Starting AI Clip Hunter...`,
          "success"
        );

        // Auto-start AI analysis pipeline
        const analysisRes = await startAnalysis({
          project_id: uploadRes.project_id,
          video_path: uploadRes.storage_path,
          target_clip_count: targetCount,
          preferred_duration_seconds: preferredDuration,
          category,
        });

        // Add to AppContext so local views have the project
        const newProj = addProject({
          id: uploadRes.project_id,
          name: projectName || file.name.replace(/\.[^/.]+$/, ""),
          category,
          status: "analysing",
          target_clip_count: targetCount,
          preferred_duration_seconds: preferredDuration,
          source_filename: file.name,
          source_file_size_mb: Math.round(file.size / (1024 * 1024)),
          source_duration_seconds: uploadRes.metadata.duration,
          thumbnail_url: uploadRes.thumbnail_url,
          tags: [category, "Shorts"],
        });

        setUploadProgress(100);
        setIsUploading(false);
        router.push(`/generator?project=${uploadRes.project_id}&job_id=${analysisRes.job_id}`);
      } else {
        // Fallback / Demo video mode
        setUploadProgress(50);
        const newProj = addProject({
          name: projectName || "Autonomous AI Revolution & Dev Future",
          category,
          status: "analysing",
          target_clip_count: targetCount,
          preferred_duration_seconds: preferredDuration,
          source_filename: "autonomous_ai_revolution_master.mp4",
          source_file_size_mb: 485,
          source_duration_seconds: 1200,
          video_url: previewUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80",
          tags: [category, "Shorts"],
        });

        try {
          const analysisRes = await startAnalysis({
            project_id: newProj.id,
            target_clip_count: targetCount,
            preferred_duration_seconds: preferredDuration,
            category,
          });
          setUploadProgress(100);
          setIsUploading(false);
          router.push(`/generator?project=${newProj.id}&job_id=${analysisRes.job_id}`);
        } catch {
          setUploadProgress(100);
          setIsUploading(false);
          router.push(`/generator?project=${newProj.id}`);
        }
      }
    } catch (err: any) {
      setIsUploading(false);
      setValidationError(`Upload error: ${err.message || "Failed to process video"}`);
      addNotification("Upload Failed", err.message || "Error communicating with backend", "warning");
    }
  };

  const round = (val: number) => Math.round(val);

  // Preset demo video option for quick evaluation without local media file
  const loadDemoVideo = () => {
    setProjectName("Autonomous AI Revolution & Dev Future");
    setCategory("podcast");
    setPreviewUrl("https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4");
    setFile({
      name: "autonomous_ai_revolution_master.mp4",
      size: 485 * 1024 * 1024,
      type: "video/mp4"
    } as any);
    setValidationError(null);
    addNotification("Demo Video Loaded", "Loaded 4K video source for instant workflow testing.", "info");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1E2333]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span>Create New Shorts Project</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Upload your long video to isolate viral moments, auto-generate captions, and edit in Studio.
          </p>
        </div>

        <button
          onClick={loadDemoVideo}
          className="self-start md:self-auto px-3.5 py-1.5 rounded-xl bg-[#181C28] hover:bg-[#202636] border border-[#2A3144] text-xs font-semibold text-purple-300 flex items-center gap-2 transition-colors"
        >
          <Film className="w-3.5 h-3.5 text-purple-400" />
          <span>Load Demo 4K Video</span>
        </button>
      </div>

      {/* FORM BODY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT 2 COLS: UPLOAD & CONFIG */}
        <div className="md:col-span-2 space-y-6">
          {/* 1. PROJECT NAME */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
              <span>Project Name (Optional)</span>
              <span className="text-[11px] text-gray-500 lowercase">e.g. Episode 42</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Future of Tech Masterclass & Q&A"
              className="w-full px-4 py-3 rounded-xl bg-[#12151E] border border-[#23293A] text-white text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all placeholder:text-gray-600"
            />
          </div>

          {/* 2. DRAG AND DROP SOURCE UPLOAD */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Source Video Upload
            </label>

            {!file && !previewUrl ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-[#262C3E] bg-[#12151E] hover:border-[#38425C] hover:bg-[#151926]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <h3 className="text-sm font-bold text-white mb-1">
                  Drag and drop your video file here
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  Supports <strong className="text-gray-300">MP4, MOV, WebM</strong> up to 2 GB
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1C2130] text-purple-300 text-xs font-semibold border border-[#2A3144] hover:bg-[#252C40] transition-colors">
                  <FileVideo className="w-4 h-4 text-purple-400" />
                  <span>Browse Local File</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#12151E] border border-[#23293A] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                      <Film className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{file?.name || "Video Source"}</p>
                      <p className="text-[11px] text-gray-400">
                        {file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "485 MB"} • Ready for AI Analysis
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setFile(null);
                      setPreviewUrl(null);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E2333] transition-colors"
                    title="Remove Video"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* VIDEO PREVIEW */}
                {previewUrl && (
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-black border border-white/10">
                    <video
                      src={previewUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {validationError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}
          </div>

          {/* 3. CATEGORY SELECTOR */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Video Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`p-3 rounded-xl text-left border transition-all ${
                    category === cat.value
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-sm'
                      : 'bg-[#12151E] border-[#23293A] text-gray-400 hover:border-[#2F374D] hover:text-gray-200'
                  }`}
                >
                  <p className="text-xs font-bold capitalize">{cat.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: PARAMETERS & ACTION */}
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-[#12151E] border border-[#23293A] space-y-6">
            <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Shorts Output Settings
            </h3>

            {/* DESIRED CLIP COUNT */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400">
                Desired Clip Count
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {['5', '10', '15', '20', 'custom'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setClipCountOption(val)}
                    className={`py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                      clipCountOption === val
                        ? 'bg-purple-600 text-white shadow-glow-purple'
                        : 'bg-[#1A1F2D] text-gray-400 hover:text-white border border-[#23293A]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              {clipCountOption === 'custom' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Custom Target:</span>
                    <span className="font-bold text-white">{customClipCount} clips</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={customClipCount}
                    onChange={(e) => setCustomClipCount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#23293A] rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* PREFERRED DURATION */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-gray-400">Target Duration</span>
                <span className="font-bold text-purple-400">{preferredDuration} seconds</span>
              </div>
              <input
                type="range"
                min="15"
                max="60"
                step="5"
                value={preferredDuration}
                onChange={(e) => setPreferredDuration(parseInt(e.target.value))}
                className="w-full h-1.5 bg-[#23293A] rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>15s (Snappy)</span>
                <span>45s (Optimal)</span>
                <span>60s (Max)</span>
              </div>
            </div>

            {/* SUMMARY SPECS */}
            <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2 text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Aspect Ratio</span>
                <span className="font-semibold text-white">9:16 Vertical</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Resolution</span>
                <span className="font-semibold text-white">1080 x 1920</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>AI Captions</span>
                <span className="font-semibold text-yellow-400">Hormozi Kinetic</span>
              </div>
            </div>

            {/* UPLOAD PROGRESS BAR */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-gray-400">Ingesting source video...</span>
                  <span className="text-purple-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1C2130] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="button"
              disabled={isUploading}
              onClick={handleCreateProject}
              className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-glow-purple ${
                isUploading
                  ? 'bg-purple-900/50 text-purple-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white active:scale-98'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isUploading ? "Uploading & Initializing..." : "Create Project & Generate"}</span>
            </button>
          </div>

          {/* POLICY NOTE */}
          <div className="p-4 rounded-xl bg-[#12151E]/60 border border-[#1E2333] flex items-start gap-2.5 text-xs text-gray-400">
            <Info className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
            <p>
              AI Shorts Factory processes direct file uploads and authorized videos you own. Unauthorized third-party YouTube scraping is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


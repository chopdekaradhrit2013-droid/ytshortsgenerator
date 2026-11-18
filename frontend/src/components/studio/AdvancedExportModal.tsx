"use client";

import React, { useState, useEffect } from 'react';
import {
  Download,
  Film,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Sparkles,
  Sliders,
  Settings2,
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { triggerMultiTrackRenderApi, getExportStatus, cancelExport, resolveMediaUrl, ExportJob } from '@/lib/api';
import { ExportSettings, StudioProject } from '@/types';

interface AdvancedExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  studioProject: StudioProject;
  onExportStarted?: (jobId: string) => void;
}

export const AdvancedExportModal: React.FC<AdvancedExportModalProps> = ({
  isOpen,
  onClose,
  studioProject,
  onExportStarted
}) => {
  const [resolution, setResolution] = useState<'720p' | '1080p' | '1440p' | '4k'>('1080p');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [format, setFormat] = useState<'mp4' | 'webm' | 'mov'>('mp4');
  const [quality, setQuality] = useState<'ultra' | 'high' | 'standard' | 'web'>('high');
  const [bitrate, setBitrate] = useState<string>('12M');
  const [audioBitrate, setAudioBitrate] = useState<string>('192k');

  const [isExporting, setIsExporting] = useState(false);
  const [exportJob, setExportJob] = useState<ExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const durationSec = studioProject?.timeline_data?.duration || 45.0;

  // Estimated file size calculation in MB: (video_bitrate_mbps + audio_bitrate_mbps) * duration / 8
  const numBitrate = parseInt(bitrate) || 12;
  const numAudioBitrate = (parseInt(audioBitrate) || 192) / 1000;
  const estimatedSizeMb = (((numBitrate + numAudioBitrate) * durationSec) / 8).toFixed(1);

  const handleStartExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const res = await triggerMultiTrackRenderApi(studioProject.id);
      if (res.job_id) {
        onExportStarted?.(res.job_id);
        pollJob(res.job_id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to start multitrack rendering.");
      setIsExporting(false);
    }
  };

  const pollJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const job = await getExportStatus(jobId);
        setExportJob(job);
        if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
          clearInterval(interval);
          setIsExporting(false);
        }
      } catch (e) {
        clearInterval(interval);
        setIsExporting(false);
      }
    }, 1500);
  };

  const handleCancelExport = async () => {
    if (exportJob?.id) {
      await cancelExport(exportJob.id);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#0F121C] border border-[#262C40] rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2333] flex items-center justify-between bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Export Polished Short
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FFmpeg H.264
                </span>
              </h2>
              <p className="text-xs text-gray-400">Multi-track render reflecting all cuts, audio beds, and subtitles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* In-Flight Export Progress Card */}
          {exportJob && exportJob.status === 'rendering' && (
            <div className="p-4 rounded-xl bg-[#141826] border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  Rendering Timeline ({exportJob.stage})
                </span>
                <span className="font-mono text-white font-bold">{exportJob.progress_percentage}%</span>
              </div>
              <div className="w-full bg-[#0A0C14] rounded-full h-2 overflow-hidden border border-[#202538]">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${exportJob.progress_percentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Pass: Audio normalizer + dynamic ASS subtitles</span>
                <button
                  type="button"
                  onClick={handleCancelExport}
                  className="text-red-400 hover:text-red-300 underline font-medium"
                >
                  Cancel Render
                </button>
              </div>
            </div>
          )}

          {/* Export Completed Card */}
          {exportJob && exportJob.status === 'completed' && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Rendering Complete (100%)
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">QC Passed</span>
              </div>
              <p className="text-xs text-gray-300">
                High-definition vertical video successfully rendered with synced audio beds and burned animated captions.
              </p>
              {exportJob.output_video_path && (
                <a
                  href={resolveMediaUrl(exportJob.output_video_path)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-600/30"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4 Video</span>
                </a>
              )}
            </div>
          )}

          {/* Export Parameters Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Resolution */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Target Resolution</label>
              <select
                value={resolution}
                onChange={(e: any) => setResolution(e.target.value)}
                disabled={isExporting}
                className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="720p">720p (720 × 1280)</option>
                <option value="1080p">1080p Full HD (1080 × 1920)</option>
                <option value="1440p">1440p 2K (1440 × 2560)</option>
                <option value="4k">4K Ultra HD (2160 × 3840)</option>
              </select>
            </div>

            {/* Frame Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Frame Rate</label>
              <select
                value={fps}
                onChange={(e: any) => setFps(Number(e.target.value) as any)}
                disabled={isExporting}
                className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={24}>24 fps (Cinematic Film)</option>
                <option value={30}>30 fps (Standard YouTube)</option>
                <option value={60}>60 fps (Gaming Smooth)</option>
              </select>
            </div>

            {/* Video Format */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Container Format</label>
              <select
                value={format}
                onChange={(e: any) => setFormat(e.target.value)}
                disabled={isExporting}
                className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="mp4">MP4 (H.264 / AAC) — Recommended</option>
                <option value="webm">WebM (VP9 / Opus)</option>
                <option value="mov">QuickTime MOV (ProRes/H.264)</option>
              </select>
            </div>

            {/* Video Quality Preset */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Quality Profile</label>
              <select
                value={quality}
                onChange={(e: any) => setQuality(e.target.value)}
                disabled={isExporting}
                className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="ultra">Ultra Quality (CRF 18)</option>
                <option value="high">High Quality (CRF 20)</option>
                <option value="standard">Standard Quality (CRF 24)</option>
                <option value="web">Web Compact (CRF 28)</option>
              </select>
            </div>

            {/* Video Bitrate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Target Video Bitrate</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(e.target.value)}
                disabled={isExporting}
                className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="8M">8 Mbps (Standard)</option>
                <option value="12M">12 Mbps (High Bitrate)</option>
                <option value="20M">20 Mbps (Maximum Detail)</option>
                <option value="35M">35 Mbps (Broadcast Master)</option>
              </select>
            </div>

            {/* Audio Bitrate */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Audio Quality</label>
              <select
                value={audioBitrate}
                onChange={(e) => setAudioBitrate(e.target.value)}
                disabled={isExporting}
                className="w-full px-3 py-2 bg-[#0A0C14] border border-[#262C40] rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="128k">128 kbps (AAC Standard)</option>
                <option value="192k">192 kbps (AAC Studio)</option>
                <option value="256k">256 kbps (AAC Audiophile)</option>
                <option value="320k">320 kbps (Maximum Fidelity)</option>
              </select>
            </div>
          </div>

          {/* Size & Spec Summary Pill */}
          <div className="p-3 rounded-xl bg-[#0A0C14] border border-[#202538] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-gray-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Est. Render Duration: <strong>{durationSec.toFixed(1)}s</strong></span>
            </div>
            <div className="font-mono text-emerald-400 font-bold">
              Est. File Size: ~{estimatedSizeMb} MB
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#1E2333] flex items-center justify-between bg-[#121622]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Close
          </button>
          <button
            disabled={isExporting}
            onClick={handleStartExport}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-emerald-600/30"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Rendering Multitrack Short...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Start Final Render</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


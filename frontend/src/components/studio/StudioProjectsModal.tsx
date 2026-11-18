"use client";

import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Copy,
  Edit2,
  Trash2,
  X,
  Clock,
  Sparkles,
  Check,
  Loader2,
  Film
} from 'lucide-react';
import { fetchStudioProjectsListApi, duplicateStudioProjectApi, renameStudioProjectApi } from '@/lib/api';
import { StudioProject } from '@/types';

interface StudioProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string;
  onSelectProject: (studioProject: StudioProject) => void;
}

export const StudioProjectsModal: React.FC<StudioProjectsModalProps> = ({
  isOpen,
  onClose,
  activeProjectId,
  onSelectProject
}) => {
  const [projects, setProjects] = useState<StudioProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetchStudioProjectsListApi();
      setProjects(res.projects || []);
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleDuplicate = async (pId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await duplicateStudioProjectApi(pId);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRename = async (pId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingName.trim()) return;
    try {
      await renameStudioProjectApi(pId, editingName.trim());
      setEditingId(null);
      loadProjects();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-[#0F121C] border border-[#262C40] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E2333] flex items-center justify-between bg-[#141824]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Studio Editing Projects</h2>
              <p className="text-xs text-gray-400">Reopen, duplicate or rename existing editing revisions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Project List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-xs">
              No existing studio projects found. Edits will save automatically to your current project.
            </div>
          ) : (
            projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isEditing = editingId === proj.id;

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    onSelectProject(proj);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isActive
                      ? 'bg-purple-950/25 border-purple-500/50 shadow-glow-purple'
                      : 'bg-[#141824] border-[#222738] hover:border-[#353D58] hover:bg-[#181D2C]'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                    <div className="w-10 h-10 rounded-lg bg-[#0A0C14] border border-[#262C40] flex items-center justify-center text-gray-400 flex-shrink-0">
                      <Film className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="px-2 py-1 bg-[#0A0C14] border border-purple-500 rounded text-xs text-white"
                          />
                          <button
                            onClick={(e) => handleSaveRename(proj.id, e)}
                            className="p-1 text-emerald-400 hover:bg-white/10 rounded"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white truncate">{proj.name}</h4>
                          {isActive && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                              Active
                            </span>
                          )}
                          <span className="text-[10px] text-gray-500 font-mono">v{proj.version}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                        <span>Aspect: {proj.aspect_ratio || '9:16'}</span>
                        <span>•</span>
                        <span>Duration: {proj.timeline_data?.duration?.toFixed(1) || '45.0'}s</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {proj.updated_at ? new Date(proj.updated_at).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                    <button
                      title="Rename"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(proj.id);
                        setEditingName(proj.name);
                      }}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      title="Duplicate (Branch)"
                      onClick={(e) => handleDuplicate(proj.id, e)}
                      className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#1E2333] flex justify-end bg-[#121622]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


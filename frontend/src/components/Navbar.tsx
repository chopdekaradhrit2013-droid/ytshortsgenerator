"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  FolderOpen,
  Check,
  X,
  ExternalLink
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function Navbar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    projects,
    activeProject,
    setActiveProject,
    notifications,
    dismissNotification
  } = useApp();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);

  // Get current page title and breadcrumbs
  const getHeaderInfo = () => {
    if (pathname === '/') return { title: "Dashboard", category: "Overview" };
    if (pathname.startsWith('/projects/create')) return { title: "Create Project", category: "Workspace" };
    if (pathname.startsWith('/projects')) return { title: "My Projects", category: "Workspace" };
    if (pathname.startsWith('/generator')) return { title: "AI Clip Generator", category: "AI Studio" };
    if (pathname.startsWith('/studio')) return { title: "Editing Studio", category: "Timeline Editor" };
    if (pathname.startsWith('/publishing')) return { title: "Publishing Centre", category: "Distribution" };
    if (pathname.startsWith('/history')) return { title: "Upload History", category: "Distribution" };
    if (pathname.startsWith('/settings')) return { title: "Settings", category: "Preferences" };
    return { title: "AI Shorts Factory", category: "Studio" };
  };

  const headerInfo = getHeaderInfo();

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-16 bg-[#0E1118]/80 backdrop-blur-md border-b border-[#1E2333] transition-all duration-300 flex items-center justify-between px-6 ${
        sidebarCollapsed ? 'left-20' : 'left-64'
      }`}
    >
      {/* BREADCRUMB & TITLE */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
            <span>AI Shorts Factory</span>
            <span>/</span>
            <span className="text-purple-400">{headerInfo.category}</span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            {headerInfo.title}
          </h1>
        </div>

        {/* ACTIVE PROJECT SELECTOR PILL */}
        {activeProject && (
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowProjectSelector(!showProjectSelector)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161A26] border border-[#23293A] text-xs font-medium text-gray-200 hover:border-purple-500/50 hover:bg-[#1C2130] transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5 text-purple-400" />
              <span className="max-w-[160px] truncate">{activeProject.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {showProjectSelector && (
              <div className="absolute left-0 mt-2 w-72 rounded-xl bg-[#161A26] border border-[#262C3E] shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Switch Active Project
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1 mt-1">
                  {projects.map((proj) => (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setActiveProject(proj);
                        setShowProjectSelector(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        activeProject.id === proj.id
                          ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30'
                          : 'text-gray-300 hover:bg-[#1E2436]'
                      }`}
                    >
                      <div className="truncate mr-2">
                        <p className="font-medium truncate">{proj.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{proj.category} • {proj.clip_count} clips</p>
                      </div>
                      {activeProject.id === proj.id && (
                        <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[#262C3E] mt-2 pt-2">
                  <Link
                    href="/projects/create"
                    onClick={() => setShowProjectSelector(false)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Project</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-3">
        {/* FAST CREATE SHORT BUTTON */}
        <Link
          href="/projects/create"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-semibold hover:from-purple-500 hover:to-blue-500 shadow-glow-purple transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New Project</span>
        </Link>

        {/* NOTIFICATIONS DROPDOWN */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#161A26] border border-transparent hover:border-[#23293A] transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#161A26] border border-[#262C3E] shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-[#262C3E]">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Activity Center</span>
                <span className="text-[10px] text-gray-400">{notifications.length} recent</span>
              </div>
              
              <div className="max-h-72 overflow-y-auto space-y-2 mt-2">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">
                    No new notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className="p-2.5 rounded-lg bg-[#11141E] border border-[#23293A] text-xs flex items-start justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-white">{n.title}</p>
                        <p className="text-gray-400 text-[11px] mt-0.5">{n.message}</p>
                      </div>
                      <button
                        onClick={() => dismissNotification(n.id)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* SETTINGS QUICK LINK */}
        <Link
          href="/settings"
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#161A26] border border-transparent hover:border-[#23293A] transition-colors"
          title="Studio Settings"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}

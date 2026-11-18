"use client";

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  RotateCw,
  AlertCircle,
  Calendar,
  Users,
  X,
  Sparkles,
  ShieldAlert,
  Clock
} from 'lucide-react';
import {
  adminListAnnouncementsApi,
  adminCreateAnnouncementApi,
  adminDeleteAnnouncementApi
} from '@/lib/api';
import { PlatformAnnouncement } from '@/types';
import { useApp } from '@/context/AppContext';

export default function AdminAnnouncementsPage() {
  const { addNotification } = useApp();

  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formType, setFormType] = useState<'general' | 'maintenance' | 'release' | 'service_update'>('general');
  const [formPriority, setFormPriority] = useState<'low' | 'normal' | 'high' | 'critical'>('normal');
  const [formAudience, setFormAudience] = useState<'all' | 'free_only' | 'paid_only'>('all');

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await adminListAnnouncementsApi(true);
      setAnnouncements(res || []);
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load announcements.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formMessage.trim()) return;

    setSubmitting(true);
    try {
      await adminCreateAnnouncementApi({
        title: formTitle.trim(),
        message: formMessage.trim(),
        type: formType,
        priority: formPriority,
        target_audience: formAudience,
        is_active: true
      });
      addNotification("Announcement Dispatched", "Broadcasting to creator dashboards.", "success");
      setCreating(false);
      setFormTitle('');
      setFormMessage('');
      loadAnnouncements();
    } catch (err: any) {
      addNotification("Creation Failed", err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDeleteAnnouncementApi(id);
      addNotification("Announcement Deleted", "Removed from creator feed.", "success");
      loadAnnouncements();
    } catch (err: any) {
      addNotification("Delete Failed", err.message, "error");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Announcements</h1>
          <p className="text-xs text-gray-400 mt-1">
            Broadcast scheduled maintenance notices, product releases, and high-priority service updates to creators.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreating(true)}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {/* ANNOUNCEMENTS LIST */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-500">
          <RotateCw className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
          <span>Retrieving active broadcasts...</span>
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#0D111A] border border-[#192236] text-center space-y-2">
          <Megaphone className="w-8 h-8 text-gray-600 mx-auto" />
          <p className="text-sm font-semibold text-gray-300">No active announcements</p>
          <p className="text-xs text-gray-500">Create an announcement to broadcast alerts to user dashboards.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="p-5 rounded-2xl bg-[#0D111A] border border-[#192236] hover:border-purple-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    a.priority === 'critical' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                    a.priority === 'high' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}>
                    {a.priority} priority
                  </span>
                  <span className="text-[10px] font-mono uppercase text-gray-400 bg-gray-800/80 px-2 py-0.5 rounded">
                    {a.type.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-purple-400 font-semibold">
                    Audience: {a.target_audience}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{a.title}</h3>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{a.message}</p>

                <div className="flex items-center gap-3 text-[11px] text-gray-500 pt-1">
                  <span>Author: {a.author_name || 'System Admin'}</span>
                  <span>•</span>
                  <span>Created: {new Date(a.created_at).toLocaleDateString()}</span>
                  {a.expires_at && (
                    <>
                      <span>•</span>
                      <span>Expires: {new Date(a.expires_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {creating && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E121B] border border-[#202940] rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#1A2236] pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Megaphone className="w-5 h-5 text-purple-400" />
                <span>Create Platform Announcement</span>
              </div>
              <button type="button" onClick={() => setCreating(false)} className="text-gray-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Announcement Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. ⚡ Scheduled System Maintenance This Sunday"
                  required
                  className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-300">Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs capitalize focus:outline-none focus:border-purple-500"
                  >
                    <option value="general">General</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="release">Release</option>
                    <option value="service_update">Service Update</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-300">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs capitalize focus:outline-none focus:border-purple-500"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-300">Audience</label>
                  <select
                    value={formAudience}
                    onChange={(e) => setFormAudience(e.target.value as any)}
                    className="w-full px-2 py-1.5 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs capitalize focus:outline-none focus:border-purple-500"
                  >
                    <option value="all">All Creators</option>
                    <option value="free_only">Free Only</option>
                    <option value="paid_only">Paid Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Message Content</label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Details regarding upcoming downtime, feature changelog, or notice..."
                  required
                  rows={4}
                  className="w-full p-3 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Broadcast Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


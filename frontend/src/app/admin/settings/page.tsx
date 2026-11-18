"use client";

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Save,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Layers,
  Wrench,
  ToggleLeft,
  ToggleRight,
  Info
} from 'lucide-react';
import { adminGetSettingsApi, adminUpdateSettingsApi } from '@/lib/api';
import { PlatformSettings } from '@/types';
import { useApp } from '@/context/AppContext';

export default function AdminSettingsPage() {
  const { user, addNotification } = useApp();

  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [platformName, setPlatformName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [defaultCredits, setDefaultCredits] = useState(100);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await adminGetSettingsApi();
      setSettings(data);
      setPlatformName(data.platform_name || 'AI Shorts Factory');
      setLogoUrl(data.logo_url || '/logo.svg');
      setSupportEmail(data.support_email || 'support@shortsfactory.io');
      setMaintenanceMode(Boolean(data.maintenance_mode));
      setMaintenanceMsg(data.maintenance_message || '');
      setRegistrationEnabled(Boolean(data.registration_enabled));
      setDefaultCredits(data.default_free_credits ?? 100);
      setFeatureFlags(data.feature_flags || {});
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to load platform configuration.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleFlag = (key: string) => {
    setFeatureFlags({ ...featureFlags, [key]: !featureFlags[key] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== 'super_admin') {
      addNotification("Permission Denied", "Only Super Admins can alter global platform settings.", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await adminUpdateSettingsApi({
        platform_name: platformName,
        logo_url: logoUrl,
        support_email: supportEmail,
        maintenance_mode: maintenanceMode,
        maintenance_message: maintenanceMsg,
        registration_enabled: registrationEnabled,
        default_free_credits: defaultCredits,
        feature_flags: featureFlags
      });
      addNotification("Settings Saved", "Platform configuration updated safely.", "success");
      setSettings(res.settings);
    } catch (err: any) {
      addNotification("Save Failed", err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';

  if (loading) {
    return (
      <div className="py-20 text-center text-xs text-gray-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto text-purple-500 mb-2" />
        <span>Loading global platform configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Platform Configuration</h1>
          <p className="text-xs text-gray-400 mt-1">
            Global operational controls, maintenance switches, registration availability, and feature gates.
          </p>
        </div>

        {!isSuperAdmin && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Read-Only View (Super Admin Required to Edit)</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* PLATFORM IDENTITY CARD */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Platform Identity & Contact</h2>
              <p className="text-xs text-gray-400">Public application name, logos, and support routing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Platform Name</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                disabled={!isSuperAdmin}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs focus:outline-none focus:border-purple-500 disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Logo URL</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                disabled={!isSuperAdmin}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500 disabled:opacity-60"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">Support Inquiries Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                disabled={!isSuperAdmin}
                required
                className="w-full px-3 py-2 rounded-xl bg-[#141A28] border border-[#202940] text-white text-xs font-mono focus:outline-none focus:border-purple-500 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* OPERATIONAL SWITCHES */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Emergency & Operations Controls</h2>
              <p className="text-xs text-gray-400">Maintenance mode, signup gates, and initial credit grants.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* MAINTENANCE MODE TOGGLE */}
            <div className="p-4 rounded-xl bg-[#121622] border border-[#1E263D] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Maintenance Mode</h3>
                  <p className="text-[11px] text-gray-400">Halts public studio access with maintenance banner.</p>
                </div>
                <button
                  type="button"
                  disabled={!isSuperAdmin}
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                  className={`p-1 rounded-xl transition-colors ${
                    maintenanceMode ? 'text-amber-400' : 'text-gray-500'
                  }`}
                >
                  {maintenanceMode ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              {maintenanceMode && (
                <div className="space-y-1 pt-1 animate-in fade-in">
                  <label className="text-[10px] uppercase font-bold text-gray-400">Banner Notice Text</label>
                  <textarea
                    value={maintenanceMsg}
                    onChange={(e) => setMaintenanceMsg(e.target.value)}
                    disabled={!isSuperAdmin}
                    rows={2}
                    className="w-full p-2.5 rounded-xl bg-[#0B0E17] border border-[#1B2338] text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* REGISTRATION GATE */}
            <div className="p-4 rounded-xl bg-[#121622] border border-[#1E263D] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">New User Registration</h3>
                  <p className="text-[11px] text-gray-400">Toggle whether new creators can register accounts.</p>
                </div>
                <button
                  type="button"
                  disabled={!isSuperAdmin}
                  onClick={() => setRegistrationEnabled(!registrationEnabled)}
                  className={`p-1 rounded-xl transition-colors ${
                    registrationEnabled ? 'text-emerald-400' : 'text-gray-500'
                  }`}
                >
                  {registrationEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                </button>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-[10px] uppercase font-bold text-gray-400">Default Free Signup Credits</label>
                <input
                  type="number"
                  min="0"
                  value={defaultCredits}
                  onChange={(e) => setDefaultCredits(parseInt(e.target.value) || 0)}
                  disabled={!isSuperAdmin}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#0B0E17] border border-[#1B2338] text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE FLAGS */}
        <div className="p-6 rounded-2xl bg-[#0D111A] border border-[#192236] space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Global Feature Flags</h2>
              <p className="text-xs text-gray-400">Dynamically toggle platform-wide features without redeploying code.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {[
              { key: 'auto_reframing', label: '9:16 Smart Auto-Reframing', desc: 'Computer vision tracking & face centering' },
              { key: 'ai_thumbnails', label: 'AI Thumbnail Packaging', desc: 'Candidate frame selection & visual templates' },
              { key: 'competitor_analysis', label: 'Competitor Intelligence', desc: 'Content gap analytics & hook pattern scraping' },
              { key: 'bulk_publishing', label: 'Bulk YouTube Publishing', desc: 'Multi-short scheduled distribution queue' },
              { key: 'dynamic_subtitles', label: 'Smart Dynamic Captions', desc: 'Multi-lingual word-by-word karaoke animations' },
              { key: 'high_fps_exports', label: '4K Ultra HD & 60 FPS Export', desc: 'High-bitrate FFmpeg hardware encoding' }
            ].map((f) => {
              const active = featureFlags[f.key] ?? true;
              return (
                <div
                  key={f.key}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-colors ${
                    active ? 'bg-[#121724] border-purple-500/30' : 'bg-[#0E121B] border-[#1A2234] opacity-60'
                  }`}
                >
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{f.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{f.desc}</p>
                  </div>
                  <button
                    type="button"
                    disabled={!isSuperAdmin}
                    onClick={() => handleToggleFlag(f.key)}
                    className={active ? 'text-purple-400' : 'text-gray-600'}
                  >
                    {active ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        {isSuperAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Persist Platform Configuration</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}


"use client";

import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  User,
  Scissors,
  Type,
  Film,
  HardDrive,
  Sliders,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';

export default function SettingsPage() {
  const { settings, updateSettings, addNotification } = useApp();

  const [activeSection, setActiveSection] = useState<'profile' | 'youtube' | 'editing' | 'captions' | 'export' | 'storage' | 'app'>('profile');

  // Form states initialized from settings
  const [profileName, setProfileName] = useState(settings.profile.name);
  const [profileEmail, setProfileEmail] = useState(settings.profile.email);

  const [ytVisibility, setYtVisibility] = useState(settings.youtube_account.default_visibility);
  const [ytTags, setYtTags] = useState(settings.youtube_account.default_tags);

  const [defaultDuration, setDefaultDuration] = useState(settings.editing_preferences.default_clip_duration);
  const [autoSilence, setAutoSilence] = useState(settings.editing_preferences.auto_silence_removal);
  const [autoDucking, setAutoDucking] = useState(settings.editing_preferences.background_music_ducking);

  const [captionPreset, setCaptionPreset] = useState(settings.caption_style.preset);
  const [captionFont, setCaptionFont] = useState(settings.caption_style.font_family);
  const [captionColor, setCaptionColor] = useState(settings.caption_style.primary_color);
  const [captionHighlight, setCaptionHighlight] = useState(settings.caption_style.highlight_color);

  const [exportRes, setExportRes] = useState(settings.export_settings.resolution);
  const [exportFps, setExportFps] = useState(settings.export_settings.framerate);

  const handleSave = () => {
    updateSettings({
      profile: {
        ...settings.profile,
        name: profileName,
        email: profileEmail
      },
      youtube_account: {
        ...settings.youtube_account,
        default_visibility: ytVisibility,
        default_tags: ytTags
      },
      editing_preferences: {
        ...settings.editing_preferences,
        default_clip_duration: defaultDuration,
        auto_silence_removal: autoSilence,
        background_music_ducking: autoDucking
      },
      caption_style: {
        ...settings.caption_style,
        preset: captionPreset,
        font_family: captionFont,
        primary_color: captionColor,
        highlight_color: captionHighlight
      },
      export_settings: {
        ...settings.export_settings,
        resolution: exportRes,
        framerate: exportFps
      }
    });
  };

  const navSections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "youtube", label: "YouTube Account", icon: YoutubeIcon },
    { id: "editing", label: "Editing Preferences", icon: Scissors },
    { id: "captions", label: "Caption Style", icon: Type },
    { id: "export", label: "Video Export", icon: Film },
    { id: "storage", label: "Storage & Quota", icon: HardDrive },
    { id: "app", label: "App Preferences", icon: Sliders },
  ];

  const storagePercentage = Math.round((settings.storage.used_bytes / settings.storage.limit_bytes) * 100);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2333]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <SettingsIcon className="w-6 h-6 text-purple-400" />
            <span>Studio & Account Settings</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Configure your video generation presets, caption typography, export profiles and connected accounts.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-xs font-bold shadow-glow-purple hover:from-purple-500 hover:to-blue-500 transition-all self-start sm:self-auto active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* SETTINGS BODY */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* LEFT NAV TABS */}
        <div className="space-y-1">
          {navSections.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-purple-600/20 text-white border border-purple-500/40 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#12151E]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                <span>{sec.label}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTENT PANEL */}
        <div className="md:col-span-3 p-6 rounded-2xl bg-[#12151E] border border-[#23293A] space-y-6">
          {/* PROFILE SECTION */}
          {activeSection === 'profile' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">User Profile</h2>
              <div className="flex items-center gap-4 pb-4 border-b border-[#1E2333]">
                {settings.profile?.avatar && !settings.profile.avatar.includes('unsplash') ? (
                  <img
                    src={settings.profile.avatar}
                    alt={profileName}
                    className="w-16 h-16 rounded-2xl object-cover ring-2 ring-purple-500/40"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center text-xl font-black text-white ring-2 ring-purple-400/40 select-none shadow-md">
                    {profileName ? profileName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AC'}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-sm">{profileName}</h3>
                  <p className="text-xs text-purple-400">{settings.profile.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Full Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Email Address</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* YOUTUBE SECTION */}
          {activeSection === 'youtube' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">Connected YouTube Channel</h2>
              <div className="p-4 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
                    <YoutubeIcon className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">{settings.youtube_account.channel_name}</h3>
                    <p className="text-[11px] text-gray-400">
                      Channel ID: {settings.youtube_account.channel_id} • 148.5K subscribers
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Connected
                </span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Default Visibility</label>
                  <select
                    value={ytVisibility}
                    onChange={(e) => setYtVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  >
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Default Video Tags</label>
                  <input
                    type="text"
                    value={ytTags}
                    onChange={(e) => setYtTags(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  />
                  <p className="text-[10px] text-gray-500">Comma-separated tags added to every uploaded Short.</p>
                </div>
              </div>
            </div>
          )}

          {/* EDITING PREFERENCES */}
          {activeSection === 'editing' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">Default Editing Preferences</h2>
              
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Default Clip Duration</span>
                  <span className="font-bold text-white">{defaultDuration} seconds</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={defaultDuration}
                  onChange={(e) => setDefaultDuration(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#23293A] rounded cursor-pointer"
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Auto Silence & Breath Removal</p>
                    <p className="text-[11px] text-gray-400">Automatically trims pauses longer than 0.6 seconds</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoSilence}
                    onChange={() => setAutoSilence(!autoSilence)}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Background Music Auto-Ducking</p>
                    <p className="text-[11px] text-gray-400">Lowers BGM audio track when active speech is detected</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoDucking}
                    onChange={() => setAutoDucking(!autoDucking)}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CAPTION STYLE */}
          {activeSection === 'captions' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">Default Caption Typography & Animation</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Preset Style</label>
                  <select
                    value={captionPreset}
                    onChange={(e) => setCaptionPreset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  >
                    <option value="hormozi">Alex Hormozi (Kinetic Pop)</option>
                    <option value="beast">MrBeast (Heavy Outline)</option>
                    <option value="minimal">Minimal Modern (Inter)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Font Family</label>
                  <select
                    value={captionFont}
                    onChange={(e) => setCaptionFont(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Impact">Impact</option>
                    <option value="Anton">Anton</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400">Highlight Color</label>
                <div className="flex items-center gap-2">
                  {['#FACC15', '#38BDF8', '#10B981', '#EC4899', '#A855F7', '#EF4444'].map((col) => (
                    <button
                      key={col}
                      onClick={() => setCaptionHighlight(col)}
                      className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                        captionHighlight === col ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* EXPORT SETTINGS */}
          {activeSection === 'export' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">Video Export Settings (FFmpeg)</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Resolution</label>
                  <select
                    value={exportRes}
                    onChange={(e) => setExportRes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  >
                    <option value="1080x1920 (Full HD)">1080x1920 (Full HD Vertical)</option>
                    <option value="720x1280 (HD)">720x1280 (HD Vertical)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400">Framerate</label>
                  <select
                    value={exportFps}
                    onChange={(e) => setExportFps(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  >
                    <option value={60}>60 FPS (Ultra Smooth)</option>
                    <option value={30}>30 FPS (Standard)</option>
                  </select>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] space-y-2 text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Video Codec</span>
                  <span className="font-semibold text-white">libx264 (H.264 High Profile)</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Audio Codec</span>
                  <span className="font-semibold text-white">AAC-LC 192 kbps</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Encoding Preset</span>
                  <span className="font-semibold text-purple-400">Fast (CRF 22)</span>
                </div>
              </div>
            </div>
          )}

          {/* STORAGE SECTION */}
          {activeSection === 'storage' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">Cloud Media Storage</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Used Space</span>
                  <span className="font-bold text-white">
                    {(settings.storage.used_bytes / (1024 ** 3)).toFixed(2)} GB of {(settings.storage.limit_bytes / (1024 ** 3)).toFixed(0)} GB ({storagePercentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#1C2130] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-blue-500"
                    style={{ width: `${storagePercentage}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] text-xs text-gray-400 space-y-1">
                <p className="font-bold text-white">Auto-Cleanup Policy</p>
                <p>Intermediate raw cache files older than 30 days are automatically recycled.</p>
              </div>
            </div>
          )}

          {/* APPLICATION PREFERENCES */}
          {activeSection === 'app' && (
            <div className="space-y-5">
              <h2 className="text-base font-bold text-white">Application Preferences</h2>
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Sound Effects</p>
                    <p className="text-[11px] text-gray-400">Play auditory feedback for cuts, splits & successful uploads</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={settings.app_preferences.sound_effects}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white text-xs">Studio Auto-Save</p>
                    <p className="text-[11px] text-gray-400">Persist timeline tracks every 10 seconds</p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="w-4 h-4 rounded text-purple-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

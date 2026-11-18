"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BrainCircuit,
  Sparkles,
  TrendingUp,
  Target,
  Users,
  Lightbulb,
  Calendar,
  Layers,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Search,
  Filter,
  SlidersHorizontal,
  Send,
  RotateCw,
  X,
  Check,
  Zap,
  Award,
  Video,
  FileVideo,
  Eye,
  BarChart3,
  Radio,
  Compass
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';
import {
  fetchNicheProfileApi,
  updateNicheProfileApi,
  discoverTrendsApi,
  fetchCompetitorsApi,
  addCompetitorApi,
  removeCompetitorApi,
  fetchContentGapsApi,
  evaluateSourceVideoApi,
  fetchShortsIdeasApi,
  generateShortsIdeasApi,
  evaluateViralPotentialApi,
  convertIdeaToProjectApi,
  fetchStrategyPlanApi,
  generateStrategyPlanApi,
  queryStrategyAssistantApi
} from '@/lib/api';
import {
  ChannelNicheProfile,
  TrendingTopic,
  CompetitorChannel,
  ContentGapRecord,
  AIShortsIdea,
  ViralPotentialEvaluation,
  ContentStrategyPlan
} from '@/types';

type IntelligenceTab =
  | 'overview'
  | 'trends'
  | 'competitors'
  | 'ideas'
  | 'evaluator'
  | 'gaps'
  | 'strategy'
  | 'assistant';

export default function ContentIntelligencePage() {
  const router = useRouter();
  const { addNotification } = useApp();

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<IntelligenceTab>('overview');
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Niche Profile State
  const [nicheProfile, setNicheProfile] = useState<ChannelNicheProfile | null>(null);
  const [nicheModalOpen, setNicheModalOpen] = useState<boolean>(false);
  const [editNicheName, setEditNicheName] = useState<string>('');
  const [editCoreTopics, setEditCoreTopics] = useState<string>('');
  const [editAudience, setEditAudience] = useState<string>('');
  const [editBrandVoice, setEditBrandVoice] = useState<string>('');
  const [editDuration, setEditDuration] = useState<number>(42);
  const [savingNiche, setSavingNiche] = useState<boolean>(false);

  // 2. Discover Trends State
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [sourceVideoTitle, setSourceVideoTitle] = useState<string>('');
  const [sourceVideoDesc, setSourceVideoDesc] = useState<string>('');
  const [sourceVideoDurationMins, setSourceVideoDurationMins] = useState<number>(30);
  const [evaluatingSource, setEvaluatingSource] = useState<boolean>(false);
  const [sourceEvaluationResult, setSourceEvaluationResult] = useState<any>(null);

  // 3. Competitor Intelligence State
  const [competitors, setCompetitors] = useState<CompetitorChannel[]>([]);
  const [addCompetitorModalOpen, setAddCompetitorModalOpen] = useState<boolean>(false);
  const [newCompName, setNewCompName] = useState<string>('');
  const [newCompSubs, setNewCompSubs] = useState<number>(500000);
  const [newCompFrequency, setNewCompFrequency] = useState<number>(4.0);
  const [newCompTopics, setNewCompTopics] = useState<string>('AI Tech, Software Engineering');
  const [addingComp, setAddingComp] = useState<boolean>(false);

  // 4. Content Gap Analysis State
  const [contentGaps, setContentGaps] = useState<ContentGapRecord[]>([]);

  // 5. Idea Generator State
  const [ideas, setIdeas] = useState<AIShortsIdea[]>([]);
  const [ideaSourceFilter, setIdeaSourceFilter] = useState<string>('all');
  const [generatingIdeas, setGeneratingIdeas] = useState<boolean>(false);
  const [convertingIdeaId, setConvertingIdeaId] = useState<string | null>(null);

  // 6. Viral Potential Evaluator State
  const [evalIdeaTitle, setEvalIdeaTitle] = useState<string>(
    'Stop Paying $20/mo For ChatGPT Plus: Use This Local Hack #Shorts'
  );
  const [evalIdeaHook, setEvalIdeaHook] = useState<string>(
    'You are literally burning $240 a year for something your laptop can run offline for free.'
  );
  const [evalIdeaConcept, setEvalIdeaConcept] = useState<string>(
    'Step-by-step benchmark demonstrating quantized local models running on unified memory with zero subscription fees.'
  );
  const [evalIdeaDuration, setEvalIdeaDuration] = useState<number>(42);
  const [evaluatingIdea, setEvaluatingIdea] = useState<boolean>(false);
  const [ideaEvaluation, setIdeaEvaluation] = useState<ViralPotentialEvaluation | null>(null);

  // 7. Content Strategy Calendar State
  const [strategyPlan, setStrategyPlan] = useState<ContentStrategyPlan | null>(null);
  const [strategyTimeframe, setStrategyTimeframe] = useState<number>(14);
  const [generatingStrategy, setGeneratingStrategy] = useState<boolean>(false);

  // 8. AI Strategy Assistant State
  const [assistantMessages, setAssistantMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>>([
    {
      role: 'assistant',
      content:
        "Welcome to the AI Content Intelligence Center! I continuously analyze your niche, track your competitors (Fireship, Two Minute Papers, Matthew Berman), and evaluate your historical retention to identify winning Shorts formulas.\n\nAsk me about content gaps, competitor counter-moves, or opening hook optimization!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);

  // Initial Data Load
  useEffect(() => {
    loadAllIntelligenceData();
  }, [strategyTimeframe]);

  async function loadAllIntelligenceData() {
    setLoading(true);
    try {
      const [
        profileRes,
        trendsRes,
        compRes,
        gapsRes,
        ideasRes,
        strategyRes
      ] = await Promise.allSettled([
        fetchNicheProfileApi(),
        discoverTrendsApi(),
        fetchCompetitorsApi(),
        fetchContentGapsApi(),
        fetchShortsIdeasApi(10),
        fetchStrategyPlanApi(strategyTimeframe)
      ]);

      if (profileRes.status === 'fulfilled') {
        setNicheProfile(profileRes.value);
        setEditNicheName(profileRes.value.niche_name);
        setEditCoreTopics(profileRes.value.core_topics.join(', '));
        setEditAudience(profileRes.value.target_audience);
        setEditBrandVoice(profileRes.value.brand_voice);
        setEditDuration(profileRes.value.preferred_duration_seconds);
      }
      if (trendsRes.status === 'fulfilled') setTrends(trendsRes.value.trends || []);
      if (compRes.status === 'fulfilled') setCompetitors(compRes.value.competitors || []);
      if (gapsRes.status === 'fulfilled') setContentGaps(gapsRes.value.content_gaps || []);
      if (ideasRes.status === 'fulfilled') setIdeas(ideasRes.value.ideas || []);
      if (strategyRes.status === 'fulfilled') setStrategyPlan(strategyRes.value);
    } catch (err) {
      console.error("Error loading intelligence data:", err);
      addNotification("Intelligence Center", "Failed to load intelligence data.", "warning");
    } finally {
      setLoading(false);
    }
  }

  // Handle Save Niche Profile
  async function handleSaveNicheProfile() {
    setSavingNiche(true);
    try {
      const topicsList = editCoreTopics.split(',').map(t => t.trim()).filter(Boolean);
      const updated = await updateNicheProfileApi({
        niche_name: editNicheName,
        core_topics: topicsList,
        target_audience: editAudience,
        brand_voice: editBrandVoice,
        preferred_duration_seconds: editDuration,
        top_performing_hook_styles: nicheProfile?.top_performing_hook_styles || ["Contrarian Statement"],
        manual_overrides: { primary_focus: topicsList[0] || "AI Tech" }
      });
      setNicheProfile(updated);
      setNicheModalOpen(false);
      addNotification("Niche Profile Updated", "AI content recommendation engine recalibrated.", "success");
    } catch (err) {
      addNotification("Update Failed", "Could not save niche profile.", "warning");
    } finally {
      setSavingNiche(false);
    }
  }

  // Handle Evaluate Candidate Long-Form Video
  async function handleEvaluateSourceVideo() {
    if (!sourceVideoTitle.trim()) return;
    setEvaluatingSource(true);
    try {
      const res = await evaluateSourceVideoApi({
        title: sourceVideoTitle,
        description: sourceVideoDesc,
        duration_seconds: sourceVideoDurationMins * 60,
        category: nicheProfile?.niche_name || "AI Tech"
      });
      setSourceEvaluationResult(res);
      addNotification("Evaluation Complete", `Opportunity score: ${res.opportunity_score}/100.`, "info");
    } catch (err) {
      addNotification("Evaluation Error", "Could not score source video.", "warning");
    } finally {
      setEvaluatingSource(false);
    }
  }

  // Handle Add Competitor
  async function handleAddCompetitor() {
    if (!newCompName.trim()) return;
    setAddingComp(true);
    try {
      await addCompetitorApi({
        channel_name: newCompName,
        subscribers: newCompSubs,
        upload_frequency_per_week: newCompFrequency,
        top_topics: newCompTopics.split(',').map(t => t.trim()).filter(Boolean)
      });
      addNotification("Competitor Added", `Tracking ${newCompName}.`, "success");
      setAddCompetitorModalOpen(false);
      setNewCompName('');
      const compRes = await fetchCompetitorsApi();
      setCompetitors(compRes.competitors || []);
    } catch (err) {
      addNotification("Action Failed", "Could not add competitor.", "warning");
    } finally {
      setAddingComp(false);
    }
  }

  // Handle Remove Competitor
  async function handleRemoveCompetitor(id: string) {
    try {
      await removeCompetitorApi(id);
      setCompetitors(prev => prev.filter(c => c.id !== id && c.competitor_channel_id !== id));
      addNotification("Competitor Removed", "Competitor unlinked from tracking.", "info");
    } catch (err) {
      addNotification("Action Failed", "Could not remove competitor.", "warning");
    }
  }

  // Handle Generate Ideas
  async function handleGenerateIdeas() {
    setGeneratingIdeas(true);
    try {
      const res = await generateShortsIdeasApi({ count: 5 });
      setIdeas(res.ideas || []);
      addNotification("Ideas Generated", "Generated 5 high-opportunity Shorts blueprints.", "success");
    } catch (err) {
      addNotification("Idea Generation Failed", "Could not generate ideas.", "warning");
    } finally {
      setGeneratingIdeas(false);
    }
  }

  // Handle Convert Idea to Project
  async function handleConvertIdeaToProject(ideaId: string) {
    setConvertingIdeaId(ideaId);
    try {
      const res = await convertIdeaToProjectApi(ideaId);
      addNotification("Project Created!", `"${res.project_name}" is ready in Shorts Factory.`, "success");
      setIdeas(prev => prev.map(i => i.id === ideaId ? { ...i, is_converted_to_project: 1, project_id: res.project_id } : i));
      setTimeout(() => {
        router.push("/projects");
      }, 1200);
    } catch (err: any) {
      addNotification("Conversion Error", err.message || "Could not convert idea.", "warning");
    } finally {
      setConvertingIdeaId(null);
    }
  }

  // Handle Evaluate Custom Idea
  async function handleEvaluateIdea() {
    if (!evalIdeaTitle.trim() || !evalIdeaHook.trim()) return;
    setEvaluatingIdea(true);
    try {
      const res = await evaluateViralPotentialApi({
        title: evalIdeaTitle,
        hook_sentence: evalIdeaHook,
        concept_summary: evalIdeaConcept,
        duration_seconds: evalIdeaDuration
      });
      setIdeaEvaluation(res);
      addNotification("Evaluation Complete", `Viral Opportunity Score: ${res.opportunity_score}/100.`, "info");
    } catch (err) {
      addNotification("Evaluation Error", "Could not evaluate idea.", "warning");
    } finally {
      setEvaluatingIdea(false);
    }
  }

  // Handle Generate Strategy
  async function handleGenerateStrategyPlan(timeframe: number) {
    setStrategyTimeframe(timeframe);
    setGeneratingStrategy(true);
    try {
      const res = await generateStrategyPlanApi(timeframe);
      setStrategyPlan(res);
      addNotification("Strategy Plan Generated", `Created cohesive ${timeframe}-day content roadmap.`, "success");
    } catch (err) {
      addNotification("Strategy Generation Error", "Could not build plan.", "warning");
    } finally {
      setGeneratingStrategy(false);
    }
  }

  // Handle Strategy Assistant Query
  async function handleSendAssistantQuery(userQuery?: string) {
    const q = userQuery || assistantInput.trim();
    if (!q || isAssistantThinking) return;

    const userMessage = {
      role: 'user' as const,
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAssistantMessages(prev => [...prev, userMessage]);
    setAssistantInput('');
    setIsAssistantThinking(true);

    try {
      const res = await queryStrategyAssistantApi(q);
      const aiMessage = {
        role: 'assistant' as const,
        content: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAssistantMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      addNotification("Assistant Error", "Failed to query strategy assistant.", "warning");
    } finally {
      setIsAssistantThinking(false);
    }
  }

  // Filtered Ideas
  const filteredIdeas = useMemo(() => {
    if (ideaSourceFilter === 'all') return ideas;
    return ideas.filter(i => i.source_type === ideaSourceFilter);
  }, [ideas, ideaSourceFilter]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      {/* 1. TOP HERO HEADER: AI CONTENT INTELLIGENCE & VIRAL STRATEGY */}
      <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-2.5">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              <span>AUTONOMOUS AI NICHE INTELLIGENCE & VIRALITY STRATEGY</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              AI Content Intelligence & Viral Strategy Engine
            </h1>
            <p className="text-xs lg:text-sm text-gray-400 mt-1 max-w-2xl">
              Understand your niche authority, track competitor channels, pinpoint high-yield content gaps, and generate data-backed Shorts blueprints ready for instant production.
            </p>
          </div>

          {/* QUICK NICHE PILL & ACTIONS */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#0A0C10] border border-[#23293A] flex items-center gap-3 shadow-inner">
              <div className="w-10 h-10 rounded-xl bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Compass className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left pr-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Target Niche</span>
                <span className="text-xs font-extrabold text-white block">
                  {nicheProfile?.niche_name || "AI & Emerging Technology"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setNicheModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#1C2130] hover:bg-[#252C40] text-gray-200 border border-[#2A3144] flex items-center gap-2 transition-all shadow-sm"
            >
              <Edit3 className="w-3.5 h-3.5 text-purple-400" />
              <span>Correct Niche Profile</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('ideas');
                handleGenerateIdeas();
              }}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center gap-2 shadow-glow-purple active:scale-95 transition-all"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Generate Shorts Ideas</span>
            </button>
          </div>
        </div>

        {/* METRICS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#1C2130] text-xs">
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">Niche Maturity Index</span>
            <span className="font-extrabold text-purple-400 text-lg mt-1">94 / 100</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">Tracked Competitors</span>
            <span className="font-extrabold text-blue-400 text-lg mt-1">{competitors.length} Channels</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">High-Yield Content Gaps</span>
            <span className="font-extrabold text-amber-400 text-lg mt-1">{contentGaps.length} Opportunities</span>
          </div>
          <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#1E2333] flex flex-col justify-between">
            <span className="text-gray-400">Saved Shorts Ideas</span>
            <span className="font-extrabold text-emerald-400 text-lg mt-1">{ideas.length} Blueprints</span>
          </div>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-[#23293A] pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: '1. Overview', icon: BrainCircuit },
          { id: 'trends', label: '2. Discover Trends', icon: TrendingUp },
          { id: 'competitors', label: '3. Competitor Intelligence', icon: Users },
          { id: 'ideas', label: '4. Idea Generator', icon: Lightbulb, badge: 'Ideas' },
          { id: 'evaluator', label: '5. Viral Potential Analyzer', icon: Flame },
          { id: 'gaps', label: '6. Content Gap Analysis', icon: Target },
          { id: 'strategy', label: '7. Content Calendar', icon: Calendar },
          { id: 'assistant', label: '8. AI Strategy Assistant', icon: Sparkles, badge: 'AI' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as IntelligenceTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white hover:bg-[#161B29]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded bg-purple-500 text-white text-[9px] font-mono">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: OVERVIEW & CHANNEL NICHE PROFILE */}
      {/* ============================================================== */}
      {activeTab === 'overview' && nicheProfile && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT 7 COLS: NICHE PROFILE CARD */}
            <div className="lg:col-span-7 p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span>Channel Niche Identity Profile</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Learned from your YouTube performance analytics and manual guidance.
                  </p>
                </div>
                <button
                  onClick={() => setNicheModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-[#0A0C10] hover:bg-[#1E2333] border border-[#23293A] text-xs font-semibold text-gray-300 hover:text-white flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                  <span>Edit Profile</span>
                </button>
              </div>

              {/* CORE TOPICS */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
                  Core Topic Pillars
                </span>
                <div className="flex flex-wrap gap-2">
                  {nicheProfile.core_topics.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* AUDIENCE & VOICE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#23293A] space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Target Audience
                  </span>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    {nicheProfile.target_audience}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#23293A] space-y-1">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                    Brand Voice & Tone
                  </span>
                  <p className="text-xs text-gray-200 leading-relaxed font-medium">
                    {nicheProfile.brand_voice}
                  </p>
                </div>
              </div>

              {/* RETENTION HOOK PATTERNS */}
              <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#23293A] space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Statistically Proven Hook Styles (From Analytics)
                </span>
                <div className="flex flex-wrap gap-2">
                  {nicheProfile.top_performing_hook_styles.map((hk, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{hk}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT 5 COLS: CONTENT GAP PREVIEW & QUICK ACTIONS */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-2 border-b border-[#23293A]">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span>Top Opportunity Content Gaps</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('gaps')}
                    className="text-xs text-purple-400 hover:underline font-bold"
                  >
                    View All ({contentGaps.length})
                  </button>
                </div>

                <div className="space-y-3">
                  {contentGaps.slice(0, 3).map((gap) => (
                    <div
                      key={gap.id}
                      className="p-3.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] hover:border-amber-500/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[200px]">{gap.topic_name}</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px]">
                          {gap.opportunity_score}/100 Opp
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-snug line-clamp-2">
                        {gap.suggested_angle}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[10px] text-gray-500">
                        <span>Multiplier: <strong className="text-emerald-400">{gap.potential_views_multiplier}x views</strong></span>
                        <button
                          onClick={() => {
                            setEvalIdeaTitle(gap.topic_name);
                            setEvalIdeaHook(`Why nobody is talking about ${gap.topic_name.toLowerCase()}`);
                            setActiveTab('evaluator');
                          }}
                          className="text-purple-400 hover:text-purple-300 font-bold"
                        >
                          Analyze Virality &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: DISCOVER TRENDS & LONG-FORM CANDIDATES */}
      {/* ============================================================== */}
      {activeTab === 'trends' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* TRENDING TOPICS GRID */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Real-Time Trending Topics In Your Niche</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Calculated from search velocity spikes, community discussion frequency, and creator upload velocity.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trends.map((tr) => (
                <div
                  key={tr.id}
                  className="p-5 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4 shadow-xl hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-bold uppercase tracking-wider border border-purple-500/20">
                        {tr.niche}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-1.5">{tr.topic}</h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-extrabold flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-emerald-400" />
                      <span>+{tr.growth_velocity_pct}%</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                      <span className="text-[10px] text-gray-500 block">Search Volume Index</span>
                      <span className="font-extrabold text-white text-sm font-mono">{tr.search_volume_index} / 100</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                      <span className="text-[10px] text-gray-500 block">Competition Level</span>
                      <span className="font-extrabold text-purple-400 text-sm">{tr.competition_level}</span>
                    </div>
                  </div>

                  {/* LONG-FORM CANDIDATES */}
                  <div className="space-y-2 pt-2 border-t border-[#1C2130]">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Recommended Long-Form Sources for Shorts Clipping:
                    </span>
                    {tr.sample_candidates.map((cand, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-semibold text-white truncate block">{cand.title}</span>
                          <span className="text-[10px] text-gray-500">
                            {cand.source_creator} • {cand.duration_minutes}m • ~{cand.estimated_shorts_count} viable moments
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-mono font-bold flex-shrink-0">
                          {cand.opportunity_score}/100 Opp
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LONG-FORM VIDEO OPPORTUNITY CALCULATOR */}
          <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-5 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileVideo className="w-4 h-4 text-blue-400" />
                <span>Evaluate Any Long-Form Video For Shorts Opportunities</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Input a candidate podcast, tutorial, or webinar to calculate estimated viable moments and opportunity scores before ingestion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-3">
                <input
                  type="text"
                  value={sourceVideoTitle}
                  onChange={(e) => setSourceVideoTitle(e.target.value)}
                  placeholder="Paste candidate video title (e.g. Andrej Karpathy on Autonomous Agents & MoE)..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
                />
                <textarea
                  rows={2}
                  value={sourceVideoDesc}
                  onChange={(e) => setSourceVideoDesc(e.target.value)}
                  placeholder="Optional video description, chapter timestamps, or topics covered..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                />
              </div>

              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1">
                    Duration (Minutes): {sourceVideoDurationMins}m
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={180}
                    step={5}
                    value={sourceVideoDurationMins}
                    onChange={(e) => setSourceVideoDurationMins(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <button
                  onClick={handleEvaluateSourceVideo}
                  disabled={!sourceVideoTitle.trim() || evaluatingSource}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {evaluatingSource ? <RotateCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  <span>Evaluate Video Opportunities</span>
                </button>
              </div>
            </div>

            {/* EVALUATION RESULT */}
            {sourceEvaluationResult && (
              <div className="p-4 rounded-2xl bg-[#0A0C10] border border-purple-500/40 space-y-3 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">{sourceEvaluationResult.verdict}</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">{sourceEvaluationResult.criteria_explanation}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-purple-400 font-mono block">
                      {sourceEvaluationResult.opportunity_score}/100
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      ~{sourceEvaluationResult.estimated_interesting_moments} Shorts Moments
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: COMPETITOR INTELLIGENCE */}
      {/* ============================================================== */}
      {activeTab === 'competitors' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span>Tracked Competitor Channels ({competitors.length})</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Benchmark your upload frequency, average views, and topic distribution against leading creators in your niche.
              </p>
            </div>

            <button
              onClick={() => setAddCompetitorModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Competitor</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {competitors.map((comp) => (
              <div
                key={comp.id}
                className="p-5 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4 shadow-xl hover:border-gray-700 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={comp.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"}
                        alt={comp.channel_name}
                        className="w-10 h-10 rounded-xl object-cover ring-1 ring-purple-500/30"
                      />
                      <div>
                        <h4 className="text-sm font-bold text-white">{comp.channel_name}</h4>
                        <span className="text-[11px] text-gray-400">
                          {(comp.subscribers / 1000).toFixed(0)}K Subscribers
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveCompetitor(comp.id)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-950/20"
                      title="Remove competitor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                      <span className="text-[10px] text-gray-500 block">Avg Shorts Views</span>
                      <span className="font-extrabold text-white text-sm font-mono">
                        {(comp.avg_shorts_views / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                      <span className="text-[10px] text-gray-500 block">Upload Cadence</span>
                      <span className="font-extrabold text-purple-400 text-sm font-mono">
                        {comp.upload_frequency_per_week} / week
                      </span>
                    </div>
                  </div>

                  {/* TOP TOPICS */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Frequent Topics
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comp.top_topics.map((tp, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#0A0C10] border border-[#23293A] text-gray-300 text-[10px]"
                        >
                          {tp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1C2130]">
                  <button
                    onClick={() => {
                      setActiveTab('gaps');
                    }}
                    className="w-full py-2 rounded-xl bg-[#0A0C10] hover:bg-[#161B29] text-purple-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-[#23293A]"
                  >
                    <span>Inspect Content Gaps</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: SHORTS IDEA GENERATOR */}
      {/* ============================================================== */}
      {activeTab === 'ideas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400" />
                <span>AI Shorts Idea Generator & Production Blueprints</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Every idea contains a battle-tested opening hook, full 4-stage structure, recommended duration, and a 1-click button to create a project.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={ideaSourceFilter}
                onChange={(e) => setIdeaSourceFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#12151E] border border-[#23293A] text-xs font-semibold text-gray-300"
              >
                <option value="all">All Sources</option>
                <option value="trending">Trending Topics</option>
                <option value="gap">Content Gaps</option>
                <option value="analytics_replicated">Analytics Replicated</option>
              </select>

              <button
                onClick={handleGenerateIdeas}
                disabled={generatingIdeas}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-2"
              >
                {generatingIdeas ? <RotateCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate Fresh Ideas</span>
              </button>
            </div>
          </div>

          {/* IDEAS CARDS */}
          <div className="space-y-4">
            {filteredIdeas.map((idea) => {
              const isConverting = convertingIdeaId === idea.id;
              const isConverted = Boolean(idea.is_converted_to_project);

              return (
                <div
                  key={idea.id}
                  className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] hover:border-purple-500/40 transition-colors space-y-4 shadow-xl"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                          {idea.source_type.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          Duration: {idea.recommended_duration_seconds}s • Caption: {idea.caption_style_preset}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white tracking-tight">
                        {idea.title}
                      </h4>

                      {/* HOOK BOX */}
                      <div className="p-3.5 rounded-2xl bg-[#0A0C10] border border-purple-500/30 text-xs">
                        <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                          Opening 3-Second Retention Hook:
                        </span>
                        <p className="font-semibold text-white italic">
                          "{idea.hook_sentence}"
                        </p>
                      </div>

                      <p className="text-xs text-gray-300 leading-relaxed">
                        {idea.concept_summary}
                      </p>
                    </div>

                    {/* SCORE & CONVERT ACTION */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <div className="p-3 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-right">
                        <span className="text-[10px] text-gray-500 block">Opportunity Score</span>
                        <span className="text-2xl font-extrabold text-purple-400 font-mono block">
                          {idea.opportunity_score}/100
                        </span>
                      </div>

                      <button
                        onClick={() => handleConvertIdeaToProject(idea.id)}
                        disabled={isConverting || isConverted}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md ${
                          isConverted
                            ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-glow-purple active:scale-95'
                        }`}
                      >
                        {isConverting ? (
                          <RotateCw className="w-4 h-4 animate-spin" />
                        ) : isConverted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>{isConverted ? "Project Created ✓" : "Convert to Shorts Project"}</span>
                      </button>
                    </div>
                  </div>

                  {/* STRUCTURE CHIPS */}
                  <div className="pt-2 border-t border-[#1C2130] flex flex-wrap gap-2 text-[11px]">
                    {idea.suggested_structure.map((st, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-xl bg-[#0A0C10] border border-[#23293A] text-gray-300 font-mono"
                      >
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: VIRAL POTENTIAL ANALYZER */}
      {/* ============================================================== */}
      {activeTab === 'evaluator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-5 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-purple-400" />
                <span>Pre-Production Viral Opportunity Scorer</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Evaluate your own ideas before producing video footage. Evaluates hook strength, topic demand, and audience alignment.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Short Title</label>
                <input
                  type="text"
                  value={evalIdeaTitle}
                  onChange={(e) => setEvalIdeaTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Opening 3-Second Hook Sentence</label>
                <textarea
                  rows={2}
                  value={evalIdeaHook}
                  onChange={(e) => setEvalIdeaHook(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">Main Concept & Proof</label>
                <textarea
                  rows={3}
                  value={evalIdeaConcept}
                  onChange={(e) => setEvalIdeaConcept(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400">
                  Target Duration: {evalIdeaDuration} Seconds
                </label>
                <input
                  type="range"
                  min={15}
                  max={60}
                  step={1}
                  value={evalIdeaDuration}
                  onChange={(e) => setEvalIdeaDuration(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              <button
                onClick={handleEvaluateIdea}
                disabled={evaluatingIdea}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold shadow-glow-purple flex items-center justify-center gap-2"
              >
                {evaluatingIdea ? <RotateCw className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
                <span>Calculate Virality Opportunity Score</span>
              </button>
            </div>
          </div>

          {/* EVALUATION BREAKDOWN CARD */}
          <div className="lg:col-span-6 p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Transparent Criteria Breakdown</span>
            </h3>

            {ideaEvaluation ? (
              <div className="space-y-5 animate-in zoom-in-95 duration-200">
                <div className="p-4 rounded-2xl bg-[#0A0C10] border border-purple-500/40 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">Overall Virality Opportunity</span>
                    <span className="text-[11px] text-gray-400">Internal benchmark estimate (not a view guarantee)</span>
                  </div>
                  <span className="text-3xl font-extrabold text-purple-400 font-mono">
                    {ideaEvaluation.opportunity_score} / 100
                  </span>
                </div>

                {/* 6 BREAKDOWN BARS */}
                <div className="space-y-3">
                  {[
                    { label: 'Hook Strength & Retention Triggers', score: ideaEvaluation.score_breakdown.hook_strength },
                    { label: 'Niche Topic Relevance & Search Intent', score: ideaEvaluation.score_breakdown.topic_relevance },
                    { label: 'Originality & Contrarian Angle', score: ideaEvaluation.score_breakdown.originality },
                    { label: 'Audience Demographics Fit', score: ideaEvaluation.score_breakdown.audience_fit },
                    { label: 'Storytelling & Duration Pacing', score: ideaEvaluation.score_breakdown.storytelling },
                    { label: 'Competition & Saturation Index', score: ideaEvaluation.score_breakdown.competition_level },
                  ].map((bar, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-300 font-medium">{bar.label}</span>
                        <span className="font-mono text-purple-300 font-bold">{bar.score}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#0A0C10] overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                          style={{ width: `${bar.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-xs text-gray-300 leading-relaxed font-sans">
                  {ideaEvaluation.diagnostic_feedback}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 text-xs">
                Enter your hook and title on the left to calculate full opportunity breakdown.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: CONTENT GAP ANALYSIS */}
      {/* ============================================================== */}
      {activeTab === 'gaps' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              <span>Competitor Content Gap Radar ({contentGaps.length})</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Subjects where your competitors generate significant views that your channel has not yet covered.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentGaps.map((gap) => (
              <div
                key={gap.id}
                className="p-5 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4 shadow-xl hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-bold text-white">{gap.topic_name}</h4>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-xs font-bold">
                    {gap.opportunity_score}/100 Opp
                  </span>
                </div>

                {/* COVERAGE COMPARISON */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Competitors Coverage:</span>
                    <span className="font-mono font-bold text-purple-400">{gap.competitor_coverage_score}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Your Channel Coverage:</span>
                    <span className="font-mono font-bold text-emerald-400">{gap.user_coverage_score}%</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-xs text-gray-300">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                    Differentiating Angle:
                  </span>
                  <p>{gap.suggested_angle}</p>
                </div>

                <div className="pt-2 border-t border-[#1C2130] flex items-center justify-between">
                  <span className="text-xs text-emerald-400 font-semibold font-mono">
                    {gap.potential_views_multiplier}x View Velocity Multiplier
                  </span>
                  <button
                    onClick={() => {
                      setEvalIdeaTitle(gap.topic_name);
                      setEvalIdeaHook(`Why 99% of people misunderstand ${gap.topic_name.toLowerCase()}`);
                      setActiveTab('evaluator');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold hover:bg-purple-600 hover:text-white transition-colors"
                  >
                    Analyze Virality
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 7: CONTENT STRATEGY CALENDAR */}
      {/* ============================================================== */}
      {activeTab === 'strategy' && strategyPlan && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>{strategyPlan.plan_name}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Sequential daily content strategy designed to maximize algorithmic lift and viewer habituation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  onClick={() => handleGenerateStrategyPlan(days)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    strategyTimeframe === days
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-[#12151E] border border-[#23293A] text-gray-400 hover:text-white'
                  }`}
                >
                  {days}-Day Plan
                </button>
              ))}
            </div>
          </div>

          {/* SCHEDULE ITEMS */}
          <div className="space-y-3">
            {strategyPlan.daily_schedule.map((item) => (
              <div
                key={item.day}
                className="p-4 rounded-2xl bg-[#12151E] border border-[#23293A] hover:border-gray-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-300 flex items-center justify-center font-mono font-extrabold text-sm flex-shrink-0">
                    Day {item.day}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h4 className="text-xs font-bold text-white truncate max-w-xl">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-gray-400 italic line-clamp-1">
                      "{item.hook}"
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 font-mono">
                      <span>{item.topic}</span>
                      <span>•</span>
                      <span>{item.duration}s Duration</span>
                      <span>•</span>
                      <span className="text-purple-400">{item.publish_date}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEvalIdeaTitle(item.title);
                    setEvalIdeaHook(item.hook);
                    setActiveTab('evaluator');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0A0C10] hover:bg-[#1E2333] border border-[#23293A] text-xs font-semibold text-gray-300 hover:text-white self-end md:self-auto"
                >
                  Analyze & Score
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 8: AI STRATEGY ASSISTANT */}
      {/* ============================================================== */}
      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
          <div className="lg:col-span-8 p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-5 shadow-xl min-h-[550px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-glow-purple">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Content Strategy Advisor</h3>
                  <p className="text-[11px] text-gray-400">Trained on competitor moves, content gaps, and retention psychology.</p>
                </div>
              </div>
            </div>

            {/* CHAT MESSAGES */}
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2">
              {assistantMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed max-w-xl ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none'
                        : 'bg-[#0A0C10] border border-[#23293A] text-gray-200 rounded-tl-none whitespace-pre-line font-sans'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isAssistantThinking && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-xs text-purple-300 w-48 animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Formulating strategy...</span>
                </div>
              )}
            </div>

            {/* INPUT */}
            <div className="space-y-3 pt-3 border-t border-[#23293A]">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendAssistantQuery();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                  placeholder="Ask about competitor moves, content gaps, or hook formulas..."
                  className="flex-1 px-4 py-3 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={!assistantInput.trim() || isAssistantThinking}
                  className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white disabled:opacity-40 transition-all shadow-glow-purple"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* SUGGESTED STRATEGY PROMPTS */}
          <div className="lg:col-span-4 p-5 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Recommended Strategic Inquiries</span>
            </h4>
            <div className="space-y-2">
              {[
                "What are my competitors doing right now?",
                "What are my biggest content gaps?",
                "How can I improve my opening hooks?",
                "What topic should I publish next for maximum velocity?",
                "Should I increase my upload frequency?",
              ].map((pill, i) => (
                <button
                  key={i}
                  onClick={() => handleSendAssistantQuery(pill)}
                  className="w-full p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] hover:border-purple-500 text-left text-xs text-gray-300 hover:text-white transition-all flex items-center justify-between"
                >
                  <span className="line-clamp-1">{pill}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: EDIT / CORRECT NICHE PROFILE MODAL */}
      {/* ============================================================== */}
      {nicheModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">Define & Correct Channel Niche Profile</h3>
              </div>
              <button
                onClick={() => setNicheModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-400">Niche Name</label>
                <input
                  type="text"
                  value={editNicheName}
                  onChange={(e) => setEditNicheName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-400">Core Topic Pillars (comma separated)</label>
                <input
                  type="text"
                  value={editCoreTopics}
                  onChange={(e) => setEditCoreTopics(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-400">Target Audience Description</label>
                <textarea
                  rows={2}
                  value={editAudience}
                  onChange={(e) => setEditAudience(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-400">Brand Voice & Pacing</label>
                <input
                  type="text"
                  value={editBrandVoice}
                  onChange={(e) => setEditBrandVoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23293A]">
              <button
                onClick={() => setNicheModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1C2130] text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNicheProfile}
                disabled={savingNiche}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {savingNiche ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ADD COMPETITOR CHANNEL */}
      {/* ============================================================== */}
      {addCompetitorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">Track Competitor Channel</h3>
              </div>
              <button
                onClick={() => setAddCompetitorModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-400">Channel Name</label>
                <input
                  type="text"
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="e.g. Fireship Tech"
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-400">Subscribers</label>
                  <input
                    type="number"
                    value={newCompSubs}
                    onChange={(e) => setNewCompSubs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-gray-400">Uploads / Week</label>
                  <input
                    type="number"
                    step={0.5}
                    value={newCompFrequency}
                    onChange={(e) => setNewCompFrequency(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-400">Core Topics</label>
                <input
                  type="text"
                  value={newCompTopics}
                  onChange={(e) => setNewCompTopics(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23293A]">
              <button
                onClick={() => setAddCompetitorModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1C2130] text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompetitor}
                disabled={addingComp || !newCompName.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
              >
                {addingComp ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Add Competitor</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Eye,
  ThumbsUp,
  MessageSquare,
  Share2,
  Users,
  Film,
  Calendar,
  Download,
  Printer,
  Sparkles,
  Bell,
  SlidersHorizontal,
  Search,
  ArrowUpDown,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Globe,
  Flame,
  Zap,
  Target,
  Send,
  RotateCw,
  X,
  Layers,
  Award
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';
import {
  fetchAnalyticsOverviewApi,
  fetchAnalyticsTimeSeriesApi,
  fetchIndividualShortsAnalyticsApi,
  fetchShortDetailAnalyticsApi,
  fetchTopPerformingShortsApi,
  fetchAudienceInsightsApi,
  fetchContentPerformanceInsightsApi,
  queryAIPerformanceAssistantApi,
  fetchPerformanceAlertsApi,
  markAlertsAsReadApi,
  fetchAlertSettingsApi,
  updateAlertSettingsApi,
  getExportCsvUrl
} from '@/lib/api';
import {
  ChannelAnalyticsOverview,
  TimeSeriesPoint,
  VideoAnalyticsRecord,
  AudienceInsights,
  ContentPerformanceInsights,
  PerformanceAlert,
  AlertSettings
} from '@/types';

type ActiveAnalyticsTab = 'overview' | 'shorts' | 'audience' | 'insights' | 'assistant';
type ChartMetric = 'views' | 'subscribers_gained' | 'likes' | 'comments' | 'shorts_published';

export default function AnalyticsDashboardPage() {
  const { addNotification } = useApp();

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveAnalyticsTab>('overview');

  // Time Range
  const [timeRange, setTimeRange] = useState<string>('28d');
  const [loading, setLoading] = useState<boolean>(true);

  // Overview Data
  const [overview, setOverview] = useState<ChannelAnalyticsOverview | null>(null);

  // Time-Series Chart Data
  const [timeSeries, setTimeSeries] = useState<TimeSeriesPoint[]>([]);
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetric>('views');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // Individual Shorts
  const [shortsList, setShortsList] = useState<VideoAnalyticsRecord[]>([]);
  const [searchShortsQuery, setSearchShortsQuery] = useState<string>('');
  const [shortsSortBy, setShortsSortBy] = useState<string>('views');
  const [shortsSortOrder, setShortsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedShortDetail, setSelectedShortDetail] = useState<VideoAnalyticsRecord | null>(null);

  // Top Performing Shorts
  const [topShorts, setTopShorts] = useState<{
    top_by_views: VideoAnalyticsRecord[];
    top_by_likes: VideoAnalyticsRecord[];
    top_by_engagement: VideoAnalyticsRecord[];
    fastest_growing: VideoAnalyticsRecord[];
  } | null>(null);
  const [topTab, setTopTab] = useState<'views' | 'likes' | 'engagement' | 'velocity'>('views');

  // Audience Insights
  const [audience, setAudience] = useState<AudienceInsights | null>(null);

  // Content Insights
  const [contentInsights, setContentInsights] = useState<ContentPerformanceInsights | null>(null);

  // AI Assistant State
  const [assistantMessages, setAssistantMessages] = useState<Array<{
    role: 'user' | 'assistant';
    content: string;
    citations?: string[];
    suggested_followups?: string[];
    timestamp: string;
  }>>([
    {
      role: 'assistant',
      content: "Hello! I am your AI Shorts Performance Analyst. I analyze your channel's actual views, completion curves, and viewer retention to tell you what works and what to publish next. Ask me anything, or pick one of the prompts below!",
      citations: ["Channel Total: 148.5K subscribers", "Shorts Feed Discovery: 84.5%"],
      suggested_followups: [
        "Why did my top Short perform so well?",
        "What topics should I make next?",
        "What duration performs best?",
        "Which videos are gaining momentum right now?"
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [assistantInput, setAssistantInput] = useState<string>('');
  const [isAssistantThinking, setIsAssistantThinking] = useState<boolean>(false);

  // Alerts State
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [alertsModalOpen, setAlertsModalOpen] = useState<boolean>(false);
  const [alertSettingsModalOpen, setAlertSettingsModalOpen] = useState<boolean>(false);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>({
    channel_id: "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    milestone_1k_enabled: true,
    milestone_10k_enabled: true,
    milestone_100k_enabled: true,
    velocity_spike_threshold_pct: 200.0,
    retention_drop_threshold_pct: 40.0,
    subscriber_milestone_interval: 1000,
    email_notifications_enabled: true
  });

  // Load Data
  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [
        overviewRes,
        timeSeriesRes,
        shortsRes,
        topRes,
        audienceRes,
        insightsRes,
        alertsRes,
        settingsRes
      ] = await Promise.allSettled([
        fetchAnalyticsOverviewApi(timeRange),
        fetchAnalyticsTimeSeriesApi(timeRange, selectedChartMetric),
        fetchIndividualShortsAnalyticsApi(shortsSortBy, shortsSortOrder, 50),
        fetchTopPerformingShortsApi(),
        fetchAudienceInsightsApi(timeRange),
        fetchContentPerformanceInsightsApi(),
        fetchPerformanceAlertsApi(false),
        fetchAlertSettingsApi()
      ]);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (timeSeriesRes.status === 'fulfilled') setTimeSeries(timeSeriesRes.value.data || []);
      if (shortsRes.status === 'fulfilled') setShortsList(shortsRes.value.shorts || []);
      if (topRes.status === 'fulfilled') setTopShorts(topRes.value);
      if (audienceRes.status === 'fulfilled') setAudience(audienceRes.value);
      if (insightsRes.status === 'fulfilled') setContentInsights(insightsRes.value);
      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.alerts || []);
        setUnreadAlertsCount(alertsRes.value.unread_count || 0);
      }
      if (settingsRes.status === 'fulfilled') setAlertSettings(settingsRes.value);
    } catch (err) {
      console.error("Error loading analytics dashboard data:", err);
      addNotification("Analytics Load Error", "Failed to fetch channel analytics.", "warning");
    } finally {
      setLoading(false);
    }
  }

  // Handle Sort Change
  async function handleSortChange(column: string) {
    const newOrder = shortsSortBy === column && shortsSortOrder === 'desc' ? 'asc' : 'desc';
    setShortsSortBy(column);
    setShortsSortOrder(newOrder);
    try {
      const res = await fetchIndividualShortsAnalyticsApi(column, newOrder, 50);
      if (res && res.shorts) {
        setShortsList(res.shorts);
      }
    } catch (err) {
      console.error("Failed to sort shorts:", err);
    }
  }

  // Inspect Single Short Detail
  async function handleInspectShort(videoId: string) {
    try {
      const res = await fetchShortDetailAnalyticsApi(videoId);
      setSelectedShortDetail(res);
    } catch (err) {
      addNotification("Short Details", "Could not fetch detailed analytics for this Short.", "warning");
    }
  }

  // Handle AI Assistant Query
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
      const res = await queryAIPerformanceAssistantApi(q, selectedShortDetail?.video_id);
      const aiMessage = {
        role: 'assistant' as const,
        content: res.answer,
        citations: res.citations || [],
        suggested_followups: res.suggested_followups || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAssistantMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      addNotification("AI Assistant Error", "Failed to generate analytics response.", "warning");
    } finally {
      setIsAssistantThinking(false);
    }
  }

  // Mark Alerts as Read
  async function handleMarkAlertsRead() {
    try {
      await markAlertsAsReadApi();
      setUnreadAlertsCount(0);
      setAlerts(prev => prev.map(a => ({ ...a, is_read: 1 })));
    } catch (err) {
      console.error(err);
    }
  }

  // Save Alert Settings
  async function handleSaveAlertSettings() {
    try {
      await updateAlertSettingsApi(alertSettings);
      addNotification("Alert Settings Saved", "Threshold notifications updated.", "success");
      setAlertSettingsModalOpen(false);
    } catch (err) {
      addNotification("Update Failed", "Could not save alert settings.", "warning");
    }
  }

  // Filtered Shorts for Table
  const filteredShorts = useMemo(() => {
    if (!searchShortsQuery.trim()) return shortsList;
    return shortsList.filter(s =>
      s.title.toLowerCase().includes(searchShortsQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchShortsQuery.toLowerCase())
    );
  }, [shortsList, searchShortsQuery]);

  // Chart Rendering Helpers
  const chartPoints = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    const values = timeSeries.map(p => p[selectedChartMetric] as number);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values, 1);
    const range = maxVal - minVal || 1;

    return timeSeries.map((p, i) => {
      const x = (i / (timeSeries.length - 1)) * 100;
      const normalized = ((p[selectedChartMetric] as number) - minVal) / range;
      const y = 90 - (normalized * 75); // Leave padding top & bottom
      return { x, y, ...p, val: p[selectedChartMetric] as number };
    });
  }, [timeSeries, selectedChartMetric]);

  const svgPathD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return chartPoints.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
    }, "");
  }, [chartPoints]);

  const svgAreaD = useMemo(() => {
    if (chartPoints.length === 0) return "";
    return `${svgPathD} L 100 95 L 0 95 Z`;
  }, [svgPathD, chartPoints]);

  const renderBadge = (badge: string) => {
    switch (badge) {
      case 'viral_outlier':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1 shadow-glow-purple">
            <Flame className="w-3 h-3 text-purple-400" />
            <span>Viral Outlier</span>
          </span>
        );
      case 'above_average':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Above Average</span>
          </span>
        );
      case 'underperforming':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span>Underperforming</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gray-500/20 text-gray-300 border border-gray-500/30 flex items-center gap-1">
            <span>Average</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      {/* 1. TOP BAR: CHANNEL IDENTITY & RANGE SELECTOR */}
      <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-600/5 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold mb-2.5">
              <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
              <span>OFFICIAL YOUTUBE ANALYTICS & DATA API V3</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Shorts Analytics & Performance Intelligence
            </h1>
            <p className="text-xs lg:text-sm text-gray-400 mt-1 max-w-2xl">
              Real-time YouTube channel performance metrics, viewer retention curves, demographic distributions, and data-backed AI growth insights.
            </p>
          </div>

          {/* CONTROLS: TIMEFRAME, ALERTS & EXPORTS */}
          <div className="flex flex-wrap items-center gap-3">
            {/* TIMEFRAME SELECTOR */}
            <div className="p-1 rounded-2xl bg-[#0A0C10] border border-[#23293A] flex items-center">
              {[
                { id: '7d', label: '7 Days' },
                { id: '28d', label: '28 Days' },
                { id: '90d', label: '90 Days' },
                { id: '365d', label: '1 Year' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeRange(t.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    timeRange === t.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ALERTS BELL */}
            <button
              onClick={() => {
                setAlertsModalOpen(true);
                handleMarkAlertsRead();
              }}
              className="relative p-2.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-gray-300 hover:text-white transition-colors"
              title="Performance Milestone Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* ALERT SETTINGS */}
            <button
              onClick={() => setAlertSettingsModalOpen(true)}
              className="p-2.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-gray-400 hover:text-white transition-colors"
              title="Configure Milestone Thresholds"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* EXPORT CSV */}
            <a
              href={getExportCsvUrl(timeRange)}
              download={`ai_shorts_factory_analytics_${timeRange}.csv`}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-[#1C2130] hover:bg-[#252C40] text-gray-200 border border-[#2A3144] flex items-center gap-2 transition-all shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Export CSV</span>
            </a>

            {/* PRINT REPORT */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-2xl text-xs font-bold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white flex items-center gap-2 shadow-glow-purple active:scale-95 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* CHANNEL STATS SUMMARY STRIP */}
        {overview && (
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1C2130] text-xs">
            <div className="flex items-center gap-3">
              <img
                src={overview.avatar_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80"}
                alt={overview.channel_name}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-purple-500/40"
              />
              <div>
                <span className="font-bold text-white block">{overview.channel_name}</span>
                <span className="text-[11px] text-gray-400">
                  {overview.channel_id} • {(overview.metrics.total_subscribers.value / 1000).toFixed(1)}K Subscribers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-gray-400 font-mono text-[11px]">
              <span>Tracking Window: <strong className="text-white">{timeRange.toUpperCase()}</strong></span>
              <span>Updated: <strong className="text-emerald-400">Live API Cache Synced</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* 2. TABBED NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#23293A] pb-3 overflow-x-auto">
        {[
          { id: 'overview', label: '1. Overview & Graphs', icon: BarChart3 },
          { id: 'shorts', label: '2. Shorts Performance Table', icon: Film },
          { id: 'audience', label: '3. Audience Demographics', icon: Users },
          { id: 'insights', label: '4. Content Insights & Times', icon: Target },
          { id: 'assistant', label: '5. AI Performance Assistant', icon: Sparkles, badge: 'AI' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveAnalyticsTab)}
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
      {/* TAB 1: OVERVIEW & PERFORMANCE GRAPHS */}
      {/* ============================================================== */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* 8 EXECUTIVE METRIC CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Views', metric: overview.metrics.total_views, icon: Eye, format: (v: number) => v.toLocaleString() },
              { label: 'Net Subscribers Gained', metric: overview.metrics.total_subscribers, icon: Users, format: (v: number) => `+${(overview.metrics.total_subscribers.gained_in_period || 0).toLocaleString()}` },
              { label: 'Total Likes', metric: overview.metrics.total_likes, icon: ThumbsUp, format: (v: number) => v.toLocaleString() },
              { label: 'Total Comments', metric: overview.metrics.total_comments, icon: MessageSquare, format: (v: number) => v.toLocaleString() },
              { label: 'Total Shares', metric: overview.metrics.total_shares, icon: Share2, format: (v: number) => v.toLocaleString() },
              { label: 'Shorts Published', metric: overview.metrics.total_shorts_published, icon: Film, format: (v: number) => v.toLocaleString() },
              { label: 'Avg Views Per Short', metric: overview.metrics.avg_views_per_short, icon: Zap, format: (v: number) => v.toLocaleString() },
              { label: 'Avg Engagement Rate', metric: overview.metrics.avg_engagement_rate, icon: Award, format: (v: number) => `${v}%` },
            ].map((item, idx) => {
              const Icon = item.icon;
              const isPos = item.metric.is_positive;
              const change = item.metric.change_pct || 0;

              return (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-[#12151E] border border-[#23293A] hover:border-gray-700 transition-all flex flex-col justify-between space-y-2 shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-400">{item.label}</span>
                    <div className="w-7 h-7 rounded-lg bg-[#0A0C10] border border-[#23293A] flex items-center justify-center text-purple-400">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                      {item.format(item.metric.value)}
                    </h3>

                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                      {isPos ? (
                        <span className="inline-flex items-center text-emerald-400 font-bold">
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                          +{change}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-400 font-bold">
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                          {change}%
                        </span>
                      )}
                      <span className="text-[10px] text-gray-500">vs prev {timeRange}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* INTERACTIVE TIME-SERIES PERFORMANCE GRAPH */}
          <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span>Performance Over Time ({timeRange.toUpperCase()})</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Daily aggregated performance trajectory tracking view momentum and engagement spikes.
                </p>
              </div>

              {/* METRIC CHIP TOGGLES */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'views', label: 'Views', color: 'purple' },
                  { id: 'subscribers_gained', label: 'Subscribers', color: 'blue' },
                  { id: 'likes', label: 'Likes', color: 'emerald' },
                  { id: 'comments', label: 'Comments', color: 'amber' },
                  { id: 'shorts_published', label: 'Shorts Published', color: 'pink' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedChartMetric(m.id as ChartMetric)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedChartMetric === m.id
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500 shadow-sm'
                        : 'bg-[#0A0C10] border border-[#23293A] text-gray-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG INTERACTIVE AREA CHART */}
            <div className="relative w-full h-72 pt-4">
              {timeSeries.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs">
                  No time series data available for selected period.
                </div>
              ) : (
                <div className="w-full h-full relative">
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    <line x1="0" y1="20" x2="100" y2="20" stroke="#1E2333" strokeDasharray="1 1" strokeWidth="0.5" />
                    <line x1="0" y1="45" x2="100" y2="45" stroke="#1E2333" strokeDasharray="1 1" strokeWidth="0.5" />
                    <line x1="0" y1="70" x2="100" y2="70" stroke="#1E2333" strokeDasharray="1 1" strokeWidth="0.5" />
                    <line x1="0" y1="95" x2="100" y2="95" stroke="#1E2333" strokeWidth="0.8" />

                    {/* Gradient Area Fill */}
                    {svgAreaD && <path d={svgAreaD} fill="url(#areaGradient)" />}

                    {/* Stroke Line */}
                    {svgPathD && (
                      <path
                        d={svgPathD}
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Interactive Circles */}
                    {chartPoints.map((pt, i) => (
                      <circle
                        key={i}
                        cx={pt.x}
                        cy={pt.y}
                        r={hoveredPointIndex === i ? "2.5" : "1.0"}
                        className={`transition-all duration-150 ${
                          hoveredPointIndex === i ? 'fill-white stroke-purple-400 stroke-2' : 'fill-purple-500'
                        }`}
                        onMouseEnter={() => setHoveredPointIndex(i)}
                      />
                    ))}
                  </svg>

                  {/* HOVER TOOLTIP */}
                  {hoveredPointIndex !== null && chartPoints[hoveredPointIndex] && (
                    <div
                      className="absolute z-20 pointer-events-none transform -translate-x-1/2 p-2.5 rounded-xl bg-black/95 border border-purple-500 shadow-2xl text-xs space-y-0.5 text-center"
                      style={{
                        left: `${chartPoints[hoveredPointIndex].x}%`,
                        top: `${Math.max(10, chartPoints[hoveredPointIndex].y - 30)}%`
                      }}
                    >
                      <p className="font-mono text-[10px] text-gray-400">
                        {chartPoints[hoveredPointIndex].date}
                      </p>
                      <p className="font-extrabold text-white text-sm">
                        {chartPoints[hoveredPointIndex].val.toLocaleString()}{' '}
                        <span className="text-[10px] text-purple-300 uppercase">
                          {selectedChartMetric.replace('_', ' ')}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* X-AXIS DATES */}
                  <div className="flex justify-between text-[10px] font-mono text-gray-500 pt-3">
                    <span>{timeSeries[0]?.date}</span>
                    <span>{timeSeries[Math.floor(timeSeries.length / 2)]?.date}</span>
                    <span>{timeSeries[timeSeries.length - 1]?.date}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: INDIVIDUAL SHORTS TABLE & TOP 10 LEADERBOARDS */}
      {/* ============================================================== */}
      {activeTab === 'shorts' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* LEADERBOARD CAROUSEL / HIGHLIGHTS */}
          {topShorts && (
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-purple-400" />
                    <span>Top Performing Shorts Leaderboards</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Your highest performing content ranked by total views, raw likes, viewer engagement, and 48-hour velocity.
                  </p>
                </div>

                <div className="p-1 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center">
                  {[
                    { id: 'views', label: 'Top Views' },
                    { id: 'likes', label: 'Top Likes' },
                    { id: 'engagement', label: 'Top Engagement' },
                    { id: 'velocity', label: 'Fastest Growing' },
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => setTopTab(tb.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        topTab === tb.id ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3 TOP CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(topTab === 'views'
                  ? topShorts.top_by_views
                  : topTab === 'likes'
                  ? topShorts.top_by_likes
                  : topTab === 'engagement'
                  ? topShorts.top_by_engagement
                  : topShorts.fastest_growing
                ).slice(0, 3).map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => handleInspectShort(item.video_id)}
                    className="p-3.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] hover:border-purple-500/50 cursor-pointer transition-all flex items-center gap-3.5 group"
                  >
                    <div className="w-14 h-20 rounded-xl overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                      <img
                        src={item.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-md bg-purple-600/90 text-white text-[10px] font-extrabold flex items-center justify-center font-mono">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <h4 className="text-xs font-bold text-white truncate max-w-xs group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {item.views.toLocaleString()} views • {item.likes.toLocaleString()} likes
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        {renderBadge(item.performance_badge)}
                        <span className="text-[10px] text-purple-400 font-mono font-bold">
                          {item.engagement_rate}% Eng
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FULL INTERACTIVE SHORTS TABLE */}
          <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-5 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-purple-400" />
                  <span>Published Shorts Audit Table ({filteredShorts.length})</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Click any Short to inspect its full retention curve, 3-second hook score, and viewer diagnostics.
                </p>
              </div>

              {/* SEARCH */}
              <div className="px-3 py-1.5 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center gap-2 w-72">
                <Search className="w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  value={searchShortsQuery}
                  onChange={(e) => setSearchShortsQuery(e.target.value)}
                  placeholder="Search by title or topic..."
                  className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none"
                />
              </div>
            </div>

            {/* TABLE */}
            <div className="rounded-2xl border border-[#23293A] overflow-hidden overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0A0C10] border-b border-[#23293A] text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-3.5">Short Title</th>
                    <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSortChange('published_at')}>
                      <div className="flex items-center gap-1">
                        <span>Published</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSortChange('views')}>
                      <div className="flex items-center gap-1">
                        <span>Views</span>
                        <ArrowUpDown className="w-3 h-3 text-purple-400" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSortChange('likes')}>
                      <div className="flex items-center gap-1">
                        <span>Likes</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSortChange('comments')}>
                      <div className="flex items-center gap-1">
                        <span>Comments</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5">Subs Gained</th>
                    <th className="p-3.5 cursor-pointer hover:text-white" onClick={() => handleSortChange('engagement_rate')}>
                      <div className="flex items-center gap-1">
                        <span>Engagement</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5">Indicator</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C2130]">
                  {filteredShorts.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => handleInspectShort(s.video_id)}
                      className="hover:bg-[#161B27] cursor-pointer transition-colors"
                    >
                      {/* THUMBNAIL & TITLE */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-14 rounded-lg overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                            <img
                              src={s.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"}
                              alt={s.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-[7px] font-mono px-0.5 rounded text-white">
                              {s.duration_seconds.toFixed(0)}s
                            </div>
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs truncate max-w-xs block">
                              {s.title}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {s.category} • {s.hook_style}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                        {new Date(s.published_at).toLocaleDateString()}
                      </td>

                      <td className="p-3.5 font-bold text-white font-mono text-sm">
                        {s.views.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-gray-300 font-mono">
                        {s.likes.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-gray-300 font-mono">
                        {s.comments.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-emerald-400 font-mono font-semibold">
                        +{s.subscribers_gained.toLocaleString()}
                      </td>

                      <td className="p-3.5 text-purple-300 font-mono font-bold">
                        {s.engagement_rate}%
                      </td>

                      <td className="p-3.5">
                        {renderBadge(s.performance_badge)}
                      </td>

                      <td className="p-3.5 text-right">
                        <a
                          href={s.platform_url || `https://youtube.com/shorts/${s.video_id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg bg-[#0A0C10] hover:bg-[#1E2333] text-gray-400 hover:text-white inline-flex items-center"
                          title="Watch on YouTube"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: AUDIENCE INSIGHTS & GEOGRAPHY */}
      {/* ============================================================== */}
      {activeTab === 'audience' && audience && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-300">
          {/* DEMOGRAPHICS: AGE & GENDER */}
          <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Viewer Age Ranges & Demographics</span>
            </h3>

            {/* AGE BARS */}
            <div className="space-y-3">
              {audience.age_distribution.map((item) => (
                <div key={item.range} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-300">{item.range} Years Old</span>
                    <span className="font-mono text-purple-300 font-bold">{item.percentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0A0C10] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                      style={{ width: `${item.percentage * 2}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* GENDER DISTRIBUTION */}
            <div className="pt-4 border-t border-[#1C2130] space-y-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                Gender Distribution
              </span>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                  <span className="text-[11px] text-gray-400 block">Male Viewers</span>
                  <span className="text-lg font-extrabold text-blue-400 mt-0.5 block">{audience.gender_distribution.male}%</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                  <span className="text-[11px] text-gray-400 block">Female Viewers</span>
                  <span className="text-lg font-extrabold text-purple-400 mt-0.5 block">{audience.gender_distribution.female}%</span>
                </div>
                <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                  <span className="text-[11px] text-gray-400 block">Other / Unknown</span>
                  <span className="text-lg font-extrabold text-gray-400 mt-0.5 block">{audience.gender_distribution.other}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* GEOGRAPHY & RETURNING VIEWERS */}
          <div className="space-y-6">
            {/* GEOGRAPHY TABLE */}
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>Audience Geography & Top Countries</span>
              </h3>

              <div className="space-y-2.5">
                {audience.top_geographies.map((geo) => (
                  <div
                    key={geo.country_code}
                    className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-4 rounded bg-purple-900/50 text-[10px] font-bold text-purple-300 flex items-center justify-center font-mono">
                        {geo.country_code}
                      </span>
                      <span className="text-xs font-semibold text-white">{geo.country_name}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white block">{geo.percentage}%</span>
                      <span className="text-[10px] text-gray-500 font-mono">{geo.views.toLocaleString()} views</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RETURNING VS NEW & SUBSCRIBED VS NON-SUBSCRIBED */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-[#12151E] border border-[#23293A] space-y-2">
                <span className="text-xs font-semibold text-gray-400 block">New Viewers Index</span>
                <span className="text-2xl font-extrabold text-emerald-400 block">{audience.viewers_breakdown.new_viewers_pct}%</span>
                <p className="text-[10px] text-gray-500 leading-snug">{audience.viewers_breakdown.description}</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#12151E] border border-[#23293A] space-y-2">
                <span className="text-xs font-semibold text-gray-400 block">Non-Subscribed Reach</span>
                <span className="text-2xl font-extrabold text-purple-400 block">{audience.subscription_source.non_subscribed_views_pct}%</span>
                <p className="text-[10px] text-gray-500 leading-snug">{audience.subscription_source.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: CONTENT PERFORMANCE INSIGHTS & BEST TIMES */}
      {/* ============================================================== */}
      {activeTab === 'insights' && contentInsights && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* ACTIONABLE RECOMMENDATIONS STRIP */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contentInsights.actionable_recommendations.map((rec, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-[#12151E] border border-purple-500/30 space-y-2 shadow-lg relative overflow-hidden"
              >
                <div className="flex items-center gap-2 text-purple-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-extrabold uppercase tracking-wider">{rec.title}</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {rec.observation}
                </p>
                <div className="pt-2 border-t border-[#1C2130] flex items-start gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{rec.action}</span>
                </div>
              </div>
            ))}
          </div>

          {/* TOPICS & DURATION BREAKDOWNS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* TOPICS BREAKDOWN */}
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>Performance by Video Topic</span>
              </h3>
              <div className="space-y-2.5">
                {contentInsights.topic_insights.map((top) => (
                  <div
                    key={top.category}
                    className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{top.category}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {top.video_count} Shorts published • {top.avg_retention}% avg retention
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-purple-400 font-mono">
                        {top.avg_views.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 block">avg views</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DURATION SWEET SPOT */}
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Optimal Video Duration Sweet Spot</span>
              </h3>
              <div className="space-y-2.5">
                {contentInsights.duration_insights.map((dur) => (
                  <div
                    key={dur.duration_bracket}
                    className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white block">{dur.duration_bracket}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Retention Rate: {dur.avg_retention_pct}% • {dur.count} Shorts
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-blue-400 font-mono">
                        {dur.avg_views.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 block">avg views</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BEST PUBLISHING DAYS & HOURS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* BEST DAYS */}
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>Best Publishing Days for Algorithmic Lift</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {contentInsights.best_publishing_days.map((day) => (
                  <div
                    key={day.day}
                    className={`p-3 rounded-xl border text-center space-y-1 ${
                      day.rating === 'Optimal'
                        ? 'bg-purple-950/40 border-purple-500 text-white shadow-glow-purple'
                        : day.rating === 'High'
                        ? 'bg-blue-950/30 border-blue-500/40 text-gray-200'
                        : 'bg-[#0A0C10] border-[#23293A] text-gray-400'
                    }`}
                  >
                    <span className="text-xs font-bold block">{day.day}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 font-semibold block">
                      {day.rating} ({day.score})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* BEST TIMES */}
            <div className="p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Optimal Publishing Times (UTC Time Slots)</span>
              </h3>
              <div className="space-y-2">
                {contentInsights.best_publishing_times.map((slot) => (
                  <div
                    key={slot.time_slot}
                    className="p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-white">{slot.time_slot}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-purple-400 font-bold">
                        {slot.avg_views_multiplier}x views
                      </span>
                      <span className="text-[10px] text-gray-400">{slot.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: AI PERFORMANCE ASSISTANT */}
      {/* ============================================================== */}
      {activeTab === 'assistant' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
          {/* CONVERSATION AREA */}
          <div className="lg:col-span-8 p-6 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-5 shadow-xl min-h-[550px] flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-glow-purple">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">AI Shorts Performance Analyst</h3>
                  <p className="text-[11px] text-gray-400">Strictly grounded in your verified channel metrics.</p>
                </div>
              </div>
            </div>

            {/* MESSAGE BUBBLES */}
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

                    {/* CITATIONS */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-[#1C2130] flex flex-wrap gap-1.5">
                        {msg.citations.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300"
                          >
                            ✓ {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isAssistantThinking && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#0A0C10] border border-[#23293A] text-xs text-purple-300 w-48 animate-pulse">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing analytics...</span>
                </div>
              )}
            </div>

            {/* INPUT FIELD */}
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
                  placeholder="Ask why a video performed, what topic to make, or how to improve..."
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

          {/* PROMPT PILLS SIDEBAR */}
          <div className="lg:col-span-4 p-5 rounded-3xl bg-[#12151E] border border-[#23293A] space-y-4">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Recommended Inquiries</span>
            </h4>
            <div className="space-y-2">
              {[
                "Why did my top Short perform so well?",
                "Why did my OpenCV video underperform?",
                "What topics should I make next?",
                "Which of my Shorts should I replicate?",
                "What should I improve in my next upload?",
                "Which videos are gaining momentum right now?",
              ].map((pill, i) => (
                <button
                  key={i}
                  onClick={() => handleSendAssistantQuery(pill)}
                  className="w-full p-2.5 rounded-xl bg-[#0A0C10] border border-[#23293A] hover:border-purple-500 text-left text-xs text-gray-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{pill}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. MODALS: DETAILED SHORT INSPECTION MODAL */}
      {/* ============================================================== */}
      {selectedShortDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <YoutubeIcon className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white truncate max-w-md">
                  {selectedShortDetail.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedShortDetail(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* TOP METRICS STRIP */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                <span className="text-[10px] text-gray-400 block">Total Views</span>
                <span className="text-base font-extrabold text-white font-mono mt-0.5 block">{selectedShortDetail.views.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                <span className="text-[10px] text-gray-400 block">Likes</span>
                <span className="text-base font-extrabold text-white font-mono mt-0.5 block">{selectedShortDetail.likes.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                <span className="text-[10px] text-gray-400 block">Engagement</span>
                <span className="text-base font-extrabold text-purple-400 font-mono mt-0.5 block">{selectedShortDetail.engagement_rate}%</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A]">
                <span className="text-[10px] text-gray-400 block">Avg Retention</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono mt-0.5 block">{selectedShortDetail.avg_percentage_viewed}%</span>
              </div>
            </div>

            {/* RETENTION CURVE DIAGNOSTIC */}
            <div className="p-4 rounded-2xl bg-[#0A0C10] border border-[#23293A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  <span>Audience Retention Curve (0 to {selectedShortDetail.duration_seconds.toFixed(0)}s)</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  3s Hook: {selectedShortDetail.diagnostics?.hook_retention_3s}% Kept
                </span>
              </div>

              {/* RETENTION MINI BARS */}
              {selectedShortDetail.retention_curve && (
                <div className="flex items-end gap-1 h-20 pt-2 border-b border-[#1E2333]">
                  {selectedShortDetail.retention_curve.slice(0, 30).map((r, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-purple-600 to-indigo-400 rounded-t hover:bg-white transition-colors"
                      style={{ height: `${r.retention_pct}%` }}
                      title={`${r.second}s: ${r.retention_pct}%`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* DIAGNOSTIC HIGHLIGHTS */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between">
                <span className="text-gray-400">Viewer Swipe-Away Rate:</span>
                <span className="font-mono font-bold text-white">
                  {selectedShortDetail.diagnostics?.viewer_swipe_away_rate}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[#0A0C10] border border-[#23293A] flex items-center justify-between">
                <span className="text-gray-400">Primary Traffic Source:</span>
                <span className="font-mono font-bold text-purple-400">
                  {selectedShortDetail.diagnostics?.primary_traffic_source}
                </span>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center justify-between pt-3 border-t border-[#23293A]">
              <a
                href={selectedShortDetail.platform_url || `https://youtube.com/shorts/${selectedShortDetail.video_id}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                <span>Watch on YouTube</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <button
                onClick={() => setSelectedShortDetail(null)}
                className="px-4 py-2 rounded-xl bg-[#1C2130] text-gray-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODALS: ALERTS LIST DRAWER */}
      {/* ============================================================== */}
      {alertsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">Performance Milestone Alerts</h3>
              </div>
              <button
                onClick={() => setAlertsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-6">No milestone notifications right now.</p>
              ) : (
                alerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3.5 rounded-2xl bg-[#0A0C10] border border-[#23293A] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{al.title}</span>
                      <span className="text-[10px] text-gray-500 font-mono">
                        {new Date(al.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-400 leading-snug text-[11px]">{al.message}</p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 border-t border-[#23293A] flex justify-end">
              <button
                onClick={() => setAlertsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-500"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. MODALS: ALERT SETTINGS MODAL */}
      {/* ============================================================== */}
      {alertSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-[#12151E] border border-[#23293A] shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#23293A]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">Customize Performance Alert Thresholds</h3>
              </div>
              <button
                onClick={() => setAlertSettingsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1C2130]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* 1K, 10K, 100K MILESTONES */}
              <div className="space-y-2">
                <span className="font-bold text-white block">Milestone Notifications</span>
                {[
                  { key: 'milestone_1k_enabled', label: 'Alert when a Short reaches 1,000 views' },
                  { key: 'milestone_10k_enabled', label: 'Alert when a Short reaches 10,000 views' },
                  { key: 'milestone_100k_enabled', label: 'Alert when a Short reaches 100,000 views' },
                  { key: 'email_notifications_enabled', label: 'Send email notification digests' },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer text-gray-300">
                    <input
                      type="checkbox"
                      checked={Boolean((alertSettings as any)[item.key])}
                      onChange={(e) => setAlertSettings({ ...alertSettings, [item.key]: e.target.checked })}
                      className="w-4 h-4 rounded text-purple-600 bg-black border-[#23293A]"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              {/* VELOCITY THRESHOLD */}
              <div className="space-y-1">
                <label className="font-semibold text-gray-400 block">
                  High View Growth Velocity Spike Threshold (% above baseline)
                </label>
                <input
                  type="number"
                  value={alertSettings.velocity_spike_threshold_pct}
                  onChange={(e) => setAlertSettings({ ...alertSettings, velocity_spike_threshold_pct: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0C10] border border-[#23293A] text-white text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23293A]">
              <button
                onClick={() => setAlertSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#1C2130] text-gray-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAlertSettings}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md"
              >
                Save Thresholds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

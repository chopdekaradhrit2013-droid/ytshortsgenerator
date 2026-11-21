"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Project,
  GeneratedClip,
  PublishingJob,
  ConnectedChannel,
  AppSettings,
  TimelineTrack,
  AuthUser,
  SubscriptionPlan,
  UserSubscription,
  UsageSummary,
  AccountNotification
} from '@/types';
import {
  getCurrentUserApi,
  getUsageSummaryApi,
  listSubscriptionPlansApi,
  getAccountNotificationsApi,
  loginUserApi,
  registerUserApi,
  fetchChannelStatusApi,
  disconnectChannelApi
} from '@/lib/api';

// INITIAL SEED DATA
const INITIAL_PROJECTS: Project[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Future of Artificial General Intelligence Podcast",
    description: "Deep 90-minute technical discussion with top AI researchers on autonomous agency and superintelligence timelines.",
    category: "podcast",
    status: "completed",
    target_clip_count: 8,
    preferred_duration_seconds: 45,
    tags: ["AI", "Tech", "AGI", "Podcast"],
    clip_count: 3,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    thumbnail_url: "https://images.unsplash.com/photo-1589254065878-42c9da997008?w=600&auto=format&fit=crop&q=80",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    source_filename: "agi_podcast_ep42_4k.mp4",
    source_file_size_mb: 1420,
    source_duration_seconds: 5420.5
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Elden Ring DLC Boss Fights & Live Reactions",
    description: "High-intensity boss encounters with commentary, rage moments, and webcam reaction overlays.",
    category: "gaming",
    status: "processing",
    target_clip_count: 12,
    preferred_duration_seconds: 30,
    tags: ["Gaming", "EldenRing", "BossFight"],
    clip_count: 0,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 600000).toISOString(),
    thumbnail_url: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    source_filename: "shadow_erdtree_stream_part3.mp4",
    source_file_size_mb: 2800,
    source_duration_seconds: 7200.0
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Creator Economy & Monetization Secrets Masterclass",
    description: "Practical strategies for growing to 1M subscribers with high-retention short-form content.",
    category: "interview",
    status: "completed",
    target_clip_count: 6,
    preferred_duration_seconds: 50,
    tags: ["CreatorEconomy", "YouTubeShorts", "Growth"],
    clip_count: 1,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    thumbnail_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80",
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    source_filename: "monetization_masterclass.mov",
    source_file_size_mb: 950,
    source_duration_seconds: 3600.0
  }
];

const INITIAL_CLIPS: GeneratedClip[] = [
  {
    id: "c1111111-1111-1111-1111-111111111111",
    project_id: "11111111-1111-1111-1111-111111111111",
    source_video_id: "s1",
    title: "The Secret AGI Timeline Nobody Speaks About",
    summary: "Reveals inside predictions from top lab researchers on superintelligence horizons and why current public forecasts are conservative.",
    hook_sentence: "Most people think AGI is 20 years away. Here is what is actually happening behind closed doors.",
    start_time: 142.5,
    end_time: 188.0,
    duration_seconds: 45.5,
    engagement_score: 96,
    virality_reasons: [
      "Contrarian insider perspective with high initial curiosity hook",
      "Paced speech cadence with zero dead air in the first 5 seconds",
      "Strong predicted retention graph: estimated 82% view-through rate"
    ],
    tags: ["AGI", "AISecrets", "TechTrends", "Shorts"],
    aspect_ratio: "9:16",
    resolution_width: 1080,
    resolution_height: 1920,
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    status: "ready",
    captions_style: {
      fontFamily: "Inter",
      fontSize: 26,
      color: "#FFFFFF",
      highlightColor: "#FACC15",
      animation: "pop",
      position: "bottom"
    },
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: "c2222222-2222-2222-2222-222222222222",
    project_id: "11111111-1111-1111-1111-111111111111",
    source_video_id: "s1",
    title: "Why 99% Of Coding Jobs Will Evolve Into Architecture",
    summary: "Discusses how prompt engineering and agent orchestration replace repetitive coding syntax and what junior devs must learn.",
    hook_sentence: "If you are only writing syntax, you are missing the biggest shift in computing history.",
    start_time: 410.0,
    end_time: 452.2,
    duration_seconds: 42.2,
    engagement_score: 92,
    virality_reasons: [
      "Direct address to massive developer audience with emotional stakes",
      "Clear actionable takeaway for high shareability",
      "Sparks intense debate in comments section"
    ],
    tags: ["Coding", "SoftwareEngineering", "FutureOfWork", "Shorts"],
    aspect_ratio: "9:16",
    resolution_width: 1080,
    resolution_height: 1920,
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
    status: "ready",
    captions_style: {
      fontFamily: "Inter",
      fontSize: 24,
      color: "#FFFFFF",
      highlightColor: "#38BDF8",
      animation: "fade",
      position: "bottom"
    },
    created_at: new Date(Date.now() - 3600000 * 10).toISOString()
  },
  {
    id: "c3333333-3333-3333-3333-333333333333",
    project_id: "11111111-1111-1111-1111-111111111111",
    source_video_id: "s1",
    title: "The Unfiltered Truth About Autonomous AI Agents",
    summary: "Analysis of loop stability, self-correction traps, and real-world execution hurdles.",
    hook_sentence: "Most demos online are carefully staged. Here is what actually happens when agents run for 4 hours.",
    start_time: 890.0,
    end_time: 935.0,
    duration_seconds: 45.0,
    engagement_score: 88,
    virality_reasons: [
      "Exposes behind-the-scenes reality (high authenticity factor)",
      "Strong storytelling arc with continuous revelations",
      "High visual cue changes every 3.2 seconds"
    ],
    tags: ["AIAgents", "AutonomousAI", "TechReality"],
    aspect_ratio: "9:16",
    resolution_width: 1080,
    resolution_height: 1920,
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80",
    status: "ready",
    captions_style: {
      fontFamily: "Inter",
      fontSize: 26,
      color: "#FFFFFF",
      highlightColor: "#EC4899",
      animation: "pop",
      position: "bottom"
    },
    created_at: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: "c4444444-4444-4444-4444-444444444444",
    project_id: "33333333-3333-3333-3333-333333333333",
    source_video_id: "s3",
    title: "The $10K/Month YouTube Shorts Framework",
    summary: "Step-by-step breakdown of how creators build a repeatable viral pipeline converting views into sponsored brand deals.",
    hook_sentence: "Stop posting random clips. This 3-step framework turns views into predictable monthly cash flow.",
    start_time: 820.0,
    end_time: 868.5,
    duration_seconds: 48.5,
    engagement_score: 95,
    virality_reasons: [
      "Specific financial outcome hook that stops scrolling instantly",
      "Fast 3-point structure encouraging replays and bookmarks",
      "High audience demand for creator monetization tips"
    ],
    tags: ["Monetization", "CreatorEconomy", "YouTubeShorts", "Growth"],
    aspect_ratio: "9:16",
    resolution_width: 1080,
    resolution_height: 1920,
    video_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    thumbnail_url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80",
    status: "ready",
    captions_style: {
      fontFamily: "Inter",
      fontSize: 28,
      color: "#FFFFFF",
      highlightColor: "#10B981",
      animation: "pop",
      position: "bottom"
    },
    created_at: new Date(Date.now() - 86400000).toISOString()
  }
];

const INITIAL_JOBS: PublishingJob[] = [
  {
    id: "job-1",
    project_id: "11111111-1111-1111-1111-111111111111",
    clip_id: "c1111111-1111-1111-1111-111111111111",
    platform: "youtube",
    video_title: "The Secret AGI Timeline Nobody Speaks About #Shorts",
    video_description: "Top AI lab insiders discuss what is actually being built right now behind closed doors.\n\n#Shorts #AGI #Tech #ArtificialIntelligence #Future",
    tags: ["Shorts", "AGI", "AI", "Tech", "Future"],
    visibility: "public",
    published_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "published",
    progress_percentage: 100,
    platform_video_id: "dQw4w9WgXcQ",
    platform_url: "https://youtube.com/shorts/dQw4w9WgXcQ",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: "job-2",
    project_id: "11111111-1111-1111-1111-111111111111",
    clip_id: "c2222222-2222-2222-2222-222222222222",
    platform: "youtube",
    video_title: "Why 99% Of Coding Jobs Will Evolve Into Architecture #Shorts",
    video_description: "Stop memorizing syntax and start orchestrating intelligent agent systems.\n\n#Shorts #Coding #SoftwareEngineering #TechCareer",
    tags: ["Shorts", "Coding", "SoftwareEngineering", "AI"],
    visibility: "public",
    status: "waiting",
    progress_percentage: 0,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

const INITIAL_SETTINGS: AppSettings = {
  profile: {
    name: "Adhrit Chopdekar",
    email: "adhrit@shortsfactory.io",
    avatar: "",
    role: "Creator Pro Plan",
    storage_used_bytes: 5410000000,
    storage_limit_bytes: 10737418240
  },
  youtube_account: {
    channel_name: "",
    channel_id: "",
    subscribers: 0,
    auto_publish_approved: false,
    default_visibility: "public",
    default_tags: "Shorts, AI, Viral, Tech"
  },
  editing_preferences: {
    default_aspect_ratio: "9:16",
    default_clip_duration: 45,
    default_target_clips: 8,
    auto_silence_removal: true,
    background_music_ducking: true
  },
  caption_style: {
    preset: "hormozi",
    font_family: "Inter",
    font_size: 26,
    primary_color: "#FFFFFF",
    highlight_color: "#FACC15",
    animation: "pop",
    casing: "UPPERCASE"
  },
  export_settings: {
    resolution: "1080x1920 (Full HD)",
    framerate: 60,
    codec: "H.264 (libx264)",
    bitrate: "12 Mbps",
    audio_bitrate: "192 kbps"
  },
  storage: {
    used_bytes: 5410000000,
    limit_bytes: 10737418240,
    auto_cleanup_days: 30
  },
  app_preferences: {
    theme: "dark",
    sound_effects: true,
    auto_save_interval_sec: 10
  }
};

interface AppContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  addProject: (projectData: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  clips: GeneratedClip[];
  activeClip: GeneratedClip | null;
  setActiveClip: (clip: GeneratedClip | null) => void;
  addClips: (newClips: GeneratedClip[]) => void;
  updateClip: (id: string, updates: Partial<GeneratedClip>) => void;
  
  publishingJobs: PublishingJob[];
  addPublishingJob: (jobData: Partial<PublishingJob>) => PublishingJob;
  startUploadJob: (id: string) => void;
  startAllUploads: () => void;
  retryJob: (id: string) => void;
  
  connectedChannel: ConnectedChannel;
  toggleChannelConnection: () => void;
  refreshConnectedChannel: () => Promise<void>;
  
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  studioTracks: TimelineTrack[];
  setStudioTracks: React.Dispatch<React.SetStateAction<TimelineTrack[]>>;
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  activeStudioTool: string;
  setActiveStudioTool: (tool: string) => void;
  
  notifications: Array<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>;
  addNotification: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissNotification: (id: string) => void;

  // Prompt 13: SaaS Auth, Subscription & Usage Management
  user: AuthUser | null;
  subscription: UserSubscription | null;
  usageSummary: UsageSummary | null;
  plans: SubscriptionPlan[];
  accountNotifications: AccountNotification[];
  refreshAuthData: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  register: (payload: { email: string; password: string; full_name: string; username?: string }) => Promise<{ success: boolean; error?: string; verification_token?: string }>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<Project | null>(INITIAL_PROJECTS[0]);
  const [clips, setClips] = useState<GeneratedClip[]>(INITIAL_CLIPS);
  const [activeClip, setActiveClip] = useState<GeneratedClip | null>(INITIAL_CLIPS[0]);
  const [publishingJobs, setPublishingJobs] = useState<PublishingJob[]>(INITIAL_JOBS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activeStudioTool, setActiveStudioTool] = useState<string>("select");
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>>([]);

  const [connectedChannel, setConnectedChannel] = useState<ConnectedChannel>({
    connected: false,
    channel_name: "",
    channel_id: "",
    subscribers: 0,
    avatar_url: "",
    last_synced: "Never"
  });

  const refreshConnectedChannel = useCallback(async () => {
    try {
      const ch = await fetchChannelStatusApi();
      if (ch && ch.connected) {
        setConnectedChannel({
          connected: true,
          channel_name: ch.channel_name,
          channel_id: ch.channel_id,
          subscribers: ch.subscribers,
          avatar_url: ch.avatar_url,
          last_synced: "Just now"
        });
      } else {
        setConnectedChannel({
          connected: false,
          channel_name: "",
          channel_id: "",
          subscribers: 0,
          avatar_url: "",
          last_synced: "Never"
        });
      }
    } catch (e) {
      console.warn("Failed to refresh channel status", e);
    }
  }, []);

  // Prompt 13: SaaS Multi-User Auth, Subscriptions & Usage States
  const [user, setUser] = useState<AuthUser | null>({
    id: "usr_default_alex",
    email: "adhrit@shortsfactory.io",
    full_name: "Adhrit Chopdekar",
    username: "adhrit",
    avatar_url: undefined,
    is_verified: true,
    role: "creator",
    plan_id: "plan_pro",
    plan_slug: "pro",
    plan_name: "Viral Agency / Pro",
    subscription_status: "active",
    onboarding_completed: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString()
  });

  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [accountNotifications, setAccountNotifications] = useState<AccountNotification[]>([]);

  const refreshAuthData = useCallback(async () => {
    try {
      const [u, usg, pls, notifs] = await Promise.all([
        getCurrentUserApi().catch(() => null),
        getUsageSummaryApi().catch(() => null),
        listSubscriptionPlansApi().catch(() => []),
        getAccountNotificationsApi().catch(() => [])
      ]);

      if (u) {
        setUser(prev => ({
          ...(prev || {}),
          ...u,
          plan_slug: u.subscription?.plan_slug || prev?.plan_slug || "pro",
          plan_name: u.subscription?.plan_name || prev?.plan_name || "Pro"
        }));
        if (u.subscription) {
          setSubscription(u.subscription);
        }
      }

      if (usg) {
        setUsageSummary(usg);
      }

      if (pls && pls.length > 0) {
        setPlans(pls);
      }

      if (notifs) {
        setAccountNotifications(notifs);
      }
    } catch {
      // Background refresh fallback
    }
  }, []);

  useEffect(() => {
    refreshAuthData();
    refreshConnectedChannel();
  }, [refreshAuthData, refreshConnectedChannel]);

  const login = async (email: string, password: string) => {
    try {
      const res = await loginUserApi({ email, password });
      if (res.user && res.user.access_token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem("asf_access_token", res.user.access_token);
        }
        setUser(res.user);
        addNotification("Welcome Back!", `Signed in as ${res.user.full_name}`, "success");
        await refreshAuthData();
        return { success: true, user: res.user };
      }
      return { success: false, error: res.message || "Login failed." };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to sign in." };
    }
  };

  const register = async (payload: { email: string; password: string; full_name: string; username?: string }) => {
    try {
      const res = await registerUserApi(payload);
      if (res.user && res.user.access_token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem("asf_access_token", res.user.access_token);
        }
        setUser(res.user);
        addNotification("Account Created", "Welcome to AI Shorts Factory! Check email to verify.", "success");
        await refreshAuthData();
        return { success: true, verification_token: res.user.verification_token };
      }
      return { success: false, error: res.message || "Registration failed." };
    } catch (err: any) {
      return { success: false, error: err.message || "Registration failed." };
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("asf_access_token");
    }
    addNotification("Logged Out", "You have been securely signed out.", "info");
    // Revert to demo mode
    setUser({
      id: "usr_default_alex",
      email: "adhrit@shortsfactory.io",
      full_name: "Adhrit Chopdekar",
      username: "adhrit",
      avatar_url: undefined,
      is_verified: true,
      role: "creator",
      plan_id: "plan_pro",
      plan_slug: "pro",
      plan_name: "Viral Agency / Pro",
      subscription_status: "active",
      onboarding_completed: true,
      created_at: new Date().toISOString()
    });
    refreshAuthData();
  };

  const [studioTracks, setStudioTracks] = useState<TimelineTrack[]>([
    {
      id: "v-track",
      type: "video",
      name: "Video Track (9:16)",
      muted: false,
      locked: false,
      items: [
        {
          id: "v-item-1",
          title: "AI Moment - Segment 1",
          start_time: 0,
          end_time: 45.5,
          source_start: 142.5,
          source_end: 188.0,
          color: "bg-purple-900/60 border-purple-500",
          properties: { opacity: 100, scale: 100, crop: "center" }
        }
      ]
    },
    {
      id: "a-track",
      type: "audio",
      name: "Voice & Speech Track",
      muted: false,
      locked: false,
      items: [
        {
          id: "a-item-1",
          title: "Cleaned Audio (Denoised)",
          start_time: 0,
          end_time: 45.5,
          source_start: 142.5,
          source_end: 188.0,
          color: "bg-blue-900/60 border-blue-500",
          properties: { volume: 100, denoise: true }
        }
      ]
    },
    {
      id: "t-track",
      type: "text",
      name: "Viral Captions",
      muted: false,
      locked: false,
      items: [
        {
          id: "t-item-1",
          title: "Hook: Most people think...",
          start_time: 0,
          end_time: 5.2,
          source_start: 0,
          source_end: 5.2,
          color: "bg-amber-900/60 border-amber-500",
          text_content: "Most people think AGI is 20 years away...",
          properties: { font: "Inter", size: 26, color: "#FFFFFF", highlight: "#FACC15" }
        },
        {
          id: "t-item-2",
          title: "Body: Behind closed doors",
          start_time: 5.2,
          end_time: 22.0,
          source_start: 5.2,
          source_end: 22.0,
          color: "bg-amber-900/60 border-amber-500",
          text_content: "Here is what top researchers are really saying behind closed doors.",
          properties: { font: "Inter", size: 26, color: "#FFFFFF", highlight: "#38BDF8" }
        },
        {
          id: "t-item-3",
          title: "Climax: Autonomous Agency",
          start_time: 22.0,
          end_time: 45.5,
          source_start: 22.0,
          source_end: 45.5,
          color: "bg-amber-900/60 border-amber-500",
          text_content: "The real leap isn't text. It is autonomous computer operation.",
          properties: { font: "Inter", size: 26, color: "#FFFFFF", highlight: "#EC4899" }
        }
      ]
    }
  ]);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const storedProjects = localStorage.getItem('asf_projects');
        if (storedProjects) setProjects(JSON.parse(storedProjects));
        
        const storedClips = localStorage.getItem('asf_clips');
        if (storedClips) setClips(JSON.parse(storedClips));

        const storedJobs = localStorage.getItem('asf_jobs');
        if (storedJobs) setPublishingJobs(JSON.parse(storedJobs));
      } catch (err) {
        console.error("Failed to load state from localStorage:", err);
      }
    }
  }, []);

  // Save to localStorage when state updates
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('asf_projects', JSON.stringify(projects));
        localStorage.setItem('asf_clips', JSON.stringify(clips));
        localStorage.setItem('asf_jobs', JSON.stringify(publishingJobs));
      } catch (err) {
        console.error("Failed to persist state:", err);
      }
    }
  }, [projects, clips, publishingJobs]);

  const addNotification = (title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type }, ...prev].slice(0, 5));
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4500);
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const addProject = (projectData: Partial<Project>): Project => {
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: projectData.name || "Untitled Video Project",
      description: projectData.description || "",
      category: projectData.category || "automatic",
      status: "analysing",
      target_clip_count: projectData.target_clip_count || 8,
      preferred_duration_seconds: projectData.preferred_duration_seconds || 45,
      tags: projectData.tags || ["Shorts"],
      clip_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      thumbnail_url: projectData.thumbnail_url || "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&auto=format&fit=crop&q=80",
      video_url: projectData.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      source_filename: projectData.source_filename || "source_upload.mp4",
      source_file_size_mb: projectData.source_file_size_mb || 240,
      source_duration_seconds: projectData.source_duration_seconds || 1800
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProject(newProject);
    addNotification("Project Created", `"${newProject.name}" has been uploaded and queued for AI analysis.`, "success");

    // Simulate AI pipeline progression in background
    setTimeout(() => {
      setProjects(prev => prev.map(p => p.id === newProject.id ? { ...p, status: "processing" } : p));
    }, 4000);

    setTimeout(() => {
      // Auto-generate clips for this new project
      const generated: GeneratedClip[] = [
        {
          id: `clip-${Date.now()}-1`,
          project_id: newProject.id,
          source_video_id: `src-${newProject.id}`,
          title: `Must-Watch Insight: ${newProject.name.slice(0, 30)}`,
          summary: "AI isolated the highest emotional energy peak with exceptional hook clarity.",
          hook_sentence: "If you only watch one minute of this video, make it this one.",
          start_time: 15.0,
          end_time: 58.0,
          duration_seconds: 43.0,
          engagement_score: 94,
          virality_reasons: ["Instant visual pattern interrupt", "Direct value assertion in 3 seconds", "High viral retention probability"],
          tags: ["Shorts", "Viral", newProject.category],
          aspect_ratio: "9:16",
          resolution_width: 1080,
          resolution_height: 1920,
          video_url: newProject.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          thumbnail_url: newProject.thumbnail_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
          status: "ready",
          captions_style: {
            fontFamily: "Inter",
            fontSize: 26,
            color: "#FFFFFF",
            highlightColor: "#FACC15",
            animation: "pop",
            position: "bottom"
          },
          created_at: new Date().toISOString()
        },
        {
          id: `clip-${Date.now()}-2`,
          project_id: newProject.id,
          source_video_id: `src-${newProject.id}`,
          title: `The Surprising Reality Revealed`,
          summary: "Key contrarian perspective that will stimulate viewer debate and high comment count.",
          hook_sentence: "You have probably been taught this wrong the entire time.",
          start_time: 90.0,
          end_time: 132.5,
          duration_seconds: 42.5,
          engagement_score: 91,
          virality_reasons: ["Contrarian myth-buster angle", "Rapid speech pace", "Dynamic text highlight sync"],
          tags: ["Shorts", "Insights", "Growth"],
          aspect_ratio: "9:16",
          resolution_width: 1080,
          resolution_height: 1920,
          video_url: newProject.video_url || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          thumbnail_url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80",
          status: "ready",
          captions_style: {
            fontFamily: "Inter",
            fontSize: 26,
            color: "#FFFFFF",
            highlightColor: "#38BDF8",
            animation: "pop",
            position: "bottom"
          },
          created_at: new Date().toISOString()
        }
      ];

      setClips(prev => [...generated, ...prev]);
      setProjects(prev => prev.map(p => p.id === newProject.id ? { ...p, status: "completed", clip_count: generated.length } : p));
      addNotification("AI Analysis Complete", `Generated ${generated.length} viral Short candidates ready for review.`, "success");
    }, 8000);

    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
    if (activeProject && activeProject.id === id) {
      setActiveProject(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    setClips(prev => prev.filter(c => c.project_id !== id));
    if (activeProject && activeProject.id === id) {
      setActiveProject(projects.find(p => p.id !== id) || null);
    }
    addNotification("Project Deleted", "Project and associated clips have been removed.", "info");
  };

  const addClips = (newClips: GeneratedClip[]) => {
    setClips(prev => [...newClips, ...prev]);
  };

  const updateClip = (id: string, updates: Partial<GeneratedClip>) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (activeClip && activeClip.id === id) {
      setActiveClip(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addPublishingJob = (jobData: Partial<PublishingJob>): PublishingJob => {
    const newJob: PublishingJob = {
      id: `job-${Date.now()}`,
      project_id: jobData.project_id || activeProject?.id || "",
      clip_id: jobData.clip_id || "",
      platform: "youtube",
      video_title: jobData.video_title || "New YouTube Short #Shorts",
      video_description: jobData.video_description || "Generated with AI Shorts Factory #Shorts",
      tags: jobData.tags || ["Shorts", "Viral"],
      visibility: jobData.visibility || "public",
      status: "waiting",
      progress_percentage: 0,
      created_at: new Date().toISOString()
    };
    setPublishingJobs(prev => [newJob, ...prev]);
    addNotification("Added to Publish Queue", `"${newJob.video_title}" is ready to upload.`, "info");
    return newJob;
  };

  const startUploadJob = (id: string) => {
    setPublishingJobs(prev => prev.map(j => j.id === id ? { ...j, status: "uploading", progress_percentage: 20 } : j));
    
    // Simulate real upload sequence with progressive updates
    setTimeout(() => {
      setPublishingJobs(prev => prev.map(j => j.id === id ? { ...j, progress_percentage: 65, status: "uploading" } : j));
    }, 1500);

    setTimeout(() => {
      setPublishingJobs(prev => prev.map(j => j.id === id ? { ...j, progress_percentage: 90, status: "processing" } : j));
    }, 3000);

    setTimeout(() => {
      const vidId = Math.random().toString(36).substring(2, 10);
      setPublishingJobs(prev => prev.map(j => j.id === id ? {
        ...j,
        status: "published",
        progress_percentage: 100,
        platform_video_id: vidId,
        platform_url: `https://youtube.com/shorts/${vidId}`,
        published_at: new Date().toISOString()
      } : j));
      addNotification("Short Published!", "Video successfully uploaded to your YouTube channel.", "success");
    }, 4500);
  };

  const startAllUploads = () => {
    const waitingJobs = publishingJobs.filter(j => j.status === "waiting");
    if (waitingJobs.length === 0) {
      addNotification("No Pending Jobs", "All selected Shorts have already been uploaded.", "info");
      return;
    }
    
    waitingJobs.forEach((job, index) => {
      setTimeout(() => {
        startUploadJob(job.id);
      }, index * 2000);
    });

    addNotification("Batch Upload Started", `Uploading ${waitingJobs.length} Shorts sequentially to YouTube.`, "info");
  };

  const retryJob = (id: string) => {
    startUploadJob(id);
  };

  const toggleChannelConnection = async () => {
    try {
      if (connectedChannel.connected) {
        await disconnectChannelApi();
        setConnectedChannel({
          connected: false,
          channel_name: "",
          channel_id: "",
          subscribers: 0,
          avatar_url: "",
          last_synced: "Never"
        });
        addNotification("YouTube Channel Disconnected", "Account unlinked safely.", "info");
      }
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to disconnect channel", "error");
    }
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    addNotification("Settings Saved", "Your application preferences have been updated.", "success");
  };

  return (
    <AppContext.Provider
      value={{
        projects,
        activeProject,
        setActiveProject,
        addProject,
        updateProject,
        deleteProject,
        clips,
        activeClip,
        setActiveClip,
        addClips,
        updateClip,
        publishingJobs,
        addPublishingJob,
        startUploadJob,
        startAllUploads,
        retryJob,
        connectedChannel,
        toggleChannelConnection,
        refreshConnectedChannel,
        settings,
        updateSettings,
        sidebarCollapsed,
        setSidebarCollapsed,
        studioTracks,
        setStudioTracks,
        currentTime,
        setCurrentTime,
        isPlaying,
        setIsPlaying,
        activeStudioTool,
        setActiveStudioTool,
        notifications,
        addNotification,
        dismissNotification,
        user,
        subscription,
        usageSummary,
        plans,
        accountNotifications,
        refreshAuthData,
        login,
        register,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}


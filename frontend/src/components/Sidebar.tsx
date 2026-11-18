"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  FolderKanban,
  Sparkles,
  Scissors,
  Share2,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
  CheckCircle2,
  Film,
  CheckSquare,
  BarChart3,
  BrainCircuit,
  Image as ImageIcon,
  User,
  CreditCard,
  LogOut,
  Zap,
  ShieldAlert
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';

export default function Sidebar() {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    connectedChannel,
    toggleChannelConnection,
    settings,
    user,
    subscription,
    logout
  } = useApp();

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Create Project", href: "/projects/create", icon: PlusCircle, highlight: true },
    { name: "My Projects", href: "/projects", icon: FolderKanban },
    { name: "AI Clip Generator", href: "/generator", icon: Sparkles },
    { name: "Review Studio", href: "/review", icon: CheckSquare, badge: "Review" },
    { name: "Studio", href: "/studio", icon: Scissors, badge: "Editor" },
    { name: "Thumbnails", href: "/thumbnails", icon: ImageIcon, badge: "Design" },
    { name: "Publishing Centre", href: "/publishing", icon: Share2 },
    { name: "Analytics & Insights", href: "/analytics", icon: BarChart3, badge: "Live" },
    { name: "Content Intelligence", href: "/intelligence", icon: BrainCircuit, badge: "AI Hub" },
    { name: "Account Dashboard", href: "/account", icon: User, badge: "SaaS" },
    { name: "Pricing & Plans", href: "/pricing", icon: Sparkles, badge: "Upgrade" },
    { name: "Billing & Invoices", href: "/billing", icon: CreditCard },
    { name: "Upload History", href: "/history", icon: History },
    { name: "Settings", href: "/settings", icon: Settings },
    ...(user && ['super_admin', 'admin', 'support_agent'].includes(user.role)
      ? [{ name: "Super Admin", href: "/admin", icon: ShieldAlert, badge: "Staff" }]
      : [])
  ];

  if (pathname.startsWith('/admin')) {
    return null;
  }

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 bg-[#0E1118] border-r border-[#1E2333] transition-all duration-300 flex flex-col justify-between select-none ${
        sidebarCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* TOP BRAND HEADER */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-[#1E2333]">
          {!sidebarCollapsed ? (
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-glow-purple group-hover:scale-105 transition-transform">
                <Film className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                  AI Shorts <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">PRO</span>
                </span>
                <span className="text-[11px] text-gray-400 font-medium tracking-wide uppercase">
                  Production Studio
                </span>
              </div>
            </Link>
          ) : (
            <Link href="/" className="mx-auto">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-glow-purple">
                <Film className="w-5 h-5 text-white" />
              </div>
            </Link>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A1F2E] transition-colors"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/20 to-blue-600/10 text-white border border-purple-500/30 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-[#151926]'
                } ${item.highlight && !isActive ? 'border border-dashed border-purple-500/40 text-purple-300 hover:bg-purple-950/20' : ''}`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive
                      ? 'text-purple-400'
                      : item.highlight
                      ? 'text-purple-400'
                      : 'text-gray-400 group-hover:text-white'
                  }`}
                />
                
                {!sidebarCollapsed && (
                  <span className="flex-1 truncate tracking-tight">{item.name}</span>
                )}

                {!sidebarCollapsed && item.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {item.badge}
                  </span>
                )}

                {/* Left Active Glow Indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-purple-500 to-blue-500 rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM SECTION: YOUTUBE STATUS, PROFILE, VERSION */}
      <div className="p-3 border-t border-[#1E2333] space-y-3 bg-[#0A0D14]">
        {/* YOUTUBE CHANNEL STATUS BADGE */}
        {!sidebarCollapsed ? (
          <div className="p-2.5 rounded-xl bg-[#131722] border border-[#222838] flex items-center justify-between group">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center">
                  <YoutubeIcon className="w-4 h-4 text-red-500" />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#131722] ${
                    connectedChannel.connected ? 'bg-emerald-500' : 'bg-gray-500'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white truncate">
                    {connectedChannel.connected ? connectedChannel.channel_name : "Not Connected"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate">
                  {connectedChannel.connected
                    ? `${(connectedChannel.subscribers / 1000).toFixed(1)}k subs`
                    : "Click to link channel"}
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleChannelConnection}
              className={`p-1 rounded-lg text-xs transition-colors ${
                connectedChannel.connected
                  ? 'text-gray-400 hover:text-red-400 hover:bg-red-500/10'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/10'
              }`}
              title={connectedChannel.connected ? "Disconnect Channel" : "Connect YouTube Account"}
            >
              {connectedChannel.connected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Radio className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={toggleChannelConnection}
              className="w-10 h-10 rounded-xl bg-[#131722] border border-[#222838] flex items-center justify-center relative hover:bg-[#1A202F] transition-colors"
              title={connectedChannel.connected ? `Connected: ${connectedChannel.channel_name}` : "Connect YouTube"}
            >
              <YoutubeIcon className="w-5 h-5 text-red-500" />
              <span
                className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                  connectedChannel.connected ? 'bg-emerald-500' : 'bg-gray-500'
                }`}
              />
            </button>
          </div>
        )}

        {/* USER PROFILE */}
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[#131722] border border-[#222838] group">
            <Link href="/account" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity">
              <img
                src={user?.avatar_url || settings.profile.avatar}
                alt={user?.full_name || settings.profile.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/30"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.full_name || settings.profile.name}</p>
                <p className="text-[10px] text-purple-400 font-bold uppercase truncate">{subscription?.plan_name || user?.plan_name || "Creator Pro"}</p>
              </div>
            </Link>

            <button
              onClick={logout}
              className="p-1 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <Link href="/account">
              <img
                src={user?.avatar_url || settings.profile.avatar}
                alt={user?.full_name || settings.profile.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-500/30 hover:scale-105 transition-transform"
                title={`${user?.full_name || settings.profile.name} (${user?.plan_name || "Creator Pro"})`}
              />
            </Link>
          </div>
        )}

        {/* APP VERSION */}
        {!sidebarCollapsed && (
          <div className="text-center pt-1">
            <span className="text-[10px] text-gray-500 font-mono tracking-wider">
              v1.0.0-PRO • AI ENGINE ACTIVE
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

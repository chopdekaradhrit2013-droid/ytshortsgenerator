"use client";

import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  ExternalLink,
  Eye,
  ThumbsUp,
  MessageSquare,
  Search,
  Filter,
  Calendar
} from 'lucide-react';
import YoutubeIcon from '@/components/YoutubeIcon';
import { useApp } from '@/context/AppContext';

export default function UploadHistoryPage() {
  const { publishingJobs, connectedChannel } = useApp();
  const [searchQuery, setSearchQuery] = useState("");

  const historyItems = [
    {
      id: "h-1",
      title: "The Secret AGI Timeline Nobody Speaks About #Shorts",
      published_at: "2 days ago",
      views: "18.4K",
      likes: "1.2K",
      comments: "142",
      platform_url: "https://youtube.com/shorts/dQw4w9WgXcQ",
      status: "published",
      thumbnail: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80"
    },
    {
      id: "h-2",
      title: "The $10K/Month YouTube Shorts Framework #Shorts",
      published_at: "5 days ago",
      views: "42.1K",
      likes: "3.8K",
      comments: "389",
      platform_url: "https://youtube.com/shorts/dQw4w9WgXcQ",
      status: "published",
      thumbnail: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop&q=80"
    },
    {
      id: "h-3",
      title: "Why 99% Of Coding Jobs Will Evolve Into Architecture #Shorts",
      published_at: "1 week ago",
      views: "29.7K",
      likes: "2.1K",
      comments: "254",
      platform_url: "https://youtube.com/shorts/dQw4w9WgXcQ",
      status: "published",
      thumbnail: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=80"
    }
  ];

  const filteredHistory = historyItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2333]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <History className="w-6 h-6 text-purple-400" />
            <span>Upload History & Analytics</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Chronological audit log of all YouTube Shorts published from AI Shorts Factory.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12151E] border border-[#23293A] text-xs text-gray-300">
          <YoutubeIcon className="w-4 h-4 text-red-500" />
          <span>{connectedChannel.channel_name}</span>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="p-3 rounded-2xl bg-[#12151E] border border-[#23293A] flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-500 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search published Shorts by title..."
          className="w-full bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none"
        />
      </div>

      {/* HISTORY TABLE / CARDS */}
      <div className="rounded-2xl bg-[#12151E] border border-[#23293A] overflow-hidden divide-y divide-[#1C2130]">
        {filteredHistory.map((item) => (
          <div
            key={item.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#161B27] transition-colors"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-24 rounded-xl overflow-hidden bg-black flex-shrink-0 relative border border-white/10">
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Published</span>
                  </span>
                  <span className="text-[11px] text-gray-400">{item.published_at}</span>
                </div>

                <h3 className="font-bold text-white text-sm truncate max-w-xl">
                  {item.title}
                </h3>

                {/* YOUTUBE LIVE METRICS */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                    <strong className="text-white">{item.views}</strong> views
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-purple-400" />
                    <strong className="text-white">{item.likes}</strong> likes
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    <strong className="text-white">{item.comments}</strong> comments
                  </span>
                </div>
              </div>
            </div>

            <div className="self-end sm:self-auto">
              <a
                href={item.platform_url}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#1C2130] hover:bg-[#252C40] text-gray-200 text-xs font-semibold flex items-center gap-2 transition-colors border border-[#283145]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                <span>Open On YouTube</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

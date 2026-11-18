"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sidebarCollapsed } = useApp();

  if (pathname.startsWith('/admin')) {
    return <div className="flex-1 min-h-screen bg-[#07090E]">{children}</div>;
  }

  return (
    <main
      className={`flex-1 min-h-screen pt-16 transition-all duration-300 ${
        sidebarCollapsed ? 'ml-20' : 'ml-64'
      }`}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {children}
      </div>
    </main>
  );
}


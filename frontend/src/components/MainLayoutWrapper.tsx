"use client";

import React from 'react';
import { useApp } from '@/context/AppContext';

export default function MainLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useApp();

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

"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Lock,
  Mail,
  ArrowRight,
  RotateCw,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

function AdminLoginForm() {
  const router = useRouter();
  const { login, addNotification } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdminLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await login(loginEmail, loginPass);
      if (res.success && res.user) {
        if (!['super_admin', 'admin', 'support_agent'].includes(res.user.role)) {
          setError(`Access denied. Account '${res.user.email}' has standard '${res.user.role}' permissions.`);
          setLoading(false);
          return;
        }
        addNotification("Admin Session Initialized", `Authenticated as ${res.user.role.toUpperCase()}`, "success");
        router.push('/admin');
      } else {
        setError(res.error || "Authentication failed. Check credentials.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during administrative login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAdminLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#07090E] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-2xl bg-[#0E121B] border border-[#1C2337] space-y-6 shadow-2xl relative">
        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* HEADER */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-purple-600/30">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight uppercase">Admin Control Center</h1>
          <p className="text-xs text-gray-400">
            Administrative portal for SaaS operations, user management, and AI pipelines.
          </p>
        </div>

        {/* ERROR ALERT */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 flex items-start gap-2.5 text-red-300 text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 block">Staff Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@shortsfactory.io"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141A28] border border-[#242C44] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#141A28] border border-[#242C44] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Authenticating Staff...</span>
              </>
            ) : (
              <>
                <span>Access Admin Control</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* QUICK 1-CLICK DEMO BUTTONS */}
        <div className="pt-2 border-t border-[#1C2337] space-y-2">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider text-center">
            Development Quick Fill
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@shortsfactory.io");
                setPassword("SuperAdmin2026!");
                handleAdminLogin("admin@shortsfactory.io", "SuperAdmin2026!");
              }}
              className="p-2.5 rounded-xl bg-[#131926] hover:bg-[#1A2234] border border-[#202940] text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Super Admin</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">admin@shortsfactory.io</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("support@shortsfactory.io");
                setPassword("SupportAgent2026!");
                handleAdminLogin("support@shortsfactory.io", "SupportAgent2026!");
              }}
              className="p-2.5 rounded-xl bg-[#131926] hover:bg-[#1A2234] border border-[#202940] text-left transition-colors"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Support Agent</span>
              </div>
              <p className="text-[10px] text-gray-500 truncate mt-0.5">support@shortsfactory.io</p>
            </button>
          </div>
        </div>

        {/* RETURN */}
        <div className="text-center">
          <Link href="/account" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            ← Return to Creator Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#07090E] flex items-center justify-center text-gray-500 text-xs">Loading admin portal...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}


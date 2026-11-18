"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Gift
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function SignUpPage() {
  const router = useRouter();
  const { register } = useApp();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password strength logic
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strengthScore = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email || !password) {
      setError("Please complete all required fields.");
      return;
    }

    if (!agreeTerms) {
      setError("Please agree to the Terms of Service & Privacy Policy.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const res = await register({
      email,
      password,
      full_name: fullName,
      username: username || undefined
    });
    setLoading(false);

    if (res.success) {
      if (res.verification_token) {
        router.push(`/verify-email?token=${res.verification_token}&email=${encodeURIComponent(email)}`);
      } else {
        router.push('/onboarding');
      }
    } else {
      setError(res.error || "Registration could not be completed.");
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* LOGO & HEADING */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 shadow-xl shadow-purple-600/30 mb-2">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Create your creator account
          </h1>
          <p className="text-xs text-gray-400">
            Start on the Free Starter plan with 15 processing minutes and AI subtitles
          </p>
        </div>

        {/* FREE PLAN PERKS BADGE */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-300">
          <Gift className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Includes 15 min free video processing, 10 AI Shorts & full studio editor.</span>
        </div>

        {/* ERROR ALERT */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* FORM CONTAINER */}
        <div className="bg-[#12151E] border border-[#202638] rounded-2xl p-6 shadow-2xl space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* FULL NAME */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jordan Lee"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* EMAIL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@creatorstudio.io"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* USERNAME */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Username (Optional)</label>
              <div className="relative">
                <span className="text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="jordanlee"
                  className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs placeholder:text-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* PASSWORD STRENGTH BAR */}
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="flex gap-1 h-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`flex-1 rounded-full transition-colors ${
                          strengthScore >= lvl
                            ? strengthScore <= 2
                              ? 'bg-rose-500'
                              : strengthScore <= 3
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-[#1C2234]'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-500 text-right">
                    {strengthScore <= 2 ? 'Weak' : strengthScore <= 3 ? 'Medium' : 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            {/* TERMS & CONDITIONS */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-3.5 h-3.5 mt-0.5 rounded bg-[#0B0D14] border-[#2A3146] text-purple-600 focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-[11px] text-gray-400 leading-tight">
                  I agree to the Terms of Service and Privacy Policy. All video processing and publishing strictly adheres to YouTube API policies.
                </span>
              </label>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* FOOTER SIGN IN LINK */}
        <p className="text-center text-xs text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}


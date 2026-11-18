"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  MailCheck,
  RotateCw,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { verifyEmailApi } from '@/lib/api';
import { useApp } from '@/context/AppContext';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const { refreshAuthData, addNotification } = useApp();

  const [token, setToken] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (tok: string) => {
    if (!tok.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await verifyEmailApi(tok.trim());
      if (res.status === 'success') {
        setVerified(true);
        addNotification("Email Verified", "Your creator account has been activated!", "success");
        await refreshAuthData();
      } else {
        setError(res.message || "Invalid verification token.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify email.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      handleVerify(tokenParam);
    }
  }, [tokenParam]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md bg-[#12151E] border border-[#202638] rounded-2xl p-7 shadow-2xl text-center space-y-6">
        {verified ? (
          <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Email Verified Successfully!</h2>
              <p className="text-xs text-gray-400">
                Your email has been confirmed. You now have full access to the AI Shorts Factory workspace.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Free Starter plan activated with 15 mins video quota.</span>
            </div>

            <div className="pt-2">
              <Link
                href="/onboarding"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <span>Continue to Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="w-16 h-16 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 mx-auto flex items-center justify-center shadow-lg shadow-purple-500/15">
              <MailCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white tracking-tight">Verify Your Email Address</h2>
              <p className="text-xs text-gray-400">
                {emailParam ? (
                  <>We sent a verification confirmation code to <span className="text-white font-semibold">{emailParam}</span>.</>
                ) : (
                  "Please enter the verification code or token dispatched to your email."
                )}
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300 text-left">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-3 pt-1">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter verification token (e.g. vtok_...)"
                className="w-full px-4 py-2.5 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs placeholder:text-gray-600 text-center font-mono focus:outline-none focus:border-purple-500 transition-colors"
              />

              <button
                type="button"
                onClick={() => handleVerify(token)}
                disabled={loading || !token.trim()}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Verification</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 text-[11px] text-gray-500">
              Already verified?{' '}
              <Link href="/login" className="text-purple-400 hover:underline">
                Sign in to your account
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0B0D13] flex items-center justify-center text-gray-500 text-xs">Verifying token...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}


"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  Sparkles,
  Zap,
  Shield,
  ShieldCheck,
  CreditCard,
  Lock,
  ArrowRight,
  HelpCircle,
  RotateCw,
  X,
  CheckCircle2,
  Crown
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { createCheckoutSessionApi, confirmPaymentApi } from '@/lib/api';

const FAQS = [
  {
    q: "Can I upgrade or downgrade my plan at any time?",
    a: "Yes! Upgrades take effect immediately with prorated credits and expanded limits. Downgrades apply at the end of your current billing cycle so you never lose unused processing time."
  },
  {
    q: "How are video processing minutes counted?",
    a: "Minutes are calculated based on the actual duration of the source long-form videos you upload for highlight hunting. For example, uploading a 30-minute podcast consumes 30 minutes from your monthly quota."
  },
  {
    q: "What happens if I reach my monthly limit?",
    a: "You can easily upgrade to a higher plan or purchase additional credit add-ons. We never halt access to your existing clips, projects, or YouTube distribution channels."
  },
  {
    q: "Are YouTube publishing quotas limited?",
    a: "Direct YouTube publishing is supported on Creator, Pro, and Enterprise tiers. Free tier accounts can edit and download standard MP4s to upload manually."
  }
];

export default function PricingPage() {
  const { user, subscription, plans, refreshAuthData, addNotification } = useApp();

  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState<any>(null);

  // Card details mock inputs for testing
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("888");

  const currentPlanSlug = subscription?.plan_slug || user?.plan_slug || 'pro';

  const handleStartCheckout = async (plan: any) => {
    setSelectedPlan(plan);
    setCheckoutLoading(true);
    try {
      const res = await createCheckoutSessionApi(plan.id, interval);
      if (res.session) {
        setCheckoutSession(res.session);
        setCheckoutModalOpen(true);
      }
    } catch (err: any) {
      addNotification("Error", err.message || "Could not initiate checkout session", "error");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleConfirmCheckout = async () => {
    if (!checkoutSession) return;
    setConfirming(true);
    try {
      const res = await confirmPaymentApi({
        session_id: checkoutSession.session_id,
        signature: checkoutSession.signature,
        plan_id: checkoutSession.plan_id,
        billing_interval: checkoutSession.billing_interval,
        amount: checkoutSession.amount,
        timestamp: checkoutSession.timestamp,
        payment_method_last4: "4242",
        payment_method_brand: "visa"
      });

      if (res.status === 'success') {
        addNotification("Payment Verified!", `Successfully upgraded to ${selectedPlan?.name}!`, "success");
        await refreshAuthData();
        setCheckoutModalOpen(false);
      }
    } catch (err: any) {
      addNotification("Payment Error", err.message || "Failed to confirm payment", "error");
    } finally {
      setConfirming(false);
    }
  };

  // Fallback plans if backend plans are still loading
  const displayPlans = plans.length > 0 ? plans : [
    {
      id: "plan_free",
      slug: "free",
      name: "Free Starter",
      description: "For new creators exploring AI highlight detection and smart vertical clipping.",
      price_monthly: 0,
      price_yearly: 0,
      monthly_video_minutes: 15,
      monthly_clips_limit: 10,
      monthly_ai_analysis_limit: 5,
      monthly_thumbnails_limit: 15,
      monthly_exports_limit: 10,
      included_features: ["basic_editing", "standard_exports", "ai_subtitles", "auto_reframing_basic"]
    },
    {
      id: "plan_creator",
      slug: "creator",
      name: "Creator Pro",
      description: "Ideal for growing channels needing high processing volumes and YouTube publishing.",
      price_monthly: 29,
      price_yearly: 290,
      monthly_video_minutes: 120,
      monthly_clips_limit: 100,
      monthly_ai_analysis_limit: 50,
      monthly_thumbnails_limit: 100,
      monthly_exports_limit: 80,
      included_features: ["basic_editing", "standard_exports", "ai_subtitles", "auto_reframing_basic", "advanced_editing", "youtube_publishing", "hd_60fps_export", "custom_branding", "cloud_presets"]
    },
    {
      id: "plan_pro",
      slug: "pro",
      name: "Viral Agency / Pro",
      description: "For serious creators & agencies demanding deep AI intelligence and multi-channel scale.",
      price_monthly: 79,
      price_yearly: 790,
      monthly_video_minutes: 500,
      monthly_clips_limit: 400,
      monthly_ai_analysis_limit: 250,
      monthly_thumbnails_limit: 400,
      monthly_exports_limit: 350,
      included_features: ["basic_editing", "standard_exports", "ai_subtitles", "auto_reframing_basic", "advanced_editing", "youtube_publishing", "hd_60fps_export", "custom_branding", "cloud_presets", "4k_export", "ai_intelligence", "competitor_analysis", "advanced_analytics", "priority_processing"]
    },
    {
      id: "plan_enterprise",
      slug: "enterprise",
      name: "Studio Enterprise",
      description: "Dedicated high-performance API infrastructure, team seats, and white-glove onboarding.",
      price_monthly: 249,
      price_yearly: 2490,
      monthly_video_minutes: 2000,
      monthly_clips_limit: 1500,
      monthly_ai_analysis_limit: 1000,
      monthly_thumbnails_limit: 1500,
      monthly_exports_limit: 1500,
      included_features: ["all_features", "priority_support", "custom_limits", "team_management", "dedicated_queue", "white_label_exports"]
    }
  ];

  return (
    <div className="space-y-12 py-4 animate-in fade-in duration-300">
      {/* HEADER & TOGGLE */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Configurable SaaS Subscription Plans</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Flexible Pricing For Serious Shorts Creators
        </h1>
        <p className="text-sm text-gray-400">
          Supercharge your YouTube growth with automated AI clip hunting, Hormozi-style subtitles, auto-reframing, and visual packaging.
        </p>

        {/* BILLING INTERVAL TOGGLE */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-[#141824] border border-[#232A3E] shadow-lg">
          <button
            type="button"
            onClick={() => setInterval('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
              interval === 'monthly'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            type="button"
            onClick={() => setInterval('yearly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              interval === 'yearly'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* PLAN CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {displayPlans.map((p) => {
          const isCurrent = currentPlanSlug === p.slug;
          const isPro = p.slug === 'pro';
          const price = interval === 'yearly' ? p.price_yearly : p.price_monthly;
          const displayPrice = interval === 'yearly' && price > 0 ? Math.round(price / 12) : price;

          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 flex flex-col justify-between relative transition-all duration-300 ${
                isPro
                  ? 'bg-gradient-to-b from-[#181A2D] to-[#10121D] border-purple-500 shadow-2xl shadow-purple-600/20 ring-1 ring-purple-500/50'
                  : 'bg-[#12151E] border-[#1E2333] hover:border-[#2C354C]'
              }`}
            >
              {isPro && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  <span>Most Popular</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white tracking-tight">{p.name}</h3>
                  {isCurrent && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Current Plan
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-400 min-h-[36px]">{p.description}</p>

                {/* PRICING */}
                <div className="pt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white tracking-tight">${displayPrice}</span>
                    <span className="text-xs text-gray-400 font-medium">
                      / month {interval === 'yearly' && price > 0 && <span className="text-[10px] text-gray-500">(billed annually)</span>}
                    </span>
                  </div>
                </div>

                {/* LIMITS SUMMARY PILL */}
                <div className="p-3 rounded-xl bg-[#0B0D14] border border-[#1C2234] space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-300">
                    <span>Video Minutes:</span>
                    <strong className="text-white font-mono">{p.monthly_video_minutes} mins/mo</strong>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>AI Clip Generations:</span>
                    <strong className="text-white font-mono">{p.monthly_clips_limit} clips/mo</strong>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Thumbnail Packages:</span>
                    <strong className="text-white font-mono">{p.monthly_thumbnails_limit} covers/mo</strong>
                  </div>
                </div>

                {/* FEATURE CHECKLIST */}
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                    What's Included:
                  </span>
                  <ul className="space-y-2 text-xs text-gray-300">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>{p.monthly_video_minutes} mins 9:16 Video Reframing</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>Timestamped Subtitles & 6 Presets</span>
                    </li>
                    {p.included_features.includes('advanced_editing') && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Multi-track Timeline Video Studio</span>
                      </li>
                    )}
                    {p.included_features.includes('youtube_publishing') && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span>Direct YouTube Resumable Publishing</span>
                      </li>
                    )}
                    {p.included_features.includes('competitor_analysis') && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="font-semibold text-purple-200">Competitor Gap Analysis & Niche AI</span>
                      </li>
                    )}
                    {p.included_features.includes('4k_export') && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                        <span className="font-semibold text-purple-200">4K Ultra-HD 60FPS Video Export</span>
                      </li>
                    )}
                    {p.included_features.includes('team_management') && (
                      <li className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="font-semibold text-amber-200">Dedicated SLA & Team Accounts</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* ACTION BUTTON */}
              <div className="pt-6">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-[#1C2132] text-gray-400 text-xs font-bold cursor-default"
                  >
                    Active Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleStartCheckout(p)}
                    disabled={checkoutLoading}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.99] ${
                      isPro
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-[#1C2337] hover:bg-[#262F4A] text-white border border-[#2D3754]'
                    }`}
                  >
                    <span>{p.price_monthly === 0 ? 'Switch to Free' : 'Upgrade Plan'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CHECKOUT & PAYMENT MODAL */}
      {checkoutModalOpen && checkoutSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12151E] border border-purple-500/40 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2436]">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span>Secure Checkout — {selectedPlan?.name}</span>
              </div>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white">{selectedPlan?.name} ({interval === 'monthly' ? 'Monthly' : 'Yearly'})</p>
                <p className="text-gray-400 text-[11px] mt-0.5">Full access to expanded monthly quotas & features</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-purple-300 font-mono">${checkoutSession.amount}</p>
                <p className="text-[10px] text-gray-500 uppercase">{checkoutSession.currency}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Payment Card (Stripe Sandbox)</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-400">Expires</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs text-center font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-400">CVC</label>
                  <input
                    type="password"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B0D14] border border-[#23293D] text-white text-xs text-center font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0B0D14] border border-[#1C2234] text-[10px] text-gray-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Payments are cryptographically verified by server-side HMAC webhook signatures. Card details are never stored locally.</span>
            </div>

            <button
              type="button"
              onClick={handleConfirmCheckout}
              disabled={confirming}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {confirming ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Verifying Transaction...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm & Activate Plan (${checkoutSession.amount})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* FAQ ACCORDION */}
      <div className="max-w-3xl mx-auto pt-6 border-t border-[#1C2130] space-y-6">
        <h2 className="text-xl font-bold text-white text-center flex items-center justify-center gap-2">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <span>Frequently Asked Questions</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FAQS.map((faq, i) => (
            <div key={i} className="p-4 rounded-xl bg-[#12151E] border border-[#1E2333] space-y-1.5">
              <h3 className="text-xs font-bold text-white">{faq.q}</h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


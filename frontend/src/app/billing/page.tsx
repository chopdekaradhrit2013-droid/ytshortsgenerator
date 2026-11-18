"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Receipt,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  RotateCw,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Download,
  FileText,
  X,
  Printer
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  getPaymentTransactionsApi,
  getInvoiceApi,
  cancelSubscriptionApi,
  resumeSubscriptionApi
} from '@/lib/api';

export default function BillingPage() {
  const { user, subscription, refreshAuthData, addNotification } = useApp();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const txs = await getPaymentTransactionsApi();
        setTransactions(txs);
      } catch {
        // Fallback
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, []);

  const handleOpenInvoice = async (txId: string) => {
    setLoadingInvoice(true);
    try {
      const inv = await getInvoiceApi(txId);
      if (inv) {
        setSelectedInvoice(inv);
      }
    } catch (err: any) {
      addNotification("Error", err.message || "Could not retrieve invoice breakdown", "error");
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const res = await cancelSubscriptionApi(true);
      addNotification("Cancellation Scheduled", res.message || "Your plan will cancel at the end of the billing period.", "info");
      await refreshAuthData();
      setCancelModalOpen(false);
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to cancel subscription", "error");
    } finally {
      setCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      const res = await resumeSubscriptionApi();
      addNotification("Subscription Resumed", res.message || "Auto-renewal is back on!", "success");
      await refreshAuthData();
    } catch (err: any) {
      addNotification("Error", err.message || "Failed to resume subscription", "error");
    }
  };

  const planName = subscription?.plan_name || user?.plan_name || "Creator Pro";
  const subStatus = subscription?.status || "active";
  const isCanceledAtPeriodEnd = subscription?.cancel_at_period_end;
  const renewalDate = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Active';

  return (
    <div className="space-y-8 py-2 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E2333]">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-purple-400" />
            <span>Billing & Subscription Management</span>
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your subscription tier, payment methods, renewal schedules, and download invoices.
          </p>
        </div>

        <Link
          href="/pricing"
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 flex items-center gap-1.5 transition-all self-start sm:self-center"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Change Plan</span>
        </Link>
      </div>

      {/* PLAN CANCELLATION WARNING BANNER */}
      {isCanceledAtPeriodEnd && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-white">Subscription Scheduled to Cancel</p>
              <p className="text-[11px] text-amber-300/80">Your plan will expire on {renewalDate}. You retain access to all features until then.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResumeSubscription}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors flex-shrink-0"
          >
            Resume Auto-Renewal
          </button>
        </div>
      )}

      {/* ACTIVE SUBSCRIPTION & PAYMENT METHOD CARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SUBSCRIPTION CARD */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Current Subscription</span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              subStatus === 'active'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              {subStatus}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">{planName}</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {subscription?.billing_interval === 'yearly' ? 'Annual Billing ($290/year)' : 'Monthly Billing ($29/month)'}
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-xs text-gray-400 block">Next billing date</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>{renewalDate}</span>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#1C2130] flex items-center justify-between">
            <Link
              href="/pricing"
              className="text-xs text-purple-400 hover:text-purple-300 font-bold hover:underline flex items-center gap-1"
            >
              <span>Explore higher tier limits</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {!isCanceledAtPeriodEnd && (
              <button
                type="button"
                onClick={() => setCancelModalOpen(true)}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline font-semibold"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* PAYMENT METHOD CARD */}
        <div className="p-6 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Payment Method</span>
            <div className="p-4 rounded-xl bg-[#161B29] border border-[#232A3E] flex items-center gap-3">
              <div className="w-10 h-7 rounded-md bg-[#252C42] border border-white/10 flex items-center justify-center text-white font-mono font-bold text-[10px]">
                VISA
              </div>
              <div>
                <p className="text-xs font-bold text-white font-mono">•••• •••• •••• 4242</p>
                <p className="text-[10px] text-gray-400">Expires 12/28 • Default</p>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-gray-500 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span>Card credentials tokenized and secured via Stripe.</span>
          </div>
        </div>
      </div>

      {/* BILLING TRANSACTIONS & INVOICES */}
      <div className="p-6 rounded-2xl bg-[#12151E] border border-[#1E2333] space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1C2130]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-purple-400" />
            <span>Invoices & Payment History</span>
          </h2>
          <span className="text-xs text-gray-400">{transactions.length} transactions recorded</span>
        </div>

        {loadingHistory ? (
          <div className="py-10 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-purple-400" />
            <span>Loading invoice records...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">
            No previous transactions found for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1C2130] text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-3">Invoice Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Plan / Description</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171C2B]">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-[#161B29]/60 transition-colors">
                    <td className="py-3.5 px-3 font-mono font-bold text-white">{tx.invoice_number}</td>
                    <td className="py-3.5 px-3 text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3.5 px-3 text-gray-200">
                      {tx.plan_name || 'Creator Pro'} ({tx.billing_interval || 'monthly'})
                    </td>
                    <td className="py-3.5 px-3 font-mono font-bold text-white">
                      ${tx.amount.toFixed(2)} {tx.currency}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenInvoice(tx.id)}
                        className="px-2.5 py-1 rounded-lg bg-[#1E2538] hover:bg-purple-600 text-gray-200 hover:text-white text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* STRUCTURED INVOICE MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-[#12151E] border border-purple-500/30 rounded-2xl shadow-2xl p-7 space-y-6 animate-in zoom-in-95 duration-200">
            {/* INVOICE HEADER */}
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2436]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">Official Receipt</span>
                <h3 className="text-lg font-black text-white font-mono">{selectedInvoice.invoice_number}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-lg bg-[#1E2436] hover:bg-[#283148] text-gray-300 hover:text-white"
                  title="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 rounded-lg bg-[#1E2436] hover:bg-[#283148] text-gray-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SELLER & CUSTOMER METADATA */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Billed From</span>
                <p className="font-bold text-white">{selectedInvoice.seller.company_name}</p>
                <p className="text-gray-400 text-[11px]">{selectedInvoice.seller.address}</p>
                <p className="text-gray-400 text-[11px]">Tax ID: {selectedInvoice.seller.tax_id}</p>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Billed To</span>
                <p className="font-bold text-white">{selectedInvoice.customer.name}</p>
                <p className="text-gray-400 text-[11px]">{selectedInvoice.customer.email}</p>
                <p className="text-gray-400 text-[11px]">User ID: {selectedInvoice.customer.user_id}</p>
              </div>
            </div>

            {/* LINE ITEMS */}
            <div className="border border-[#1E2436] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#161B29] text-[10px] uppercase font-bold text-gray-400">
                  <tr>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2436]">
                  {selectedInvoice.line_items.map((item: any, i: number) => (
                    <tr key={i} className="text-white">
                      <td className="py-3 px-3 font-semibold">{item.description}</td>
                      <td className="py-3 px-3 text-center text-gray-400">{item.quantity}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">${item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* TOTALS */}
            <div className="space-y-1.5 text-xs text-right pt-2 border-t border-[#1E2436]">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span className="font-mono">${selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax:</span>
                <span className="font-mono">${selectedInvoice.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-[#1E2436]">
                <span>Total Paid:</span>
                <span className="font-mono text-purple-300">${selectedInvoice.total.toFixed(2)} {selectedInvoice.currency}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#161B29] text-[11px] text-gray-400 flex items-center justify-between">
              <span>Paid via {selectedInvoice.payment_method}</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                {selectedInvoice.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* CANCELLATION CONFIRMATION MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12151E] border border-rose-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">Cancel Subscription?</h3>
              <p className="text-xs text-gray-400">
                You will retain full access to {planName} features until {renewalDate}. After that date, your account will revert to Free Starter (15 mins/month).
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#161B29] text-[11px] text-gray-300 space-y-1">
              <p>• Your existing projects and clips are kept safe.</p>
              <p>• YouTube auto-publishing will be paused.</p>
              <p>• You can resume anytime before renewal without penalties.</p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1E2538] hover:bg-[#28324C] text-gray-300 text-xs font-semibold"
              >
                Keep Subscription
              </button>
              <button
                type="button"
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5"
              >
                {cancelling ? <RotateCw className="w-4 h-4 animate-spin" /> : null}
                <span>Confirm Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


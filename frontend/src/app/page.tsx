"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Send, 
  User, 
  Bot, 
  Layers, 
  Users, 
  MessageSquare, 
  Rocket, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Mail,
  Smartphone,
  MessageCircle,
  TrendingUp,
  Activity,
  ShoppingBag,
  Cpu,
  X,
  FileText,
  Terminal
} from "lucide-react";
import { 
  talkToCopilot, 
  runSegmentDryRun, 
  createSegment, 
  createCampaign, 
  launchCampaign, 
  fetchAnalytics,
  CustomerStats 
} from "../lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIDraftState {
  segment: {
    name: string;
    description: string;
    filterConfig: any;
  };
  campaign: {
    suggestedChannel: "EMAIL" | "SMS" | "WHATSAPP";
    channelJustification: string;
    messageTemplate: string;
  };
}

export default function DashboardPage() {
  // Navigation & Page state
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [webhookLogs, setWebhookLogs] = useState<string[]>([]);

  // AI Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<AIDraftState | null>(null);

  // Segment Preview
  const [previewLoading, setPreviewLoading] = useState(false);
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [matchingCustomers, setMatchingCustomers] = useState<CustomerStats[]>([]);

  // Launch states
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<{ campaignId: string; count: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll dashboard metrics & webhook logs
  useEffect(() => {
    loadDashboardStats();
    loadWebhookLogs();

    const interval = setInterval(() => {
      loadDashboardStats(true);
      loadWebhookLogs();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Auto scroll chat in drawer
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiLoading]);

  // Load preview customers when filters change
  useEffect(() => {
    if (aiDraft?.segment?.filterConfig) {
      fetchPreviewCustomers(aiDraft.segment.filterConfig);
    }
  }, [aiDraft?.segment?.filterConfig]);

  const loadDashboardStats = async (silent = false) => {
    try {
      if (!silent) setLoadingAnalytics(true);
      const data = await fetchAnalytics();
      setAnalytics(data);
    } catch (err) {
      console.error("Failed to load dashboard stats:", err);
    } finally {
      if (!silent) setLoadingAnalytics(false);
    }
  };

  const loadWebhookLogs = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/logs");
      if (res.ok) {
        const data = await res.json();
        setWebhookLogs(data.logs || []);
      }
    } catch (err) {
      // Channel service offline, ignore
    }
  };

  const fetchPreviewCustomers = async (filters: any) => {
    try {
      setPreviewLoading(true);
      const data = await runSegmentDryRun(filters);
      setMatchingCount(data.count);
      setMatchingCustomers(data.customers);
    } catch (err) {
      console.error("Dry run preview failed:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleStartCopilot = (promptText: string) => {
    setInputMsg(promptText);
    setIsDrawerOpen(true);
    // Let's trigger the chat send automatically
    setTimeout(() => {
      const sendBtn = document.getElementById("copilot-send-btn");
      if (sendBtn) sendBtn.click();
    }, 100);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMsg.trim() || isAiLoading) return;

    const userMessage = inputMsg;
    setInputMsg("");
    setChatHistory(prev => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);
    setLaunchResult(null);

    try {
      const response = await talkToCopilot(userMessage, chatHistory);
      setChatHistory(prev => [...prev, { role: "assistant", content: response.assistantResponse }]);
      setAiDraft({
        segment: response.segment,
        campaign: response.campaign
      });
    } catch (error) {
      console.error("Copilot interaction failed:", error);
      setChatHistory(prev => [
        ...prev, 
        { 
          role: "assistant", 
          content: "Sorry, I couldn't connect to the AI model. Let's try phrasing your goal differently." 
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!aiDraft || isLaunching) return;
    try {
      setIsLaunching(true);
      
      const segment = await createSegment({
        name: aiDraft.segment.name,
        description: aiDraft.segment.description,
        filterConfig: aiDraft.segment.filterConfig
      });

      const campaign = await createCampaign({
        name: `${aiDraft.segment.name} Outreach Campaign`,
        segmentId: segment.id,
        channel: aiDraft.campaign.suggestedChannel,
        messageTemplate: aiDraft.campaign.messageTemplate
      });

      const launch = await launchCampaign(campaign.id);
      setLaunchResult({
        campaignId: campaign.id,
        count: launch.count
      });

      setChatHistory(prev => [
        ...prev,
        {
          role: "assistant",
          content: `🚀 Outreach launched! I've dispatched campaign **"${campaign.name}"** to **${launch.count}** recipients using **${aiDraft.campaign.suggestedChannel}**.`
        }
      ]);

      setAiDraft(null);
      loadDashboardStats(true);

    } catch (err: any) {
      console.error("Launching campaign failed:", err);
      alert(`Launch failed: ${err.message}`);
    } finally {
      setIsLaunching(false);
    }
  };

  const renderChannelIcon = (channel: string) => {
    switch (channel) {
      case "EMAIL": return <Mail className="w-4 h-4 text-violet-400" />;
      case "SMS": return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case "WHATSAPP": return <MessageCircle className="w-4 h-4 text-cyan-400" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  // Quick action prompt configurations
  const quickActions = [
    { title: "Dormant users", desc: "Target customers inactive for 60+ days", prompt: "Re-engage customers who have not purchased in 60 days." },
    { title: "VIP Loyalty Boost", desc: "Gift promo codes to VIP users (spend > ₹15,000)", prompt: "Target VIP customers with lifetime spend > 15000 and send them an exclusive code." },
    { title: "First-Order follow-up", desc: "Follow up with single-order customers via SMS", prompt: "Find customers who have bought only once to send an SMS reminder." }
  ];

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-8 py-8 space-y-8 relative">
      
      {/* SECTION 1: HERO CONTAINER */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-indigo-900/20 via-violet-900/10 to-transparent border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-indigo-500/5 blur-[80px] pointer-events-none" />
        
        <div className="max-w-2xl space-y-4 relative z-10">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest">
            <Cpu className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>AI Copilot Engine Active</span>
          </div>
          
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Hello, Niraj. <br/>
            <span className="bg-gradient-to-r from-indigo-200 via-indigo-50 to-indigo-200 bg-clip-text text-transparent">
              Let's launch your next AI marketing campaign.
            </span>
          </h1>
          
          <p className="text-xs text-slate-400 leading-relaxed max-w-lg">
            Specify a target segment or business goal in natural language. The copilot builds the audience list, drafts the content, and executes simulated deliveries automatically.
          </p>

          {/* Prompt Bar */}
          <div className="pt-2">
            <div className="relative flex items-center max-w-xl">
              <input
                type="text"
                placeholder="e.g. Re-engage clients who haven't ordered in two months..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStartCopilot(inputMsg)}
                className="w-full bg-slate-950/60 border border-white/8 rounded-2xl px-5 py-4 text-xs focus:outline-none focus:border-indigo-500/50 pr-32 text-white placeholder-slate-500 shadow-xl"
              />
              <button
                onClick={() => handleStartCopilot(inputMsg)}
                className="absolute right-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg"
              >
                <Sparkles className="w-3.5 h-3.5 text-black" />
                <span>Copilot Draft</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MARKETING METRICS GRID */}
      {loadingAnalytics && !analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-24 bg-slate-900/20 rounded-2xl border border-white/5 shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">LTV Active Average</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-slate-200 mt-2">
              ₹{analytics ? (analytics.summary.totalClicked > 0 ? "14,820" : "12,450") : "0"}
            </div>
            <span className="text-[9px] text-emerald-400 font-medium mt-1 inline-block">+4.2% LTV growth</span>
          </div>

          <div className="p-5 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Delivery Rate</span>
              <Mail className="w-4 h-4 text-violet-400" />
            </div>
            <div className="text-2xl font-black text-violet-400 mt-2">
              {analytics ? analytics.summary.deliveryRate.toFixed(0) : "0"}%
            </div>
            <span className="text-[9px] text-slate-500 mt-1 inline-block">({analytics?.summary.totalDelivered || 0} of {analytics?.summary.totalSent || 0} delivered)</span>
          </div>

          <div className="p-5 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Open Success</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-black text-cyan-400 mt-2">
              {analytics ? analytics.summary.openRate.toFixed(0) : "0"}%
            </div>
            <span className="text-[9px] text-slate-500 mt-1 inline-block">({analytics?.summary.totalOpened || 0} opens)</span>
          </div>

          <div className="p-5 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] uppercase font-bold tracking-wider">Conversion Ratio</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-2">
              {analytics ? analytics.summary.conversionRate.toFixed(0) : "0"}%
            </div>
            <span className="text-[9px] text-emerald-400 font-medium mt-1 inline-block">{analytics?.summary.totalClicked || 0} link clicks</span>
          </div>

        </div>
      )}

      {/* SECTION 3: QUICK RECOMMENDATIONS */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">Recommended Campaign Presets</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleStartCopilot(action.prompt)}
              className="p-5 rounded-2xl bg-slate-950/20 hover:bg-slate-900/40 border border-white/5 hover:border-indigo-500/30 text-left transition-all group relative"
            >
              <div className="font-bold text-slate-200 text-xs flex items-center justify-between">
                <span>{action.title}</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{action.desc}</p>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-indigo-400 font-semibold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Draft Segment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 4: LOWER LAYOUT (CAMPAIGNS SUMMARY & LIVE CHANNEL SIMULATOR LOGS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Recent Campaigns (8 cols) */}
        <div className="lg:col-span-8 p-6 glass-panel rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Campaigns</span>
              <Link href="/campaigns" className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-wider">
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {loadingAnalytics && !analytics ? (
              <div className="space-y-3">
                <div className="h-12 bg-slate-800/40 rounded-xl shimmer"></div>
                <div className="h-12 bg-slate-800/40 rounded-xl shimmer"></div>
              </div>
            ) : !analytics || analytics.campaigns.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No campaigns generated yet. Run Copilot above to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {analytics.campaigns.slice(0, 3).map((camp: any) => (
                  <div key={camp.id} className="p-4 bg-slate-950/20 border border-white/5 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-200">{camp.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          {renderChannelIcon(camp.channel)}
                          <span>{camp.channel}</span>
                        </span>
                        <span>•</span>
                        <span>Target: <strong>{camp.sent}</strong> recipients</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {camp.status === "LAUNCHED" ? (
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                          <span className="text-[10px] font-bold text-indigo-300">Sending</span>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold text-slate-400 uppercase">{camp.status}</div>
                      )}
                      {camp.sent > 0 && (
                        <div className="text-[9px] text-slate-500 mt-1">
                          Conv: <strong>{camp.clickRate.toFixed(0)}%</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Live Webhook Pipeline console (4 cols) */}
        <div className="lg:col-span-4 p-6 glass-panel rounded-2xl flex flex-col justify-between h-96">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <Terminal className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Webhook Log</span>
            </div>

            <div className="flex-1 bg-black/40 border border-white/5 rounded-xl p-4 font-mono text-[9px] text-indigo-300/80 overflow-y-auto space-y-2.5">
              {webhookLogs.length === 0 ? (
                <div className="text-slate-600 text-center py-12">
                  [Idle] Waiting for campaign outreach webhook callbacks...
                </div>
              ) : (
                webhookLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================== */}
      {/* SLIDE-OUT AI COPILOT DRAWER (PREMIUM DESIGN) */}
      {/* ========================================== */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          
          {/* Backdrop */}
          <div 
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Body */}
          <div className="relative w-full md:w-[600px] lg:w-[680px] h-full bg-[#0c0d16] border-l border-white/8 flex flex-col shadow-2xl z-10 animate-slideLeft">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm text-slate-200">AI Campaign Copilot Workspace</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Define audience rules, recommend channels, and edit templates</p>
                </div>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg border border-white/5 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Main Area: Split Screen */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Column: Chat Conversation */}
              <div className="w-[45%] border-r border-white/5 flex flex-col justify-between bg-black/10">
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
                  
                  {chatHistory.length === 0 && (
                    <div className="text-center py-12 text-slate-500 text-[11px] leading-relaxed max-w-[150px] mx-auto">
                      AI assistant will respond and format segment query details here.
                    </div>
                  )}

                  {chatHistory.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 max-w-[90%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                    >
                      <div className={`
                        w-6.5 h-6.5 rounded-full flex items-center justify-center shrink-0 border text-[10px]
                        ${msg.role === "user" ? "bg-indigo-600/20 border-indigo-500/30 text-indigo-400" : "bg-slate-800 border-slate-700 text-slate-400"}
                      `}>
                        {msg.role === "user" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                      </div>
                      <div className={`
                        p-3 rounded-xl text-[10px] leading-relaxed border
                        ${msg.role === "user"
                          ? "bg-indigo-600/10 border-indigo-500/20 text-white rounded-tr-none"
                          : "bg-slate-900/60 border-white/5 text-slate-300 rounded-tl-none"
                        }
                      `}>
                        {msg.content}
                      </div>
                    </div>
                  ))}

                  {isAiLoading && (
                    <div className="flex gap-2 mr-auto max-w-[90%]">
                      <div className="w-6.5 h-6.5 rounded-full flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-300 shrink-0">
                        <Bot className="w-3 h-3 animate-spin" />
                      </div>
                      <div className="p-3 rounded-xl rounded-tl-none bg-slate-900/60 border border-white/5 text-slate-400 text-[10px] w-full space-y-1.5">
                        <div className="h-3 bg-slate-800 rounded w-full shimmer"></div>
                        <div className="h-3 bg-slate-850 rounded w-5/6 shimmer"></div>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar inside Drawer */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 bg-slate-950/20">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      id="copilot-input-box"
                      value={inputMsg}
                      onChange={(e) => setInputMsg(e.target.value)}
                      placeholder="Ask copilot..."
                      disabled={isAiLoading}
                      className="w-full bg-slate-900/40 border border-white/5 rounded-xl px-4 py-3 text-[10px] focus:outline-none focus:border-indigo-500/50 pr-10 text-white placeholder-slate-500"
                    />
                    <button
                      type="submit"
                      id="copilot-send-btn"
                      disabled={!inputMsg.trim() || isAiLoading}
                      className="absolute right-2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-colors text-white"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Active Interactive Draft Inspector */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
                
                {!aiDraft && !launchResult && (
                  <div className="h-full flex flex-col justify-center items-center text-center p-6">
                    <Layers className="w-10 h-10 text-slate-700 animate-pulse mb-3" />
                    <span className="text-slate-400 text-xs font-semibold">Workspace Empty</span>
                    <p className="text-[10px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                      Enter a prompt or choose a preset configuration in the chat.
                    </p>
                  </div>
                )}

                {launchResult && (
                  <div className="h-full flex flex-col justify-center items-center text-center p-6 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <CheckCircle className="w-12 h-12 text-emerald-400 mb-3 animate-bounce" />
                    <h4 className="text-sm font-bold text-slate-200">Outreach Dispatched!</h4>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                      We defined segment rules and created communications for <strong>{launchResult.count}</strong> client profiles.
                    </p>
                    <div className="mt-6 flex flex-col gap-2 w-full">
                      <Link
                        href="/campaigns"
                        onClick={() => setIsDrawerOpen(false)}
                        className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[10px] font-bold text-black transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Monitor Live Progress</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          setLaunchResult(null);
                          setChatHistory([]);
                        }}
                        className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold border border-slate-700"
                      >
                        Create Another Campaign
                      </button>
                    </div>
                  </div>
                )}

                {aiDraft && (
                  <div className="space-y-5">
                    
                    {/* Segment Card */}
                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Layers className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Segment Draft</span>
                      </div>
                      <input
                        type="text"
                        value={aiDraft.segment.name}
                        onChange={(e) => setAiDraft({
                          ...aiDraft,
                          segment: { ...aiDraft.segment, name: e.target.value }
                        })}
                        className="w-full bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-200 mb-2 focus:outline-none focus:border-indigo-500/50"
                      />
                      <textarea
                        value={aiDraft.segment.description}
                        onChange={(e) => setAiDraft({
                          ...aiDraft,
                          segment: { ...aiDraft.segment, description: e.target.value }
                        })}
                        rows={2}
                        className="w-full bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
                      />
                    </div>

                    {/* Channel Selector */}
                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Channel & Justification</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-white/5 mb-2 w-fit">
                        {renderChannelIcon(aiDraft.campaign.suggestedChannel)}
                        <span className="text-[10px] font-bold text-slate-200">{aiDraft.campaign.suggestedChannel}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed bg-black/10 p-2.5 rounded-lg border border-white/5">
                        {aiDraft.campaign.channelJustification}
                      </p>
                    </div>

                    {/* Audience Preview */}
                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Contacts Preview</span>
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                          {previewLoading ? "Loading..." : `${matchingCount} matches`}
                        </span>
                      </div>

                      {previewLoading ? (
                        <div className="space-y-1">
                          <div className="h-6 bg-slate-800/40 rounded shimmer"></div>
                          <div className="h-6 bg-slate-800/40 rounded shimmer"></div>
                        </div>
                      ) : matchingCustomers.length === 0 ? (
                        <div className="p-2.5 bg-amber-500/5 border border-amber-500/10 text-amber-400 text-[10px] rounded-lg">
                          No customer profiles match this criteria.
                        </div>
                      ) : (
                        <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1.5">
                          {matchingCustomers.slice(0, 3).map((customer) => (
                            <div key={customer.id} className="p-2 bg-slate-950/20 border border-white/5 rounded-lg flex items-center justify-between text-[10px]">
                              <div>
                                <span className="font-semibold text-slate-200">{customer.name}</span>
                                <span className="text-slate-500 ml-1.5">({customer.email})</span>
                              </div>
                              <span className="font-semibold text-indigo-400">₹{customer.totalSpend.toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                          {matchingCustomers.length > 3 && (
                            <div className="text-center text-[9px] text-slate-500 pt-1">
                              + {matchingCustomers.length - 3} more matching recipients
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Template Editor */}
                    <div className="p-4 bg-slate-900/30 border border-white/5 rounded-xl">
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Edit Copy Template</span>
                      </div>
                      <textarea
                        value={aiDraft.campaign.messageTemplate}
                        onChange={(e) => setAiDraft({
                          ...aiDraft,
                          campaign: { ...aiDraft.campaign, messageTemplate: e.target.value }
                        })}
                        rows={3}
                        className="w-full bg-slate-950/40 border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-200 focus:outline-none focus:border-indigo-500/50 leading-relaxed font-sans"
                      />
                    </div>

                    {/* Submit Campaign Button */}
                    <button
                      onClick={handleLaunchCampaign}
                      disabled={isLaunching || matchingCount === 0}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 text-black text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-xl"
                    >
                      {isLaunching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                          <span>Dispatching campaign...</span>
                        </>
                      ) : (
                        <>
                          <Rocket className="w-3.5 h-3.5 text-black" />
                          <span>Launch Outreach Campaign</span>
                        </>
                      )}
                    </button>

                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  Layers, 
  Mail, 
  Smartphone, 
  MessageCircle, 
  Activity, 
  Clock, 
  RefreshCw, 
  Play,
  CheckCircle2,
  XCircle,
  Eye,
  ChevronRight,
  TrendingUp,
  BarChart2
} from "lucide-react";
import { 
  fetchCampaigns, 
  fetchCampaignDetails, 
  launchCampaign, 
  Campaign, 
  CampaignMetrics 
} from "../../lib/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [campDetails, setCampDetails] = useState<{ campaign: Campaign; metrics: CampaignMetrics } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [isLaunchingId, setIsLaunchingId] = useState<string | null>(null);

  // Load campaigns list on mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Poll details of selected active/launched campaign
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (selectedCampId) {
      loadCampaignDetails(selectedCampId, true); // initial load silent
      
      // Auto refresh statistics every 2 seconds to capture async simulation callbacks
      interval = setInterval(() => {
        const campaign = campaigns.find(c => c.id === selectedCampId);
        if (campaign && campaign.status === "LAUNCHED") {
          loadCampaignDetails(selectedCampId, true);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [selectedCampId, campaigns]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await fetchCampaigns();
      setCampaigns(data);
      if (data.length > 0 && !selectedCampId) {
        setSelectedCampId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCampaignDetails = async (id: string, silent = false) => {
    try {
      if (!silent) setDetailsLoading(true);
      const details = await fetchCampaignDetails(id);
      setCampDetails(details);
    } catch (err) {
      console.error("Failed to load campaign details:", err);
    } finally {
      if (!silent) setDetailsLoading(false);
    }
  };

  const handleLaunch = async (campaignId: string) => {
    try {
      setIsLaunchingId(campaignId);
      await launchCampaign(campaignId);
      // Reload campaigns
      const updated = await fetchCampaigns();
      setCampaigns(updated);
      // Trigger details load
      loadCampaignDetails(campaignId);
    } catch (err) {
      console.error("Failed to launch campaign:", err);
      alert("Launch failed. Ensure segment customers are available.");
    } finally {
      setIsLaunchingId(null);
    }
  };

  const renderChannelIcon = (channel: string) => {
    switch (channel) {
      case "EMAIL":
        return <Mail className="w-4 h-4 text-violet-400" />;
      case "SMS":
        return <Smartphone className="w-4 h-4 text-emerald-400" />;
      case "WHATSAPP":
        return <MessageCircle className="w-4 h-4 text-cyan-400" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-slate-500/10 border-slate-500/20 text-slate-400";
      case "LAUNCHED":
        return "bg-indigo-500/15 border-indigo-500/30 text-indigo-300 animate-pulse";
      case "COMPLETED":
        return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
      default:
        return "bg-slate-500/10 border-slate-500/20 text-slate-400";
    }
  };

  // Recharts Chart Data Formatter
  const getChartData = () => {
    if (!campDetails) return [];
    const { metrics } = campDetails;
    return [
      { name: "Sent", count: metrics.totalSent, color: "#6366f1" },
      { name: "Delivered", count: metrics.delivered, color: "#8b5cf6" },
      { name: "Opened", count: metrics.opened, color: "#06b6d4" },
      { name: "Clicked", count: metrics.clicked, color: "#10b981" }
    ];
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
      
      {/* LEFT PANE: CAMPAIGNS GRID/LIST */}
      <div className="w-full lg:w-[40%] flex flex-col border-r border-white/5 bg-slate-900/10">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-sm uppercase tracking-wide text-slate-300">Campaigns Directory</h2>
          </div>
          <button 
            onClick={loadCampaigns} 
            className="p-1.5 rounded-lg border border-white/5 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 bg-slate-850/50 rounded-2xl border border-white/5 shimmer" />
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center p-8 glass-panel border-dashed rounded-2xl">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <div className="text-xs text-slate-400 font-semibold">No campaigns configured</div>
              <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                Open the Copilot tab on the left sidebar to draft your first marketing campaign!
              </p>
            </div>
          ) : (
            campaigns.map((camp) => {
              const isSelected = selectedCampId === camp.id;
              return (
                <div
                  key={camp.id}
                  onClick={() => setSelectedCampId(camp.id)}
                  className={`
                    p-5 rounded-2xl glass-panel glass-panel-hover cursor-pointer relative border
                    ${isSelected 
                      ? "border-indigo-500/40 bg-indigo-600/5 shadow-[0_0_20px_rgba(99,102,241,0.05)]" 
                      : "border-white/5"
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-xs text-slate-100">{camp.name}</h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>{camp.segment?.name}</span>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusStyle(camp.status)}`}>
                      {camp.status}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        {renderChannelIcon(camp.channel)}
                        <span className="text-[10px] font-bold text-slate-300">{camp.channel}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Target: <span className="font-bold text-slate-300">{camp._count?.communications || 0}</span>
                      </div>
                    </div>

                    {camp.status === "DRAFT" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunch(camp.id);
                        }}
                        disabled={isLaunchingId === camp.id}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-black font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1"
                      >
                        {isLaunchingId === camp.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin text-black" />
                        ) : (
                          <Play className="w-3 h-3 text-black fill-black" />
                        )}
                        <span>Launch</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>

      {/* RIGHT PANE: CAMPAIGN LIVE ANALYTICS */}
      <div className="flex-1 flex flex-col overflow-y-auto px-8 py-8 space-y-6">
        
        {detailsLoading && !campDetails ? (
          <div className="flex-1 flex flex-col justify-center items-center">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
            <span className="text-xs text-slate-400 mt-3 font-semibold">Loading statistics...</span>
          </div>
        ) : !campDetails ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <Activity className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
            <span className="text-xs text-slate-400 font-semibold">Select a campaign to inspect analytics</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex items-start justify-between pb-4 border-b border-white/5">
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">Live Funnel Tracker</span>
                <h2 className="text-lg font-bold text-slate-200 mt-1">{campDetails.campaign.name}</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Channel: <strong>{campDetails.campaign.channel}</strong></span>
                  <span>•</span>
                  <span>Segment: <strong>{campDetails.campaign.segment?.name}</strong></span>
                </div>
              </div>

              {campDetails.campaign.status === "LAUNCHED" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  <span className="text-[10px] uppercase font-bold text-indigo-300">Syncing Live Events</span>
                </div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Targeted</div>
                <div className="text-xl font-bold text-slate-200 mt-1">{campDetails.metrics.totalSent}</div>
                <div className="text-[9px] text-slate-400 mt-1">Outreach size</div>
              </div>

              <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivered</div>
                <div className="text-xl font-bold text-violet-400 mt-1">
                  {campDetails.metrics.delivered} <span className="text-xs text-slate-400 font-normal">({campDetails.metrics.deliveryRate.toFixed(0)}%)</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">Delivery Success</div>
              </div>

              <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Opened</div>
                <div className="text-xl font-bold text-cyan-400 mt-1">
                  {campDetails.metrics.opened} <span className="text-xs text-slate-400 font-normal">({campDetails.metrics.openRate.toFixed(0)}%)</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">Open rate (from delivered)</div>
              </div>

              <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Clicks / Actions</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {campDetails.metrics.clicked} <span className="text-xs text-slate-400 font-normal">({campDetails.metrics.conversionRate.toFixed(0)}%)</span>
                </div>
                <div className="text-[9px] text-slate-400 mt-1">Conversion rate (from sent)</div>
              </div>

            </div>

            {/* Chart Block */}
            {campDetails.campaign.status !== "DRAFT" && (
              <div className="p-6 glass-panel rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart2 className="w-4.5 h-4.5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Funnel Drop-off Distribution</span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getChartData()}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2b36" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ background: "#11121e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }}
                        cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={45}>
                        {getChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recipient Deliveries Logs Table */}
            {campDetails.campaign.status !== "DRAFT" && (
              <div className="p-6 glass-panel rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Outreach Deliveries Feed</span>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Latest updates</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-3.5 pr-2">
                  {campDetails.campaign.communications?.length === 0 ? (
                    <div className="text-xs text-slate-500">No communication logs created.</div>
                  ) : (
                    campDetails.campaign.communications?.map((comm: any) => {
                      const events = comm.communicationEvents.map((e: any) => e.type);
                      return (
                        <div 
                          key={comm.id} 
                          className="p-3 bg-slate-950/20 border border-white/5 rounded-xl hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-semibold text-slate-200">{comm.customer.name}</span>
                              <span className="text-slate-500 text-[10px] ml-2 font-mono">({comm.customer.email})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* status icons */}
                              {events.includes("CLICKED") && <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">CLICKED</span>}
                              {events.includes("OPENED") && !events.includes("CLICKED") && <span className="text-[9px] px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">OPENED</span>}
                              {events.includes("DELIVERED") && !events.includes("OPENED") && <span className="text-[9px] px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 font-bold">DELIVERED</span>}
                              {events.includes("FAILED") && <span className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold">FAILED</span>}
                              {comm.status === "PENDING" && <span className="text-[9px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-bold animate-pulse">PENDING</span>}
                            </div>
                          </div>
                          
                          {/* personalized message content */}
                          <div className="mt-2 text-[10px] text-slate-400 leading-relaxed font-sans bg-slate-950/40 p-2 rounded-lg border border-white/5">
                            "{comm.messageContent}"
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
}

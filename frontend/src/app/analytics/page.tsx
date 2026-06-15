"use client";

import React, { useState, useEffect } from "react";
import { BarChart3, RefreshCw, Layers, TrendingUp, Mail, Smartphone, MessageCircle, Info } from "lucide-react";
import { fetchAnalytics } from "../../lib/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const analytics = await fetchAnalytics();
      setData(analytics);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
      setError(err.message || "Failed to establish connection to backend API.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center">
        <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin" />
        <span className="text-xs text-slate-400 mt-3 font-semibold">Generating dashboard report...</span>
      </div>
    );
  }

  const { summary, campaigns } = data || {
    summary: {
      totalCampaigns: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
      conversionRate: 0
    },
    campaigns: []
  };

  // Funnel data
  const funnelData = [
    { name: "Total Sent", count: summary.totalSent || 0, color: "#6366f1" },
    { name: "Delivered", count: summary.totalDelivered || 0, color: "#8b5cf6" },
    { name: "Opened", count: summary.totalOpened || 0, color: "#06b6d4" },
    { name: "Clicked", count: summary.totalClicked || 0, color: "#10b981" }
  ];

  // Channel distribution data
  const emailCount = campaigns.filter((c: any) => c.channel === "EMAIL").reduce((sum: number, c: any) => sum + c.sent, 0);
  const smsCount = campaigns.filter((c: any) => c.channel === "SMS").reduce((sum: number, c: any) => sum + c.sent, 0);
  const waCount = campaigns.filter((c: any) => c.channel === "WHATSAPP").reduce((sum: number, c: any) => sum + c.sent, 0);

  const channelData = [
    { name: "Email", value: emailCount, color: "#8b5cf6" },
    { name: "SMS", value: smsCount, color: "#10b981" },
    { name: "WhatsApp", value: waCount, color: "#06b6d4" }
  ].filter(c => c.value > 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-8 py-8 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>CRM Analytics Desk</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Check conversion funnels, delivery rates, and channel performances.</p>
        </div>
        <button 
          onClick={loadAnalytics} 
          className="p-2 rounded-xl border border-white/5 bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3 text-xs">
          <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Connection Warning:</span>
            <p className="mt-1 opacity-90">{error}</p>
            <p className="mt-2 text-[10px] text-slate-400">Please make sure the backend server is running and your <code className="px-1 py-0.5 bg-slate-950/40 rounded text-slate-300">NEXT_PUBLIC_API_URL</code> environment variable matches the backend service URL.</p>
          </div>
        </div>
      )}

      {/* Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Campaigns</div>
          <div className="text-xl font-bold text-slate-200 mt-1">{summary.totalCampaigns ?? 0}</div>
        </div>

        <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Delivery Rate</div>
          <div className="text-xl font-bold text-violet-400 mt-1">
            {(summary.deliveryRate ?? 0).toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-400 mt-1">({summary.totalDelivered ?? 0} of {summary.totalSent ?? 0} messages)</div>
        </div>

        <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Open Rate</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">
            {(summary.openRate ?? 0).toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-400 mt-1">({summary.totalOpened ?? 0} of {summary.totalDelivered ?? 0} read)</div>
        </div>

        <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">Conversion Rate</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {(summary.conversionRate ?? 0).toFixed(1)}%
          </div>
          <div className="text-[9px] text-slate-400 mt-1">({summary.totalClicked ?? 0} click-throughs)</div>
        </div>

      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-y-auto min-h-0">
        
        {/* Funnel Graph */}
        <div className="p-6 glass-panel rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4.5 h-4.5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Campaign Outreach Funnel</span>
          </div>

          <div className="h-64 w-full">
            {summary.totalSent === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No outbound campaign traffic recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnelData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2b36" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ background: "#11121e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Channels Distribution */}
        <div className="p-6 glass-panel rounded-2xl flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-4.5 h-4.5 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Marketing Outbound Channels Distribution</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {channelData.length === 0 ? (
              <div className="text-xs text-slate-500">
                No active outreach channels recorded yet.
              </div>
            ) : (
              <div className="w-full h-full flex flex-col justify-center">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={channelData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {channelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: "#11121e", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Labels Legend */}
                <div className="flex justify-center gap-6 text-[10px] uppercase font-bold text-slate-300">
                  {channelData.map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded" style={{ backgroundColor: ch.color }} />
                      <span>{ch.name}: {ch.value} sent</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

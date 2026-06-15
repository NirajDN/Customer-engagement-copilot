"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Sparkles, 
  Megaphone, 
  Users, 
  ShoppingBag, 
  BarChart3, 
  Menu, 
  X, 
  Database,
  Cpu
} from "lucide-react";
import "./globals.css";
import { fetchCustomers } from "../lib/api";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<"connecting" | "healthy" | "error">("connecting");

  // Check CRM service connection on mount
  useEffect(() => {
    fetchCustomers()
      .then(() => setDbStatus("healthy"))
      .catch(() => setDbStatus("error"));
  }, []);

  const navItems = [
    { name: "AI Copilot", href: "/", icon: Sparkles, color: "text-indigo-400" },
    { name: "Campaigns Hub", href: "/campaigns", icon: Megaphone, color: "text-violet-400" },
    { name: "Customers", href: "/customers", icon: Users, color: "text-cyan-400" },
    { name: "Orders List", href: "/orders", icon: ShoppingBag, color: "text-emerald-400" },
    { name: "Analytics Dashboard", href: "/analytics", icon: BarChart3, color: "text-amber-400" },
  ];

  return (
    <html lang="en" className="h-full dark bg-[#090a10] text-[#f8fafc] antialiased">
      <head>
        <title>Xeno AI Campaign Copilot</title>
        <meta name="description" content="AI-native customer segmentation, channel selection, and campaign execution CRM assistant." />
      </head>
      <body className="h-full flex flex-col md:flex-row overflow-hidden font-sans">
        
        {/* Floating background blur design elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[35%] h-[35%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none floating-orb" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-violet-600/8 blur-[150px] pointer-events-none floating-orb-delayed" />

        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 glass-panel border-x-0 border-t-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
              <Cpu className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-lg tracking-wider bg-gradient-to-r from-indigo-200 via-indigo-50 to-indigo-200 bg-clip-text text-transparent">
              XENO AI
            </span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-300 hover:text-white rounded-md bg-slate-800/40 border border-slate-700/50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Navigation Sidebar (Desktop) */}
        <aside className={`
          fixed inset-y-0 left-0 w-72 glass-panel border-y-0 border-l-0 z-30 flex flex-col justify-between 
          transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex
          ${mobileMenuOpen ? "translate-x-0 top-[65px]" : "-translate-x-full"}
        `}>
          {/* Logo Brand Panel */}
          <div className="p-8 hidden md:block border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/10 border border-indigo-500/20 neon-glow-indigo">
                <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h1 className="font-bold text-xl tracking-wider bg-gradient-to-r from-indigo-200 via-indigo-50 to-indigo-200 bg-clip-text text-transparent">
                  XENO AI
                </h1>
                <p className="text-[10px] text-indigo-300/60 uppercase tracking-widest font-semibold mt-0.5">
                  Campaign Copilot
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-8 space-y-2.5 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-medium tracking-wide
                    transition-all duration-200 border group
                    ${isActive 
                      ? "bg-indigo-600/15 border-indigo-500/30 text-white font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                      : "bg-transparent border-transparent text-slate-400 hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <item.icon className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${item.color}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer Status Panel */}
          <div className="p-6 border-t border-white/5 bg-slate-900/20">
            <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-indigo-400" />
                <span className="text-[11px] text-slate-400 font-medium">CRM Connection</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${
                  dbStatus === "healthy" ? "bg-emerald-500 animate-pulse" : 
                  dbStatus === "connecting" ? "bg-amber-400 animate-bounce" : "bg-red-500"
                }`} />
                <span className="text-[10px] uppercase font-semibold text-slate-300">
                  {dbStatus === "healthy" ? "Online" : dbStatus === "connecting" ? "Connecting" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar Drawer */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden top-[65px]"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}
        </main>

      </body>
    </html>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  AlertCircle,
  Clock,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { fetchCustomers, CustomerStats } from "../../lib/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const data = await fetchCustomers();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const getInactivityBadge = (days: number | null) => {
    if (days === null) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          Never purchased
        </span>
      );
    }
    if (days >= 90) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit">
          <Clock className="w-3 h-3" />
          <span>{days}d Lapsed</span>
        </span>
      );
    }
    if (days >= 60) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit">
          <AlertCircle className="w-3 h-3" />
          <span>{days}d Dormant</span>
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Active ({days}d ago)</span>
      </span>
    );
  };

  const getSegmentClass = (spend: number, count: number) => {
    if (spend > 15000) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 flex items-center gap-1 w-fit shadow-[0_0_10px_rgba(99,102,241,0.1)]">
          <Sparkles className="w-2.5 h-2.5" />
          <span>VIP</span>
        </span>
      );
    }
    if (count >= 3) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit">
          Regular
        </span>
      );
    }
    if (count === 1) {
      return (
        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 w-fit">
          One-Time
        </span>
      );
    }
    return (
      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 w-fit">
        Lead
      </span>
    );
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <span>Customers Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Manage profiles, transaction histories, and segments.</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Customer Stats Cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Customers</div>
            <div className="text-xl font-bold text-slate-200 mt-1">{customers.length}</div>
          </div>
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">VIP Clients</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              {customers.filter(c => c.totalSpend > 15000).length}
            </div>
          </div>
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Lapsed (&gt;90d)</div>
            <div className="text-xl font-bold text-red-400 mt-1">
              {customers.filter(c => c.daysSinceLastPurchase !== null && c.daysSinceLastPurchase >= 90).length}
            </div>
          </div>
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Avg. Lifetime Value</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              ₹{(customers.reduce((sum, c) => sum + c.totalSpend, 0) / (customers.length || 1)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Table Panel */}
      <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-slate-900/20 text-slate-400 font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4">Lifetime Spend</th>
                <th className="px-6 py-4">Activity Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1, 2, 3, 4, 5].map((n) => (
                  <tr key={n}>
                    <td colSpan={5} className="px-6 py-5">
                      <div className="h-4 bg-slate-800/40 rounded shimmer w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No customers found matching the search term.
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/2 animate-fadeIn">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-200">{customer.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{customer.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getSegmentClass(customer.totalSpend, customer.orderCount)}
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-slate-300">
                      {customer.orderCount}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-indigo-400">
                      ₹{customer.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      {getInactivityBadge(customer.daysSinceLastPurchase)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

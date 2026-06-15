"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, Search, DollarSign, Calendar, RefreshCw } from "lucide-react";
import { fetchOrders, OrderDetail } from "../../lib/api";

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-emerald-500/15 border-emerald-500/30 text-emerald-400";
      case "PENDING":
        return "bg-amber-500/15 border-amber-500/30 text-amber-400";
      case "REFUNDED":
        return "bg-rose-500/15 border-rose-500/30 text-rose-400";
      default:
        return "bg-slate-500/10 border-slate-500/20 text-slate-400";
    }
  };

  const filtered = orders.filter((o) =>
    o.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/5 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            <span>Orders Directory</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Audit transactions, payment statuses, and invoice values.</p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900/40 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Orders summary cards */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Orders</div>
            <div className="text-xl font-bold text-slate-200 mt-1">{orders.length}</div>
          </div>
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Completed</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {orders.filter(o => o.status === "COMPLETED").length}
            </div>
          </div>
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Refunded</div>
            <div className="text-xl font-bold text-rose-400 mt-1">
              {orders.filter(o => o.status === "REFUNDED").length}
            </div>
          </div>
          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">Total Revenue</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">
              ₹{orders.filter(o => o.status === "COMPLETED").reduce((sum, o) => sum + Number(o.amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Purchase Date</th>
                <th className="px-6 py-4 text-right">Amount</th>
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
                    No orders found matching the search term.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-400 text-[10px]">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-200">{order.customer.name}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{order.customer.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusStyle(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(order.purchaseDate).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-bold text-indigo-300">
                      ₹{Number(order.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

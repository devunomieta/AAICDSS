import React from 'react';
import { Activity, Users, FileText, Bell, CheckCircle, TrendingUp, Cpu } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-textMuted mt-1">AffiongAI CDSS Analytics & Stability Metrics</p>
        </div>
        <div className="bg-green-900/30 border border-green-800 text-green-400 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold">
          <CheckCircle size={16} /> System Operational
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <FileText size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">Monthly Scans</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            1,432 <span className="text-green-500 text-sm font-medium mb-1 flex items-center"><TrendingUp size={14} className="mr-1"/> +12%</span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <Activity size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">Avg Inference</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            24.5s <span className="text-green-500 text-sm font-medium mb-1 flex items-center"><TrendingUp size={14} className="mr-1"/> -50%</span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <Bell size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">Notifications</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            3 <span className="text-amber-500 text-sm font-medium mb-1">Pending Compliance</span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <Cpu size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">System RAM</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            6.2 <span className="text-gray-400 text-xl font-normal mb-1">/ 8 GB</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-background border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-6">Annual Scan Volume (2026)</h2>
        <div className="h-64 flex items-end justify-between gap-2 border-b border-border pb-4 relative">
          <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between border-l border-border pl-2 pb-4">
            <span className="text-xs text-textMuted">1500</span>
            <span className="text-xs text-textMuted">1000</span>
            <span className="text-xs text-textMuted">500</span>
          </div>
          
          {[40, 60, 55, 80, 70, 95, 20, 0, 0, 0, 0, 0].map((height, i) => (
            <div key={i} className="w-full flex flex-col items-center gap-3 z-10">
              <div className="w-12 bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-colors border-t border-primary relative group cursor-pointer" style={{ height: `${height}%` }}>
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-white text-xs px-2 py-1 rounded border border-border font-bold">
                  {height > 0 ? (height * 15) : 0}
                </div>
              </div>
              <span className="text-xs font-semibold text-textMuted">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, Users, FileText, Bell, CheckCircle, TrendingUp, Cpu, Clock } from 'lucide-react';

export default function Dashboard() {
  const [recentCases, setRecentCases] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    monthly_scans: 0,
    annual_volume: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    pending_compliance: 0,
    ram_used_gb: 0,
    ram_total_gb: 0,
    avg_inference_time: "0s"
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [casesRes, analyticsRes] = await Promise.all([
          axios.get('http://localhost:8686/api/cases'),
          axios.get('http://localhost:8686/api/analytics')
        ]);
        setRecentCases(casesRes.data.cases.slice(0, 10));
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
      }
    };
    fetchData();
    // Auto-refresh RAM stats every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const maxVolume = Math.max(...analytics.annual_volume, 10);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-textMuted mt-1">AffiongAI Analytics & Metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <FileText size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">Monthly Scans</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            {analytics.monthly_scans}
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <Activity size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">Avg Inference</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            {analytics.avg_inference_time}
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <Bell size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">Notifications</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            {analytics.pending_compliance} <span className="text-amber-500 text-sm font-medium mb-1">Pending Compliance</span>
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 text-textMuted mb-2">
            <Cpu size={18} />
            <span className="font-semibold text-sm uppercase tracking-wider">System RAM</span>
          </div>
          <div className="text-3xl font-bold text-white flex items-end gap-3">
            {analytics.ram_used_gb} <span className="text-gray-400 text-xl font-normal mb-1">/ {analytics.ram_total_gb} GB</span>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-background border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-6">Annual Scan Volume (2026)</h2>
        <div className="h-64 flex items-end justify-between gap-2 border-b border-border pb-4 relative">
          <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between border-l border-border pl-2 pb-4">
            <span className="text-xs text-textMuted">{maxVolume}</span>
            <span className="text-xs text-textMuted">{Math.round(maxVolume * 0.66)}</span>
            <span className="text-xs text-textMuted">{Math.round(maxVolume * 0.33)}</span>
          </div>
          
          {analytics.annual_volume.map((volume: number, i: number) => {
            const heightPercentage = Math.max((volume / maxVolume) * 100, 1);
            return (
              <div key={i} className="w-full flex flex-col items-center gap-3 z-10">
                <div 
                  className="w-12 bg-primary/20 hover:bg-primary/40 rounded-t-sm transition-colors border-t border-primary relative group cursor-pointer" 
                  style={{ height: `${volume === 0 ? 0 : heightPercentage}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-surface text-white text-xs px-2 py-1 rounded border border-border font-bold">
                    {volume}
                  </div>
                </div>
                <span className="text-xs font-semibold text-textMuted">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-8 bg-background border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-white mb-6">Recent Cases</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface/50 text-xs uppercase text-textMuted border-b border-border">
              <tr>
                <th className="px-4 py-3 font-semibold">Case ID</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border text-gray-200">
              {recentCases.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-textMuted">No recent cases available.</td>
                </tr>
              ) : (
                recentCases.map(c => {
                  const d = new Date(c.timestamp);
                  return (
                    <tr key={c.id} className="hover:bg-surface/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{c.case_id}</td>
                      <td className="px-4 py-3">{`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`}</td>
                      <td className="px-4 py-3">
                        {c.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            <CheckCircle size={12} /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize">
                            <Clock size={12} /> {c.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 mb-4 text-center text-textMuted text-sm">
        Developed by <a href="https://devunomieta.xyz" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-white transition-colors font-semibold">@DEVUNOMIETA</a>
      </div>
    </div>
  );
}

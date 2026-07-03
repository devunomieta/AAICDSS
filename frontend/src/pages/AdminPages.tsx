import React, { useState, useEffect } from 'react';
import { Database, Users, Settings, Activity, Brain, Play, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/ToastContext';

export function ManageSystem() {
  const [activeTab, setActiveTab] = useState<'users' | 'config' | 'audit'>('users');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'audit') {
      axios.get('http://localhost:8686/api/audit').then(res => {
        // Reverse to show newest first
        setAuditLogs(res.data.reverse());
      });
    }
  }, [activeTab]);

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Settings className="text-primary" /> Manage System
        </h1>
        <p className="text-textMuted mt-1">Configure users, global settings, and view system audit logs.</p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-border pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button 
          onClick={() => setActiveTab('users')} 
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-white'}`}
        >
          <Users size={18} /> User Management
        </button>
        <button 
          onClick={() => setActiveTab('config')} 
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'config' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-white'}`}
        >
          <Settings size={18} /> System Config
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors ${activeTab === 'audit' ? 'bg-primary/20 text-primary' : 'text-textMuted hover:text-white'}`}
        >
          <Activity size={18} /> Audit Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {activeTab === 'users' && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Current System Users</h2>
            <div className="space-y-4">
              {['Radiologist (Dr. Affiong)', 'Compliance Officer (Sarah Jenkins)', 'System Admin'].map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-white">{user}</p>
                      <p className="text-sm text-textMuted">Active Account</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-surface border border-border text-textMuted rounded-lg cursor-not-allowed group relative">
                    Edit/Revoke
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Coming Soon
                    </div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Global Settings</h2>
            <div className="space-y-6">
              <div className="p-4 bg-background border border-border rounded-lg">
                <p className="font-bold text-white mb-1">Active Learning Threshold</p>
                <p className="text-sm text-textMuted mb-4">Number of cases required to trigger automated retraining notification.</p>
                <div className="flex gap-4">
                  <input type="number" value={50} disabled className="bg-surface border border-border rounded-lg px-4 py-2 text-white w-32 cursor-not-allowed" />
                  <button className="px-4 py-2 bg-surface border border-border text-textMuted rounded-lg cursor-not-allowed group relative">
                    Save Changes
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Coming Soon
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-background text-textMuted text-sm font-medium uppercase tracking-wider">
                <tr>
                  <th className="p-4 border-b border-border">Time</th>
                  <th className="p-4 border-b border-border">User</th>
                  <th className="p-4 border-b border-border">Action</th>
                  <th className="p-4 border-b border-border">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-textMuted">No audit logs found.</td>
                  </tr>
                ) : (
                  auditLogs.map((log, idx) => {
                    const date = new Date(log.timestamp * 1000);
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 text-sm text-gray-400 whitespace-nowrap">
                          {date.toLocaleDateString()} {date.toLocaleTimeString()}
                        </td>
                        <td className="p-4 font-medium text-white capitalize">{log.user}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded-md font-bold ${
                            log.action.includes('Login') ? 'bg-blue-500/20 text-blue-400' :
                            log.action.includes('Started') ? 'bg-green-500/20 text-green-400' :
                            log.action.includes('Delet') ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-300">{log.details}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ModelRetraining() {
  const [cases, setCases] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({ status: 'idle', progress: 0 });
  const { showToast } = useToast();

  useEffect(() => {
    fetchData();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get('http://localhost:8686/api/feedback');
      setCases(res.data.filter((c: any) => c.status === 'Retraining Ready'));
    } catch (err) {
      console.error(err);
    }
  };

  const pollStatus = async () => {
    try {
      const res = await axios.get('http://localhost:8686/api/retrain/status');
      setStatus(res.data);
      if (res.data.status === 'completed' || res.data.status === 'idle') {
        fetchData(); // refresh list
      }
    } catch (err) {
      // ignore
    }
  };

  const handleStart = async () => {
    if (cases.length === 0) {
      showToast("No cases ready for retraining.", 'error');
      return;
    }
    try {
      await axios.post('http://localhost:8686/api/retrain');
      showToast("Retraining pipeline started!", 'success');
      pollStatus();
    } catch (err) {
      showToast("Failed to start retraining.", 'error');
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Database className="text-primary" /> Model Retraining Pipeline
        </h1>
        <p className="text-textMuted mt-1">Manage automated Active Learning and live fine-tuning pipelines</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-textMuted mb-2">
            <Brain size={18} /> <span className="font-bold uppercase tracking-wider text-xs">Current Model</span>
          </div>
          <p className="text-3xl font-bold text-white">v1.2.0</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-textMuted mb-2">
            <CheckCircle size={18} /> <span className="font-bold uppercase tracking-wider text-xs">Retraining Ready Cases</span>
          </div>
          <p className="text-3xl font-bold text-primary">{cases.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-textMuted mb-2">
            <Activity size={18} /> <span className="font-bold uppercase tracking-wider text-xs">Pipeline Status</span>
          </div>
          <p className="text-xl font-bold text-white capitalize">{status.status}</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-8 flex-1">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-xl font-bold text-white">Live Pipeline Execution</h2>
          <button 
            onClick={handleStart}
            disabled={status.status === 'running' || status.status === 'starting'}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-bold transition-colors"
          >
            <Play size={20} />
            Start Retraining
          </button>
        </div>

        {status.status !== 'idle' && (
          <div className="bg-background border border-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-primary text-lg">{status.progress}%</span>
              {status.epoch > 0 && <span className="text-sm font-medium text-gray-400">Epoch {status.epoch} {status.total_epochs ? `/ ${status.total_epochs}` : ''}</span>}
            </div>
            <div className="w-full bg-surface rounded-full h-3 mb-4 overflow-hidden border border-border">
              <div 
                className="bg-primary h-3 rounded-full transition-all duration-500 ease-out" 
                style={{ width: `${status.progress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-gray-300 font-medium flex items-center gap-2">
                {status.status === 'running' && <Activity size={16} className="animate-pulse text-primary" />}
                {status.message}
              </p>
              {status.loss && <p className="text-sm text-textMuted font-medium bg-surface px-3 py-1 rounded-md border border-border">Loss: {status.loss.toFixed(4)}</p>}
            </div>
          </div>
        )}

        {status.status === 'idle' && (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-border rounded-xl">
            <Database size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium text-lg text-gray-400">Pipeline is idle</p>
            <p className="text-sm">Click 'Start Retraining' to spawn the background Python process and begin Active Learning.</p>
          </div>
        )}
      </div>
    </div>
  );
}

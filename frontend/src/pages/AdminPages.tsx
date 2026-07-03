import React from 'react';
import { Database, Users, Settings, Activity } from 'lucide-react';

export function ModelRetraining() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Database className="text-primary" /> Model Retraining Pipeline
        </h1>
        <p className="text-textMuted mt-1">Manage automated Active Learning and fine-tuning pipelines</p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-gray-400">
        <Activity size={48} className="mx-auto mb-4 opacity-20" />
        <p>Retraining pipeline module under construction.</p>
      </div>
    </div>
  );
}

export function UserManagement() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Users className="text-primary" /> User Management
        </h1>
        <p className="text-textMuted mt-1">Add, edit, or revoke access for Radiologist and Compliance accounts</p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-gray-400">
        <p>User management module under construction.</p>
      </div>
    </div>
  );
}

export function SystemConfig() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Settings className="text-primary" /> System Configuration
        </h1>
        <p className="text-textMuted mt-1">Manage global settings, retraining thresholds, and storage</p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-gray-400">
        <p>System config module under construction.</p>
      </div>
    </div>
  );
}

export function AuditLogs() {
  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <Database className="text-primary" /> Audit Logs
        </h1>
        <p className="text-textMuted mt-1">System-wide logs of deletions and prediction overrides</p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-8 text-center text-gray-400">
        <p>Audit logs module under construction.</p>
      </div>
    </div>
  );
}

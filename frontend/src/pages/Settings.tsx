import React from 'react';
import { Settings as SettingsIcon, Moon, Sun, User } from 'lucide-react';

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-8">System Settings</h1>
      
      <div className="bg-background border border-border rounded-xl overflow-hidden mb-8">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <User size={20} className="text-primary" /> Profile Management
          </h2>
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              DR
            </div>
            <div>
              <p className="text-lg font-medium text-white">Dr. Affiong</p>
              <p className="text-textMuted">Chief of Radiology (ID: DOCTOR_01)</p>
              <button className="mt-2 text-sm text-primary hover:text-primaryHover font-medium">Edit Profile Details</button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
            <SettingsIcon size={20} className="text-primary" /> Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border">
              <div>
                <p className="font-medium text-white">Theme Mode</p>
                <p className="text-sm text-textMuted">Toggle between Dark and Light mode for clinical viewing.</p>
              </div>
              <div className="flex bg-background border border-border rounded-lg p-1">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium">
                  <Moon size={16} /> Dark
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-textMuted hover:text-white rounded-md text-sm font-medium transition-colors">
                  <Sun size={16} /> Light
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface rounded-lg border border-border">
              <div>
                <p className="font-medium text-white">Compact Mode</p>
                <p className="text-sm text-textMuted">Reduce padding to fit more scans on screen.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

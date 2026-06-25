import React from 'react';
import { Sparkles, Calendar, ArrowUpCircle } from 'lucide-react';

export default function Updates() {
  const updates = [
    {
      version: 'v2.1.0',
      status: 'Coming Soon',
      title: 'PACS Gateway Integration',
      description: 'Direct bi-directional DICOM routing to hospital PACS networks. Pull scans instantly without manual uploads.',
      date: 'Q3 2026'
    },
    {
      version: 'v2.2.0',
      status: 'In Development',
      title: 'Active Learning Feedback Loop',
      description: 'When Compliance Officer approves a Radiologist override, the system automatically fine-tunes the CNN weights during overnight batch cycles.',
      date: 'Q4 2026'
    },
    {
      version: 'v3.0.0',
      status: 'Planning',
      title: 'Cloud GPU LIME Integration',
      description: 'Offloading LIME superpixel generation to the secure cloud GPU cluster for sub-second high-resolution explainability maps.',
      date: 'Q1 2027'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Sparkles size={32} className="text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">System Updates</h1>
          <p className="text-textMuted mt-1">Product roadmap and upcoming features</p>
        </div>
      </div>
      
      <div className="relative border-l border-border ml-4 space-y-10">
        {updates.map((update, idx) => (
          <div key={idx} className="pl-8 relative">
            <div className="absolute w-4 h-4 bg-primary rounded-full -left-[9px] top-1 border-4 border-background"></div>
            <div className="bg-background border border-border rounded-xl p-6 shadow-sm hover:border-gray-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white">{update.title}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/20 text-primary border border-primary/30">
                      {update.version}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-textMuted">
                    <Calendar size={14} /> {update.date} • <ArrowUpCircle size={14} className="ml-2" /> {update.status}
                  </div>
                </div>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                {update.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

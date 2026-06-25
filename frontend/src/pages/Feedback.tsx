import React from 'react';
import { MessageSquare, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function Feedback() {
  const mockQueue = [
    { id: 'SC-9241', patient: 'Anonymous', aiPred: 'Pneumonia (0.89)', radDec: 'Accepted', status: 'Retraining Ready' },
    { id: 'SC-9242', patient: 'Anonymous', aiPred: 'Normal (0.92)', radDec: 'Overridden: Trace Effusion', status: 'Pending Compliance' },
  ];

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <MessageSquare className="text-primary" /> Feedback Board
        </h1>
        <p className="text-textMuted mt-1">Review overridden diagnoses for model fine-tuning (Compliance Officer access required)</p>
      </div>

      <div className="bg-background border border-border rounded-xl flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-5 gap-4 bg-surface p-4 border-b border-border text-sm font-bold text-gray-400 uppercase tracking-wider">
          <div>Case ID</div>
          <div>AI Prediction</div>
          <div>Radiologist Override</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {mockQueue.map((item, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-4 items-center p-4 bg-surface/30 hover:bg-surface/60 border border-transparent hover:border-border rounded-lg transition-colors">
              <div className="font-mono text-sm text-primary font-bold">{item.id}</div>
              <div className="text-sm text-gray-300">{item.aiPred}</div>
              <div className="text-sm text-gray-300 italic">{item.radDec}</div>
              <div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${
                  item.status === 'Pending Compliance' ? 'bg-amber-900/30 text-amber-500 border border-amber-900/50' : 'bg-green-900/30 text-green-500 border border-green-900/50'
                }`}>
                  {item.status === 'Pending Compliance' ? <Clock size={12} /> : <CheckCircle size={12} />}
                  {item.status}
                </span>
              </div>
              <div className="text-right">
                <button 
                  disabled={item.status !== 'Pending Compliance'}
                  className="bg-primary hover:bg-primaryHover disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
                >
                  Approve for Retrain
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

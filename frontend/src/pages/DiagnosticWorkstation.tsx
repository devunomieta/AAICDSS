import React, { useState, useCallback } from 'react';
import { Upload, FileImage, AlertTriangle, CheckCircle, Brain, Activity } from 'lucide-react';
import axios from 'axios';

interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  results?: {
    predictions: Record<string, number>;
    uncertainty: Record<string, number>;
    heatmap?: string;
    gradcam?: string;
    report?: string;
  };
}

export default function DiagnosticWorkstation() {
  const [batch, setBatch] = useState<BatchItem[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: 'pending' as const,
        progress: 0,
      }));
      setBatch(prev => [...prev, ...newFiles]);
      if (activeIndex === null && newFiles.length > 0) {
        setActiveIndex(0);
      }
    }
  };

  const processQueue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // We process sequentially to save RAM (8GB constraint)
    for (let i = 0; i < batch.length; i++) {
      if (batch[i].status !== 'pending') continue;
      
      setActiveIndex(i);
      
      // Update status to uploading
      setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading', progress: 10 } : item));
      
      try {
        // 1. Upload
        const formData = new FormData();
        formData.append('files', batch[i].file);
        
        const uploadRes = await axios.post('http://localhost:8686/api/upload', formData);
        const serverPath = uploadRes.data.paths[0];
        
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing', progress: 40 } : item));
        
        // 2. Infer
        const inferData = new FormData();
        inferData.append('image_path', serverPath);
        const inferRes = await axios.post('http://localhost:8686/api/infer', inferData);
        
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 80, results: inferRes.data } : item));
        
        // 3. Report
        const reportData = new FormData();
        reportData.append('preds', JSON.stringify(inferRes.data.predictions));
        reportData.append('uncertainties', JSON.stringify(inferRes.data.uncertainty));
        
        const reportRes = await fetch('http://localhost:8686/api/report', {
          method: 'POST',
          body: reportData
        });
        
        const reader = reportRes.body?.getReader();
        const decoder = new TextDecoder();
        let reportText = "";
        
        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            reportText += decoder.decode(value);
            
            // Update the report text in real-time
            setBatch(prev => prev.map((item, idx) => idx === i ? { 
              ...item, 
              results: { ...item.results!, report: reportText } 
            } : item));
          }
        }
        
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'completed', progress: 100 } : item));
        
      } catch (error) {
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', progress: 0 } : item));
      }
    }
    
    setIsProcessing(false);
  };

  const activeItem = activeIndex !== null ? batch[activeIndex] : null;

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Diagnostic Workstation</h1>
          <p className="text-textMuted mt-1">Batch Analysis & Clinical Reporting</p>
        </div>
        <div className="relative">
          <input 
            type="file" 
            multiple 
            accept="image/*,.dcm" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleFileUpload}
          />
          <button className="bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-primary/20">
            <Upload size={18} />
            <span>Upload Scans</span>
          </button>
        </div>
      </div>

      <div className="flex gap-6 flex-1 h-[calc(100vh-140px)]">
        
        {/* Left Column: Batch Queue */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-background border border-border rounded-xl p-5 flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileImage size={20} className="text-primary" />
              Batch Queue
            </h2>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {batch.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-textMuted border-2 border-dashed border-border rounded-lg bg-surface/50">
                  <Upload size={40} className="mb-3 opacity-50" />
                  <p>Drag & drop scans here</p>
                  <p className="text-sm">Supports DICOM, PNG, JPG</p>
                </div>
              ) : (
                batch.map((item, idx) => (
                  <div 
                    key={item.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`p-4 rounded-lg cursor-pointer transition-all border ${
                      activeIndex === idx 
                        ? 'bg-primary/10 border-primary' 
                        : 'bg-surface border-border hover:border-gray-600'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm text-gray-200 truncate w-3/4" title={item.file.name}>
                        {item.file.name}
                      </span>
                      {item.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                      {item.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                      {['pending', 'uploading', 'processing'].includes(item.status) && (
                        <span className="text-xs font-semibold text-primary">
                          {item.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-background rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                        }`} 
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {batch.length > 0 && (
              <button 
                onClick={processQueue}
                disabled={isProcessing || !batch.some(i => i.status === 'pending')}
                className="mt-4 w-full bg-surface border border-border hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isProcessing ? 'Processing Queue...' : 'Process Pending Queue'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Viewer & Results */}
        <div className="w-2/3 flex flex-col gap-4">
          <div className="bg-background border border-border rounded-xl p-1 flex-1 relative overflow-hidden flex items-center justify-center group">
            {activeItem ? (
              <img 
                src={URL.createObjectURL(activeItem.file)} 
                alt="Scan viewer" 
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="text-textMuted flex flex-col items-center">
                <Brain size={48} className="mb-4 opacity-20" />
                <p>Select a scan from the batch queue to view</p>
              </div>
            )}
            
            {/* Validation Floating Bar */}
            {activeItem && activeItem.status === 'completed' && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur border border-border px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2">
                  <CheckCircle size={16} /> Accept
                </button>
                <div className="w-px h-8 bg-border"></div>
                <button className="bg-red-900/50 hover:bg-red-600 text-red-100 border border-red-800 hover:border-red-500 px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                  <AlertTriangle size={16} /> Override
                </button>
              </div>
            )}
          </div>

          {/* AI Report Box */}
          <div className="bg-background border border-border rounded-xl h-64 p-5 overflow-y-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} /> Thoracic AI Diagnostic Report
            </h3>
            
            {activeItem?.status === 'completed' ? (
              <div className="prose prose-invert max-w-none text-sm text-gray-300">
                {activeItem.results?.report || "*Report streaming unavailable.*"}
              </div>
            ) : activeItem?.status === 'processing' ? (
              <div className="flex flex-col items-center justify-center h-32 gap-3 text-primary animate-pulse">
                <Brain size={32} />
                <span className="text-sm font-medium">Generating Clinical Report...</span>
              </div>
            ) : (
              <div className="text-gray-500 text-sm italic">
                Awaiting pipeline execution to generate report.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

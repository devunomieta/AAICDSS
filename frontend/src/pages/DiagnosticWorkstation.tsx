import React, { useState, useRef, DragEvent } from 'react';
import { Upload, FileImage, AlertTriangle, CheckCircle, Brain, Activity, X } from 'lucide-react';
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
  
  // New States for Flow
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionCaseId, setSessionCaseId] = useState('');
  const [sessionUploadType, setSessionUploadType] = useState<'single' | 'batch' | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  
  // Drag State
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const endSession = () => {
    setSessionCaseId('');
    setSessionUploadType(null);
    setIsSessionActive(false);
    setBatch([]);
    setActiveIndex(null);
  };

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCaseId || !sessionUploadType) return;
    
    setIsSessionActive(true);
    setIsModalOpen(false);

    try {
      const formData = new FormData();
      formData.append('case_id', sessionCaseId);
      formData.append('upload_type', sessionUploadType);
      await axios.post('http://localhost:8686/api/init_case', formData);
    } catch (err) {
      console.error("Failed to initialize case in DB", err);
    }
    
    // Automatically trigger file picker when session starts
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList | null } }) => {
    if (e.target.files) {
      let newFiles = Array.from(e.target.files);
      if (sessionUploadType === 'single') {
        newFiles = [newFiles[0]];
      }
      
      const mappedFiles = newFiles.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: 'pending' as const,
        progress: 0,
      }));
      setBatch(prev => [...prev, ...mappedFiles]);
      if (activeIndex === null && mappedFiles.length > 0) {
        setActiveIndex(0);
      }
    }
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isSessionActive) {
      setIsDragging(true);
    }
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isSessionActive) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const processQueue = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    for (let i = 0; i < batch.length; i++) {
      if (batch[i].status !== 'pending') continue;
      
      setActiveIndex(i);
      setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading', progress: 10 } : item));
      
      try {
        const formData = new FormData();
        formData.append('case_id', sessionCaseId);
        formData.append('upload_type', sessionUploadType!);
        formData.append('files', batch[i].file);
        
        const uploadRes = await axios.post('http://localhost:8686/api/upload', formData);
        const serverPath = uploadRes.data.paths[0];
        
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing', progress: 40 } : item));
        
        const inferData = new FormData();
        inferData.append('image_path', serverPath);
        const inferRes = await axios.post('http://localhost:8686/api/infer', inferData);
        
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, progress: 80, results: inferRes.data } : item));
        
        const reportData = new FormData();
        reportData.append('preds', JSON.stringify(inferRes.data.predictions));
        reportData.append('uncertainties', JSON.stringify(inferRes.data.uncertainty));
        reportData.append('case_id', sessionCaseId);
        
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
    <div className="flex flex-col h-full gap-6 relative">
      
      {/* Initialization Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Initialize Upload Session</h2>
            <form onSubmit={startSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Case ID</label>
                <input 
                  type="text" 
                  value={sessionCaseId}
                  onChange={e => setSessionCaseId(e.target.value)}
                  placeholder="e.g. CASE-10293"
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-white focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Upload Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="uploadType" value="single" onChange={() => setSessionUploadType('single')} required />
                    <span className="text-gray-300">Single Scan</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="uploadType" value="batch" onChange={() => setSessionUploadType('batch')} required />
                    <span className="text-gray-300">Batch Scans</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full bg-primary hover:bg-primaryHover text-white py-2.5 rounded-lg font-medium transition-colors">
                Start Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        multiple={sessionUploadType === 'batch'}
        accept="image/*,.dcm" 
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileUpload}
      />

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Diagnostic Workstation</h1>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-textMuted">
              {isSessionActive ? `Active Session: ${sessionCaseId} (${sessionUploadType})` : "Batch Analysis & Clinical Reporting"}
            </p>
            {isSessionActive && (
              <button 
                onClick={endSession}
                className="text-red-400 hover:text-red-300 text-sm font-medium border border-red-500/30 hover:border-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1 rounded transition-colors"
              >
                End Session / Close Case
              </button>
            )}
          </div>
        </div>
        {!isSessionActive && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primaryHover text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-lg shadow-primary/20"
          >
            <Upload size={18} />
            <span>Upload Scans</span>
          </button>
        )}
      </div>

      <div className="flex gap-6 flex-1 h-[calc(100vh-140px)]">
        
        {/* Left Column: Image Queue */}
        <div className="w-1/3 flex flex-col gap-4">
          <div className="bg-background border border-border rounded-xl p-5 flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileImage size={20} className="text-primary" />
              Image Queue
            </h2>
            
            <div 
              className={`flex-1 overflow-y-auto pr-2 space-y-3 rounded-lg border-2 border-dashed transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-transparent'
              }`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            >
              {batch.length === 0 ? (
                <div 
                  className="h-full flex flex-col items-center justify-center text-textMuted border-2 border-dashed border-border rounded-lg bg-surface/50 cursor-pointer hover:border-gray-500 hover:text-gray-300 transition-colors"
                  onClick={() => !isSessionActive ? setIsModalOpen(true) : fileInputRef.current?.click()}
                >
                  <Upload size={40} className={`mb-3 ${isSessionActive ? 'opacity-100 text-primary' : 'opacity-50'}`} />
                  {isSessionActive ? (
                    <>
                      <p className="font-medium text-white">Drag & drop scans here</p>
                      <p className="text-sm">Or click to browse</p>
                    </>
                  ) : (
                    <>
                      <p>Click to initialize upload session</p>
                    </>
                  )}
                  <p className="text-xs mt-2 opacity-50">Supports DICOM, PNG, JPG</p>
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
                className={`mt-4 w-full border text-white py-2 rounded-lg text-sm font-medium transition-colors ${
                  isProcessing 
                    ? 'bg-surface border-border opacity-50 cursor-not-allowed' 
                    : batch.some(i => i.status === 'pending') 
                      ? 'bg-primary border-primary hover:bg-primaryHover shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                      : 'bg-surface border-border hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {isProcessing ? 'Processing Queue...' : 'Run Diagnostic Pipeline'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: AI Report (Top) & Viewer (Bottom) */}
        <div className="w-2/3 flex flex-col gap-4">
          
          {/* AI Report Box (Moved to Top) */}
          <div className="bg-background border border-border rounded-xl h-64 p-5 overflow-y-auto shrink-0 flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} /> AI Diagnostic Report
            </h3>
            
            {activeItem?.status === 'completed' ? (
              <div 
                className="prose prose-invert max-w-none text-sm text-gray-300 whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: (activeItem.results?.report || "*Report streaming unavailable.*")
                          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                }}
              />
            ) : activeItem?.status === 'processing' || activeItem?.status === 'uploading' ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-4">
                <div className="relative flex items-center justify-center">
                  <Brain size={48} className="text-primary animate-pulse opacity-20 absolute" />
                  <span className="text-2xl font-bold text-white relative z-10">{activeItem.progress}%</span>
                </div>
                <div className="text-sm font-medium text-primary animate-pulse">
                  {activeItem.progress < 40 ? "Uploading scan to server..." : 
                   activeItem.progress < 80 ? "Running PyTorch CNN Inference..." : 
                   "Streaming LLaMA-3 Clinical Report..."}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500 text-sm italic">
                Awaiting pipeline execution to generate report.
              </div>
            )}
          </div>

          {/* Scan Viewer (Moved to Bottom) */}
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
                <p>Select a scan from the image queue to view</p>
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

        </div>

      </div>
    </div>
  );
}

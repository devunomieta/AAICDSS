import React, { useState, useRef, DragEvent } from 'react';
import { Upload, FileImage, AlertTriangle, CheckCircle, Brain, Activity, X, Maximize, Minimize } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  results?: {
    predictions: Record<string, number>;
    uncertainty: Record<string, number>;
    ig_heatmap?: string;
    gradcam_heatmap?: string;
    report?: string;
  };
  serverPath?: string;
  validationStatus?: 'accepted' | 'overridden';
  startTime?: number;
  endTime?: number;
  displayedProgress?: number;
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
  
  // Timers and Analytics
  const [baselineEstimate, setBaselineEstimate] = useState<number>(25); // default fallback
  const [completedTimes, setCompletedTimes] = useState<number[]>([]);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [heatmapView, setHeatmapView] = useState<'original' | 'ig' | 'gradcam'>('original');
  const [isScanViewerExpanded, setIsScanViewerExpanded] = useState(false);

  React.useEffect(() => {
    // Fetch baseline
    axios.get('http://localhost:8686/api/analytics').then(res => {
      if (res.data?.avg_inference_time) {
        setBaselineEstimate(res.data.avg_inference_time);
      }
    }).catch(err => console.error("Error fetching analytics", err));
  }, []);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isProcessing) {
      interval = setInterval(() => {
        setCurrentTime(Date.now());
        setBatch(prev => prev.map(item => {
          if (['uploading', 'processing'].includes(item.status)) {
            const current = item.displayedProgress || 0;
            const target = item.progress;
            if (current < target) {
              return { ...item, displayedProgress: Math.min(target, current + 1) }; // +1 per 100ms
            }
          } else if (item.status === 'completed' && item.displayedProgress !== 100) {
            return { ...item, displayedProgress: 100 };
          }
          return item;
        }));
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isProcessing]);

  
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

      // Audit Log
      const auditData = new FormData();
      auditData.append('action', 'Case Started');
      auditData.append('user', 'radiologist');
      auditData.append('details', `Started ${sessionUploadType} case ${sessionCaseId}`);
      await axios.post('http://localhost:8686/api/audit/log', auditData);
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
        displayedProgress: 0,
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
      setHeatmapView('original'); // reset view for new item
      setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading', progress: 10, startTime: Date.now() } : item));
      
      try {
        const formData = new FormData();
        formData.append('case_id', sessionCaseId);
        formData.append('upload_type', sessionUploadType!);
        formData.append('files', batch[i].file);
        
        const uploadRes = await axios.post('http://localhost:8686/api/upload', formData);
        const serverPath = uploadRes.data.paths[0];
        
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing', progress: 40, serverPath } : item));
        
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
        
        const now = Date.now();
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'completed', progress: 100, endTime: now } : item));
        
        // Track completed time for rolling average
        const itemStart = batch[i].startTime || now;
        setCompletedTimes(prev => [...prev, (now - itemStart) / 1000]);
        
      } catch (error) {
        setBatch(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', progress: 0, endTime: Date.now() } : item));
      }
    }
    
    setIsProcessing(false);
  };

  const activeItem = activeIndex !== null ? batch[activeIndex] : null;

  // Calculate dynamic estimate
  const dynamicEstimate = completedTimes.length > 0 
    ? completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length 
    : baselineEstimate;

  const handleValidation = async (type: 'accept' | 'override') => {
    if (!activeItem || activeIndex === null) return;
    if (activeItem.validationStatus) return; // Already validated

    const topPred = activeItem.results?.predictions 
      ? Object.keys(activeItem.results.predictions)[0] 
      : 'Unknown';
      
    const actual_decision = type === 'accept' ? `Accepted: ${topPred}` : `Overridden: Needs review`;
    
    // Optimistic UI update
    setBatch(prev => prev.map((item, idx) => idx === activeIndex ? { ...item, validationStatus: type === 'accept' ? 'accepted' : 'overridden' } : item));

    try {
      const formData = new FormData();
      formData.append('image_path', activeItem.serverPath || activeItem.file.name);
      formData.append('prediction', topPred);
      formData.append('actual_decision', actual_decision);
      formData.append('user', 'radiologist');
      
      await axios.post('http://localhost:8686/api/feedback', formData);
      
      // Audit Log
      const auditData = new FormData();
      auditData.append('action', `Diagnosis ${type === 'accept' ? 'Accepted' : 'Overridden'}`);
      auditData.append('user', 'radiologist');
      auditData.append('details', `Case: ${sessionCaseId || 'Unknown'} - ${actual_decision}`);
      await axios.post('http://localhost:8686/api/audit/log', auditData);
      
    } catch (error) {
      console.error("Failed to submit validation", error);
      // Revert optimistic update on error if needed, but keeping it simple here
    }
  };

  const renderScanViewerContent = (isExpanded: boolean) => (
    <>
      {/* Top Toolbar (Heatmap Toggle & Expand) */}
      <div className="bg-surface/50 border-b border-border p-2 flex justify-between items-center z-20">
        <div className="flex gap-2">
          {activeItem && activeItem.status === 'completed' && (
            <div className="bg-background border border-border rounded-lg p-1 flex gap-1 shadow-sm">
              <button 
                onClick={() => setHeatmapView('original')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${heatmapView === 'original' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-surface'}`}
              >
                Original
              </button>
              <button 
                onClick={() => setHeatmapView('ig')}
                disabled={!activeItem.results?.ig_heatmap}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${heatmapView === 'ig' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                IG Heatmap
              </button>
              <button 
                onClick={() => setHeatmapView('gradcam')}
                disabled={!activeItem.results?.gradcam_heatmap}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${heatmapView === 'gradcam' ? 'bg-primary text-white' : 'text-gray-400 hover:text-white hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed'}`}
              >
                Grad-CAM
              </button>
            </div>
          )}
        </div>
        <button 
          onClick={() => setIsScanViewerExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white bg-background border border-border rounded-lg p-2 hover:bg-surface transition-colors"
          title={isExpanded ? "Minimize" : "Fullscreen"}
        >
          {isExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>

      {/* Image Container */}
      <div className="flex-1 relative flex items-center justify-center p-2 min-h-0 bg-black/20">
        {activeItem ? (
          <img 
            src={
              heatmapView === 'ig' && activeItem.results?.ig_heatmap 
                ? `http://localhost:8686/${activeItem.results.ig_heatmap}` 
                : heatmapView === 'gradcam' && activeItem.results?.gradcam_heatmap
                  ? `http://localhost:8686/${activeItem.results.gradcam_heatmap}`
                  : URL.createObjectURL(activeItem.file)
            } 
            alt="Scan viewer" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-textMuted flex flex-col items-center">
            <Brain size={48} className="mb-4 opacity-20" />
            <p>Select a scan from the image queue to view</p>
          </div>
        )}
      </div>
      
      {/* Legends Overlay */}
      {activeItem && activeItem.status === 'completed' && heatmapView !== 'original' && (
        <div className="absolute bottom-20 right-4 bg-surface/95 backdrop-blur-md border border-border p-3 rounded-lg shadow-xl text-xs z-20 w-48">
          <p className="font-bold text-gray-200 mb-2 border-b border-border/50 pb-1.5">
            {heatmapView === 'ig' ? 'IG Heatmap Legend' : 'Grad-CAM Legend'}
          </p>
          {heatmapView === 'ig' ? (
            <div className="space-y-2.5 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                <span className="text-gray-300 font-medium">Positive Evidence</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                <span className="text-gray-300 font-medium">Negative Evidence</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-full h-3 rounded-sm bg-gradient-to-r from-blue-500 via-green-500 to-red-500"></div>
              </div>
              <div className="flex justify-between text-gray-400 font-medium">
                <span>Low</span>
                <span>High Activation</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Validation Action Footer */}
      {activeItem && activeItem.status === 'completed' && (
        <div className="bg-surface/50 border-t border-border p-3 flex justify-center items-center gap-4 z-20">
          {!activeItem.validationStatus ? (
            <>
              <button onClick={() => handleValidation('accept')} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-green-900/20 transition-all hover:-translate-y-0.5">
                <CheckCircle size={16} /> Accept Diagnosis
              </button>
              <button onClick={() => handleValidation('override')} className="bg-red-900/50 hover:bg-red-600 text-red-100 border border-red-800 hover:border-red-500 px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all hover:-translate-y-0.5">
                <AlertTriangle size={16} /> Override
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 px-6 py-2 bg-background/80 rounded-lg border border-border shadow-inner">
              {activeItem.validationStatus === 'accepted' ? (
                <span className="text-green-400 flex items-center gap-2 font-medium text-sm"><CheckCircle size={16} /> Diagnosis Accepted</span>
              ) : (
                <span className="text-red-400 flex items-center gap-2 font-medium text-sm"><AlertTriangle size={16} /> Diagnosis Overridden</span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );

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

      {/* Fullscreen Scan Viewer Modal */}
      {isScanViewerExpanded && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-background border border-border rounded-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col relative overflow-hidden shadow-2xl">
            {renderScanViewerContent(true)}
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
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

      <div className="flex flex-col lg:flex-row gap-6 flex-1 h-auto lg:h-[calc(100vh-140px)]">
        
        {/* Left Column: Image Queue */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
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
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === 'completed' ? 'bg-green-500' : 'bg-primary'
                        }`} 
                        style={{ width: `${item.displayedProgress || 0}%` }}
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
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          
          {/* AI Report Box (Moved to Top) */}
          <div className="bg-background border border-border rounded-xl h-48 p-4 overflow-y-auto shrink-0 flex flex-col">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={16} /> AI Diagnostic Report
            </h3>
            
            {activeItem?.status === 'completed' ? (
              <div className="prose prose-invert max-w-none text-sm text-gray-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeItem.results?.report || "*Report streaming unavailable.*"}
                </ReactMarkdown>
              </div>
            ) : activeItem?.status === 'processing' || activeItem?.status === 'uploading' ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-4 w-full">
                {/* Visual Indicators & Timers */}
                <div className="flex justify-between w-full px-4 items-center">
                  <div className="text-center">
                    <p className="text-[10px] text-textMuted mb-1 uppercase tracking-wider font-bold">Elapsed</p>
                    <p className="text-lg font-mono text-white">
                      {Math.floor((currentTime - (activeItem.startTime || currentTime)) / 1000)}s
                    </p>
                  </div>
                  
                  <div className="relative flex items-center justify-center">
                    <Brain size={42} className="text-primary animate-pulse opacity-20 absolute" />
                    <span className="text-xl font-bold text-white relative z-10 drop-shadow-md">
                      {Math.floor(activeItem.displayedProgress || 0)}%
                    </span>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-[10px] text-textMuted mb-1 uppercase tracking-wider font-bold">Est. Total</p>
                    <p className="text-lg font-mono text-gray-400">
                      ~{Math.round(dynamicEstimate)}s
                    </p>
                  </div>
                </div>

                {/* Pipeline Stages Checklist */}
                <div className="w-full max-w-sm bg-surface/30 rounded-lg p-2.5 border border-border">
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-3 text-xs">
                      <div className={`rounded-full p-1 ${activeItem.progress >= 40 ? 'text-green-400' : 'text-gray-500'}`}>
                        {activeItem.progress >= 40 ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                      </div>
                      <span className={activeItem.progress >= 40 ? 'text-gray-300' : 'text-gray-500'}>Uploading scan to server</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs">
                      <div className={`rounded-full p-1 ${activeItem.progress >= 80 ? 'text-green-400' : 'text-gray-500'}`}>
                        {activeItem.progress >= 80 ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                      </div>
                      <span className={activeItem.progress >= 80 ? 'text-gray-300' : 'text-gray-500'}>Running CNN Inference</span>
                    </li>
                    <li className="flex items-center gap-3 text-xs">
                      <div className={`rounded-full p-1 ${activeItem.progress === 100 ? 'text-green-400' : 'text-gray-500'}`}>
                        {activeItem.progress === 100 ? <CheckCircle size={12} /> : <div className="w-3 h-3 rounded-full border border-current" />}
                      </div>
                      <span className={activeItem.progress === 100 ? 'text-gray-300' : 'text-gray-500'}>Generating Clinical Report</span>
                    </li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-500 text-sm italic">
                Awaiting pipeline execution to generate report.
              </div>
            )}
          </div>

          {/* Scan Viewer (Moved to Bottom) */}
          <div className="bg-background border border-border rounded-xl flex-1 flex flex-col relative overflow-hidden group">
            {renderScanViewerContent(false)}
          </div>

        </div>

      </div>
    </div>
  );
}

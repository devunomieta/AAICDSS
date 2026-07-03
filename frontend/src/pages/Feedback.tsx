import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, Clock, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../components/ToastContext';

interface FeedbackProps {
  userRole: 'radiologist' | 'compliance' | 'admin' | null;
}

interface FeedbackItem {
  timestamp: number;
  user: string;
  image: string;
  ai_prediction: string;
  radiologist_decision: string;
  status: string;
}

export default function Feedback({ userRole }: FeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await axios.get('http://localhost:8686/api/feedback');
      setFeedback(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching feedback", error);
      showToast("Failed to load feedback data", "error");
      setLoading(false);
    }
  };

  const handleApprove = async (timestamp: number) => {
    if (userRole !== 'compliance') return;
    
    try {
      const formData = new FormData();
      formData.append('timestamp', timestamp.toString());
      const response = await axios.post('http://localhost:8686/api/feedback/approve', formData);
      if (response.data.status === 'success') {
        showToast("Case approved for retraining pipeline", "success");
        fetchFeedback(); // Refresh list
      } else {
        showToast(response.data.message || "Approval failed", "error");
      }
    } catch (error) {
      console.error("Error approving feedback", error);
      showToast("Failed to approve case", "error");
    }
  };

  // Derived state for filtering and sorting
  let filteredData = feedback.filter(item => {
    const matchesSearch = item.ai_prediction.toLowerCase().includes(search.toLowerCase()) || 
                          item.radiologist_decision.toLowerCase().includes(search.toLowerCase()) ||
                          item.image.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === 'All' || item.status.includes(statusFilter);
    return matchesSearch && matchesFilter;
  });

  filteredData.sort((a, b) => {
    if (sortOrder === 'newest') return b.timestamp - a.timestamp;
    return a.timestamp - b.timestamp;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (ts: number) => {
    return new Date(ts * 1000).toLocaleString();
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
          <MessageSquare className="text-primary" /> Feedback Board
        </h1>
        <p className="text-textMuted mt-1">Review overridden diagnoses for model fine-tuning (Compliance Officer access required)</p>
      </div>

      <div className="bg-background border border-border rounded-xl flex-1 flex flex-col overflow-hidden shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/30">
          <div className="flex items-center gap-4 w-1/2 max-w-md">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Search predictions or overrides..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-background border border-border rounded-lg px-3 py-2 text-sm">
              <Filter size={16} className="text-gray-500 mr-2" />
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent text-white focus:outline-none border-none outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending Compliance</option>
                <option value="Retraining Ready">Retraining Ready</option>
                <option value="Accepted">Accepted</option>
              </select>
            </div>
            
            <select 
              value={sortOrder} 
              onChange={(e) => { setSortOrder(e.target.value as any); setCurrentPage(1); }}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-6 gap-4 bg-surface p-4 border-b border-border text-xs font-bold text-gray-400 uppercase tracking-wider">
          <div>Date</div>
          <div>Image Reference</div>
          <div>AI Prediction</div>
          <div>Radiologist Override</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {loading ? (
            <div className="flex justify-center items-center h-full text-gray-500">Loading feedback...</div>
          ) : paginatedData.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">No feedback cases found.</div>
          ) : (
            paginatedData.map((item, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-4 items-center p-4 bg-surface/30 hover:bg-surface/60 border border-transparent hover:border-border rounded-lg transition-colors">
                <div className="text-xs text-textMuted">{formatDate(item.timestamp)}</div>
                <div className="font-mono text-xs text-primary font-bold truncate" title={item.image}>
                  {item.image.split('/').pop() || item.image.split('\\').pop()}
                </div>
                <div className="text-sm text-gray-300 truncate" title={item.ai_prediction}>{item.ai_prediction}</div>
                <div className="text-sm text-gray-300 italic truncate" title={item.radiologist_decision}>{item.radiologist_decision}</div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap ${
                    item.status.includes('Pending') ? 'bg-amber-900/30 text-amber-500 border border-amber-900/50' : 
                    item.status === 'Retraining Ready' ? 'bg-purple-900/30 text-purple-400 border border-purple-900/50' : 
                    'bg-green-900/30 text-green-500 border border-green-900/50'
                  }`}>
                    {item.status.includes('Pending') ? <Clock size={10} /> : <CheckCircle size={10} />}
                    {item.status}
                  </span>
                </div>
                <div className="text-right" title={userRole !== 'compliance' ? "Compliance Officer access required" : ""}>
                  <button 
                    onClick={() => handleApprove(item.timestamp)}
                    disabled={!item.status.includes('Pending') || userRole !== 'compliance'}
                    className="bg-primary hover:bg-primaryHover disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Approve for Retrain
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pagination */}
        {!loading && filteredData.length > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between bg-surface/30 shrink-0">
            <span className="text-sm text-textMuted">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} cases
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded bg-background border border-border text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded bg-background border border-border text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

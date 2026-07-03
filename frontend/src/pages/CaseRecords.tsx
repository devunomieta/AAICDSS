import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../components/ToastContext';
import { Search, Filter, ChevronLeft, ChevronRight, FileText, CheckCircle, Clock, FileImage, X, Trash2 } from 'lucide-react';

interface CaseRecord {
  id: number;
  case_id: string;
  upload_type: string;
  radiologist: string;
  status: string;
  timestamp: string;
  results: any;
}

interface DeletedCaseRecord {
  id: number;
  case_id: string;
  started_by: string;
  files_processed: number;
  deleted_by: string;
  started_at: string;
  deleted_at: string;
  reason: string;
}

interface Props {
  userRole?: 'radiologist' | 'compliance' | null;
  userName?: string;
}

export default function CaseRecords({ userRole, userName }: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'deleted'>('active');
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [deletedCases, setDeletedCases] = useState<DeletedCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  // Table State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  // Modals
  const [selectedCase, setSelectedCase] = useState<CaseRecord | null>(null);
  const [caseToDelete, setCaseToDelete] = useState<CaseRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (activeTab === 'active') {
      fetchCases();
    } else {
      fetchDeletedCases();
    }
    setCurrentPage(1);
  }, [activeTab]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8686/api/cases');
      setCases(res.data.cases);
    } catch (err) {
      console.error("Error fetching cases", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeletedCases = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:8686/api/deleted_cases');
      setDeletedCases(res.data.deleted_cases);
    } catch (err) {
      console.error("Error fetching deleted cases", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!caseToDelete || !userRole || !userName) return;
    
    // Validate reason if compliance is deleting a non-pending case
    if (userRole === 'compliance' && !deleteReason.trim()) {
      showToast("Please provide a reason for deletion.", 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('deleted_by', userName);
      formData.append('user_role', userRole);
      formData.append('reason', deleteReason);
      
      await axios.post(`http://localhost:8686/api/cases/${caseToDelete.case_id}/delete`, formData);
      
      try {
        const auditData = new FormData();
        auditData.append('action', 'Case Deletion');
        auditData.append('user', userRole || 'Unknown');
        auditData.append('details', `Deleted case ${caseToDelete.case_id}. Reason: ${deleteReason || 'None provided'}`);
        await axios.post('http://localhost:8686/api/audit/log', auditData);
      } catch (err) {
        console.error("Audit log failed", err);
      }
      
      setCaseToDelete(null);
      setDeleteReason('');
      showToast('Case deleted successfully.', 'success');
      fetchCases();
      fetchDeletedCases();
    } catch (err) {
      console.error("Error deleting case", err);
      showToast("Failed to delete case.", 'error');
    }
  };

  // Derived filtered/sorted list for active cases
  const filteredCases = cases.filter(c => {
    if (search && !c.case_id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    return true;
  });

  const filteredDeleted = deletedCases.filter(c => {
    if (search && !c.case_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeList = activeTab === 'active' ? filteredCases : filteredDeleted;
  const totalPages = Math.ceil(activeList.length / itemsPerPage);
  const paginatedList = activeList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto relative">
      
      {/* Delete Confirmation Modal */}
      {caseToDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-2">Delete Case {caseToDelete.case_id}?</h2>
            <p className="text-textMuted text-sm mb-6">
              This action will permanently remove the case and its clinical report from the active records. It will be archived in the deletion history.
            </p>
            
            {userRole === 'compliance' && caseToDelete.status !== 'pending' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Deletion <span className="text-red-400">*</span></label>
                <textarea 
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value)}
                  placeholder="State the reason for overriding and deleting this completed case..."
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary min-h-[100px]"
                />
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => { setCaseToDelete(null); setDeleteReason(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-colors"
              >
                Confirm Deletion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Case Details Modal */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 md:p-4 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-white">Case Details: {selectedCase.case_id}</h2>
                <p className="text-textMuted text-sm mt-1">Uploaded by {selectedCase.radiologist} on {formatDate(selectedCase.timestamp)}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
              {/* Left: Images */}
              <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-border p-4 md:p-6 overflow-y-visible md:overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileImage size={20} /> Scans</h3>
                <div className="grid grid-cols-2 gap-4">
                  {selectedCase.results?.images && selectedCase.results.images.length > 0 ? (
                    selectedCase.results.images.map((img: string, idx: number) => {
                      const filename = img.split('/').pop() || img.split('\\').pop();
                      return (
                        <div key={idx} className="bg-background rounded-lg border border-border aspect-square overflow-hidden flex items-center justify-center relative group">
                          <img 
                            src={`http://localhost:8686/uploads/${filename}`} 
                            alt={filename} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] text-white font-medium truncate w-full">{filename}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 text-textMuted py-8 text-center italic">No images processed.</div>
                  )}
                </div>
              </div>
              
              {/* Right: Report */}
              <div className="w-full md:w-1/2 p-4 md:p-6 overflow-y-visible md:overflow-y-auto">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><FileText size={20} /> Diagnostic Report</h3>
                <div className="bg-background rounded-lg p-5 border border-border">
                  {selectedCase.results?.report ? (
                    <div 
                      className="prose prose-invert max-w-none text-sm text-gray-300 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: selectedCase.results.report.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }}
                    />
                  ) : (
                    <div className="text-textMuted italic">No report available for this case.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-6 gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Case Records</h1>
          <p className="text-textMuted mt-1">Review historical diagnostics and associated reports</p>
        </div>
        <div className="flex bg-surface rounded-lg p-1 border border-border">
          <button 
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-white'}`}
          >
            Active Cases
          </button>
          <button 
            onClick={() => setActiveTab('deleted')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'deleted' ? 'bg-primary text-white shadow-sm' : 'text-textMuted hover:text-white'}`}
          >
            Deleted History
          </button>
        </div>
      </div>

      <div className="bg-background border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/30">
          <div className="flex items-center gap-4 w-1/2 max-w-md">
            <div className="relative w-full">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search Case ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          {activeTab === 'active' && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-textMuted bg-surface px-3 py-2 rounded-lg border border-border">
                <Filter size={16} />
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-transparent text-white outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead className="bg-surface/50 text-xs uppercase text-textMuted sticky top-0 z-10 shadow-sm backdrop-blur-md border-b border-border">
              {activeTab === 'active' ? (
                <tr>
                  <th className="px-6 py-4 font-semibold">Case ID</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Type</th>
                  <th className="px-6 py-4 font-semibold">Radiologist</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-6 py-4 font-semibold">Case ID</th>
                  <th className="px-6 py-4 font-semibold">Started By</th>
                  <th className="px-6 py-4 font-semibold">Scans</th>
                  <th className="px-6 py-4 font-semibold">Deleted By</th>
                  <th className="px-6 py-4 font-semibold">Deleted At</th>
                  <th className="px-6 py-4 font-semibold">Reason</th>
                </tr>
              )}
            </thead>
            <tbody className="text-sm divide-y divide-border text-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'active' ? 6 : 6} className="px-6 py-12 text-center text-textMuted">Loading cases...</td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'active' ? 6 : 6} className="px-6 py-12 text-center text-textMuted">No records found.</td>
                </tr>
              ) : activeTab === 'active' ? (
                (paginatedList as CaseRecord[]).map(c => {
                  const canDelete = c.status === 'pending' || userRole === 'compliance';
                  return (
                    <tr 
                      key={c.id} 
                      className="hover:bg-surface/60 transition-colors group"
                    >
                      <td className="px-6 py-4 font-medium text-white cursor-pointer group-hover:text-primary transition-colors" onClick={() => setSelectedCase(c)}>
                        {c.case_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap cursor-pointer" onClick={() => setSelectedCase(c)}>{formatDate(c.timestamp)}</td>
                      <td className="px-6 py-4 capitalize cursor-pointer" onClick={() => setSelectedCase(c)}>{c.upload_type}</td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedCase(c)}>{c.radiologist}</td>
                      <td className="px-6 py-4 cursor-pointer" onClick={() => setSelectedCase(c)}>
                        {c.status === 'completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            <CheckCircle size={14} /> Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 capitalize">
                            <Clock size={14} /> {c.status}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          disabled={!canDelete}
                          onClick={(e) => { e.stopPropagation(); setCaseToDelete(c); }}
                          className={`p-2 rounded-lg transition-colors ${canDelete ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-600 cursor-not-allowed'}`}
                          title={canDelete ? "Delete Case" : "Only Compliance can delete non-pending cases"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                (paginatedList as DeletedCaseRecord[]).map(c => (
                  <tr key={c.id} className="hover:bg-surface/60 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{c.case_id}</td>
                    <td className="px-6 py-4">{c.started_by}</td>
                    <td className="px-6 py-4">{c.files_processed} scans</td>
                    <td className="px-6 py-4 font-medium text-red-400">{c.deleted_by}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(c.deleted_at)}</td>
                    <td className="px-6 py-4 max-w-xs truncate text-textMuted" title={c.reason}>{c.reason || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-surface/30 shrink-0 text-sm">
          <span className="text-textMuted">
            Showing <span className="text-white font-medium">{activeList.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, activeList.length)}</span> of <span className="text-white font-medium">{activeList.length}</span> entries
          </span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md border border-border text-gray-400 hover:text-white hover:bg-surface disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-white font-medium px-2">Page {currentPage} of {totalPages || 1}</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-md border border-border text-gray-400 hover:text-white hover:bg-surface disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}

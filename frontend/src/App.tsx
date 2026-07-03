import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Activity, BarChart2, Database, MessageSquare, Settings, Bell, LogOut, Info, ChevronLeft, ChevronRight, FolderClock, Users, Menu, X } from 'lucide-react';
import axios from 'axios';
import aIcon from './assets/A-Icon.png';
import { useToast } from './components/ToastContext';
import DiagnosticWorkstation from './pages/DiagnosticWorkstation';
import Dashboard from './pages/Dashboard';
import CaseRecords from './pages/CaseRecords';
import Feedback from './pages/Feedback';
import SettingsPage from './pages/Settings';
import Updates from './pages/Updates';
import Login from './pages/Login';
import { ModelRetraining, ManageSystem } from './pages/AdminPages';

interface SidebarProps {
  onLogout: () => void;
  userRole: 'radiologist' | 'compliance' | 'admin' | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

function Sidebar({ onLogout, userRole, isCollapsed, setIsCollapsed, isMobileMenuOpen, setIsMobileMenuOpen }: SidebarProps) {
  const location = useLocation();
  const { showToast } = useToast();
  const isActive = (path: string) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  const [pendingFeedback, setPendingFeedback] = useState(0);

  useEffect(() => {
    // Fetch notifications count
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('http://localhost:8686/api/analytics');
        setPendingFeedback(res.data.pending_compliance || 0);
      } catch (e) {
        console.error("Error fetching analytics for notifications", e);
      }
    };
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <>
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-background border-r border-border h-screen flex flex-col py-4 fixed left-0 top-0 transition-transform duration-300 z-50 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className={`flex items-center text-primary font-bold text-xl mb-10 mt-2 px-6 ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
        <img src={aIcon} alt="AffiongAI Icon" className="w-8 h-8 object-contain shrink-0" />
        {!isCollapsed && <span className="text-white hidden md:block">AffiongAI</span>}
      </div>
      
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-surface border border-border rounded-full p-1 text-textMuted hover:text-white hover:bg-primary z-50 transition-colors hidden md:block"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      
      <button 
        onClick={() => setIsMobileMenuOpen(false)}
        className="absolute right-4 top-4 text-textMuted hover:text-white md:hidden"
      >
        <X size={24} />
      </button>

      <nav className="flex flex-col gap-2">
        <Link to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
          <BarChart2 size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Analytics</span>}
        </Link>
        {userRole === 'radiologist' && (
          <Link to="/diagnostic" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/diagnostic') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
            <Activity size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">Inference</span>}
          </Link>
        )}
        <Link to="/cases" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/cases') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
          <FolderClock size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Case Records</span>}
        </Link>
        <Link to="/feedback" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-lg transition-colors relative ${isActive('/feedback') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
          <div className="relative">
            <MessageSquare size={20} className="shrink-0" />
            {pendingFeedback > 0 && (
              <div className={`absolute -top-1.5 -right-1.5 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-background ${isCollapsed ? 'w-4 h-4' : 'w-4 h-4'}`}>
                {pendingFeedback > 9 ? '9+' : pendingFeedback}
              </div>
            )}
          </div>
          {!isCollapsed && <span className="font-medium">Feedback Board</span>}
        </Link>
        <button className={`flex items-center px-4 py-3 text-textMuted hover:bg-surface hover:text-white rounded-lg transition-colors text-left ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4 w-[calc(100%-2rem)]'}`} onClick={() => { showToast('PACS Gateway coming soon'); setIsMobileMenuOpen(false); }}>
          <Database size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">PACS Gateway</span>}
        </button>

        {userRole === 'admin' && (
          <>
            <div className={`mt-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'ml-6'}`}>Admin</div>
            <Link to="/admin/retrain" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/retrain') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
              <Database size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium">Retraining Pipeline</span>}
            </Link>
            <Link to="/admin/manage" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/manage') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
              <Settings size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium">Manage System</span>}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto border-t border-border pt-4 pb-2">
        <div className={`flex items-center px-4 py-3 mb-2 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className={`w-10 h-10 rounded-full ${userRole === 'compliance' ? 'bg-amber-600' : userRole === 'admin' ? 'bg-purple-600' : 'bg-primary'} flex items-center justify-center text-white font-bold shrink-0`}>
            {userRole === 'compliance' ? 'SJ' : userRole === 'admin' ? 'AD' : 'DR'}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="font-bold text-sm text-textMain truncate">
                {userRole === 'compliance' ? 'Sarah Jenkins' : userRole === 'admin' ? 'System Admin' : 'Dr. Affiong'}
              </span>
              <span className="text-xs text-textMuted font-medium uppercase tracking-wider">
                {userRole === 'compliance' ? 'Compliance' : userRole === 'admin' ? 'Engineering' : 'Radiology'}
              </span>
            </div>
          )}
        </div>
        {/* System Updates and System Settings hidden as requested */}
        <button 
          onClick={onLogout}
          className={`flex items-center px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors text-left mt-1 ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4 w-[calc(100%-2rem)]'}`}
        >
          <LogOut size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </button>
      </div>
    </div>
    </>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'radiologist' | 'compliance' | 'admin' | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = (role: 'radiologist' | 'compliance' | 'admin') => {
    setUserRole(role);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div className="flex bg-surface min-h-screen">
        <Sidebar 
          onLogout={handleLogout} 
          userRole={userRole} 
          isCollapsed={isSidebarCollapsed} 
          setIsCollapsed={setIsSidebarCollapsed} 
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <main className={`ml-0 flex flex-col ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} flex-1 h-screen overflow-hidden transition-all duration-300 relative`}>
          {/* Mobile Top Bar */}
          <div className="md:hidden flex items-center justify-between bg-surface border-b border-border p-4 shrink-0 shadow-sm z-30">
            <div className="flex items-center gap-2">
              <img src={aIcon} alt="AffiongAI" className="w-8 h-8 object-contain" />
              <span className="font-bold text-white text-lg">AffiongAI</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="bg-background border border-border p-2 rounded-lg text-white"
            >
              <Menu size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {userRole === 'radiologist' && <Route path="/diagnostic" element={<DiagnosticWorkstation />} />}
            <Route path="/cases" element={<CaseRecords userRole={userRole} userName={userRole === 'radiologist' ? 'Dr. Affiong' : userRole === 'admin' ? 'System Admin' : 'Sarah Jenkins'} />} />
            <Route path="/feedback" element={<Feedback userRole={userRole} />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/updates" element={<Updates />} />
            {userRole === 'admin' && <Route path="/admin/retrain" element={<ModelRetraining />} />}
            {userRole === 'admin' && <Route path="/admin/manage" element={<ManageSystem />} />}
            <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

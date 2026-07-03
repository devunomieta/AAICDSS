import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Activity, BarChart2, Database, MessageSquare, Settings, Bell, LogOut, Info, ChevronLeft, ChevronRight, FolderClock } from 'lucide-react';
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
import { ModelRetraining, UserManagement, SystemConfig, AuditLogs } from './pages/AdminPages';

interface SidebarProps {
  onLogout: () => void;
  userRole: 'radiologist' | 'compliance' | 'admin' | null;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

function Sidebar({ onLogout, userRole, isCollapsed, setIsCollapsed }: SidebarProps) {
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
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} bg-background border-r border-border h-screen flex flex-col py-4 fixed left-0 top-0 transition-all duration-300 z-50`}>
      <div className={`flex items-center text-primary font-bold text-xl mb-10 mt-2 px-6 ${isCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
        <img src={aIcon} alt="AffiongAI Icon" className="w-8 h-8 object-contain shrink-0" />
      </div>
      
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 bg-surface border border-border rounded-full p-1 text-textMuted hover:text-white hover:bg-primary z-50 transition-colors"
      >
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <nav className="flex flex-col gap-2">
        <Link to="/dashboard" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
          <BarChart2 size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Analytics</span>}
        </Link>
        {userRole === 'radiologist' && (
          <Link to="/diagnostic" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/diagnostic') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
            <Activity size={20} className="shrink-0" />
            {!isCollapsed && <span className="font-medium">Inference</span>}
          </Link>
        )}
        <Link to="/cases" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/cases') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
          <FolderClock size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">Case Records</span>}
        </Link>
        <Link to="/feedback" className={`flex items-center px-4 py-3 rounded-lg transition-colors relative ${isActive('/feedback') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
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
        <button className={`flex items-center px-4 py-3 text-textMuted hover:bg-surface hover:text-white rounded-lg transition-colors text-left ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4 w-[calc(100%-2rem)]'}`} onClick={() => showToast('PACS Gateway coming soon')}>
          <Database size={20} className="shrink-0" />
          {!isCollapsed && <span className="font-medium">PACS Gateway</span>}
        </button>

        {userRole === 'admin' && (
          <>
            <div className={`mt-4 mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'ml-6'}`}>Admin</div>
            <Link to="/admin/retrain" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/retrain') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
              <Database size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium">Retraining Pipeline</span>}
            </Link>
            <Link to="/admin/users" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/users') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
              <Users size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium">User Management</span>}
            </Link>
            <Link to="/admin/config" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/config') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
              <Settings size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium">System Config</span>}
            </Link>
            <Link to="/admin/audit" className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive('/admin/audit') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'} ${isCollapsed ? 'justify-center mx-2' : 'gap-3 mx-4'}`}>
              <Activity size={20} className="shrink-0" />
              {!isCollapsed && <span className="font-medium">Audit Logs</span>}
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
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'radiologist' | 'compliance' | 'admin' | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
        <Sidebar onLogout={handleLogout} userRole={userRole} isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />
        <main className={`${isSidebarCollapsed ? 'ml-20' : 'ml-64'} flex-1 p-8 h-screen overflow-y-auto transition-all duration-300`}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {userRole === 'radiologist' && <Route path="/diagnostic" element={<DiagnosticWorkstation />} />}
            <Route path="/cases" element={<CaseRecords userRole={userRole} userName={userRole === 'radiologist' ? 'Dr. Affiong' : userRole === 'admin' ? 'System Admin' : 'Sarah Jenkins'} />} />
            <Route path="/feedback" element={<Feedback userRole={userRole} />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/updates" element={<Updates />} />
            {userRole === 'admin' && (
              <>
                <Route path="/admin/retrain" element={<ModelRetraining />} />
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/config" element={<SystemConfig />} />
                <Route path="/admin/audit" element={<AuditLogs />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Activity, BarChart2, Database, MessageSquare, Settings, Bell, LogOut, Info } from 'lucide-react';
import DiagnosticWorkstation from './pages/DiagnosticWorkstation';
import Dashboard from './pages/Dashboard';
import Feedback from './pages/Feedback';
import SettingsPage from './pages/Settings';
import Updates from './pages/Updates';

function Sidebar() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path === '/dashboard' && location.pathname === '/');
  
  return (
    <div className="w-64 bg-background border-r border-border h-screen flex flex-col p-4 fixed left-0 top-0">
      <div className="flex items-center gap-3 text-primary font-bold text-xl mb-10 mt-2 px-2">
        <Activity size={28} />
        <span>AffiongAI</span>
      </div>

      <nav className="flex flex-col gap-2">
        <Link to="/diagnostic" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/diagnostic') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'}`}>
          <Activity size={20} />
          <span className="font-medium">Inference</span>
        </Link>
        <Link to="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/dashboard') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'}`}>
          <BarChart2 size={20} />
          <span className="font-medium">Analytics</span>
        </Link>
        <button className="flex items-center gap-3 px-4 py-3 text-textMuted hover:bg-surface hover:text-white rounded-lg transition-colors text-left" onClick={() => alert('PACS Gateway coming soon')}>
          <Database size={20} />
          <span className="font-medium">PACS Gateway</span>
        </button>
        <Link to="/feedback" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/feedback') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'}`}>
          <MessageSquare size={20} />
          <span className="font-medium">Feedback Board</span>
        </Link>
      </nav>

      <div className="mt-auto border-t border-border pt-4 pb-2">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
            DR
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-textMain">Dr. Affiong</span>
            <span className="text-xs text-textMuted font-medium uppercase tracking-wider">Radiology</span>
          </div>
        </div>
        
        <Link to="/updates" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/updates') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'}`}>
          <Info size={20} />
          <span className="font-medium">System Updates</span>
        </Link>
        <Link to="/settings" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/settings') ? 'bg-primary text-white' : 'text-textMuted hover:bg-surface hover:text-white'}`}>
          <Settings size={20} />
          <span className="font-medium">System Settings</span>
        </Link>
        <button className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors w-full text-left mt-1">
          <LogOut size={20} />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="flex bg-surface min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-8 h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/diagnostic" element={<DiagnosticWorkstation />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/updates" element={<Updates />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

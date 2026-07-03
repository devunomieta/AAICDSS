import React, { createContext, useContext, useState, ReactNode } from 'react';
import { X, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'error' | 'success') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<{ message: string, type: 'info' | 'error' | 'success', id: number } | null>(null);

  const showToast = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = Date.now();
    setToast({ message, type, id });
    setTimeout(() => {
      setToast(current => current?.id === id ? null : current);
    }, 4000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-surface border border-border shadow-2xl px-5 py-4 rounded-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
          {toast.type === 'info' && <Info className="text-primary" size={20} />}
          {toast.type === 'success' && <CheckCircle className="text-green-500" size={20} />}
          {toast.type === 'error' && <AlertTriangle className="text-red-500" size={20} />}
          <div className="text-white text-sm font-medium pr-2">{toast.message}</div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
};

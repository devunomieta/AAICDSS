import React, { useState } from 'react';
import { Activity, Fingerprint, Mail, Lock, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import aLogo from '../assets/A-Logo.png';

interface LoginProps {
  onLogin: (userType: 'radiologist' | 'compliance') => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const autofill = (type: 'radiologist' | 'compliance') => {
    if (type === 'radiologist') {
      setEmail('radiologist@affiong.ai');
      setPassword('radio123');
    } else {
      setEmail('compliance@affiong.ai');
      setPassword('secure123');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'compliance@affiong.ai') {
      onLogin('compliance');
    } else {
      onLogin('radiologist');
    }
  };

  const showFutureWarning = () => {
    alert("Future Update: SSO and Biometric access will be integrated in v3.0");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo Section */}
        <div className="flex flex-col items-center gap-3">
          <img src={aLogo} alt="AffiongAI Logo" className="w-64 h-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]" />
        </div>

        {/* Login Box */}
        <div className="bg-surface border border-border rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-primary to-blue-500"></div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background border border-border text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                  placeholder="name@affiong.ai"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-background border border-border text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button type="submit" className="w-full text-white bg-primary hover:bg-primaryHover font-medium rounded-lg text-sm px-5 py-3 text-center transition-colors shadow-lg shadow-primary/25 mt-2">
              Login
            </button>
          </form>

          {/* Dummy SSO Buttons */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface text-gray-500">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={showFutureWarning} className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-gray-300 hover:bg-background hover:text-white transition-colors group">
                <div className="w-4 h-4 bg-gray-400 group-hover:bg-white rounded-full flex items-center justify-center text-[10px] text-surface font-bold">G</div>
                Google
              </button>
              <button onClick={showFutureWarning} className="flex items-center justify-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-gray-300 hover:bg-background hover:text-white transition-colors">
                <Fingerprint size={16} />
                Biometric
              </button>
            </div>
          </div>
        </div>

        {/* Dummy Accounts Block */}
        <div className="mt-8 bg-surface/50 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-500 text-sm font-bold mb-3">
            <ShieldAlert size={16} />
            <span>Demo Accounts - Click to Login</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => autofill('radiologist')} className="text-left p-3 rounded-lg border border-border hover:bg-surface transition-colors bg-background">
              <p className="text-xs text-textMuted uppercase font-bold mb-1">Radiologist</p>
              <p className="text-sm text-gray-300">radiologist@affiong.ai</p>
            </button>
            <button onClick={() => autofill('compliance')} className="text-left p-3 rounded-lg border border-border hover:bg-surface transition-colors bg-background">
              <p className="text-xs text-textMuted uppercase font-bold mb-1">Compliance Officer</p>
              <p className="text-sm text-gray-300">compliance@affiong.ai</p>
            </button>
          </div>
        </div>

        {/* Disabled Signup Note */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Signup is disabled in Test Phase.<br />Contact <a href="mailto:j.unomieta7706@miva.edu.ng">j.unomieta7706@miva.edu.ng</a> to get a new clinical account.
        </p>
      </div>
    </div>
  );
}

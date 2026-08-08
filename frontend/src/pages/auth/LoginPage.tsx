import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User as UserIcon, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import uigmLogo from '../../assets/uigm.png';
import labBg from '../../assets/lab.png';
import { Alert } from '../../components/ui/Alert';
import useAuthStore from '../../store/authStore';
import apiClient from '../../services/apiClient';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await apiClient.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const { access_token } = response.data;

      const userResponse = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      setAuth(access_token, userResponse.data);
      setLoginSuccess(true);

      // Delay navigation to show success animation
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden bg-slate-50 selection:bg-blue-200">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img src={labBg} alt="Lab Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px]"></div>
      </div>

      <div className="z-10 flex flex-col items-center w-full px-4">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center mb-8"
        >
          <div className="bg-white p-2 rounded-xl mb-5 shadow-lg border border-slate-100 flex items-center justify-center w-16 h-16">
            <img src={uigmLogo} alt="UIGM Logo" className="w-full h-full object-contain drop-shadow-sm" />
          </div>
          <h1 className="text-3xl font-bold text-[#0f172a] tracking-tight mb-2">Smart-lab UIGM System</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">UIGM Lab Control Center</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          className="w-full max-w-[440px] bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white"
        >
          {error && (
            <Alert variant="error" className="mb-6 bg-red-50/80 backdrop-blur-sm border-red-100">
              {error}
            </Alert>
          )}

          {loginSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 space-y-6"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center"
              >
                <ShieldCheck className="w-10 h-10 text-green-500" />
              </motion.div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-[#0f172a]">Authentication Successful</h3>
                <p className="text-sm text-slate-500">Preparing your dashboard...</p>
              </div>

              <div className="flex gap-1.5 mt-4">
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  className="w-2 h-2 rounded-full bg-[#0f172a]"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  className="w-2 h-2 rounded-full bg-[#0f172a]"
                />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  className="w-2 h-2 rounded-full bg-[#0f172a]"
                />
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                  Username
                </label>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon className="h-4 w-4 text-slate-400 group-focus-within:text-[#0f172a] transition-colors" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 bg-white/50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0f172a]/20 focus:border-[#0f172a] text-sm text-slate-800 transition-all outline-none placeholder:text-slate-400 font-medium"
                    placeholder="e.g. admin_j.smith"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                  Password
                </label>
                <div className="relative flex items-center group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-[#0f172a] transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-10 py-3 bg-white/50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#0f172a]/20 focus:border-[#0f172a] text-sm text-slate-800 transition-all outline-none placeholder:text-slate-400 font-medium tracking-wide"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#0f172a] transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#0f172a] hover:bg-slate-800 text-white py-3.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg mt-2"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Authorize Session
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Internal System Access Only.<br />
              <a href="#" className="text-[#0f172a] hover:underline font-semibold">Contact System Administrator</a> for access.
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
        className="absolute bottom-8 flex items-center gap-6 text-[9px] sm:text-[10px] font-bold tracking-widest text-slate-400 uppercase"
      >
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] animate-pulse"></div>
          System Operational
        </div>
        <div className="h-3 w-px bg-slate-300"></div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          V1.2.0-STABLE
        </div>
      </motion.div>
    </div>
  );
};

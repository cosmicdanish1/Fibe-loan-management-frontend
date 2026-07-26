import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  AlertTriangle,
  CheckCircle,
  X,
  Zap,
  Shield,
  Heart
} from 'lucide-react';
import { ConfigProvider } from 'antd';

declare global {
  interface Window {
    electron?: {
      ipcRenderer: {
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, func: (...args: any[]) => void) => void;
        removeAllListeners: (channel: string) => void;
      };
    };
  }
}

const ExitOption1: React.FC = () => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExit = useCallback(() => {
    setIsExiting(true);
    setShowConfirmation(false);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          if (window.electronAPI) {
            window.electronAPI.quitApp();
            setTimeout(() => {
              if (window.electronAPI) {
                window.electronAPI.forceQuitApp();
              }
            }, 1000);
          } 
          else if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('app-quit');
            setTimeout(() => {
              if (window.electron?.ipcRenderer) {
                window.electron.ipcRenderer.send('app-quit-force');
              }
            }, 1000);
          }
          else if (window.opener) {
            window.close();
          } else {
            try {
              window.open('', '_self', '');
              window.close();
            } catch (e) {
              // Silent fail
            }
          }
          
          return 100;
        }
        return prev + 2;
      });
    }, 20);

    return () => clearInterval(interval);
  }, []);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const exitMessages = useMemo(() => [
    'Saving your session...',
    'Closing connections...',
    'Finalizing data...',
    'Almost done...',
    'See you soon!'
  ], []);

  const currentMessage = useMemo(() => {
    const index = Math.floor((progress / 100) * exitMessages.length);
    return exitMessages[Math.min(index, exitMessages.length - 1)];
  }, [progress, exitMessages]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#ef4444',
          borderRadius: 12,
        },
      }}
    >
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-rose-900/30 to-slate-900 font-sans selection:bg-rose-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {showConfirmation && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-rose-100 to-red-100 mb-4 shadow-lg shadow-rose-200/50"
              >
                <AlertTriangle className="h-10 w-10 text-rose-600" />
              </motion.div>

              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-black text-slate-900 mb-2 text-center uppercase tracking-tight"
              >
                Exit Application
              </motion.h3>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm font-bold text-slate-500 mb-6 text-center uppercase tracking-wide"
              >
                Are you sure you want to exit Paper White Technology LMS?
              </motion.p>

              {/* Warning Box */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-6"
              >
                <div className="flex items-start gap-2">
                  <Shield size={14} className="text-rose-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-black text-rose-900 uppercase tracking-tight leading-tight mb-1">
                      Important Notice
                    </p>
                    <p className="text-[9px] font-bold text-rose-700 leading-tight">
                      All unsaved changes will be lost. Make sure you've saved your work before exiting.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex gap-3"
              >
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 border-2 border-slate-300 rounded-xl text-slate-700 font-black text-sm uppercase tracking-wider hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 flex items-center justify-center gap-2 group"
                >
                  <X size={16} className="group-hover:rotate-90 transition-transform" />
                  Cancel
                </button>
                <button
                  onClick={handleExit}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white rounded-xl font-black text-sm uppercase tracking-wider hover:from-rose-700 hover:via-red-700 hover:to-rose-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 shadow-lg shadow-rose-200/50 flex items-center justify-center gap-2 group"
                >
                  <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                  Exit
                </button>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-4 text-center"
              >
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  Press ESC to cancel
                </p>
              </motion.div>
            </motion.div>
          )}

          {isExiting && (
            <motion.div
              key="exiting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md w-full px-4"
            >
              {/* Animated Icon */}
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                className="mb-6"
              >
                <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-rose-500/20 border border-white/10">
                  <LogOut className="w-14 h-14 text-white" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-black text-white mb-3 uppercase tracking-tight"
              >
                Goodbye!
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-bold text-slate-300 mb-6 uppercase tracking-wider"
              >
                Thank you for using Paper White Technology
              </motion.p>

              {/* Progress Bar Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="w-full max-w-sm mx-auto"
              >
                {/* Progress Bar */}
                <div className="relative w-full h-3 bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 shadow-inner mb-3">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 rounded-full shadow-lg shadow-rose-500/50 relative overflow-hidden"
                  >
                    <motion.div
                      animate={{
                        x: ['-100%', '100%'],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: 'linear',
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                  </motion.div>
                </div>

                {/* Progress Percentage */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {currentMessage}
                  </span>
                  <span className="text-xs font-black text-white tabular-nums">
                    {progress}%
                  </span>
                </div>
              </motion.div>

              {/* Status Icons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-4 mt-6"
              >
                <motion.div
                  animate={{
                    opacity: progress > 20 ? 1 : 0.3,
                    scale: progress > 20 ? 1 : 0.8,
                  }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Saved</span>
                </motion.div>
                <motion.div
                  animate={{
                    opacity: progress > 50 ? 1 : 0.3,
                    scale: progress > 50 ? 1 : 0.8,
                  }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Closed</span>
                </motion.div>
                <motion.div
                  animate={{
                    opacity: progress > 80 ? 1 : 0.3,
                    scale: progress > 80 ? 1 : 0.8,
                  }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Done</span>
                </motion.div>
              </motion.div>

              {/* Footer Message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex items-center justify-center gap-2"
              >
                <Heart size={12} className="text-rose-400" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  See you soon!
                </span>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ConfigProvider>
  );
};

export default ExitOption1;

import React, { useState } from 'react';
import { Button, Input, message, Spin } from 'antd';
import { KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';

interface Props {
  onActivated: () => void;
}

const LicenseActivation: React.FC<Props> = ({ onActivated }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatKey = (value: string) => {
    // Auto-format as PWT0-XXXX-XXXX-XXXX-XXXX (5 groups of 4, 20 alphanum + 4 dashes = 24 chars)
    const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 20);
    const parts = clean.match(/.{1,4}/g) || [];
    return parts.join('-');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKey(formatKey(e.target.value));
    setError('');
  };

  const isValidFormat = (k: string) =>
    /^PWT0-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(k);

  const handleActivate = async () => {
    if (!isValidFormat(key)) {
      setError('License key must be in format PWT0-XXXX-XXXX-XXXX-XXXX');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const machineId = await getMachineId();
      const res = await apiService.activateLicense(key, machineId);

      if (res.success) {
        message.success('Software activated successfully!');
        onActivated();
      } else {
        setError(res.message || res.error || 'Invalid license key. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect to server. Please ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getMachineId = async (): Promise<string> => {
    try {
      if (window.electronAPI?.invoke) {
        return await window.electronAPI.invoke('get-machine-id') || 'unknown';
      }
    } catch {}
    return navigator.userAgent.slice(0, 50);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo / Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-6">
            <ShieldCheck size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Activate Software</h1>
          <p className="text-slate-400 mt-2 text-sm">
          Enter your license key to activate the Loan Management System by Paper White Technology
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="space-y-6">
            {/* Key Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                License Key
              </label>
              <div className="relative">
                <KeyRound
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
                />
                <Input
                  value={key}
                  onChange={handleChange}
                  placeholder="PWT0-XXXX-XXXX-XXXX-XXXX"
                  maxLength={24}
                  className="pl-9 font-mono text-base tracking-widest bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.15)',
                    color: 'white',
                    fontSize: '16px',
                    letterSpacing: '0.1em',
                    height: '48px',
                  }}
                  onPressEnter={handleActivate}
                  disabled={loading}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-1">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Activate Button */}
            <Button
              type="primary"
              size="large"
              block
              onClick={handleActivate}
              disabled={loading || !isValidFormat(key)}
              className="h-12 font-bold text-sm tracking-wide"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                border: 'none',
                borderRadius: '10px',
              }}
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <Spin size="small" />
                  Activating...
                </span>
              ) : (
                'Activate Software'
              )}
            </Button>

            {/* Info */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              <p className="text-slate-400 text-xs text-center">
                License is valid for <span className="text-white font-semibold">1 year</span> from activation date
              </p>
              <p className="text-slate-500 text-xs text-center">
                A 30-day grace period applies after expiry
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Contact your administrator if you don't have a license key
        </p>
      </div>
    </div>
  );
};

export default LicenseActivation;

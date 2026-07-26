import React from 'react';
import { ShieldOff, Phone, Mail } from 'lucide-react';

const LicenseExpired: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-slate-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 bg-red-500/10 border border-red-500/30 rounded-full mb-8">
          <ShieldOff size={48} className="text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-white mb-3">License Expired</h1>
        <p className="text-red-300 text-base mb-2">
          Your software license has expired and the grace period has ended.
        </p>
        <p className="text-slate-400 text-sm mb-10">
          Access to the Loan Management System has been locked.
          Please contact your administrator to renew your license.
        </p>

        {/* Contact Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-4">
            Contact Support
          </h3>
          <div className="flex items-center gap-3 text-slate-300 text-sm">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Phone size={14} className="text-indigo-400" />
            </div>
            <span>Contact your software vendor</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 text-sm">
            <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <Mail size={14} className="text-indigo-400" />
            </div>
            <span>Request a new license key</span>
          </div>
        </div>

        <p className="text-slate-600 text-xs mt-8">
          Paper White Technology - Loan Management System
        </p>
      </div>
    </div>
  );
};

export default LicenseExpired;

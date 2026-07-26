import React from 'react';
import { Spin } from 'antd';
import { useLicense } from './LicenseContext';
import LicenseActivation from './LicenseActivation';
import LicenseExpired from './LicenseExpired';

interface Props {
  children: React.ReactNode;
}

/**
 * LicenseGate wraps the entire app.
 * - If not activated → show activation screen
 * - If expired (past grace) → show locked screen
 * - If active or in grace → show the app normally
 */
const LicenseGate: React.FC<Props> = ({ children }) => {
  const { status, refresh } = useLicense();

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spin size="large" />
          <p className="text-slate-400 text-sm">Verifying license...</p>
        </div>
      </div>
    );
  }

  if (status === 'not_activated') {
    return <LicenseActivation onActivated={refresh} />;
  }

  if (status === 'expired') {
    return <LicenseExpired />;
  }

  // active or grace — show the app
  return <>{children}</>;
};

export default LicenseGate;

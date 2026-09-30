import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import { useLicense } from './LicenseContext';

const LicenseWarningBanner: React.FC = () => {
  const { status, daysRemaining, graceDaysRemaining, isInitializing } = useLicense();

  // Don't flash while the first real API check is still in flight
  if (isInitializing) return null;

  // Show warning when expiring soon (≤30 days) or in grace period
  if (status === 'active' && daysRemaining > 30) return null;
  if (status === 'checking' || status === 'not_activated' || status === 'expired') return null;

  const isGrace = status === 'grace';
  const bgColor = isGrace ? 'bg-red-600' : 'bg-amber-500';
  const displayDays = isGrace ? (graceDaysRemaining ?? 0) : (daysRemaining ?? 0);
  const label = isGrace
    ? `Grace period: ${displayDays} day${displayDays !== 1 ? 's' : ''} remaining — Software will lock after this`
    : `License expires in ${displayDays} day${displayDays !== 1 ? 's' : ''} — Please renew soon`;

  return (
    <div className={`${bgColor} text-white px-4 py-2 flex items-center gap-3 text-xs font-semibold`}>
      <div className="flex items-center gap-1.5">
        {isGrace ? <AlertTriangle size={14} /> : <Clock size={14} />}
        <span>{label}</span>
      </div>
    </div>
  );
};

export default LicenseWarningBanner;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/context/AuthContext';
import { Clock, AlertCircle } from 'lucide-react';

const SESSION_TIMEOUT = 100 * 365 * 24 * 60 * 60 * 1000; // 100 years (De-facto disabled)
const WARNING_TIME = 0; // Disable warning

export const SessionMonitor: React.FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState<number>(SESSION_TIMEOUT);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const updateTimer = () => {
      const sessionStartTime = localStorage.getItem('sessionStartTime');
      if (!sessionStartTime) return;

      const startTime = parseInt(sessionStartTime, 10);
      const currentTime = Date.now();
      const elapsedTime = currentTime - startTime;
      const remaining = SESSION_TIMEOUT - elapsedTime;

      setTimeRemaining(remaining);

      // Show warning when 30 minutes or less remaining
      if (remaining <= WARNING_TIME && remaining > 0) {
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }

      // Auto logout when time expires
      if (remaining <= 0) {
        alert('Your session has expired. Please login again.');
        logout();
      }
    };

    // Update every minute
    const intervalId = setInterval(updateTimer, 60 * 1000);

    // Update immediately
    updateTimer();

    return () => clearInterval(intervalId);
  }, [isAuthenticated, logout]);

  if (!isAuthenticated) return null;

  const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

  return (
    <div className="flex items-center gap-2 text-sm">
      {showWarning ? (
        <div className="flex items-center gap-1 text-orange-600 bg-orange-50 px-3 py-1 rounded-md">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">
            Session expires in {hours}h {minutes}m
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {hours}h {minutes}m remaining
          </span>
        </div>
      )}
    </div>
  );
};

export default SessionMonitor;

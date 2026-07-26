import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';

interface ConnectionStatusProps {
  className?: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className = '' }) => {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [backendInfo, setBackendInfo] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      console.log('[ConnectionStatus] Checking backend connection...');
      
      // Try to get app info from backend
      const response = await apiService.getAppInfo();
      
      if (response.success) {
        setIsConnected(true);
        setBackendInfo(response.data);
        console.log('[ConnectionStatus] Backend connected successfully:', response.data);
      } else {
        setIsConnected(false);
        setBackendInfo(null);
        console.warn('[ConnectionStatus] Backend connection failed:', response.error);
      }
    } catch (error) {
      setIsConnected(false);
      setBackendInfo(null);
      console.error('[ConnectionStatus] Connection check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    if (isChecking) return 'text-yellow-600 bg-yellow-100';
    if (isConnected === null) return 'text-gray-600 bg-gray-100';
    return isConnected ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    if (isConnected === null) return 'Unknown';
    return isConnected ? 'Connected' : 'Disconnected';
  };

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      );
    }
    
    if (isConnected) {
      return (
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    return (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>Backend: {getStatusText()}</span>
      </div>
      
      {backendInfo && (
        <div className="text-xs text-gray-500">
          v{backendInfo.version} | {backendInfo.environment}
        </div>
      )}
      
      <button
        onClick={checkConnection}
        disabled={isChecking}
        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        title="Refresh connection status"
      >
        Refresh
      </button>
    </div>
  );
};

export default ConnectionStatus;

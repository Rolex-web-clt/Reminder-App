import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      id="offline-banner"
      className="bg-amber-600 text-white px-4 py-2 text-sm font-medium flex items-center justify-between shadow-md sticky top-0 z-50 animate-pulse"
    >
      <div className="flex items-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>You are currently offline. Reminders will synchronize once network connectivity resumes.</span>
      </div>
      <button
        id="offline-retry-btn"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1 text-xs bg-amber-700 hover:bg-amber-800 px-3 py-1 rounded transition"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
};

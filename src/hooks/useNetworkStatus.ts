import { useState, useEffect } from 'react';
import { addNetworkListeners } from '@/lib/networkUtils';

/**
 * Hook to track online/offline network status
 * Returns true when online, false when offline
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Network: Online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('📡 Network: Offline');
      setIsOnline(false);
    };

    // Set up event listeners
    const cleanup = addNetworkListeners(handleOnline, handleOffline);

    // Check initial status
    setIsOnline(navigator.onLine);

    return cleanup;
  }, []);

  return isOnline;
}

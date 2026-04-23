/**
 * Network Utilities for detecting internet connectivity issues
 */

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof NetworkError) return true;
  
  // Check for common network error indicators
  if (error instanceof TypeError && 
      (error.message.includes('fetch') || 
       error.message.includes('network') ||
       error.message.includes('Failed to fetch'))) {
    return true;
  }
  
  // Check for timeout errors
  if (error instanceof Error && 
      (error.name === 'AbortError' || error.message.includes('aborted'))) {
    return true;
  }
  
  // Check if navigator says we're offline
  if (!navigator.onLine) {
    return true;
  }
  
  return false;
}

/**
 * Check if an error is a configuration error (not network related)
 */
export function isConfigurationError(error: unknown): boolean {
  return error instanceof ConfigurationError;
}

/**
 * Listen for online/offline events
 */
export function addNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Wrap an API call to convert network errors to NetworkError
 */
export async function withNetworkErrorHandling<T>(
  apiCall: () => Promise<T>,
  errorMessage = 'Network request failed'
): Promise<T> {
  try {
    // Check if online before making the call
    if (!navigator.onLine) {
      throw new NetworkError('No internet connection');
    }
    
    return await apiCall();
  } catch (error) {
    // Convert network-related errors to NetworkError
    if (isNetworkError(error)) {
      throw new NetworkError(errorMessage);
    }
    
    // Re-throw other errors as-is
    throw error;
  }
}

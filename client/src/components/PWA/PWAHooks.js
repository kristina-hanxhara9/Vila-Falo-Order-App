import { useState, useEffect } from 'react';

// Custom hook for PWA functionality
export const usePWA = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
      }
      if (window.navigator && window.navigator.standalone) {
        setIsInstalled(true);
      }
    };

    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      console.log('🌐 Back online!');
      // Trigger data sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ 
          type: 'SYNC_DATA' 
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('📱 Gone offline');
    };

    // PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('💾 PWA install prompt available');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('🎉 PWA installed successfully!');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial checks
    checkInstalled();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return false;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      console.log(`PWA install ${outcome}`);
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const showNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/logo192.png',
        badge: '/logo192.png',
        ...options
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    return null;
  };

  return {
    isOnline,
    isInstallable,
    isInstalled,
    installApp,
    requestNotificationPermission,
    showNotification
  };
};

// PWA Status component
export const PWAStatus = () => {
  const { isOnline, isInstallable, isInstalled, installApp } = usePWA();

  if (isInstalled) {
    return null; // Don't show anything if already installed
  }

  return (
    <div className="pwa-status">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="offline-indicator bg-yellow-500 text-white px-4 py-2 text-sm text-center">
          📱 You're offline. Orders will sync when connection is restored.
        </div>
      )}

      {/* Install prompt */}
      {isInstallable && (
        <div className="install-prompt bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">📱</span>
            <span className="text-sm">Install Vila Falo app for better experience</span>
          </div>
          <button 
            onClick={installApp}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
          >
            Install
          </button>
        </div>
      )}
    </div>
  );
};

// Offline queue manager
export const useOfflineQueue = () => {
  const [offlineQueue, setOfflineQueue] = useState([]);

  const addToQueue = (action) => {
    setOfflineQueue(prev => [...prev, { ...action, timestamp: Date.now() }]);
    
    // Store in localStorage for persistence
    const stored = JSON.parse(localStorage.getItem('pwa-offline-queue') || '[]');
    stored.push({ ...action, timestamp: Date.now() });
    localStorage.setItem('pwa-offline-queue', JSON.stringify(stored));
  };

  const processQueue = async () => {
    const stored = JSON.parse(localStorage.getItem('pwa-offline-queue') || '[]');
    
    for (const action of stored) {
      try {
        // Process each queued action
        if (action.type === 'ORDER_CREATE') {
          // Sync order creation
          console.log('Syncing offline order:', action.data);
        } else if (action.type === 'ORDER_UPDATE') {
          // Sync order updates
          console.log('Syncing order update:', action.data);
        }
      } catch (error) {
        console.error('Failed to sync action:', action, error);
      }
    }

    // Clear queue after processing
    localStorage.removeItem('pwa-offline-queue');
    setOfflineQueue([]);
  };

  useEffect(() => {
    // Process queue when coming back online
    const handleOnline = () => {
      if (navigator.onLine) {
        processQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return {
    offlineQueue,
    addToQueue,
    processQueue
  };
};

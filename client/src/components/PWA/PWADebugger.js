import React, { useState, useEffect } from 'react';

const PWADebugger = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const checkPWAStatus = () => {
      const info = {
        // Basic environment
        url: window.location.href,
        protocol: window.location.protocol,
        isLocalhost: window.location.hostname === 'localhost',
        isHTTPS: window.location.protocol === 'https:',
        
        // Browser detection
        userAgent: navigator.userAgent,
        isChrome: navigator.userAgent.includes('Chrome'),
        isEdge: navigator.userAgent.includes('Edge'),
        isSafari: navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'),
        isFirefox: navigator.userAgent.includes('Firefox'),
        
        // PWA features
        hasServiceWorker: 'serviceWorker' in navigator,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches,
        hasNotifications: 'Notification' in window,
        isOnline: navigator.onLine,
        
        // PWA state
        swRegistration: null,
        manifestData: null,
        installPromptAvailable: false
      };
      
      // Check service worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(registration => {
          setDebugInfo(prev => ({
            ...prev,
            swRegistration: registration ? {
              scope: registration.scope,
              state: registration.active?.state,
              scriptURL: registration.active?.scriptURL
            } : null
          }));
        });
      }
      
      // Check manifest
      fetch('/manifest.json')
        .then(response => response.json())
        .then(manifest => {
          setDebugInfo(prev => ({ ...prev, manifestData: manifest }));
        })
        .catch(err => {
          setDebugInfo(prev => ({ ...prev, manifestError: err.message }));
        });
      
      setDebugInfo(info);
    };
    
    checkPWAStatus();
    
    // Listen for PWA events
    const handleInstallPrompt = (e) => {
      setDebugInfo(prev => ({ ...prev, installPromptAvailable: true }));
    };
    
    const handleAppInstalled = () => {
      setDebugInfo(prev => ({ ...prev, isInstalled: true }));
    };
    
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);
  
  const getStatusIcon = (condition) => condition ? 'OK' : 'NO';
  
  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-gray-300 rounded-xl shadow-2xl p-4 max-w-sm z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">PWA Status</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          {showDetails ? 'Hide' : 'Show'}
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>HTTPS:</span>
          <span className={debugInfo.isHTTPS || debugInfo.isLocalhost ? 'text-green-600' : 'text-red-600'}>
            {getStatusIcon(debugInfo.isHTTPS || debugInfo.isLocalhost)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Browser:</span>
          <span className={debugInfo.isChrome || debugInfo.isEdge ? 'text-green-600' : 'text-red-600'}>
            {getStatusIcon(debugInfo.isChrome || debugInfo.isEdge)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Service Worker:</span>
          <span className={debugInfo.hasServiceWorker ? 'text-green-600' : 'text-red-600'}>
            {getStatusIcon(debugInfo.hasServiceWorker)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Install Ready:</span>
          <span className={debugInfo.installPromptAvailable ? 'text-green-600' : 'text-red-600'}>
            {getStatusIcon(debugInfo.installPromptAvailable)}
          </span>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            <div>Browser: {debugInfo.isChrome ? 'Chrome' : debugInfo.isEdge ? 'Edge' : 'Other'}</div>
            <div>URL: {debugInfo.protocol}</div>
            {debugInfo.manifestData && (
              <div>Manifest: {debugInfo.manifestData.name}</div>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-500 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-blue-600"
        >
          Refresh Page
        </button>
        <button
          onClick={() => {
            if ('caches' in window) {
              caches.keys().then(names => {
                names.forEach(name => caches.delete(name));
                alert('Cache cleared!');
              });
            }
          }}
          className="w-full bg-yellow-500 text-white px-3 py-2 rounded text-sm font-semibold hover:bg-yellow-600"
        >
          Clear Cache
        </button>
      </div>
    </div>
  );
};

export default PWADebugger;
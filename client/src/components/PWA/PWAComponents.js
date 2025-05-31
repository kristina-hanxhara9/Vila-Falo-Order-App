import React from 'react';
import { usePWA } from './PWAHooks';

export const PWAInstallButton = ({ className = '' }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 PWA Install Button Debug:', {
      isInstallable,
      isInstalled,
      userAgent: navigator.userAgent,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      location: window.location.href
    });
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    console.log('🚀 Install button clicked');
    const success = await installApp();
    if (success) {
      console.log('✅ App installed successfully!');
    } else {
      console.log('❌ App installation failed or cancelled');
    }
  };

  // Show debug info in development
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <div className="bg-white border-2 border-blue-500 rounded-xl p-4 shadow-lg max-w-xs">
          <h3 className="font-bold text-sm mb-2">🔧 PWA Debug</h3>
          <div className="text-xs space-y-1">
            <div>Installable: {isInstallable ? '✅' : '❌'}</div>
            <div>Installed: {isInstalled ? '✅' : '❌'}</div>
            <div>Browser: {navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'}</div>
            <div>HTTPS: {window.location.protocol === 'https:' ? '✅' : '❌'}</div>
          </div>
          {isInstallable && (
            <button
              onClick={handleInstall}
              className="mt-3 w-full bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-semibold"
            >
              📱 Install App
            </button>
          )}
          {!isInstallable && (
            <div className="mt-2 text-xs text-gray-600">
              {isInstalled ? 'Already installed' : 'Not installable yet'}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      className={`
        bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 
        text-white px-4 py-3 rounded-2xl shadow-lg hover:shadow-xl
        flex items-center space-x-2 transition-all duration-300 transform hover:-translate-y-1
        font-semibold border-2 border-white/20 backdrop-blur-sm
        ${className}
      `}
      title="Install Vila Falo app for better experience"
    >
      <span className="text-lg">📱</span>
      <span>Install App</span>
    </button>
  );
};

export const PWAOfflineIndicator = () => {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm z-50">
      <span className="mr-2">📱</span>
      You're offline. Orders will sync when connection is restored.
    </div>
  );
};

// Add a simple install prompt for testing
export const PWAInstallPrompt = () => {
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] = React.useState(null);

  React.useEffect(() => {
    const handler = (e) => {
      console.log('📱 beforeinstallprompt triggered');
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    
    // For testing - show prompt after 5 seconds if not already shown
    const timer = setTimeout(() => {
      if (!showPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
        console.log('🔧 Forcing install prompt for testing');
        setShowPrompt(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timer);
    };
  }, [showPrompt]);

  const handleInstall = async () => {
    console.log('🚀 Install button clicked');
    
    if (deferredPrompt) {
      try {
        // Show the browser's install prompt
        console.log('📱 Showing browser install prompt...');
        deferredPrompt.prompt();
        
        // Wait for the user's response
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`🎯 User choice: ${outcome}`);
        
        if (outcome === 'accepted') {
          console.log('✅ User accepted the install prompt');
          setDeferredPrompt(null);
        } else {
          console.log('❌ User dismissed the install prompt');
        }
      } catch (error) {
        console.error('❌ Install prompt error:', error);
        showFallbackInstructions();
      }
    } else {
      console.log('⚠️ No deferred prompt available, showing manual instructions');
      showFallbackInstructions();
    }
    
    setShowPrompt(false);
  };
  
  const showFallbackInstructions = () => {
    const isChrome = navigator.userAgent.includes('Chrome');
    const isEdge = navigator.userAgent.includes('Edge');
    const isSafari = navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let instructions = 'To install Vila Falo app:';
    
    if (isChrome && !isMobile) {
      instructions += '\n\n🖥️ Chrome Desktop:\n• Look for ⊕ icon in address bar\n• Or: Menu (⋮) → "Install Vila Falo"';
    } else if (isChrome && isMobile) {
      instructions += '\n\n📱 Chrome Mobile:\n• Menu (⋮) → "Add to Home Screen"\n• Or: "Install App" if available';
    } else if (isEdge) {
      instructions += '\n\n🖥️ Edge:\n• Look for ⊕ icon in address bar\n• Or: Menu (⋯) → "Apps" → "Install this site"';
    } else if (isSafari) {
      instructions += '\n\n📱 Safari iOS:\n• Tap Share button (📤)\n• Select "Add to Home Screen"\n• Tap "Add"';
    } else {
      instructions += '\n\n🌐 Your Browser:\n• Look for install icon in address bar\n• Or check browser menu for "Install" or "Add to Home Screen"';
    }
    
    instructions += '\n\n💡 Tip: The app icon will appear on your home screen/desktop!';
    
    alert(instructions);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-2xl z-50 md:max-w-sm md:left-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <h3 className="font-bold">Install Vila Falo</h3>
            <p className="text-sm opacity-90">Get the app for better experience</p>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-white/70 hover:text-white text-xl"
        >
          ✕
        </button>
      </div>
      <div className="flex space-x-3 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-white text-blue-600 font-semibold py-2 px-4 rounded-xl hover:bg-gray-100 transition-colors"
        >
          📱 Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="px-4 py-2 text-white/90 hover:text-white transition-colors"
        >
          Later
        </button>
      </div>
    </div>
  );
};

// Notification permission component
export const PWANotificationSetup = () => {
  const { requestNotificationPermission } = usePWA();
  const [permissionStatus, setPermissionStatus] = React.useState(
    'Notification' in window ? Notification.permission : 'not-supported'
  );

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
  };

  if (permissionStatus === 'granted' || permissionStatus === 'not-supported') {
    return null;
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-green-600 mr-2">🔔</span>
          <div>
            <h3 className="text-sm font-medium text-green-800">Enable Notifications</h3>
            <p className="text-sm text-green-600">Get notified about new orders and updates</p>
          </div>
        </div>
        <button
          onClick={handleRequestPermission}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
        >
          Enable
        </button>
      </div>
    </div>
  );
};

export default {
  PWAInstallButton,
  PWAOfflineIndicator,
  PWANotificationSetup,
  PWAInstallPrompt
};

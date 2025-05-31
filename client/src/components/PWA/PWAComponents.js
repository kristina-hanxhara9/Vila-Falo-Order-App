import React from 'react';
import { usePWA } from './PWAHooks';

export const PWAInstallButton = ({ className = '' }) => {
  const { isInstallable, isInstalled, installApp } = usePWA();

  // Don't show if already installed or not installable
  if (isInstalled || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      console.log('App installed successfully!');
    }
  };

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
  PWANotificationSetup
};

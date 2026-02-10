import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorker from './serviceWorker';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
serviceWorker.register({
  onSuccess: () => {
    console.log('🎉 Vila Falo PWA is ready for offline use!');
  },
  onUpdate: (registration) => {
    console.log('🔄 New version available, please refresh the app');
    // You can add auto-update logic here
  }
});

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// PWA Install prompt handling
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', (evt) => {
  console.log('🎉 Vila Falo PWA was installed successfully!');
});

// Network status handling
window.addEventListener('online', () => {
  console.log('🌐 Back online - syncing data...');
  // Trigger data sync
});

window.addEventListener('offline', () => {
  console.log('📱 Gone offline - switching to offline mode');
  // Show offline banner
});

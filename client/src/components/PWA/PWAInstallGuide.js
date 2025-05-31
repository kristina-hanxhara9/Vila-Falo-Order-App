import React, { useState } from 'react';

const PWAInstallGuide = () => {
  const [showGuide, setShowGuide] = useState(false);

  if (!showGuide) {
    return (
      <button
        onClick={() => setShowGuide(true)}
        className="fixed bottom-20 right-4 bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-2xl shadow-lg font-semibold flex items-center space-x-2 z-40"
        title="Show manual install guide"
      >
        <span>Guide</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Install Vila Falo App</h2>
            <button
              onClick={() => setShowGuide(false)}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              X
            </button>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-bold text-lg mb-4">How to Install:</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Chrome Desktop:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Look for + icon in address bar</li>
                <li>2. Click it and select Install</li>
                <li>3. Or: Menu > Install Vila Falo</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Chrome Mobile:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>1. Tap menu (3 dots) in top-right</li>
                <li>2. Select Add to Home Screen</li>
                <li>3. Confirm installation</li>
              </ul>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Safari iOS:</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>1. Tap Share button at bottom</li>
                <li>2. Select Add to Home Screen</li>
                <li>3. Tap Add to confirm</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              Once installed, Vila Falo will appear on your home screen and work like a native app!
            </p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t flex justify-center">
          <button
            onClick={() => setShowGuide(false)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallGuide;
import React from 'react';

/**
 * 🎯 VILA FALO BUTTON EXAMPLES
 * This component shows all the available button styles
 * that match the Kitchen Dashboard design
 */
const ButtonExamples = () => {
  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">
          🎨 Vila Falo Button System - Kitchen Style
        </h1>
        
        {/* Primary Buttons */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Primary Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button className="vila-btn vila-btn-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Porosi e Re
            </button>
            
            <button className="vila-btn vila-btn-secondary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              Kitchen Display
            </button>
            
            <button className="vila-btn vila-btn-info">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Detajet
            </button>
          </div>
        </section>
        
        {/* Status Actions */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Status Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button className="vila-btn vila-btn-success">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Konfirmo
            </button>
            
            <button className="vila-btn vila-btn-warning">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Duke Përgatitur
            </button>
            
            <button className="vila-btn vila-btn-danger">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Dilni
            </button>
          </div>
        </section>
        
        {/* Toggle Buttons */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Toggle States</h2>
          <div className="flex flex-wrap gap-4">
            <button className="vila-btn vila-btn-success">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10a7.971 7.971 0 00-2.343-5.657 1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              </svg>
              🔊 Zëri ON
            </button>
            
            <button className="bg-gray-500 hover:bg-gray-600 text-white vila-btn">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              🔇 Zëri OFF
            </button>
          </div>
        </section>
        
        {/* Size Variations */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Size Variations</h2>
          <div className="flex flex-wrap items-center gap-4">
            <button className="vila-btn vila-btn-sm vila-btn-primary">
              Small Button
            </button>
            
            <button className="vila-btn vila-btn-primary">
              Normal Button
            </button>
            
            <button className="vila-btn vila-btn-lg vila-btn-primary">
              Large Button
            </button>
            
            <button className="vila-btn vila-btn-xl vila-btn-primary">
              Extra Large Button
            </button>
          </div>
        </section>
        
        {/* Special Buttons */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Special Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <button className="vila-btn bg-purple-600 hover:bg-purple-700 text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              🖨️ Printer
            </button>
            
            <button className="vila-btn bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Shiko të gjitha
            </button>
          </div>
        </section>
        
        {/* Disabled State */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Disabled State</h2>
          <div className="flex flex-wrap gap-4">
            <button className="vila-btn vila-btn-primary" disabled>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Disabled Button
            </button>
            
            <button className="vila-btn vila-btn-success" disabled>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Processing...
            </button>
          </div>
        </section>
        
        {/* Floating Action Button */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Floating Action Button</h2>
          <div className="relative h-32 bg-gray-100 rounded-lg">
            <div className="fixed bottom-6 right-6" style={{position: 'absolute'}}>
              <button className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ButtonExamples;
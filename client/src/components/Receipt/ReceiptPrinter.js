import React, { useState, useEffect } from 'react';
import receiptPrintingService from '../../services/receiptPrintingService';

const ReceiptPrinter = ({ 
  order, 
  menuItems = [], 
  onPrintSuccess, 
  onPrintError,
  size = 'normal', // 'small', 'normal', 'large'
  style = 'button', // 'button', 'icon', 'compact'
  showOptions = true
}) => {
  const [printing, setPrinting] = useState(false);
  const [printerStatus, setPrinterStatus] = useState('checking');
  const [showOptions, setShowOptionsState] = useState(false);
  
  // Check printer status on mount
  useEffect(() => {
    const checkPrinter = async () => {
      const connected = await receiptPrintingService.checkPrinterConnection();
      setPrinterStatus(connected ? 'connected' : 'disconnected');
    };
    
    checkPrinter();
  }, []);
  
  // Print receipt function
  const handlePrint = async (options = {}) => {
    if (!order) {
      const errorMsg = 'Nuk ka porosi për të printuar';
      if (onPrintError) onPrintError(errorMsg);
      return;
    }
    
    setPrinting(true);
    
    try {
      const result = await receiptPrintingService.printReceipt(order, menuItems, options);
      
      if (result.success) {
        if (onPrintSuccess) onPrintSuccess(result);
      } else {
        if (onPrintError) onPrintError(result.error || 'Gabim i panjohur');
      }
    } catch (error) {
      console.error('Print error:', error);
      if (onPrintError) onPrintError(error.message);
    } finally {
      setPrinting(false);
      setShowOptionsState(false);
    }
  };
  
  // Quick print (tries thermal first, then browser)
  const quickPrint = () => handlePrint();
  
  // Force browser print
  const browserPrint = () => handlePrint({ forceBrowser: true });
  
  // Print kitchen ticket
  const printKitchenTicket = async () => {
    if (!order) return;
    
    setPrinting(true);
    try {
      const result = await receiptPrintingService.printKitchenTicket(order, menuItems);
      if (result.success) {
        if (onPrintSuccess) onPrintSuccess({ ...result, type: 'kitchen' });
      } else {
        if (onPrintError) onPrintError(result.error);
      }
    } catch (error) {
      if (onPrintError) onPrintError(error.message);
    } finally {
      setPrinting(false);
    }
  };
  
  // Get button classes based on size and style
  const getButtonClasses = () => {
    const baseClasses = 'relative overflow-hidden transition-all duration-300 flex items-center justify-center font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
    
    const sizeClasses = {
      small: 'px-3 py-2 text-sm',
      normal: 'px-4 py-3 text-base',
      large: 'px-6 py-4 text-lg'
    };
    
    const colorClasses = printerStatus === 'connected' 
      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white';
    
    return `${baseClasses} ${sizeClasses[size]} ${colorClasses}`;
  };
  
  // Get icon classes
  const getIconClasses = () => {
    const baseClasses = 'rounded-full transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
    
    const sizeClasses = {
      small: 'w-8 h-8 text-xs',
      normal: 'w-10 h-10 text-sm',
      large: 'w-12 h-12 text-base'
    };
    
    const colorClasses = printerStatus === 'connected'
      ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
      : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white';
    
    return `${baseClasses} ${sizeClasses[size]} ${colorClasses}`;
  };
  
  if (!order) {
    return null;
  }
  
  // Icon style
  if (style === 'icon') {
    return (
      <div className="relative">
        <button
          onClick={quickPrint}
          disabled={printing}
          className={getIconClasses()}
          title={`Printo faturën - ${printerStatus === 'connected' ? 'Printer termik' : 'Browser'}`}
        >
          {printing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        {/* Printer status indicator */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
          printerStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-blue-400'
        }`}></div>
      </div>
    );
  }
  
  // Compact style
  if (style === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={quickPrint}
          disabled={printing}
          className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center disabled:opacity-50"
        >
          {printing ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          ) : (
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
          )}
          Print
        </button>
        
        <div className={`w-2 h-2 rounded-full ${
          printerStatus === 'connected' ? 'bg-green-400' : 'bg-blue-400'
        }`} title={printerStatus === 'connected' ? 'Printer termik i lidhur' : 'Vetëm browser printing'}></div>
      </div>
    );
  }
  
  // Button style (default)
  return (
    <div className="relative">
      <button
        onClick={showOptions ? quickPrint : () => setShowOptionsState(true)}
        disabled={printing}
        className={getButtonClasses()}
      >
        {printing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            Duke printuar...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            🧾 Printo Faturën
            {printerStatus === 'connected' && (
              <div className="absolute top-1 right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </>
        )}
      </button>
      
      {/* Print Options Dropdown */}
      {showOptions && showOptionsState && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4">
            <h3 className="font-bold text-lg">Opcione Printimi</h3>
            <p className="text-sm text-blue-100">Zgjidhni llojin e printimit</p>
          </div>
          
          <div className="p-4 space-y-3">
            {/* Thermal Printer Option */}
            <button
              onClick={quickPrint}
              disabled={printing}
              className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${
                printerStatus === 'connected'
                  ? 'bg-green-50 hover:bg-green-100 text-green-800 border-2 border-green-200'
                  : 'bg-gray-50 text-gray-400 cursor-not-allowed border-2 border-gray-200'
              }`}
            >
              <div className={`w-3 h-3 rounded-full mr-3 ${
                printerStatus === 'connected' ? 'bg-green-500' : 'bg-gray-400'
              }`}></div>
              <div className="flex-1 text-left">
                <div className="font-semibold">🖨️ Printer Termik</div>
                <div className="text-xs">
                  {printerStatus === 'connected' ? 'I gatshëm për printim' : 'Nuk është i lidhur'}
                </div>
              </div>
            </button>
            
            {/* Browser Print Option */}
            <button
              onClick={browserPrint}
              disabled={printing}
              className="w-full flex items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border-2 border-blue-200 transition-all duration-200"
            >
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
              <div className="flex-1 text-left">
                <div className="font-semibold">🌐 Browser Print</div>
                <div className="text-xs">Hap në dritare të re për printim</div>
              </div>
            </button>
            
            {/* Kitchen Ticket Option */}
            <button
              onClick={printKitchenTicket}
              disabled={printing}
              className="w-full flex items-center p-3 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-800 border-2 border-orange-200 transition-all duration-200"
            >
              <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
              <div className="flex-1 text-left">
                <div className="font-semibold">🍳 Biletë Kuzhine</div>
                <div className="text-xs">Printim i thjeshtë për kuzhinën</div>
              </div>
            </button>
            
            {/* Close button */}
            <button
              onClick={() => setShowOptionsState(false)}
              className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
            >
              ✕ Mbyll
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptPrinter;
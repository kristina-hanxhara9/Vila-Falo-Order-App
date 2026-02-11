import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';
import ThermalPrinterService from '../../services/ThermalPrinterService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';


const TableGrid = ({ tables, onSelectTable }) => {
  // Ensure tables is always an array
  const safeTablesArray = Array.isArray(tables) ? tables : [];
  
  // Table status texts in Albanian
  const getStatusText = (status) => {
    switch (status) {
      case 'free':
        return 'E lirë';
      case 'ordering':
        return 'Duke porositur';
      case 'unpaid':
        return 'E papaguar';
      case 'paid':
        return 'E paguar';
      default:
        return status;
    }
  };
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {safeTablesArray.map((table) => {
        return (
          <div
            key={table._id}
            className="group bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden cursor-pointer"
            onClick={() => onSelectTable(table)}
          >
            <div className={`p-8 bg-gradient-to-br ${
              table.status === 'free' ? 'from-emerald-50 to-green-100' :
              table.status === 'ordering' ? 'from-amber-50 to-yellow-100' :
              table.status === 'unpaid' ? 'from-rose-50 to-red-100' :
              'from-blue-50 to-indigo-100'
            }`}>
              <div className="flex items-center mb-4">
                <div className={`w-14 h-14 bg-gradient-to-br ${
                  table.status === 'free' ? 'from-emerald-500 to-emerald-600' :
                  table.status === 'ordering' ? 'from-amber-500 to-amber-600' :
                  table.status === 'unpaid' ? 'from-rose-500 to-rose-600' :
                  'from-blue-500 to-blue-600'
                } rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <span className="text-white text-2xl font-bold">{table.number}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">Tavolina {table.number}</h3>
                  <p className={`text-sm font-medium ${
                    table.status === 'free' ? 'text-emerald-600' :
                    table.status === 'ordering' ? 'text-amber-600' :
                    table.status === 'unpaid' ? 'text-rose-600' :
                    'text-blue-600'
                  }`}>{getStatusText(table.status)}</p>
                </div>
              </div>
              {table.name && (
                <p className="text-gray-600 leading-relaxed">{table.name}</p>
              )}
            </div>
            <div className={`h-1 bg-gradient-to-r ${
              table.status === 'free' ? 'from-emerald-500 to-green-500' :
              table.status === 'ordering' ? 'from-amber-500 to-yellow-500' :
              table.status === 'unpaid' ? 'from-rose-500 to-red-500' :
              'from-blue-500 to-indigo-500'
            } transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`}></div>
          </div>
        );
      })}
    </div>
  );
};

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Thermal Printer State
  const [thermalPrinter] = useState(new ThermalPrinterService());
  const [showPrinterConfig, setShowPrinterConfig] = useState(false);
  const [printerSettings, setPrinterSettings] = useState({
    interface: 'usb',
    restaurantName: 'Vila Falo - Voskopoje, Korçë',
    autoTest: false // This autoTest property is in state but not used in the provided code.
  });
  const [printingStatus, setPrintingStatus] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);

  const { user, logout, token } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Fetch data: tables, active orders, and menu items
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {

        setError('No token available');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);

        
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        

        const menuRes = await axios.get(`${API_URL}/menu`, config);

        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
        

        const tablesRes = await axios.get(`${API_URL}/tables`, config);

        const tablesData = Array.isArray(tablesRes.data) ? tablesRes.data : [];
        setTables(tablesData.sort((a, b) => a.number - b.number));
        

        const ordersRes = await axios.get(`${API_URL}/orders/active`, config);

        setActiveOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
        

        setLoading(false);
      } catch (err) {
        console.error('❌ Fetch error:', err);
        console.error('❌ Error response:', err.response?.data);
        console.error('❌ Error status:', err.response?.status);
        setError('API Error: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        
        if (err.response?.status === 401) {
          navigate('/login');
        }
      }
    };
    
    fetchData();
  }, [token, navigate]);
  
  // Listen for socket events
  useEffect(() => {
    if (socket && connected) {
      // Listen for table updates
      socket.on('table-updated', (data) => {
        setTables((prevTables) => {
          const safePrevTables = Array.isArray(prevTables) ? prevTables : [];
          return safePrevTables.map((table) =>
            table._id === data.tableId
              ? { ...table, status: data.status }
              : table
          );
        });
      });
      
      // Listen for new orders
      socket.on('order-received', (orderData) => {
        setActiveOrders((prevOrders) => {
          const safePrevOrders = Array.isArray(prevOrders) ? prevOrders : [];
          const orderExists = safePrevOrders.some((order) => order._id === orderData._id);
          if (!orderExists) {
            return [...safePrevOrders, orderData];
          }
          return safePrevOrders;
        });
      });
      
      // Listen for order completion
      socket.on('order-completed', ({ orderId }) => {
        setActiveOrders((prevOrders) => {
          const safePrevOrders = Array.isArray(prevOrders) ? prevOrders : [];
          return safePrevOrders.filter((order) => order._id !== orderId);
        });
      });
      
      // Cleanup on unmount
      return () => {
        socket.off('table-updated');
        socket.off('order-received');
        socket.off('order-completed');
      };
    }
  }, [socket, connected]);
  
  // Handle table selection - show modal
  const handleSelectTable = (table) => {
    setSelectedTable(table);
  };

  // Get status text in Albanian
  const getStatusText = (status) => {
    switch (status) {
      case 'free': return 'E lire';
      case 'ordering': return 'Duke porositur';
      case 'unpaid': return 'E papaguar';
      case 'paid': return 'E paguar';
      default: return status;
    }
  };

  // Change table status
  const changeTableStatus = async (tableId, newStatus) => {
    try {
      const config = { headers: { 'x-auth-token': token } };

      if (newStatus === 'free') {
        const table = tables.find(t => t._id === tableId);
        if (table && table.currentOrder) {
          await axios.put(`${API_URL}/orders/${table.currentOrder}/status`, { status: 'completed' }, config);
        }
      }

      const updateResponse = await axios.put(`${API_URL}/tables/${tableId}`, {
        status: newStatus,
        currentOrder: newStatus === 'free' ? null : undefined
      }, config);

      setTables(tables.map(t => t._id === tableId ? updateResponse.data : t));

      if (socket && connected) {
        socket.emit('table-status-change', { _id: tableId, status: newStatus, updatedBy: 'Waiter' });
      }

      setSelectedTable(prev => prev && prev._id === tableId ? { ...prev, status: newStatus } : prev);
    } catch (err) {
      console.error('Status change error:', err);
      setError('Gabim gjate ndryshimit te statusit');
    }
  };
  
  // Handle navigation to new order page
  const handleNewOrder = () => {
    navigate('/waiter/order/new');
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Enhanced currency formatting with proper number handling
  const formatCurrency = (amount) => {
    // Ensure amount is a valid number
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
    return numAmount.toLocaleString('sq-AL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }) + ' LEK';
  };
  
  // Calculate order total with proper validation
  const calculateOrderTotal = (items) => {
    if (!Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
      const price = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      return total + (price * quantity);
    }, 0);
  };

  // Get item name from menuItems
  const getItemName = (item) => {
    // First try direct name if it exists
    if (item && item.name) {
      return item.name;
    }
    
    // If menuItem is an object with a name
    if (item && item.menuItem && typeof item.menuItem === 'object') {
      if (item.menuItem.albanianName) return item.menuItem.albanianName;
      if (item.menuItem.name) return item.menuItem.name;
    }
    
    // If menuItem is just an ID string, look it up in our menuItems state
    if (item && item.menuItem && typeof item.menuItem === 'string') {
      const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
      const menuItemFromState = safeMenuItems.find(m => m._id === item.menuItem); // Renamed variable to avoid conflict
      if (menuItemFromState) {
        // Prefer Albanian name
        if (menuItemFromState.albanianName) return menuItemFromState.albanianName;
        if (menuItemFromState.name) return menuItemFromState.name;
      }
    }
    
    // Last resort fallback
    return 'Artikull pa emër';
  };

  // Enhanced thermal receipt printing
  const printReceipt = async (order, options = {}) => {
    try {
      setPrintingOrder(order._id);
      setPrintingStatus('Duke printuar...');
      
      // Configure printer with current settings
      thermalPrinter.configurePrinter({
        interface: printerSettings.interface,
        restaurantName: printerSettings.restaurantName
      });
      
      // Print the receipt
      const result = await thermalPrinter.printReceipt(order, {
        restaurantName: printerSettings.restaurantName,
        waiterName: user?.name,
        ...options
      });
      
      if (result.success) {
        setPrintingStatus('✅ Fatura u printua me sukses!');
        // Show success message briefly
        setTimeout(() => {
          setPrintingStatus('');
          setPrintingOrder(null);
        }, 3000);
      } else {
        setPrintingStatus('❌ ' + result.message);
        setTimeout(() => {
          setPrintingStatus('');
          setPrintingOrder(null);
        }, 5000);
      }
      
    } catch (error) {
      console.error('Print failed:', error);
      setPrintingStatus('❌ Gabim në printim: ' + error.message);
      setTimeout(() => {
        setPrintingStatus('');
        setPrintingOrder(null);
      }, 5000);
    }
  };
  
  // Test thermal printer
  const testThermalPrinter = async () => {
    try {
      setPrintingStatus('Duke testuar printerin...');
      thermalPrinter.configurePrinter(printerSettings);
      
      const result = await thermalPrinter.testPrinter();
      
      if (result.success) {
        setPrintingStatus('✅ Printeri funksionon mirë!');
      } else {
        setPrintingStatus('❌ ' + result.message);
      }
      
      setTimeout(() => setPrintingStatus(''), 3000);
      
    } catch (error) {
      setPrintingStatus('❌ Gabim në testim: ' + error.message);
      setTimeout(() => setPrintingStatus(''), 5000);
    }
  };
  
  // Configure printer settings
  const updatePrinterSettings = (newSettings) => {
    setPrinterSettings(prev => ({ ...prev, ...newSettings }));
    thermalPrinter.configurePrinter({ ...printerSettings, ...newSettings }); // Ensure new settings are applied to the service
  };

  // Toggle table management mode
  const navigateToTableManagement = () => {
    navigate('/waiter/tables');
  };
  
  // Ensure safe arrays for rendering
  const safeTables = Array.isArray(tables) ? tables : [];
  const safeActiveOrders = Array.isArray(activeOrders) ? activeOrders : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-pulse mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Duke ngarkuar...</h2>
          <p className="text-gray-500">Ju lutem prisni një moment</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Enhanced Header with glassmorphism effect */}
      <div className="relative">
        <div className="vila-page-header">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    Vila Falo
                  </h1>
                </div>
                <p className="text-blue-100 text-lg font-medium">
                  Mirësevini, <span className="text-white font-semibold">{user?.name || 'Përdorues'}</span>
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-blue-100 text-sm font-medium mt-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
                  {connected ? 'Në linjë' : 'Jo në linjë'} • Kamarier
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center">
                <button 
                  onClick={handleNewOrder} 
                  className="group px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1 backdrop-blur-sm"
                >
                  <div className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300">
                    <svg fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-semibold">Porosi e Re</span>
                </button>
                
                <button
                  onClick={navigateToTableManagement}
                  className="group px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L13.414 13H18v3a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM5 8a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm5 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Tavolinat</span>
                </button>
                
                <button 
                  onClick={() => setShowPrinterConfig(!showPrinterConfig)}
                  className="group px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">🖨️ Printer</span>
                </button>
                
                <button 
                  onClick={handleLogout} 
                  className="group px-6 py-3 bg-rose-500/80 hover:bg-rose-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform duration-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Dilni</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Printing Status Banner */}
      {printingStatus && (
        <div className="container mx-auto px-4 pt-4">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-400 text-purple-800 p-6 relative rounded-2xl shadow-lg backdrop-blur-sm animate-pulse" role="alert">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mr-3"></div>
              <p className="font-semibold text-lg">{printingStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="container mx-auto px-4 pt-4"> {/* Added container and pt-4 for consistency if error is shown alone */}
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-400 text-red-800 p-6 mb-6 relative rounded-2xl shadow-lg backdrop-blur-sm" role="alert">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold mb-1">Gabim në sistem</h3>
                <p className="text-sm">{error}</p>
              </div>
              <button 
                className="flex-shrink-0 ml-4 p-2 rounded-lg hover:bg-red-100 transition-colors duration-200" 
                onClick={() => setError('')}
              >
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Printer Configuration Modal */}
      {showPrinterConfig && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-8 py-6 rounded-t-3xl">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center">
                  🖨️ Konfigurimi i Printerit
                </h2>
                <button 
                  onClick={() => setShowPrinterConfig(false)}
                  className="text-white hover:text-gray-200 transition-colors duration-200"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Printer Interface Selection */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Lloji i lidhjes së printerit
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['usb', 'serial', 'network'].map(type => (
                    <div 
                      key={type}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                        printerSettings.interface === type 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                      onClick={() => updatePrinterSettings({ interface: type })}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">
                          {type === 'usb' ? '🔌' : type === 'serial' ? '📡' : '🌐'}
                        </div>
                        <div className="font-semibold capitalize">{type}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {type === 'usb' ? 'Lidhje USB' :
                           type === 'serial' ? 'Port Serial' : 'Rrjet (TCP/IP)'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Restaurant Name */}
              <div>
                <label className="block text-lg font-semibold text-gray-700 mb-3">
                  Emri i restorantit për faturën
                </label>
                <input
                  type="text"
                  value={printerSettings.restaurantName}
                  onChange={(e) => updatePrinterSettings({ restaurantName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl focus:border-purple-500 focus:outline-none transition-colors duration-200 text-lg"
                  placeholder="Shkruani emrin e restorantit..."
                />
              </div>
              
              {/* Network Settings (if network selected) */}
              {printerSettings.interface === 'network' && (
                <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200">
                  <h3 className="text-xl font-bold text-blue-800 mb-4">🌐 Cilësimet e rrjetit</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-blue-700 mb-2">
                        Adresa IP e printerit
                      </label>
                      <input
                        type="text"
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        // value={printerSettings.networkIp || ''} // Example: if you add networkIp to printerSettings
                        // onChange={(e) => updatePrinterSettings({ networkIp: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-blue-700 mb-2">
                        Porti
                      </label>
                      <input
                        type="number"
                        placeholder="9100"
                        className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                        // value={printerSettings.networkPort || ''} // Example: if you add networkPort to printerSettings
                        // onChange={(e) => updatePrinterSettings({ networkPort: parseInt(e.target.value) || 9100 })}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {/* USB/Serial Info */}
              {printerSettings.interface !== 'network' && (
                <div className="bg-green-50 p-6 rounded-2xl border border-green-200">
                  <h3 className="text-xl font-bold text-green-800 mb-3">
                    {printerSettings.interface === 'usb' ? '🔌 USB' : '📡 Serial'} - Informacion lidhje
                  </h3>
                  <div className="text-green-700 space-y-2">
                    <p>• Sigurohuni që printeri termik është i lidhur përmes {printerSettings.interface.toUpperCase()}</p>
                    <p>• Printerat e mbështetur: Epson, Star, Citizen, dhe ESC/POS</p>
                    <p>• Shfletuesi do të kërkojë leje për të aksesuar printerin</p>
                    {printerSettings.interface === 'usb' && (
                      <p>• Kërkon shfletues modern me Web USB API (Chrome, Edge)</p>
                    )}
                    {printerSettings.interface === 'serial' && (
                      <p>• Kërkon shfletues modern me Web Serial API</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={testThermalPrinter}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  🧪 Testo Printerin
                </button>
                
                <button
                  onClick={() => setShowPrinterConfig(false)}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-2xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  ❌ Mbyll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Table Section */}
        <div className="mb-10">
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-gray-200/50">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Statuset e Tavolinave</h2>
                  <p className="text-gray-600">Klikoni në tavolinë për të parë detajet ose për të bërë porosi</p>
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center bg-white/60 px-3 py-2 rounded-xl">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full mr-2 ring-2 ring-emerald-400/30"></div>
                    <span className="font-medium text-emerald-700">E lirë</span>
                  </div>
                  <div className="flex items-center bg-white/60 px-3 py-2 rounded-xl">
                    <div className="w-3 h-3 bg-amber-400 rounded-full mr-2 ring-2 ring-amber-400/30"></div>
                    <span className="font-medium text-amber-700">Duke porositur</span>
                  </div>
                  <div className="flex items-center bg-white/60 px-3 py-2 rounded-xl">
                    <div className="w-3 h-3 bg-rose-400 rounded-full mr-2 ring-2 ring-rose-400/30"></div>
                    <span className="font-medium text-rose-700">E papaguar</span>
                  </div>
                  <div className="flex items-center bg-white/60 px-3 py-2 rounded-xl">
                    <div className="w-3 h-3 bg-blue-400 rounded-full mr-2 ring-2 ring-blue-400/30"></div>
                    <span className="font-medium text-blue-700">E paguar</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <TableGrid tables={safeTables} onSelectTable={handleSelectTable} />
              
              {safeTables.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">Nuk ka tavolina</h3>
                  <p className="text-gray-500">Tavolinat do të shfaqen këtu pasi të ngarkohen</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Enhanced Active Orders Section */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl border border-white/20 overflow-hidden mb-10">
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-8 py-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">Porositë Aktive</h2>
                <p className="text-gray-600">Gjithsej {safeActiveOrders.length} porosi aktive</p>
              </div>
              {safeActiveOrders.length > 0 && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live updates</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-8">
            {safeActiveOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Nuk ka porosi aktive</h3>
                <p className="text-gray-500 mb-6">Porosia e re do të shfaqet automatikisht këtu</p>
                <button 
                  onClick={handleNewOrder}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:-translate-y-1 shadow-lg"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Krijo Porosi të Re
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {safeActiveOrders.map((order) => {
                  const safeOrderItems = Array.isArray(order.items) ? order.items : [];
                  // Calculate and verify the total
                  const calculatedTotal = calculateOrderTotal(safeOrderItems);
                  const displayTotal = order.totalAmount || calculatedTotal;
                  
                  return (
                    <div key={order._id} className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 flex justify-between items-center border-b border-gray-100">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">Tavolina {order.table?.number || 'N/A'}</div>
                            <div className="text-xs text-gray-500">
                              {safeOrderItems.length} artikuj
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-600">
                            {new Date(order.createdAt).toLocaleTimeString('sq-AL', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-xs text-gray-400">
                            {Math.floor((Date.now() - new Date(order.createdAt)) / 60000)}min më parë
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="space-y-3 mb-6">
                          {safeOrderItems.map((item, index) => {
                            const itemName = getItemName(item);
                            const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price) || 0;
                            const itemQuantity = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
                            const itemTotal = itemPrice * itemQuantity;
                            
                            return (
                              <div key={index} className="flex justify-between items-start group-hover:bg-gray-50 rounded-lg p-3 -m-3 transition-colors duration-200">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                                      {itemQuantity}
                                    </span>
                                    <span className="font-semibold text-gray-800">{itemName}</span>
                                  </div>
                                  {item.notes && (
                                    <p className="text-sm text-gray-500 mt-1 ml-8 italic">
                                      "{item.notes}"
                                    </p>
                                  )}
                                </div>
                                <div className="text-right ml-4">
                                  <div className="font-bold text-gray-800">
                                    {formatCurrency(itemTotal)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatCurrency(itemPrice)} × {itemQuantity}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="border-t-2 border-gray-100 pt-4 mb-6">
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-bold text-gray-800">Total:</span>
                            <span className="text-xl font-bold text-blue-600">
                              {formatCurrency(displayTotal)}
                            </span>
                          </div>
                          {order.totalAmount !== null && order.totalAmount !== undefined && calculatedTotal !== order.totalAmount && (
                            <div className="text-xs text-amber-600 mt-1">
                              ⚠️ Totali i ri-llogaritur: {formatCurrency(calculatedTotal)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 px-6 py-4 flex justify-between space-x-3">
                        <Link
                          to={`/waiter/table/${order.table?._id}`}
                          className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
                        >
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          Detajet
                        </Link>
                        <button 
                          onClick={() => printReceipt(order)}
                          disabled={printingOrder === order._id}
                          className={`flex-1 inline-flex items-center justify-center px-4 py-2 rounded-xl transition-colors duration-200 font-medium ${
                            printingOrder === order._id 
                              ? 'bg-gray-400 text-white cursor-not-allowed' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {printingOrder === order._id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Duke printuar...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                              </svg>
                              🧾 Print
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link to="/waiter/order/new" className="group bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">Porosi e Re</h3>
                  <p className="text-blue-600 text-sm font-medium">Krijo porosi</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Filloni një porosi të re për klientët tuaj</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>

          <Link 
            to="/waiter/tables"
            className="group bg-gradient-to-br from-emerald-50 to-green-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-emerald-200 overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L13.414 13H18v3a2 2 0 01-2 2H4a2 2 0 01-2-2V5zM5 8a1 1 0 011-1h1a1 1 0 110 2H6a1 1 0 01-1-1zm5 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-200">Menaxho Tavolinat</h3>
                  <p className="text-emerald-600 text-sm font-medium">Kontrollo statuset</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Ndrysho statuset dhe menaxho tavolinat</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>

          <div className="group bg-gradient-to-br from-purple-50 to-violet-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200 overflow-hidden cursor-pointer">
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-200">Statistikat</h3>
                  <p className="text-purple-600 text-sm font-medium">Performanca</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Shiko statistikat e porosive dhe performancës</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </div>
        </div>
      </div>
      
      {/* Table Detail Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTable(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={`px-6 py-5 ${
              selectedTable.status === 'free' ? 'bg-gradient-to-r from-emerald-500 to-green-600' :
              selectedTable.status === 'ordering' ? 'bg-gradient-to-r from-amber-500 to-yellow-600' :
              selectedTable.status === 'unpaid' ? 'bg-gradient-to-r from-rose-500 to-red-600' :
              'bg-gradient-to-r from-blue-500 to-indigo-600'
            }`}>
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Tavolina {selectedTable.number}</h2>
                <button onClick={() => setSelectedTable(null)} className="text-white/80 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-sm text-gray-500">Kapaciteti</div>
                  <div className="font-semibold text-gray-800">{selectedTable.capacity} persona</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Statusi</div>
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedTable.status === 'free' ? 'bg-green-100 text-green-800' :
                    selectedTable.status === 'ordering' ? 'bg-yellow-100 text-yellow-800' :
                    selectedTable.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {getStatusText(selectedTable.status)}
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Ndrysho statusin:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTable.status !== 'free' && (
                    <button onClick={() => changeTableStatus(selectedTable._id, 'free')}
                      className="py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium text-sm">
                      E lire
                    </button>
                  )}
                  {selectedTable.status !== 'ordering' && (
                    <button onClick={() => changeTableStatus(selectedTable._id, 'ordering')}
                      className="py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition font-medium text-sm">
                      Duke porositur
                    </button>
                  )}
                  {selectedTable.status !== 'unpaid' && (
                    <button onClick={() => changeTableStatus(selectedTable._id, 'unpaid')}
                      className="py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-medium text-sm">
                      E papaguar
                    </button>
                  )}
                  {selectedTable.status !== 'paid' && (
                    <button onClick={() => changeTableStatus(selectedTable._id, 'paid')}
                      className="py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition font-medium text-sm">
                      E paguar
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => { setSelectedTable(null); navigate(`/waiter/table/${selectedTable._id}`); }}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition flex items-center justify-center font-semibold"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Shiko detajet
                </button>
                <button
                  onClick={() => { setSelectedTable(null); navigate(`/waiter/table/${selectedTable._id}/order`); }}
                  className="w-full py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition flex items-center justify-center font-semibold"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Bej porosi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden">
        <button
          onClick={handleNewOrder}
          className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
        >
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default WaiterDashboard;
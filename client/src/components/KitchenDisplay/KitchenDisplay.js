import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Enhanced Kitchen Display System - Large screen for kitchen viewing
const KitchenDisplay = () => {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [fullscreen, setFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  const { token } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  
  // Sound refs
  const newOrderSound = useRef(null);
  const urgentSound = useRef(null);
  
  // Initialize sounds
  useEffect(() => {
    newOrderSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmseGjOJ1fjOci8HKnrI7OCNEA');
    urgentSound.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmseGjOJ1fjOci8HKnrI7OCNEA');
  }, []);
  
  // Play notification sound
  const playSound = useCallback((isUrgent = false) => {
    if (!soundEnabled) return;
    try {
      const sound = isUrgent ? urgentSound.current : newOrderSound.current;
      if (sound) {
        sound.currentTime = 0;
        sound.play().catch(console.error);
      }
    } catch (error) {
      console.error('Sound error:', error);
    }
  }, [soundEnabled]);
  
  // Auto-refresh time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);
  
  // Update connection status
  useEffect(() => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  }, [connected]);
  
  // Fullscreen handling
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        setFullscreen(true);
      }).catch(console.error);
    } else {
      document.exitFullscreen().then(() => {
        setFullscreen(false);
      }).catch(console.error);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        const config = { headers: { 'x-auth-token': token } };
        
        // Fetch menu items
        const menuRes = await axios.get(`${API_URL}/menu`, config);
        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
        
        // Fetch active orders
        const ordersRes = await axios.get(`${API_URL}/orders`, config);
        const safeOrdersData = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const activeOrders = safeOrdersData.filter(order => order.status === 'active');
        
        // Sort by oldest first (most urgent)
        setOrders(activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
        setLoading(false);
      } catch (err) {
        console.error('Kitchen Display fetch error:', err);
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Auto-refresh every 5 seconds for real-time feel
    const refreshInterval = setInterval(fetchData, 5000);
    
    return () => clearInterval(refreshInterval);
  }, [token]);
  
  // Socket listeners for real-time updates
  useEffect(() => {
    if (socket && connected) {
      socket.on('order-updated', (updatedOrder) => {
        setOrders(currentOrders => {
          const safeCurrentOrders = Array.isArray(currentOrders) ? currentOrders : [];
          
          if (updatedOrder.status !== 'active') {
            return safeCurrentOrders.filter(order => order._id !== updatedOrder._id);
          }
          
          if (safeCurrentOrders.some(order => order._id === updatedOrder._id)) {
            return safeCurrentOrders.map(order => 
              order._id === updatedOrder._id ? updatedOrder : order
            );
          }
          
          if (updatedOrder.status === 'active') {
            return [...safeCurrentOrders, updatedOrder]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          
          return safeCurrentOrders;
        });
      });
      
      socket.on('new-order', (newOrder) => {
        if (newOrder.status === 'active') {
          // Play sound for new order
          const orderAge = Math.floor((Date.now() - new Date(newOrder.createdAt)) / (1000 * 60));
          playSound(orderAge >= 15);
          
          setOrders(currentOrders => {
            const safeCurrentOrders = Array.isArray(currentOrders) ? currentOrders : [];
            return [...safeCurrentOrders, newOrder]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
        }
      });
      
      return () => {
        socket.off('order-updated');
        socket.off('new-order');
      };
    }
  }, [socket, connected, playSound]);
  
  // Get item name from menu
  const getItemName = useCallback((item) => {
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
    
    if (item && item.name) return item.name;
    
    if (item && item.menuItem && typeof item.menuItem === 'object') {
      if (item.menuItem.albanianName) return item.menuItem.albanianName;
      if (item.menuItem.name) return item.menuItem.name;
    }
    
    if (item && item.menuItem && typeof item.menuItem === 'string') {
      const menuItem = safeMenuItems.find(m => m._id === item.menuItem);
      if (menuItem) {
        if (menuItem.albanianName) return menuItem.albanianName;
        if (menuItem.name) return menuItem.name;
      }
    }
    
    return 'Artikull pa emër';
  }, [menuItems]);
  
  // Get order priority based on time
  const getOrderPriority = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes >= 30) return 'critical';
    if (diffMinutes >= 15) return 'warning';
    return 'normal';
  }, []);
  
  // Get time difference
  const getTimeDifference = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }, []);
  
  // Group items by category for better organization
  const groupItemsByCategory = useCallback((items) => {
    const grouped = {};
    const safeItems = Array.isArray(items) ? items : [];
    
    safeItems.forEach(item => {
      let category = 'Të tjera';
      
      if (item && item.category) {
        category = item.category;
      } else if (item && item.menuItem && typeof item.menuItem === 'object' && item.menuItem.category) {
        category = item.menuItem.category;
      } else if (item && item.menuItem && typeof item.menuItem === 'string') {
        const menuItem = menuItems.find(m => m._id === item.menuItem);
        if (menuItem && menuItem.category) {
          category = menuItem.category;
        }
      }
      
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }, [menuItems]);
  
  // Get category display name
  const getCategoryName = (category) => {
    switch(category) {
      case 'food':
        return '🍽️ Ushqime';
      case 'drink':
        return '🥤 Pije';
      case 'dessert':
        return '🍰 Ëmbëlsira';
      default:
        return `📦 ${category}`;
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-orange-500 mx-auto mb-8"></div>
            <div className="absolute inset-0 rounded-full h-32 w-32 border-4 border-transparent border-r-red-400 animate-pulse mx-auto"></div>
          </div>
          <h2 className="text-6xl font-bold text-white mb-4">🔥 Duke ngarkuar...</h2>
          <p className="text-3xl text-gray-300">Sistemi i kuzhinës po hapet</p>
        </div>
      </div>
    );
  }
  
  const safeOrders = Array.isArray(orders) ? orders : [];
  const criticalOrders = safeOrders.filter(order => getOrderPriority(order.createdAt) === 'critical');
  const warningOrders = safeOrders.filter(order => getOrderPriority(order.createdAt) === 'warning');
  const normalOrders = safeOrders.filter(order => getOrderPriority(order.createdAt) === 'normal');
  
  return (
    <div className={`min-h-screen bg-gray-900 text-white ${fullscreen ? 'cursor-none' : ''}`}>
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-rose-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-orange-500/10 to-white/5"></div>
        
        <div className="relative py-8 px-8 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-7xl font-bold bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">
                🔥 KUZHINA VILA FALO
              </h1>
              <p className="text-3xl text-orange-100 mt-2 font-medium">
                Sistemi i Ekranit të Kuzhinës - Live Display
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-5xl font-bold text-white">
                {currentTime.toLocaleTimeString('sq-AL', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
              <div className="text-2xl text-orange-100">
                {currentTime.toLocaleDateString('sq-AL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
              <div className={`text-xl mt-3 flex items-center justify-end ${
                connectionStatus === 'connected' ? 'text-green-300' : 'text-red-300'
              }`}>
                <div className={`w-5 h-5 rounded-full mr-3 ${
                  connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`}></div>
                {connectionStatus === 'connected' ? '🟢 LIVE' : '🔴 OFFLINE'}
              </div>
            </div>
          </div>
          
          {/* Enhanced Stats Bar */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-4xl font-bold text-yellow-300">{safeOrders.length}</div>
              <div className="text-xl text-white/80">Totali Porosi</div>
            </div>
            
            <div className="bg-red-500/20 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-4xl font-bold text-red-300">{criticalOrders.length}</div>
              <div className="text-xl text-white/80">🚨 Urgjente</div>
            </div>
            
            <div className="bg-yellow-500/20 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-4xl font-bold text-yellow-300">{warningOrders.length}</div>
              <div className="text-xl text-white/80">⚠️ Kujdes</div>
            </div>
            
            <div className="bg-green-500/20 backdrop-blur-sm rounded-2xl p-4 text-center">
              <div className="text-4xl font-bold text-green-300">{normalOrders.length}</div>
              <div className="text-xl text-white/80">✅ Normale</div>
            </div>
          </div>
          
          {safeOrders.length > 0 && (
            <div className="mt-4 text-center text-2xl">
              ⏰ Më e vjetra: <span className="font-bold text-yellow-300">{getTimeDifference(safeOrders[0]?.createdAt)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Control Panel */}
      {!fullscreen && (
        <div className="bg-gray-800 px-8 py-4 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={toggleFullscreen}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center"
            >
              🖥️ Ekran të plotë
            </button>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-6 py-3 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center ${
                soundEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {soundEnabled ? '🔊 Zëri ON' : '🔇 Zëri OFF'}
            </button>
          </div>
          
          <div className="text-gray-400">
            Auto-refresh: 5s | Fullscreen: F11 key
          </div>
        </div>
      )}
      
      {/* Orders Display */}
      <div className="p-8">
        {safeOrders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-9xl mb-8 animate-bounce">✨</div>
            <h2 className="text-8xl font-bold text-gray-400 mb-6">Gjithçka Gati!</h2>
            <p className="text-4xl text-gray-500 mb-8">Nuk ka porosi në pritje</p>
            <div className="mt-8 text-3xl text-green-400 animate-pulse">
              🎉 Kuzhina është e lirë për porosi të reja
            </div>
            <div className="mt-12 text-2xl text-gray-600">
              Sistemi monitoron automatikisht për porosi të reja...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {safeOrders.map((order, index) => {
              const safeOrderItems = Array.isArray(order.items) ? order.items : [];
              const priority = getOrderPriority(order.createdAt);
              const timeDiff = getTimeDifference(order.createdAt);
              const groupedItems = groupItemsByCategory(safeOrderItems);
              const completedItems = safeOrderItems.filter(item => item.prepared).length;
              const totalItems = safeOrderItems.length;
              const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
              
              const priorityColors = {
                critical: 'from-red-600 to-red-700 border-red-400 shadow-red-500/50',
                warning: 'from-yellow-600 to-orange-600 border-yellow-400 shadow-yellow-500/50',
                normal: 'from-green-600 to-emerald-600 border-green-400 shadow-green-500/50'
              };
              
              const priorityIcons = {
                critical: '🚨',
                warning: '⚠️',
                normal: '✅'
              };
              
              return (
                <div
                  key={order._id}
                  className={`bg-gradient-to-br ${priorityColors[priority]} rounded-3xl p-8 border-4 shadow-2xl transform hover:scale-105 transition-all duration-300 ${
                    priority === 'critical' ? 'animate-pulse' : ''
                  }`}
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-center mb-6 pb-4 border-b-2 border-white/30">
                    <div>
                      <div className="text-5xl font-bold flex items-center">
                        {priorityIcons[priority]} 
                        <span className="ml-3">T-{order.table?.number || 'N/A'}</span>
                      </div>
                      <div className="text-2xl text-white/80 mt-2">
                        👤 {order.waiter?.name || 'N/A'}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-4xl font-bold text-white">
                        {timeDiff}
                      </div>
                      <div className="text-xl text-white/80">
                        {priority === 'critical' ? '🚨 URGJENT!' :
                         priority === 'warning' ? '⚠️ Kujdes' : '✅ Normal'}
                      </div>
                      <div className="text-lg text-white/70 mt-1">
                        Porosi #{index + 1}
                      </div>
                    </div>
                  </div>
                  
                  {/* Order Items by Category */}
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category} className="bg-black/20 rounded-2xl p-6">
                        <h3 className="text-2xl font-bold text-white mb-4 border-b border-white/30 pb-2">
                          {getCategoryName(category)} ({items.length})
                        </h3>
                        
                        <div className="space-y-3">
                          {items.map((item, itemIndex) => {
                            const itemName = getItemName(item);
                            
                            return (
                              <div
                                key={item._id || itemIndex}
                                className={`bg-white/20 rounded-xl p-4 backdrop-blur-sm transition-all duration-300 ${
                                  item.prepared ? 'opacity-60 bg-green-500/30' : 'hover:bg-white/30'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <div className={`text-2xl font-bold rounded-full w-12 h-12 flex items-center justify-center ${
                                      item.prepared ? 'bg-green-500 text-white' : 'bg-white/30 text-white'
                                    }`}>
                                      {item.quantity}
                                    </div>
                                    <div>
                                      <div className={`text-xl font-bold ${
                                        item.prepared ? 'line-through text-green-200' : 'text-white'
                                      }`}>
                                        {itemName}
                                      </div>
                                      {item.notes && (
                                        <div className="text-lg text-yellow-200 mt-2 bg-yellow-900/40 p-2 rounded-lg">
                                          💬 {item.notes}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    {item.prepared ? (
                                      <div className="text-2xl text-green-200">
                                        ✅ GATI
                                      </div>
                                    ) : (
                                      <div className="text-2xl text-white font-bold animate-pulse">
                                        🍳 PËRGATIT
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Enhanced Order Progress */}
                  <div className="mt-6 pt-4 border-t-2 border-white/30">
                    <div className="flex justify-between items-center text-xl mb-3">
                      <span className="font-semibold">Progresi:</span>
                      <span className="font-bold text-2xl">
                        {completedItems} / {totalItems}
                      </span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-6">
                      <div
                        className={`h-6 rounded-full transition-all duration-500 ${
                          progress === 100 ? 'bg-green-400' : 'bg-white'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-center mt-2 text-lg font-semibold">
                      {progress.toFixed(0)}% e përfunduar
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Enhanced Footer */}
      <div className="bg-gray-800/95 backdrop-blur-sm py-6 px-8 border-t border-gray-700">
        <div className="flex justify-between items-center text-lg">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-green-500 rounded-full"></div>
              <span className="text-green-300 font-semibold">Normal (0-15 min)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-300 font-semibold">Kujdes (15-30 min)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-300 font-semibold">Urgjent (30+ min)</span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-gray-400">
              🔄 Auto-refresh: 5s | 📡 Live Updates: {connected ? '🟢 ACTIVE' : '🔴 INACTIVE'}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Sistemi i Kuzhinës Vila Falo v2.0 - Kitchen Display System
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KitchenDisplay;
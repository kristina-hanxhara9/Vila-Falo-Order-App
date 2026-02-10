import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';
import '../../styles/kitchen-button-fixes.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Professional Priority System
const ORDER_PRIORITY = {
  URGENT: { 
    minutes: 30, 
    cardClass: 'vila-card-urgent',
    badgeClass: 'vila-badge-urgent',
    buttonClass: 'vila-btn-danger',
    icon: '🚨'
  },
  WARNING: { 
    minutes: 15, 
    cardClass: 'vila-card-warning',
    badgeClass: 'vila-badge-warning',
    buttonClass: 'vila-btn-warning',
    icon: '⚠️'
  },
  NORMAL: { 
    minutes: 0, 
    cardClass: 'vila-card-normal',
    badgeClass: 'vila-badge-normal',
    buttonClass: 'vila-btn-success',
    icon: '✅'
  }
};

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [isKitchenDisplay, setIsKitchenDisplay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { token, logout, user } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Refs for audio notifications
  const newOrderAudioRef = useRef(null);
  const urgentOrderAudioRef = useRef(null);
  
  // Create audio elements
  useEffect(() => {
    newOrderAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmseGjOJ1fjOci8HKnrI7OCNEA');
    urgentOrderAudioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmseGjOJ1fjOci8HKnrI7OCNEA');
  }, []);
  
  // Play notification sound
  const playNotificationSound = useCallback((isUrgent = false) => {
    if (!soundEnabled) return;
    
    try {
      const audio = isUrgent ? urgentOrderAudioRef.current : newOrderAudioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);
  
  // Add notification
  const addNotification = useCallback((message, type = 'info', isUrgent = false) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
      isUrgent
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, isUrgent ? 10000 : 5000);
    
    playNotificationSound(isUrgent);
  }, [playNotificationSound]);

  // Toggle Kitchen Display Mode
  const toggleKitchenDisplay = () => {
    setIsKitchenDisplay(!isKitchenDisplay);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // Fetch menu items and orders
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {

        setError('No token available');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');

        
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        
        // First, fetch the menu items to get the names

        const menuRes = await axios.get(`${API_URL}/menu`, config);

        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
        
        // Then fetch orders

        const ordersRes = await axios.get(`${API_URL}/orders`, config);

        
        // Filter for active orders only with safety check
        const safeOrdersData = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const activeOrders = safeOrdersData.filter(order => order.status === 'active');
        
        // Sort by oldest first so kitchen can prioritize
        setOrders(activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));

        setLoading(false);
      } catch (err) {
        console.error('❌ Fetch error:', err);
        setError('API Error: ' + (err.response?.data?.message || err.message));
        setLoading(false);
        
        if (err.response?.status === 401) {
          navigate('/login');
        }
      }
    };
    
    fetchData();
    
    // Enhanced socket listeners with notifications
    if (socket) {
      socket.on('order-updated', (updatedOrder) => {

        setOrders(currentOrders => {
          const safeCurrentOrders = Array.isArray(currentOrders) ? currentOrders : [];
          
          // If the order is no longer active, remove it from the list
          if (updatedOrder.status !== 'active') {
            return safeCurrentOrders.filter(order => order._id !== updatedOrder._id);
          }
          
          // If the order is already in the list, update it
          if (safeCurrentOrders.some(order => order._id === updatedOrder._id)) {
            return safeCurrentOrders.map(order => 
              order._id === updatedOrder._id ? updatedOrder : order
            );
          }
          
          // If it's a new active order, add it to the list
          if (updatedOrder.status === 'active') {
            return [...safeCurrentOrders, updatedOrder]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
          
          return safeCurrentOrders;
        });
      });
      
      socket.on('new-order', (newOrder) => {

        
        if (newOrder.status === 'active') {
          // Check if order is urgent (older orders or special notes)
          const orderAge = Math.floor((Date.now() - new Date(newOrder.createdAt)) / (1000 * 60));
          const isUrgent = orderAge >= 15 || (newOrder.items && newOrder.items.some(item => item.notes?.toLowerCase().includes('urgjent')));
          
          // Add notification
          addNotification(
            `Porosi e re për Tavolinën ${newOrder.table?.number || 'N/A'}!`,
            'info',
            isUrgent
          );
          
          setOrders(currentOrders => {
            const safeCurrentOrders = Array.isArray(currentOrders) ? currentOrders : [];
            const newOrders = [...safeCurrentOrders, newOrder]
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            
            setLastOrderCount(newOrders.length);
            
            return newOrders;
          });
        }
      });
      
      // Listen for urgent order notifications
      socket.on('urgent-order-reminder', (orderData) => {
        addNotification(
          `🚨 Porosi urgjente për Tavolinën ${orderData.table?.number || 'N/A'}! (${Math.floor((Date.now() - new Date(orderData.createdAt)) / (1000 * 60))} min)`,
          'warning',
          true
        );
      });
      
      return () => {
        socket.off('order-updated');
        socket.off('new-order');
        socket.off('urgent-order-reminder');
      };
    }
  }, [token, socket, navigate, addNotification]);

  // Enhanced mark item as prepared with notifications
  const markItemAsPrepared = async (orderId, itemId) => {
    try {
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      
      // Find the item name for notification
      const safeOrders = Array.isArray(orders) ? orders : [];
      const currentOrder = safeOrders.find(order => order._id === orderId);
      const currentItem = currentOrder?.items?.find(item => item._id === itemId);
      const itemName = currentItem ? getItemName(currentItem) : 'Artikull';
      
      // Update the state locally first
      setOrders(currentOrders => {
        const safeOrdersList = Array.isArray(currentOrders) ? currentOrders : [];
        
        return safeOrdersList.map(order => {
          if (order._id === orderId) {
            const safeItems = Array.isArray(order.items) ? order.items : [];
            return {
              ...order,
              items: safeItems.map(item => {
                if (item._id === itemId) {
                  return { ...item, prepared: true };
                }
                return item;
              })
            };
          }
          return order;
        });
      });
      
      // Show success notification
      addNotification(`✅ ${itemName} u përgatit!`, 'success');
      setSuccess(`${itemName} u shënua si i përgatitur`);
      setTimeout(() => setSuccess(''), 3000);
      
      // Send update to server
      await axios.put(`${API_URL}/orders/${orderId}/item/${itemId}/prepared`, {}, config);
      
      // Check if all items are prepared
      if (currentOrder && Array.isArray(currentOrder.items)) {
        const allPrepared = currentOrder.items.every(item => 
          (item._id === itemId || item.prepared === true)
        );
        
        // If all items are prepared, auto-complete the order
        if (allPrepared) {
          await axios.put(`${API_URL}/orders/${orderId}/prepared`, {}, config);
          
          // Remove order from list
          setOrders(currentOrders => {
            const safeCurrentOrders = Array.isArray(currentOrders) ? currentOrders : [];
            return safeCurrentOrders.filter(order => order._id !== orderId);
          });
          
          addNotification(`🎉 Porosia për Tavolinën ${currentOrder.table?.number} është gati!`, 'success');
          setSuccess('Porosia u përfundua dhe u dërgua!');
          setTimeout(() => setSuccess(''), 3000);
        }
      }
      
    } catch (err) {
      setError('Gabim gjatë ndryshimit të statusit të artikullit');
      addNotification('❌ Gabim në shënimin e artikullit', 'error');
      console.error('Error marking item as prepared:', err);
    }
  };

  // Enhanced mark order as prepared with notifications
  const markOrderAsPrepared = async (orderId) => {
    try {
      const config = {
        headers: {
          'x-auth-token': token
        }
      };
      
      // Find order for notification
      const safeOrders = Array.isArray(orders) ? orders : [];
      const order = safeOrders.find(o => o._id === orderId);
      
      await axios.put(`${API_URL}/orders/${orderId}/prepared`, {}, config);
      
      // Remove order from list
      setOrders(currentOrders => {
        const safeCurrentOrders = Array.isArray(currentOrders) ? currentOrders : [];
        return safeCurrentOrders.filter(order => order._id !== orderId);
      });
      
      addNotification(`🚀 Porosia për Tavolinën ${order?.table?.number || 'N/A'} u dërgua!`, 'success');
      setSuccess('Porosia u përfundua dhe u dërgua te kamarieret!');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      setError('Gabim gjatë dërgimit të porosisë');
      addNotification('❌ Gabim në dërgimin e porosisë', 'error');
      console.error(err);
    }
  };
  
  // Get time difference class based on how long the order has been waiting
  const getTimeDifferenceInfo = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    let timeText;
    if (diffMinutes < 60) {
      timeText = `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      timeText = `${hours}h ${minutes}min`;
    }
    
    let priority;
    if (diffMinutes >= ORDER_PRIORITY.URGENT.minutes) priority = 'URGENT';
    else if (diffMinutes >= ORDER_PRIORITY.WARNING.minutes) priority = 'WARNING';
    else priority = 'NORMAL';
    
    return {
      text: timeText,
      priority,
      minutes: diffMinutes
    };
  }, []);
  
  // Group items by category for easier kitchen processing
  const groupItemsByCategory = (items) => {
    const grouped = {};
    const safeItems = Array.isArray(items) ? items : [];
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
    
    safeItems.forEach(item => {
      // For the category, check all possible sources
      let category = 'Të tjera';
      
      // Try to get category from item directly
      if (item && item.category) {
        category = item.category;
      } 
      // Try to get from menuItem if it's an object
      else if (item && item.menuItem && typeof item.menuItem === 'object' && item.menuItem.category) {
        category = item.menuItem.category;
      }
      // Try to find the menu item in our state
      else if (item && item.menuItem && typeof item.menuItem === 'string') {
        const menuItem = safeMenuItems.find(m => m._id === item.menuItem);
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
  };

  // Get item name - using the menuItems state
  const getItemName = (item) => {
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
    
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
      const menuItem = safeMenuItems.find(m => m._id === item.menuItem);
      if (menuItem) {
        // Prefer Albanian name
        if (menuItem.albanianName) return menuItem.albanianName;
        if (menuItem.name) return menuItem.name;
      }
    }
    // Last resort fallback
    return 'Artikull pa emër';
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Get category display name
  const getCategoryName = (category) => {
    switch(category) {
      case 'food':
        return 'Ushqime';
      case 'drink':
        return 'Pije';
      case 'dessert':
        return 'Ëmbëlsira';
      default:
        return category;
    }
  };
  
  // Auto-refresh orders every 30 seconds and check for urgent orders
  useEffect(() => {
    const interval = setInterval(() => {
      const safeOrders = Array.isArray(orders) ? orders : [];
      
      // Check for urgent orders and send notifications
      safeOrders.forEach(order => {
        const timeInfo = getTimeDifferenceInfo(order.createdAt);
        
        // Notify for urgent orders every 5 minutes
        if (timeInfo.priority === 'URGENT' && timeInfo.minutes % 5 === 0) {
          addNotification(
            `🚨 Porosi urgjente për Tavolinën ${order.table?.number}! (${timeInfo.text})`,
            'warning',
            true
          );
        }
      });
      
      // Force re-render to update time displays
      setOrders(currentOrders => [...currentOrders]);
    }, 10000); // 10 seconds
    
    return () => clearInterval(interval);
  }, [orders, addNotification, getTimeDifferenceInfo]);
  
  if (loading) {
    return (
      <div className="app-loading">
        <div className="vila-loading-card">
          <div className="vila-spinner"></div>
          <h2 className="vila-text-2xl vila-font-bold vila-text-center vila-mb-4">
            Duke ngarkuar kuzhinën...
          </h2>
          <p className="text-gray-600">Ju lutem prisni një moment</p>
        </div>
      </div>
    );
  }

  // Kitchen Display Mode - Large Screen Format
  if (isKitchenDisplay) {
    return (
      <div className={`vila-kitchen-display ${isFullscreen ? 'h-screen' : 'min-h-screen'} overflow-hidden`}>
        {/* Kitchen Display Header - Professional */}
        <div className="vila-header-content">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-6">
              <div className="vila-empty-icon w-16 h-16">
                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                </svg>
              </div>
              <div>
                <h1 className="vila-text-4xl vila-font-bold text-white mb-2">KUZHINA VILA FALO</h1>
                <div className="flex items-center space-x-4">
                  <span className="vila-text-2xl vila-font-semibold text-gray-300">
                    {Array.isArray(orders) ? orders.length : 0} POROSI AKTIVE
                  </span>
                  <div className={connected ? 'vila-status-online' : 'vila-status-offline'}>
                    {connected ? '🟢 LIVE' : '🔴 OFFLINE'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="vila-text-3xl vila-font-bold text-orange-400">
                {new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <button 
                onClick={toggleFullscreen}
                className="vila-btn vila-btn-info vila-btn-lg"
              >
                {isFullscreen ? '🪟 EXIT' : '🖥️ FULL'}
              </button>
              <button 
                onClick={toggleKitchenDisplay}
                className="vila-btn vila-btn-primary vila-btn-lg"
              >
                📱 NORMAL
              </button>
            </div>
          </div>
        </div>

        {/* Kitchen Display Orders */}
        <div className="vila-p-8">
          {(!Array.isArray(orders) || orders.length === 0) ? (
            <div className="flex items-center justify-center h-96">
              <div className="vila-empty-state bg-green-500/20 border border-green-500/30">
                <div className="text-8xl mb-8">✅</div>
                <div className="vila-text-4xl vila-font-bold text-green-400 mb-4">E GJITHA GATSHME!</div>
                <div className="vila-text-2xl text-gray-300">Nuk ka porosi në pritje</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
              {orders.map(order => {
                const safeOrderItems = Array.isArray(order.items) ? order.items : [];
                const allItemsPrepared = safeOrderItems.every(item => item.prepared);
                const timeInfo = getTimeDifferenceInfo(order.createdAt);
                const priorityConfig = ORDER_PRIORITY[timeInfo.priority];
                
                return (
                  <div 
                    key={order._id} 
                    className={`vila-kitchen-card ${
                      timeInfo.priority === 'URGENT' ? 'vila-kitchen-card-urgent' :
                      timeInfo.priority === 'WARNING' ? 'vila-kitchen-card-warning' :
                      'vila-kitchen-card-normal'
                    } ${allItemsPrepared ? 'bg-emerald-900/40 border-emerald-400' : ''}`}
                  >
                    {/* Large Order Header */}
                    <div className="vila-card-header bg-gradient-to-r from-orange-500 to-red-500">
                      <div className="flex justify-between items-center text-white">
                        <div>
                          <div className="vila-text-4xl vila-font-bold mb-2">
                            🍽️ TAVOLINA {order.table?.number || 'N/A'}
                          </div>
                          <div className="vila-text-xl opacity-90">
                            Kamarier: {order.waiter?.name || 'N/A'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="vila-text-3xl vila-font-bold mb-1">
                            {timeInfo.text}
                          </div>
                          <div className="vila-text-xl">
                            {priorityConfig.icon} {timeInfo.priority === 'URGENT' ? 'URGJENT!' :
                             timeInfo.priority === 'WARNING' ? 'KUJDES' : 'NORMAL'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Large Order Items */}
                    <div className="vila-card-body space-y-6">
                      {safeOrderItems.map(item => {
                        const itemName = getItemName(item);
                        
                        return (
                          <div 
                            key={item._id} 
                            className={`flex justify-between items-center vila-p-6 vila-rounded-2xl border-2 transition-all ${
                              item.prepared 
                                ? 'border-emerald-500 bg-emerald-900/30' 
                                : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700/70'
                            }`}
                          >
                            <div className="flex items-center space-x-6">
                              <div className={`w-16 h-16 vila-rounded-full flex items-center justify-center vila-text-3xl vila-font-bold ${
                                item.prepared ? 'bg-emerald-500' : 'bg-orange-500'
                              } text-white`}>
                                {item.quantity}
                              </div>
                              <div>
                                <div className={`vila-text-3xl vila-font-bold ${
                                  item.prepared ? 'line-through text-emerald-400' : 'text-white'
                                }`}>
                                  {itemName}
                                </div>
                                {item.notes && (
                                  <div className="vila-text-xl text-amber-400 vila-mt-2">
                                    💬 {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => markItemAsPrepared(order._id, item._id)}
                              className={`vila-btn vila-btn-xl ${
                                item.prepared 
                                  ? 'vila-btn-success cursor-not-allowed' 
                                  : 'vila-btn-warning'
                              }`}
                              disabled={item.prepared}
                            >
                              {item.prepared ? '✅ GATI' : '🍳 SHËNO'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Large Complete Button */}
                    <div className="vila-card-footer">
                      <button
                        onClick={() => markOrderAsPrepared(order._id)}
                        className={`w-full vila-btn vila-btn-xl ${
                          allItemsPrepared 
                            ? 'vila-btn-success' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!allItemsPrepared}
                      >
                        {allItemsPrepared ? '🎉 DËRGO POROSINË!' : '⏳ PRIT TË GJITHA ARTIKUJT'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Ensure safe arrays for rendering
  const safeOrdersForRender = Array.isArray(orders) ? orders : [];
  
  return (
    <div className="app-container">
      {/* Professional Header */}
      <header className="vila-header">
        <div className="vila-header-content">
          <div className="container">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0">
              {/* Brand Section */}
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-4 vila-mb-4">
                  <div className="vila-empty-icon w-16 h-16">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="vila-text-4xl vila-font-bold text-white mb-1">Vila Falo</h1>
                    <p className="text-gray-300 vila-text-lg vila-font-medium">Sistemi i Kuzhinës</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-gray-200">
                    Mirësevini, <span className="text-white vila-font-semibold">{user?.name || 'Përdorues'}</span>
                  </p>
                  <div className="flex items-center justify-center lg:justify-start space-x-4">
                    <div className={connected ? 'vila-status-online' : 'vila-status-offline'}>
                      <div className={`w-2 h-2 vila-rounded-full mr-2 ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                      {connected ? 'Në linjë' : 'Jo në linjë'}
                    </div>
                    <div className="vila-badge vila-badge-info border border-white/30 text-white">
                      <span className="vila-font-bold vila-text-xl mr-2">{safeOrdersForRender.length}</span>
                      Porosi aktive
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center">
                <button
                  onClick={toggleKitchenDisplay}
                  className="vila-btn vila-btn-info flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  Ekrani i Kuzhinës
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`vila-btn flex items-center ${
                    soundEnabled ? 'vila-btn-success' : 'bg-gray-500 hover:bg-gray-600 text-white'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d={soundEnabled ? "M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.764 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.764l3.619-2.793a1 1 0 011 .076zM15.5 6.5a.5.5 0 011 0v7a.5.5 0 01-1 0v-7zm2.5 2a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5z" : "M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.764 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.764l3.619-2.793a1 1 0 011 .076zM15 8.5a1 1 0 00-1.414-1.414L12 8.672 10.414 7.086A1 1 0 109 8.5L10.586 10 9 11.414a1 1 0 101.414 1.414L12 11.242l1.586 1.586A1 1 0 0015 11.414L13.414 10 15 8.586z"} clipRule="evenodd" />
                  </svg>
                  {soundEnabled ? 'Zëri ON' : 'Zëri OFF'}
                </button>
                
                <button 
                  onClick={handleLogout} 
                  className="vila-btn vila-btn-danger flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                  </svg>
                  Dilni
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Professional Notification System */}
      <div className="fixed top-24 right-6 z-50 space-y-3 max-w-sm">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`vila-notification ${
              notification.isUrgent ? 'vila-notification-urgent' : 'vila-notification-info'
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-6 h-6 vila-rounded-full flex items-center justify-center flex-shrink-0 ${
                notification.isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <div className={`w-2 h-2 vila-rounded-full ${
                  notification.isUrgent ? 'bg-red-500' : 'bg-blue-500'
                } animate-pulse`}></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`vila-font-semibold vila-text-sm ${
                  notification.isUrgent ? 'text-red-800' : 'text-blue-800'
                }`}>
                  {notification.message}
                </p>
                <p className={`vila-text-sm vila-mt-2 ${
                  notification.isUrgent ? 'text-red-600' : 'text-blue-600'
                } opacity-75`}>
                  {notification.timestamp.toLocaleTimeString('sq-AL')}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <main className="container vila-p-8">
        {/* Professional Error Alert */}
        {error && (
          <div className="vila-alert vila-alert-danger">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 vila-rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="vila-text-lg vila-font-semibold text-red-800 vila-mb-2">Gabim në sistem</h3>
                <p className="text-red-700">{error}</p>
              </div>
              <button 
                className="flex-shrink-0 vila-p-2 vila-rounded-lg hover:bg-red-100 transition-colors duration-200" 
                onClick={() => setError('')}
              >
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {/* Professional Success Alert */}
        {success && (
          <div className="vila-alert vila-alert-success">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-emerald-100 vila-rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="vila-font-semibold text-emerald-800">{success}</p>
            </div>
          </div>
        )}
        
        {/* Orders Grid or Empty State */}
        {safeOrdersForRender.length === 0 ? (
          <div className="vila-empty-state">
            <div className="vila-empty-icon">
              <svg className="h-16 w-16 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="vila-text-3xl vila-font-bold text-gray-800 vila-mb-4">Gjithçka në rregull!</h3>
            <p className="text-gray-600 vila-text-xl vila-mb-4">Nuk ka porosi aktive në pritje</p>
            <p className="text-gray-500">Porosia e re do të shfaqet automatikisht këtu</p>
            <div className="vila-mt-8">
              <div className="vila-badge vila-badge-normal vila-font-medium">
                <div className="w-3 h-3 bg-emerald-400 vila-rounded-full mr-3 animate-pulse"></div>
                Në pritje për porosi të reja...
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {safeOrdersForRender.map(order => {
              const safeOrderItems = Array.isArray(order.items) ? order.items : [];
              const allItemsPrepared = safeOrderItems.every(item => item.prepared);
              const groupedItems = groupItemsByCategory(safeOrderItems);
              const timeInfo = getTimeDifferenceInfo(order.createdAt);
              const priorityConfig = ORDER_PRIORITY[timeInfo.priority];
              
              return (
                <div 
                  key={order._id} 
                  className={`vila-card ${priorityConfig.cardClass} ${
                    allItemsPrepared ? 'bg-emerald-50 border-emerald-200' : ''
                  } ${timeInfo.priority === 'URGENT' ? 'ring-2 ring-red-200 animate-pulse' : ''}`}
                >
                  {/* Professional Order Header */}
                  <div className={`vila-card-header ${
                    allItemsPrepared ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <div className={`w-14 h-14 vila-rounded-xl flex items-center justify-center ${priorityConfig.badgeClass}`}>
                          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="vila-text-xl vila-font-bold text-gray-800">Tavolina {order.table?.number || 'N/A'}</h3>
                          <p className="text-gray-600">Kamarier: {order.waiter?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="vila-text-lg vila-font-bold text-gray-800">{timeInfo.text}</div>
                        <div className={`vila-badge ${priorityConfig.badgeClass}`}>
                          {priorityConfig.icon} {timeInfo.priority === 'URGENT' ? 'URGJENT!' :
                           timeInfo.priority === 'WARNING' ? 'Kujdes' : 'Normal'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Professional Order Items */}
                  <div className="vila-card-body">
                    {Object.entries(groupedItems).map(([category, items]) => {
                      const safeCategoryItems = Array.isArray(items) ? items : [];
                      
                      return (
                        <div key={category} className="vila-mb-8">
                          <div className="flex items-center vila-mb-4">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 vila-rounded-xl flex items-center justify-center mr-3 text-white vila-font-bold">
                              {safeCategoryItems.length}
                            </div>
                            <h4 className="vila-text-lg vila-font-bold text-gray-800 border-b-2 border-blue-200 pb-1">
                              {getCategoryName(category)}
                            </h4>
                          </div>
                          
                          <div className="space-y-4">
                            {safeCategoryItems.map(item => {
                              const itemName = getItemName(item);
                              
                              return (
                                <div 
                                  key={item._id} 
                                  className={`vila-rounded-xl vila-p-4 border transition-all duration-200 ${
                                    item.prepared 
                                      ? 'border-emerald-200 bg-emerald-50' 
                                      : 'border-gray-200 bg-gray-50 hover:border-blue-200 hover:bg-blue-50'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 vila-mb-4">
                                        <span className={`w-10 h-10 vila-rounded-full flex items-center justify-center text-white vila-text-sm vila-font-bold ${
                                          item.prepared ? 'bg-emerald-500' : 'bg-blue-500'
                                        }`}>
                                          {item.quantity}
                                        </span>
                                        <span className={`vila-text-lg vila-font-bold ${
                                          item.prepared ? 'line-through text-gray-500' : 'text-gray-800'
                                        }`}>
                                          {itemName}
                                        </span>
                                      </div>
                                      {item.notes && (
                                        <div className="ml-13 bg-amber-50 border-l-4 border-amber-300 vila-p-4 vila-rounded-r-lg">
                                          <p className="vila-text-sm text-amber-800 vila-font-medium">
                                            💬 {item.notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <button
                                      onClick={() => markItemAsPrepared(order._id, item._id)}
                                      className={`ml-4 vila-btn vila-btn-sm ${
                                        item.prepared 
                                          ? 'vila-btn-success cursor-not-allowed' 
                                          : 'vila-btn-warning'
                                      }`}
                                      disabled={item.prepared}
                                    >
                                      {item.prepared ? '✅ E gatshme' : '🍳 Shëno gati'}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Professional Complete Order Button */}
                  <div className="vila-card-footer">
                    <button
                      onClick={() => markOrderAsPrepared(order._id)}
                      className={`w-full vila-btn vila-btn-lg ${
                        allItemsPrepared 
                          ? 'vila-btn-success' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                      disabled={!allItemsPrepared}
                    >
                      {allItemsPrepared ? '🎉 Dërgo Porosinë!' : '⏳ Të gjitha artikujt duhet të jenë gati'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default KitchenDashboard;
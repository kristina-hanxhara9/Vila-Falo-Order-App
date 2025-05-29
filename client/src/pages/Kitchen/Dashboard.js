import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Enhanced status colors and priority levels
const ORDER_PRIORITY = {
  URGENT: { minutes: 30, class: 'border-red-500 bg-red-50', textClass: 'text-red-700' },
  WARNING: { minutes: 15, class: 'border-amber-500 bg-amber-50', textClass: 'text-amber-700' },
  NORMAL: { minutes: 0, class: 'border-emerald-500 bg-emerald-50', textClass: 'text-emerald-700' }
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
    // Create notification sounds (you can replace these with actual sound files)
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
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep only 5 notifications
    
    // Auto-remove notification after 5 seconds (or 10 seconds for urgent)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, isUrgent ? 10000 : 5000);
    
    // Play sound
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
        console.log('❌ No token available');
        setError('No token available');
        navigate('/login');
        return;
      }

      try {
        setLoading(true);
        setError('');
        console.log('🔑 Using token:', token);
        
        const config = {
          headers: {
            'x-auth-token': token
          }
        };
        
        // First, fetch the menu items to get the names
        console.log('📱 Fetching menu...');
        const menuRes = await axios.get(`${API_URL}/menu`, config);
        console.log('📱 Menu response:', menuRes.data);
        console.log('📱 Menu is array?', Array.isArray(menuRes.data));
        setMenuItems(Array.isArray(menuRes.data) ? menuRes.data : []);
        
        // Then fetch orders
        console.log('📋 Fetching orders...');
        const ordersRes = await axios.get(`${API_URL}/orders`, config);
        console.log('📋 Orders response:', ordersRes.data);
        console.log('📋 Orders is array?', Array.isArray(ordersRes.data));
        
        // Filter for active orders only with safety check
        const safeOrdersData = Array.isArray(ordersRes.data) ? ordersRes.data : [];
        const activeOrders = safeOrdersData.filter(order => order.status === 'active');
        
        // Sort by oldest first so kitchen can prioritize
        setOrders(activeOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
        console.log('✅ All data fetched successfully');
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
    
    // Enhanced socket listeners with notifications
    if (socket) {
      socket.on('order-updated', (updatedOrder) => {
        console.log('Received order update via socket:', updatedOrder);
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
        console.log('Received new order via socket:', newOrder);
        
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
            
            // Update order count for notifications
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
  }, [token, socket, navigate]);
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('📊 Orders state changed:', orders, 'Is array?', Array.isArray(orders));
  }, [orders]);

  useEffect(() => {
    console.log('📊 Menu items state changed:', menuItems, 'Is array?', Array.isArray(menuItems));
  }, [menuItems]);

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
  
  // Format time difference
  const getTimeDifference = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} minuta`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return `${hours} orë ${minutes} minuta`;
    }
  };
  
  // Get time difference class based on how long the order has been waiting
  const getTimeDifferenceClass = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes < 15) {
      return 'text-green-600 font-medium text-shadow'; // Under 15 minutes - good
    } else if (diffMinutes < 30) {
      return 'text-yellow-600 font-medium text-shadow'; // 15-30 minutes - warning
    } else {
      return 'text-red-600 font-bold text-shadow'; // Over 30 minutes - critical
    }
  };
  
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
  
  // Debug before render
  console.log('🔍 Kitchen Debug before render:');
  console.log('orders:', orders, 'is array?', Array.isArray(orders));
  console.log('menuItems:', menuItems, 'is array?', Array.isArray(menuItems));

  // Check each order's items
  const safeOrders = Array.isArray(orders) ? orders : [];
  safeOrders.forEach((order, index) => {
    console.log(`Order ${index} items:`, order.items, 'is array?', Array.isArray(order.items));
  });
  
  // Get order priority based on time
  const getOrderPriority = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffMinutes >= ORDER_PRIORITY.URGENT.minutes) return 'URGENT';
    if (diffMinutes >= ORDER_PRIORITY.WARNING.minutes) return 'WARNING';
    return 'NORMAL';
  }, []);
  
  // Enhanced time difference with warnings
  const getTimeDifferenceInfo = useCallback((createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMinutes = Math.floor((now - created) / (1000 * 60));
    const priority = getOrderPriority(createdAt);
    
    let timeText;
    if (diffMinutes < 60) {
      timeText = `${diffMinutes} min`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      timeText = `${hours}h ${minutes}min`;
    }
    
    return {
      text: timeText,
      priority,
      minutes: diffMinutes,
      class: ORDER_PRIORITY[priority].textClass
    };
  }, [getOrderPriority]);
  
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
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [orders, addNotification, getTimeDifferenceInfo]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-red-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-red-400 animate-pulse mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Duke ngarkuar kuzhinën...</h2>
          <p className="text-gray-500">Ju lutem prisni një moment</p>
        </div>
      </div>
    );
  }

  // Kitchen Display Mode - Large Screen Format
  if (isKitchenDisplay) {
    return (
      <div className={`bg-gradient-to-br from-slate-900 via-orange-900 to-red-900 ${isFullscreen ? 'h-screen' : 'min-h-screen'} text-white overflow-hidden`}>
        {/* Kitchen Display Header - Compact */}
        <div className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="text-4xl font-bold text-orange-400">🍴 KUZHINA VILA FALO</div>
            <div className="text-2xl font-semibold text-white/80">
              {safeOrders.length} POROSI AKTIVE
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-xl text-xl font-bold ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
              {connected ? '🟢 LIVE' : '🔴 OFFLINE'}
            </div>
            <div className="text-2xl font-bold text-orange-400">
              {new Date().toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button 
              onClick={toggleFullscreen}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-xl text-xl font-bold"
            >
              {isFullscreen ? '🪟 EXIT' : '🖥️ FULL'}
            </button>
            <button 
              onClick={toggleKitchenDisplay}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xl font-bold"
            >
              📱 NORMAL
            </button>
          </div>
        </div>

        {/* Kitchen Display Orders - Large Cards */}
        <div className="p-8">
          {safeOrders.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="text-8xl mb-8">✅</div>
                <div className="text-6xl font-bold text-green-400 mb-4">E GJITHA GATSHME!</div>
                <div className="text-3xl text-white/70">Nuk ka porosi në pritje</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
              {safeOrders.map(order => {
                const safeOrderItems = Array.isArray(order.items) ? order.items : [];
                const allItemsPrepared = safeOrderItems.every(item => item.prepared);
                const timeInfo = getTimeDifferenceInfo(order.createdAt);
                
                return (
                  <div 
                    key={order._id} 
                    className={`bg-black/40 backdrop-blur-sm rounded-3xl border-4 ${
                      timeInfo.priority === 'URGENT' ? 'border-red-500 animate-pulse' :
                      timeInfo.priority === 'WARNING' ? 'border-yellow-500' :
                      'border-green-500'
                    } ${allItemsPrepared ? 'bg-green-900/40' : ''} overflow-hidden shadow-2xl`}
                  >
                    {/* Order Header - Large */}
                    <div className={`px-8 py-6 ${
                      timeInfo.priority === 'URGENT' ? 'bg-red-600' :
                      timeInfo.priority === 'WARNING' ? 'bg-yellow-600' :
                      'bg-green-600'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div className="text-4xl font-bold">
                          🍽️ TAVOLINA {order.table?.number || 'N/A'}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold">
                            {timeInfo.text}
                          </div>
                          <div className="text-xl">
                            {timeInfo.priority === 'URGENT' ? '🚨 URGJENT!' :
                             timeInfo.priority === 'WARNING' ? '⚠️ KUJDES' : '✅ NORMAL'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order Items - Large Font */}
                    <div className="p-8 space-y-6">
                      {safeOrderItems.map(item => {
                        const itemName = getItemName(item);
                        
                        return (
                          <div 
                            key={item._id} 
                            className={`flex justify-between items-center p-6 rounded-2xl border-2 ${
                              item.prepared ? 'border-green-500 bg-green-900/20' : 'border-orange-500 bg-orange-900/20'
                            }`}
                          >
                            <div className="flex items-center space-x-6">
                              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-3xl font-bold ${
                                item.prepared ? 'bg-green-600' : 'bg-orange-600'
                              }`}>
                                {item.quantity}
                              </div>
                              <div>
                                <div className={`text-3xl font-bold ${
                                  item.prepared ? 'line-through text-green-400' : 'text-white'
                                }`}>
                                  {itemName}
                                </div>
                                {item.notes && (
                                  <div className="text-xl text-yellow-400 mt-2">
                                    💬 {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={() => markItemAsPrepared(order._id, item._id)}
                              className={`px-8 py-4 rounded-2xl text-2xl font-bold transition-all ${
                                item.prepared 
                                  ? 'bg-green-600 text-white cursor-not-allowed' 
                                  : 'bg-orange-600 hover:bg-orange-700 text-white'
                              }`}
                              disabled={item.prepared}
                            >
                              {item.prepared ? '✅ GATI' : '🍳 SHËNO'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order Complete Button - Large */}
                    <div className="px-8 pb-8">
                      <button
                        onClick={() => markOrderAsPrepared(order._id)}
                        className={`w-full py-6 rounded-2xl text-3xl font-bold transition-all ${
                          allItemsPrepared 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
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
    <div className="bg-gradient-to-br from-slate-50 via-orange-50 to-red-50 min-h-screen">
      {/* Enhanced Kitchen Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-600 to-rose-700"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-orange-500/10 to-white/5"></div>
        
        <div className="relative backdrop-blur-sm bg-white/10 border-b border-white/20 shadow-2xl">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-white to-orange-100 bg-clip-text text-transparent">
                    Kuzhina Vila Falo
                  </h1>
                </div>
                <p className="text-orange-100 text-lg font-medium">
                  Mirësevini, <span className="text-white font-semibold">{user?.name || 'Përdorues'}</span>
                </p>
                <div className="flex items-center justify-center lg:justify-start space-x-4 mt-3">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-orange-100 text-sm font-medium">
                    <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></div>
                    {connected ? 'Në linjë' : 'Jo në linjë'}
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-500/20 text-white text-sm font-medium">
                    <span className="font-bold text-lg mr-1">{safeOrdersForRender.length}</span>
                    Porosi aktive
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={toggleKitchenDisplay}
                  className="group px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1 backdrop-blur-sm"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                  </svg>
                  <span className="font-semibold">🖥️ Kitchen Display</span>
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`group px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1 backdrop-blur-sm ${
                    soundEnabled ? 'bg-emerald-500/80 hover:bg-emerald-600' : 'bg-gray-500/80 hover:bg-gray-600'
                  } text-white`}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d={soundEnabled ? "M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.764 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.764l3.619-2.793a1 1 0 011 .076zM15.5 6.5a.5.5 0 011 0v7a.5.5 0 01-1 0v-7zm2.5 2a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5z" : "M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.764 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.764l3.619-2.793a1 1 0 011 .076zM15 8.5a1 1 0 00-1.414-1.414L12 8.672 10.414 7.086A1 1 0 109 8.5L10.586 10 9 11.414a1 1 0 101.414 1.414L12 11.242l1.586 1.586A1 1 0 0015 11.414L13.414 10 15 8.586z"} clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">{soundEnabled ? 'Zëri ON' : 'Zëri OFF'}</span>
                </button>
                
                <button 
                  onClick={handleLogout} 
                  className="group px-6 py-2 bg-rose-500/80 hover:bg-rose-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center transform hover:-translate-y-1 backdrop-blur-sm"
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
      
      {/* Notification Toast Container */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`transform transition-all duration-500 ease-in-out animate-pulse ${
              notification.isUrgent ? 'bg-red-500' : 'bg-blue-500'
            } text-white px-6 py-3 rounded-xl shadow-2xl border-l-4 ${
              notification.isUrgent ? 'border-red-300' : 'border-blue-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                notification.isUrgent ? 'bg-red-200' : 'bg-blue-200'
              }`}></div>
              <p className="font-semibold">{notification.message}</p>
            </div>
            <p className="text-xs opacity-75 mt-1">
              {notification.timestamp.toLocaleTimeString('sq-AL')}
            </p>
          </div>
        ))}
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
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
        )}
        
        {success && (
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-400 text-emerald-800 p-6 mb-6 rounded-2xl shadow-lg backdrop-blur-sm animate-pulse" role="alert">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-emerald-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-semibold">{success}</p>
            </div>
          </div>
        )}
        
        {safeOrdersForRender.length === 0 ? (
          <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-16 text-center border border-white/20">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-red-100 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <svg className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">Gjithçka në rregull!</h3>
            <p className="text-gray-500 text-lg mb-2">Nuk ka porosi aktive në pritje</p>
            <p className="text-sm text-gray-400">Porosia e re do të shfaqet automatikisht këtu</p>
            <div className="mt-8 inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
              Në pritje për porosi të reja...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {safeOrdersForRender.map(order => {
              const safeOrderItems = Array.isArray(order.items) ? order.items : [];
              const allItemsPrepared = safeOrderItems.every(item => item.prepared);
              const groupedItems = groupItemsByCategory(safeOrderItems);
              const timeInfo = getTimeDifferenceInfo(order.createdAt);
              const priorityStyle = ORDER_PRIORITY[timeInfo.priority];
              
              return (
                <div key={order._id} className={`group bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-l-8 overflow-hidden ${
                  allItemsPrepared ? 'border-emerald-500 bg-emerald-50/50' : priorityStyle.class
                } ${timeInfo.priority === 'URGENT' ? 'animate-pulse ring-4 ring-red-200' : ''}`}>
                  <div className={`px-6 py-4 border-b border-gray-100 flex justify-between items-center ${
                    allItemsPrepared ? 'bg-emerald-50' : 'bg-gradient-to-r from-white to-gray-50'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        timeInfo.priority === 'URGENT' ? 'bg-red-100 text-red-600' :
                        timeInfo.priority === 'WARNING' ? 'bg-amber-100 text-amber-600' :
                        'bg-emerald-100 text-emerald-600'
                      }`}>
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">Tavolina {order.table?.number || 'N/A'}</div>
                        <div className="text-sm text-gray-500">
                          Kamarier: {order.waiter?.name || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${timeInfo.class}`}>
                        {timeInfo.text}
                      </div>
                      <div className="text-xs text-gray-400">
                        {timeInfo.priority === 'URGENT' ? '🚨 URGJENT!' :
                         timeInfo.priority === 'WARNING' ? '⚠️ Kujdes' : '✅ Normal'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {Object.entries(groupedItems).map(([category, items]) => {
                      const safeCategoryItems = Array.isArray(items) ? items : [];
                      
                      return (
                        <div key={category} className="mb-6">
                          <div className="flex items-center mb-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mr-3">
                              <span className="text-white font-bold text-sm">{safeCategoryItems.length}</span>
                            </div>
                            <h3 className="font-bold text-gray-800 text-lg border-b-2 border-blue-200 pb-1">
                              {getCategoryName(category)}
                            </h3>
                          </div>
                          <div className="space-y-4">
                            {safeCategoryItems.map(item => {
                              const itemName = getItemName(item);
                              
                              return (
                                <div key={item._id} className={`group-hover:bg-gray-50 rounded-2xl p-4 transition-all duration-200 border-2 ${
                                  item.prepared ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-100 hover:border-blue-200'
                                }`}>
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                                          item.prepared ? 'bg-emerald-500' : 'bg-blue-500'
                                        }`}>
                                          {item.quantity}
                                        </span>
                                        <span className={`font-bold text-lg ${
                                          item.prepared ? 'line-through text-gray-400' : 'text-gray-800'
                                        }`}>
                                          {itemName}
                                        </span>
                                      </div>
                                      {item.notes && (
                                        <div className="ml-11 bg-yellow-50 border-l-4 border-yellow-200 p-3 rounded-r-lg">
                                          <p className="text-sm text-yellow-800 font-medium italic">
                                            💬 {item.notes}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <button
                                      onClick={() => markItemAsPrepared(order._id, item._id)}
                                      className={`ml-4 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 transform hover:scale-105 ${
                                        item.prepared 
                                          ? 'bg-emerald-500 text-white cursor-not-allowed shadow-lg' 
                                          : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
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
                  
                  <div className={`px-6 py-4 border-t-2 border-gray-100 ${
                    allItemsPrepared ? 'bg-emerald-50' : 'bg-gray-50'
                  }`}>
                    <button
                      onClick={() => markOrderAsPrepared(order._id)}
                      className={`w-full py-4 rounded-2xl font-bold text-center transition-all duration-300 transform hover:scale-105 ${
                        allItemsPrepared 
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-xl hover:shadow-2xl' 
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
      </div>
    </div>
  );
};

export default KitchenDashboard;
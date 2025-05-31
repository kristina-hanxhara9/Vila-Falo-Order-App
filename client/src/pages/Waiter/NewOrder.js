import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

// Enhanced API URL with fallback and local development support
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
console.log('🌐 API URL being used:', API_URL);

// Test API connectivity
const testAPIConnection = async () => {
  try {
    const response = await fetch(`${API_URL.replace('/api', '')}/`);
    console.log('🟢 API Connection test:', response.status === 200 ? 'SUCCESS' : 'FAILED');
    return response.status === 200;
  } catch (error) {
    console.error('🔴 API Connection test FAILED:', error.message);
    return false;
  }
};

const NewOrder = () => {
  const { tableId } = useParams();
  const [tables, setTables] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(tableId || '');
  const [table, setTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [orderItems, setOrderItems] = useState([]);
  const [customItem, setCustomItem] = useState({ name: '', price: '', quantity: 1 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [itemQuantities, setItemQuantities] = useState({});
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef(null);
  
  const { user, token } = useContext(AuthContext);
  const { socket, connected } = useContext(SocketContext);
  const navigate = useNavigate();
  
  // Clear messages
  const clearMessages = () => {
    setError('');
    setSuccess('');
  };
  
  // Fetch data: tables, menu items, and specific table if tableId exists
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(''); // Clear any previous errors
        
        // Test API connection first
        console.log('🔍 Testing API connection...');
        const isConnected = await testAPIConnection();
        if (!isConnected) {
          throw new Error('Nuk mund të lidhet me serverin. Ju lutem kontrolloni nëse serveri është aktiv.');
        }
        
        // Setup axios config with better error handling
        const config = {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token || localStorage.getItem('token')
          }
        };
        
        console.log('📊 Fetching data from API...');
        
        // Fetch all tables if no tableId is provided or selected
        if (!tableId) {
          console.log('🪑 Fetching tables...');
          const tablesRes = await axios.get(`${API_URL}/tables`, config);
          console.log('✅ Tables fetched:', tablesRes.data?.length || 0);
          setTables(tablesRes.data || []);
        }
        
        // Fetch specific table if tableId is provided
        if (tableId) {
          console.log(`🎯 Fetching table ${tableId}...`);
          const tableRes = await axios.get(`${API_URL}/tables/${tableId}`, config);
          console.log('✅ Table fetched:', tableRes.data);
          setTable(tableRes.data);
          setSelectedTableId(tableId);
        }
        
        // Fetch menu items
        console.log('🍽️ Fetching menu items...');
        const menuRes = await axios.get(`${API_URL}/menu`, config);
        console.log('✅ Menu items fetched:', menuRes.data?.length || 0);
        
        const menuData = menuRes.data || [];
        setMenuItems(menuData);
        
        // Initialize item quantities
        const initialQuantities = {};
        menuData.forEach(item => {
          if (item && item._id) {
            initialQuantities[item._id] = 0;
          }
        });
        setItemQuantities(initialQuantities);
        
        // Extract categories and sort them in the desired order
        const uniqueCategories = [...new Set(menuData.map(item => item?.category).filter(Boolean))];
        // Sort categories in the specific order: food, drink, dessert
        const sortedCategories = uniqueCategories.sort((a, b) => {
          const order = { 'food': 1, 'drink': 2, 'dessert': 3 };
          return (order[a] || 99) - (order[b] || 99);
        });
        setCategories(sortedCategories);
        
        console.log('🎉 All data loaded successfully');
        setLoading(false);
      } catch (err) {
        console.error('❌ Error fetching data:', err);
        
        let errorMessage = 'Gabim gjatë marrjes së të dhënave';
        
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          errorMessage = '🔌 Nuk ka lidhje me serverin. Ju lutem kontrolloni:\n\n1. Nëse serveri është aktiv (npm run dev në dosjen server)\n2. Lidhjen me internet\n3. Konfigurimin e API URL';
        } else if (err.response?.status === 404) {
          errorMessage = '❌ API endpoint nuk u gjet. Kontrolloni server-in.';
        } else if (err.response?.status >= 500) {
          errorMessage = '⚠️ Gabim në server. Kontrolloni log-et e server-it.';
        } else if (err.timeout) {
          errorMessage = '⏱️ Serveri është shumë i ngadalshëm. Provoni përsëri.';
        } else if (err.message) {
          errorMessage = `🚨 ${err.message}`;
        }
        
        setError(errorMessage);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [tableId]);
  
  // Update selected table when tableId changes
  useEffect(() => {
    if (tableId) {
      setSelectedTableId(tableId);
    }
  }, [tableId]);
  
  // Fetch table details when selectedTableId changes
  useEffect(() => {
    const fetchTable = async () => {
      if (!selectedTableId) {
        setTable(null);
        return;
      }
      
      try {
        const tableRes = await axios.get(`${API_URL}/tables/${selectedTableId}`);
        setTable(tableRes.data);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave të tavolinës');
        console.error(err);
      }
    };
    
    fetchTable();
  }, [selectedTableId]);
  
  // Add custom print styles
  // These styles will be applied when the page is printed
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    style.setAttribute('id', 'print-styles');
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-template, .print-template * {
          visibility: visible;
        }
        .print-template {
          position: absolute;
          left: 0;
          top: 0;
          width: 80mm !important;
          padding: 0 !important;
        }
        @page {
          size: 80mm auto;
          margin: 5mm;
        }
      }
    `;
    
    // Add it to the head
    document.head.appendChild(style);
    
    // Clean up when the component unmounts
    return () => {
      const styleElement = document.getElementById('print-styles');
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);
  
  // Custom sorting function for food items
  const getFoodSortOrder = (itemName) => {
    const name = itemName.toLowerCase();
    
    // Mishrat (Meats) - priority 1
    if (name.includes('mish') || name.includes('biftek') || name.includes('qofta') || 
        name.includes('suxhuk') || name.includes('proshut') || name.includes('viçin') || 
        name.includes('derri') || name.includes('pule') || name.includes('gjel')) {
      return 1;
    }
    
    // Lakror - priority 2  
    if (name.includes('lakror') || name.includes('byrek')) {
      return 2;
    }
    
    // Patate te skuqura - priority 3
    if (name.includes('patate') && (name.includes('skuq') || name.includes('crispy') || name.includes('chips'))) {
      return 3;
    }
    
    // Sallatrat - priority 4
    if (name.includes('sallat') || name.includes('salad')) {
      return 4;
    }
    
    // Salce - priority 5
    if (name.includes('salc') || name.includes('sauce') || name.includes('krem')) {
      return 5;
    }
    
    // Djathrat - priority 6
    if (name.includes('djath') || name.includes('cheese') || name.includes('kackavall')) {
      return 6;
    }
    
    // Other foods - priority 7
    return 7;
  };

  // Filter menu items by category
  const filteredMenuItems = React.useMemo(() => {
    console.log('Selected category:', selectedCategory);
    console.log('Total menu items available:', menuItems.length);
    
    // First filter by selected category
    let filtered = [];
    
    if (selectedCategory === 'all') {
      // When 'all' is selected, include all menu items
      filtered = [...menuItems];
    } else {
      // Filter by the selected category
      filtered = menuItems.filter(item => item.category === selectedCategory);
    }
    
    console.log('Filtered items count:', filtered.length);
    
    // Sort by category first, then by custom food order
    return filtered.sort((a, b) => {
      const categoryOrder = { 'food': 1, 'drink': 2, 'dessert': 3 };
      const categoryDiff = (categoryOrder[a.category] || 99) - (categoryOrder[b.category] || 99);
      
      if (categoryDiff !== 0) {
        return categoryDiff;
      }
      
      // If same category and it's food, use custom food sorting
      if (a.category === 'food') {
        return getFoodSortOrder(a.albanianName) - getFoodSortOrder(b.albanianName);
      }
      
      // For drinks and desserts, sort alphabetically
      return a.albanianName.localeCompare(b.albanianName);
    });
  }, [menuItems, selectedCategory]);
  
  // Get category name in Albanian
  const getCategoryName = (category) => {
    switch (category) {
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
  
  // Handle item quantity change
  const handleQuantityChange = (itemId, delta) => {
    setItemQuantities(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      
      return {
        ...prev,
        [itemId]: newQty
      };
    });
  };
  
  // Add item to order
  const addItemToOrder = (item) => {
    // Clear any previous messages
    clearMessages();
    
    // If quantity is 0, do nothing
    if (itemQuantities[item._id] <= 0) return;
    
    setOrderItems(prevItems => {
      // Check if item already exists in order
      const existingItem = prevItems.find(i => i.menuItem === item._id);
      
      if (existingItem) {
        // Update quantity
        return prevItems.map(i =>
          i.menuItem === item._id
            ? { ...i, quantity: i.quantity + itemQuantities[item._id] }
            : i
        );
      } else {
        // Add new item
        return [...prevItems, {
          menuItem: item._id,
          name: item.albanianName,
          price: item.price,
          quantity: itemQuantities[item._id],
          notes: ''
        }];
      }
    });
    
    // Reset quantity after adding to order
    setItemQuantities(prev => ({
      ...prev,
      [item._id]: 0
    }));
  };
  
  // Add custom item to order
  const addCustomItem = () => {
    if (!customItem.name || !customItem.price || customItem.price <= 0 || customItem.quantity <= 0) {
      setError('Ju lutem plotësoni të gjitha fushat e artikullit të personalizuar');
      return;
    }
    
    const price = parseInt(customItem.price);
    
    setOrderItems(prevItems => [
      ...prevItems,
      {
        custom: true,
        name: customItem.name,
        price,
        quantity: parseInt(customItem.quantity),
        notes: ''
      }
    ]);
    
    // Reset custom item form
    setCustomItem({ name: '', price: '', quantity: 1 });
  };
  
  // Update item quantity in order
  const updateItemQuantity = (index, newQuantity) => {
    if (newQuantity <= 0) {
      // Remove item if quantity is 0 or less
      removeItemFromOrder(index);
      return;
    }
    
    setOrderItems(prevItems =>
      prevItems.map((item, i) =>
        i === index ? { ...item, quantity: newQuantity } : item
      )
    );
  };
  
  // Update item notes
  const updateItemNotes = (index, notes) => {
    setOrderItems(prevItems =>
      prevItems.map((item, i) =>
        i === index ? { ...item, notes } : item
      )
    );
  };
  
  // Remove item from order
  const removeItemFromOrder = (index) => {
    setOrderItems(prevItems => prevItems.filter((_, i) => i !== index));
  };
  
  // Calculate total amount
  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  };
  
  // Handle table selection change
  const handleTableChange = (e) => {
    setSelectedTableId(e.target.value);
  };
  
  // Format date for receipt
  const formatDate = (date) => {
    const d = new Date(date || Date.now());
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };
  
  // Print bill functionality
  const handlePrintBill = () => {
    if (orderItems.length === 0) {
      setError('Nuk ka artikuj për të printuar');
      return;
    }

    setIsPrinting(true);
    
    // Use setTimeout to allow the state to update before printing
    setTimeout(() => {
      const originalContents = document.body.innerHTML;
      const printContents = printRef.current.innerHTML;
      
      document.body.innerHTML = printContents;
      window.print();
      document.body.innerHTML = originalContents;
      
      setIsPrinting(false);
    }, 300);
  };
  
  // Submit order
  const submitOrder = async () => {
    // Check if a table is selected
    if (!selectedTableId) {
      setError('Ju lutem zgjidhni një tavolinë');
      return;
    }
    
    if (orderItems.length === 0) {
      setError('Ju lutem shtoni të paktën një artikull në porosi');
      return;
    }
    
    try {
      setSubmitting(true);
      clearMessages();
      
      // Test server connection first
      console.log('🔍 Testing server connection before submitting order...');
      const serverCheck = await testAPIConnection();
      if (!serverCheck) {
        throw new Error('Serveri nuk përgjigjet. Ju lutem kontrolloni nëse serveri është aktiv.');
      }
      console.log('✅ Server connection OK');
      
      // Get auth token from context or localStorage
      const authToken = token || localStorage.getItem('token');
      console.log('🔐 Auth token check:', {
        fromContext: !!token,
        fromStorage: !!localStorage.getItem('token'),
        hasToken: !!authToken
      });
      
      if (!authToken) {
        setError('Ju nuk jeni të autentifikuar. Ju lutem hyni sërish.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      const config = {
        timeout: 15000, // 15 second timeout
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'x-auth-token': authToken
        }
      };
      
      console.log('📤 Request config:', {
        url: `${API_URL}/orders`,
        headers: config.headers,
        timeout: config.timeout
      });
      
      // Prepare order items with better validation
      const items = orderItems.map(item => {
        const orderItem = {
          quantity: parseInt(item.quantity) || 1,
          price: parseFloat(item.price) || 0,
          notes: item.notes || ''
        };
        
        if (item.custom) {
          // For custom items, don't include menuItem field
          orderItem.name = item.name;
          orderItem.custom = true;
        } else {
          // For regular menu items
          orderItem.menuItem = item.menuItem;
          orderItem.name = item.name;
          orderItem.custom = false;
        }
        
        return orderItem;
      });
      
      // Validate items
      if (items.some(item => item.quantity <= 0 || item.price < 0)) {
        setError('Të gjitha artikujt duhet të kenë sasi dhe çmim të vlefshëm');
        setSubmitting(false);
        return;
      }
      
      // Simplified payload - use the format the server expects
      const payload = {
        table: selectedTableId,
        items: items
      };
      
      console.log('Sending order payload:', payload);
      
      const response = await axios.post(`${API_URL}/orders`, payload, config);
      console.log('Order created successfully:', response.data);
      
      // Emit socket event if connected
      if (socket && connected) {
        try {
          socket.emit('new-order', {
            ...response.data,
            table: { _id: selectedTableId, number: table?.number }
          });
        } catch (socketErr) {
          console.warn('Socket emit failed:', socketErr);
          // Don't fail the whole operation for socket issues
        }
      }
      
      // Try to update table status (non-critical)
      try {
        await axios.put(`${API_URL}/tables/${selectedTableId}`, {
          status: 'occupied',
          currentOrder: response.data._id
        }, config);
      } catch (tableErr) {
        console.warn('Could not update table status:', tableErr);
        // Don't fail the whole operation if table update fails
      }
      
      // Show success message
      setSuccess('Porosia u dërgua me sukses!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Clear form
      setOrderItems([]);
      setItemQuantities({});
      
      // Redirect based on context after a short delay
      setTimeout(() => {
        if (tableId) {
          navigate(`/waiter/table/${selectedTableId}`);
        } else {
          navigate('/waiter');
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error submitting order:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      let errorMessage = 'Gabim gjatë dërgimit të porosisë';
      
      console.log('🚨 Full error details:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        code: err.code,
        config: {
          url: err.config?.url,
          method: err.config?.method,
          timeout: err.config?.timeout
        }
      });
      
      if (err.response?.status === 401) {
        errorMessage = 'Ju nuk jeni të autentifikuar. Ju lutem hyni sërish.';
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Të dhënat e porosisë janë të pavlefshme';
        console.log('Validation error details:', err.response.data);
      } else if (err.response?.status === 404) {
        errorMessage = 'Tavolina ose artikulli nuk u gjet.';
      } else if (err.response?.status === 500) {
        const serverError = err.response.data?.error || err.response.data?.message || 'Gabim i panjohur në server';
        errorMessage = `Gabim në server: ${serverError}`;
      } else if (err.code === 'ECONNREFUSED') {
        errorMessage = '🔌 Serveri nuk është aktiv. Ju lutem:\n\n1. Kontrolloni nëse serveri është duke punuar\n2. Drejtoni: npm run dev në dosjen server\n3. Kontrolloni portin 5000';
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = '🌐 Gabim në rrjet. Kontrolloni lidhjen me internet dhe serverin.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = '⏱️ Kërkesa ka dalë jashtë kohe. Serveri është shumë i ngadalshëm.';
      } else if (err.message) {
        errorMessage = `Gabim: ${err.message}`;
      }
      
      setError(errorMessage);
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center mb-2">
            {tableId ? (
              <Link to={`/waiter/table/${tableId}`} className="text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Kthehu te Tavolina
              </Link>
            ) : (
              <Link to="/waiter" className="text-blue-600 hover:text-blue-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 inline" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Kthehu
              </Link>
            )}
          </div>
          <h1 className="text-2xl font-bold">
            Porosi e Re {table && `- Tavolina ${table.number}`}
          </h1>
          <p className="text-gray-600">Kamarieri: {user?.name}</p>
        </div>
      </div>
      
      {success && (
        <div className="alert alert-success" role="alert">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold mb-1">Sukses!</h4>
              <p>{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="alert alert-danger" role="alert">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold mb-1">Gabim!</h4>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Table Selection (only if no tableId is provided) */}
      {!tableId && (
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <h2 className="text-lg font-semibold mb-4">Zgjidhni Tavolinën</h2>
          <select
            className="input w-full mb-4"
            value={selectedTableId}
            onChange={handleTableChange}
          >
            <option value="">Zgjidhni një tavolinë</option>
            {tables.map(table => (
              <option key={table._id} value={table._id}>
                Tavolina {table.number} - {
                  table.status === 'free' ? 'E lirë' :
                  table.status === 'ordering' ? 'Duke porositur' :
                  table.status === 'unpaid' ? 'E papaguar' : 'E paguar'
                }
              </option>
            ))}
          </select>
          
          {table && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-gray-700">
                <span className="font-medium">Tavolina {table.number}</span> - 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  table.status === 'free' ? 'bg-green-100 text-green-800' :
                  table.status === 'ordering' ? 'bg-yellow-100 text-yellow-800' :
                  table.status === 'unpaid' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {table.status === 'free' ? 'E lirë' :
                   table.status === 'ordering' ? 'Duke porositur' :
                   table.status === 'unpaid' ? 'E papaguar' : 'E paguar'}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Items */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Menuja</h2>
            </div>
            
            <div className="p-6">
              {/* Mobile-Friendly Category Filter */}
              <div className="mb-3">
                <h3 className="text-sm font-medium mb-2 text-gray-800">📱 Zgjidhni Kategorinë</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                  <button
                    className={`flex items-center justify-center px-2 py-1 rounded font-medium transition-colors text-xs ${
                      selectedCategory === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-indigo-200 text-indigo-600 hover:border-indigo-400'
                    }`}
                    onClick={() => setSelectedCategory('all')}
                  >
                    <span className="text-xs mr-1">🍽️</span>
                    <span className="text-xs">Të Gjitha</span>
                  </button>
                  
                  {categories.map(category => {
                    const isActive = selectedCategory === category;
                    let bgClass, icon, name;
                    
                    switch(category) {
                      case 'food':
                        bgClass = isActive 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white border border-green-200 text-green-600 hover:border-green-400';
                        icon = '🍴';
                        name = 'Ushqime';
                        break;
                      case 'drink':
                        bgClass = isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-white border border-blue-200 text-blue-600 hover:border-blue-400';
                        icon = '🍹';
                        name = 'Pije';
                        break;
                      case 'dessert':
                        bgClass = isActive 
                          ? 'bg-yellow-600 text-white' 
                          : 'bg-white border border-yellow-200 text-yellow-600 hover:border-yellow-400';
                        icon = '🍰';
                        name = 'Ëmbëlsira';
                        break;
                      default:
                        bgClass = isActive 
                          ? 'bg-gray-600 text-white' 
                          : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400';
                        icon = '🍽️';
                        name = category;
                    }
                    
                    return (
                      <button
                        key={category}
                        className={`flex items-center justify-center px-2 py-1 rounded font-medium transition-colors text-xs ${bgClass}`}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <span className="text-xs mr-1">{icon}</span>
                        <span className="text-xs">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Menu Items - Mobile Optimized */}
              {menuItems.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Duke ngarkuar artikujt e menusë...</p>
                </div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Nuk u gjetën artikuj në këtë kategori</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredMenuItems.map(item => {
                    const categoryIcon = {
                      'food': '🍴',
                      'drink': '🍹',
                      'dessert': '🍰'
                    }[item.category] || '🍽️';
                    
                    const categoryColor = {
                      'food': 'border-l-2 border-green-500 bg-white',
                      'drink': 'border-l-2 border-blue-500 bg-white',
                      'dessert': 'border-l-2 border-yellow-500 bg-white'
                    }[item.category] || 'border-l-2 border-gray-400 bg-white';
                    
                    return (
                      <div
                        key={item._id}
                        className={`${categoryColor} rounded shadow-sm hover:shadow transition-shadow p-2`}
                      >
                        {/* Ultra compact single line layout */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1 min-w-0">
                            <span className="text-sm mr-1">{categoryIcon}</span>
                            <div className="flex-1 min-w-0 mr-2">
                              <h3 className="font-medium text-gray-900 text-xs leading-tight truncate">{item.albanianName}</h3>
                            </div>
                            <div className="text-right mr-2 flex-shrink-0">
                              <span className="font-semibold text-gray-900 text-xs">{item.price.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          {/* Ultra compact controls */}
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {/* Quantity Controls */}
                            <button
                              className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm flex items-center justify-center transition-colors disabled:opacity-50 disabled:bg-gray-400"
                              onClick={() => handleQuantityChange(item._id, -1)}
                              disabled={itemQuantities[item._id] <= 0}
                            >
                              −
                            </button>
                            <div className="w-7 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                              <span className="text-xs font-semibold text-gray-900">{itemQuantities[item._id] || 0}</span>
                            </div>
                            <button
                              className="w-6 h-6 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-sm flex items-center justify-center transition-colors"
                              onClick={() => handleQuantityChange(item._id, 1)}
                            >
                              +
                            </button>
                            
                            {/* Add Button */}
                            <button
                              className={`px-2 py-1 rounded font-medium text-xs transition-all ml-1 ${
                                itemQuantities[item._id] > 0
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                              }`}
                              onClick={() => addItemToOrder(item)}
                              disabled={itemQuantities[item._id] <= 0}
                            >
                              {itemQuantities[item._id] > 0 ? 'Shto' : 'Zgjedh'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Custom Item */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl shadow-lg">
            <div className="px-6 py-4 border-b border-indigo-200">
              <h2 className="text-xl font-semibold text-indigo-900 flex items-center">
                <span className="mr-2">✨</span>
                Artikull i Personalizuar
              </h2>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <span className="mr-2">📝</span>
                      Emri
                    </span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Emri i artikullit"
                    value={customItem.name}
                    onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <span className="mr-2">💰</span>
                      Çmimi (LEK)
                    </span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    placeholder="Çmimi"
                    value={customItem.price}
                    onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <span className="flex items-center">
                      <span className="mr-2">🔢</span>
                      Sasia
                    </span>
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                    value={customItem.quantity}
                    onChange={(e) => setCustomItem({ ...customItem, quantity: parseInt(e.target.value) || 1 })}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl flex items-center justify-center"
                  onClick={addCustomItem}
                >
                  <span className="mr-2">➕</span>
                  Shto Artikull të Personalizuar
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Summary - Fixed position on mobile */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 rounded-lg shadow-xl lg:sticky lg:top-6">
            <div className="px-4 py-3 border-b border-blue-200">
              <h2 className="text-base font-semibold text-blue-900 flex items-center">
                <span className="mr-1 text-sm">🧾</span>
                Përmbledhja e Porosisë
              </h2>
            </div>
            
            <div className="p-4">
              {orderItems.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-gray-500 text-xs">Nuk ka artikuj në porosi</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Zgjidhni sasinë dhe shtoni artikujt
                  </p>
                </div>
              ) : (
                <div className="mb-3 space-y-1">
                  {orderItems.map((item, index) => (
                    <div key={index} className="border-b pb-1 last:border-b-0">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium text-xs">{item.name}</div>
                          <div className="text-xs text-gray-600">
                            {item.price.toLocaleString()} LEK x {item.quantity}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-semibold text-xs">
                            {(item.price * item.quantity).toLocaleString()} LEK
                          </div>
                          <button
                            className="text-xs text-red-600 hover:text-red-800"
                            onClick={() => removeItemFromOrder(index)}
                          >
                            Hiq
                          </button>
                        </div>
                      </div>
                      
                      {/* Ultra compact order item controls */}
                      <div className="mt-1 flex items-center space-x-1">
                        <div className="flex items-center border rounded overflow-hidden">
                          <button
                            className="px-1 py-0.5 bg-gray-100 hover:bg-gray-200 text-xs"
                            onClick={() => updateItemQuantity(index, item.quantity - 1)}
                          >
                            -
                          </button>
                          <input
                            type="number"
                            className="w-6 text-center border-0 text-xs"
                            value={item.quantity}
                            onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                            min="1"
                          />
                          <button
                            className="px-1 py-0.5 bg-gray-100 hover:bg-gray-200 text-xs"
                            onClick={() => updateItemQuantity(index, item.quantity + 1)}
                          >
                            +
                          </button>
                        </div>
                        
                        <input
                          type="text"
                          className="flex-1 px-1 py-0.5 border rounded text-xs"
                          placeholder="Shënime"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(index, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border-t pt-3">
                <div className="flex justify-between items-center text-lg font-bold mb-3">
                  <span>Total:</span>
                  <span>{calculateTotal().toLocaleString()} LEK</span>
                </div>
                
                <div className="space-y-2">
                  <button
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    onClick={submitOrder}
                    disabled={orderItems.length === 0 || submitting || (!tableId && !selectedTableId)}
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Duke dërguar...
                      </span>
                    ) : (
                      <>
                        <span className="mr-1 text-xs">🚀</span>
                        Dërgo Porosinë
                      </>
                    )}
                  </button>
                  
                  {/* Print Bill Button */}
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                    onClick={handlePrintBill}
                    disabled={orderItems.length === 0 || isPrinting}
                  >
                    {isPrinting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Duke printuar...
                      </span>
                    ) : (
                      <>
                        <span className="mr-1 text-xs">🖨️</span>
                        Printo Faturën
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Hidden Print Template */}
      <div className="hidden">
        <div ref={printRef} className="print-template p-4" style={{ fontFamily: 'monospace', fontSize: '11pt', width: '80mm', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '10px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16pt', marginBottom: '8px' }}>VILA FALO</div>
            <div style={{ fontSize: '12pt', marginBottom: '5px' }}>Restaurant & Bar</div>
            <div style={{ fontSize: '10pt' }}>Voskopoje, Korçë</div>
            <div style={{ fontSize: '10pt', marginBottom: '5px' }}>Shqipëri</div>
            <div style={{ fontSize: '9pt' }}>Tel: +355 69 123 4567</div>
            <div style={{ fontSize: '9pt' }}>NIPT: K12345678A</div>
            <div style={{ marginTop: '10px', borderBottom: '1px dashed #000', paddingBottom: '5px' }}>
              {formatDate(new Date())}
            </div>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <div><strong>Kamarier:</strong> {user?.name || 'N/A'}</div>
            <div><strong>Tavolina:</strong> {table ? table.number : selectedTableId ? tables.find(t => t._id === selectedTableId)?.number || 'N/A' : 'N/A'}</div>
            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '5px', marginTop: '5px' }}></div>
          </div>
          
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', paddingBottom: '5px', borderBottom: '1px solid #000', width: '40%' }}>Artikulli</th>
                  <th style={{ textAlign: 'right', paddingBottom: '5px', borderBottom: '1px solid #000', width: '20%' }}>Sasia</th>
                  <th style={{ textAlign: 'right', paddingBottom: '5px', borderBottom: '1px solid #000', width: '40%' }}>Çmimi</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px dotted #ddd' }}>
                    <td style={{ paddingTop: '5px', paddingBottom: '5px', textAlign: 'left' }}>{item.name}</td>
                    <td style={{ paddingTop: '5px', paddingBottom: '5px', textAlign: 'right' }}>{item.quantity}x</td>
                    <td style={{ paddingTop: '5px', paddingBottom: '5px', textAlign: 'right' }}>{(item.price * item.quantity).toLocaleString()} LEK</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #000' }}>
                  <th colSpan="2" style={{ textAlign: 'left', paddingTop: '8px', fontSize: '12pt' }}>TOTAL:</th>
                  <th style={{ textAlign: 'right', paddingTop: '8px', fontSize: '12pt' }}>{calculateTotal().toLocaleString()} LEK</th>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '9pt' }}>
            <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', marginBottom: '10px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>INFORMACION FISKAL</div>
              <div>TVSH (20%): {(calculateTotal() * 0.2).toLocaleString()} LEK</div>
              <div>Pa TVSH: {(calculateTotal() * 0.8).toLocaleString()} LEK</div>
            </div>
            
            <div style={{ marginTop: '15px', fontSize: '10pt' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>🍽️ FALEMINDERIT! 🍽️</div>
              <div>Për vizitën tuaj në Vila Falo</div>
              <div style={{ marginTop: '5px', fontSize: '8pt' }}>Voskopoje - Zemra e Alpeve Shqiptare</div>
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '8pt', borderTop: '1px solid #000', paddingTop: '5px' }}>
              Ora: {new Date().toLocaleTimeString('sq-AL')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrder;
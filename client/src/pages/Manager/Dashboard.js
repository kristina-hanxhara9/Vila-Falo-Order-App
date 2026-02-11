import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../contexts/AuthContext';
import { SocketContext } from '../../contexts/SocketContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ManagerDashboard = () => {
  // Dashboard state
  const [stats, setStats] = useState({
    totalOrders: 0,
    activeOrders: 0,
    dailyRevenue: 0,
    tables: {
      total: 0,
      free: 0,
      ordering: 0,
      unpaid: 0,
      paid: 0
    }
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { user, token, logout } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError('');

        // Include token in request headers
        const config = {
          headers: {
            'x-auth-token': token
          }
        };

        // Fetch all orders
        const ordersRes = await axios.get(`${API_URL}/orders`, config);

        // Get today's orders by filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = ordersRes.data.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= today;
        });

        // Calculate daily revenue from today's orders
        const dailyRevenue = todayOrders.reduce((sum, order) => {
          // Only count paid orders in revenue
          if (order.paymentStatus === 'paid') {
            return sum + order.totalAmount;
          }
          return sum;
        }, 0);

        // Get active orders
        const activeOrders = ordersRes.data.filter(order => order.status === 'active');

        // Get recent orders (last 5)
        const sortedOrders = [...ordersRes.data].sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setRecentOrders(sortedOrders.slice(0, 5));

        // Fetch tables
        const tablesRes = await axios.get(`${API_URL}/tables`, config);
        setTables(tablesRes.data);

        // Calculate table stats
        const tableStats = {
          total: tablesRes.data.length,
          free: tablesRes.data.filter(table => table.status === 'free').length,
          ordering: tablesRes.data.filter(table => table.status === 'ordering').length,
          unpaid: tablesRes.data.filter(table => table.status === 'unpaid').length,
          paid: tablesRes.data.filter(table => table.status === 'paid').length
        };

        // Update stats
        setStats({
          totalOrders: todayOrders.length,
          activeOrders: activeOrders.length,
          dailyRevenue,
          tables: tableStats
        });

        setLoading(false);
      } catch (err) {
        setError('Gabim gjatë marrjes së të dhënave të panelit');
        setLoading(false);
        console.error('Manager dashboard error:', err);
      }
    };

    fetchDashboardData();
  }, [token]);

  // Real-time updates via socket
  useEffect(() => {
    if (!socket) return;

    const refreshData = () => {
      const config = { headers: { 'x-auth-token': token } };
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      Promise.all([
        axios.get(`${API_URL}/orders`, config),
        axios.get(`${API_URL}/tables`, config)
      ]).then(([ordersRes, tablesRes]) => {
        const todayOrders = ordersRes.data.filter(order => new Date(order.createdAt) >= today);
        const dailyRevenue = todayOrders.reduce((sum, order) =>
          order.paymentStatus === 'paid' ? sum + order.totalAmount : sum, 0);
        const activeOrders = ordersRes.data.filter(order => order.status === 'active');
        const sortedOrders = [...ordersRes.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentOrders(sortedOrders.slice(0, 5));
        setTables(tablesRes.data);

        setStats({
          totalOrders: todayOrders.length,
          activeOrders: activeOrders.length,
          dailyRevenue,
          tables: {
            total: tablesRes.data.length,
            free: tablesRes.data.filter(t => t.status === 'free').length,
            ordering: tablesRes.data.filter(t => t.status === 'ordering').length,
            unpaid: tablesRes.data.filter(t => t.status === 'unpaid').length,
            paid: tablesRes.data.filter(t => t.status === 'paid').length
          }
        });
      }).catch(() => {});
    };

    socket.on('order-received', refreshData);
    socket.on('order-updated', refreshData);
    socket.on('table-updated', refreshData);

    return () => {
      socket.off('order-received', refreshData);
      socket.off('order-updated', refreshData);
      socket.off('table-updated', refreshData);
    };
  }, [socket, token]);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (amount ==null) return '0 LEK';
    return amount.toLocaleString() + ' LEK';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-indigo-400 animate-pulse mx-auto"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Duke ngarkuar panelin...</h2>
          <p className="text-gray-500">Ju lutem prisni një moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
      {/* Enhanced Manager Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-700 to-purple-800"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-blue-500/10 to-white/5"></div>
        
        <div className="vila-page-header">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <div className="text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start space-x-3 mb-2">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h1 className="text-4xl font-bold text-white">
                    Paneli i Menaxherit
                  </h1>
                </div>
                <p className="text-blue-100 text-lg font-medium">
                  Mirë se vini, <span className="text-white font-semibold">{user?.name || 'Menaxher'}</span>
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-blue-100 text-sm font-medium mt-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></div>
                  Vila Falo • Menaxhimi i restorantit
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 justify-center">
                <button 
                  onClick={handleLogout} 
                  className="group px-6 py-3 bg-red-600 text-white rounded-2xl shadow-lg flex items-center backdrop-blur-sm"
                  style={{background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'}}
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

        {/* Enhanced Dashboard Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="group bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-green-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">Të ardhura</p>
                  <p className="text-xs text-emerald-500">Sot</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-200">
                  {formatCurrency(stats.dailyRevenue)}
                </p>
                <div className="w-full bg-emerald-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full" style={{width: '75%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Porosi</p>
                  <p className="text-xs text-blue-500">Sot</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">
                  {stats.totalOrders}
                </p>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full" style={{width: '60%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-amber-600 uppercase tracking-wide">Aktive</p>
                  <p className="text-xs text-amber-500">Tani</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-800 group-hover:text-amber-700 transition-colors duration-200">
                  {stats.activeOrders}
                </p>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full" style={{width: stats.activeOrders > 0 ? '85%' : '0%'}}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden">
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-purple-600 uppercase tracking-wide">Tavolina</p>
                  <p className="text-xs text-purple-500">Të lira</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-200">
                  {stats.tables.free} / {stats.tables.total}
                </p>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-violet-500 h-2 rounded-full" style={{width: `${(stats.tables.free / stats.tables.total) * 100}%`}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Table Status Overview */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Gjendja e Tavolinave</h2>
              <p className="text-gray-600">Statusi i të gjitha tavolinave në kohë reale</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Totali</div>
              <div className="text-2xl font-bold text-gray-800">{stats.tables.total}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="group bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-6 border-2 border-emerald-200 hover:border-emerald-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-emerald-600 text-sm font-medium">✅</div>
              </div>
              <div className="text-emerald-800 font-semibold mb-1">Të lira</div>
              <div className="text-3xl font-bold text-emerald-700">{stats.tables.free}</div>
            </div>
            
            <div className="group bg-gradient-to-br from-amber-50 to-yellow-100 rounded-2xl p-6 border-2 border-amber-200 hover:border-amber-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-amber-600 text-sm font-medium">🔄</div>
              </div>
              <div className="text-amber-800 font-semibold mb-1">Duke porositur</div>
              <div className="text-3xl font-bold text-amber-700">{stats.tables.ordering}</div>
            </div>
            
            <div className="group bg-gradient-to-br from-rose-50 to-red-100 rounded-2xl p-6 border-2 border-rose-200 hover:border-rose-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-rose-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-rose-600 text-sm font-medium">⚠️</div>
              </div>
              <div className="text-rose-800 font-semibold mb-1">Të papaguara</div>
              <div className="text-3xl font-bold text-rose-700">{stats.tables.unpaid}</div>
            </div>
            
            <div className="group bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border-2 border-blue-200 hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-blue-600 text-sm font-medium">💳</div>
              </div>
              <div className="text-blue-800 font-semibold mb-1">Të paguara</div>
              <div className="text-3xl font-bold text-blue-700">{stats.tables.paid}</div>
            </div>
          </div>
        </div>

        {/* Enhanced Recent Orders */}
        <div className="bg-white/70 backdrop-blur-lg rounded-3xl shadow-xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Porositë e Fundit</h2>
              <p className="text-gray-600">5 porositë më të fundit që janë bërë</p>
            </div>
            <Link 
              to="/manager/orders" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-200 font-medium"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Shiko të gjitha
            </Link>
          </div>
        
          {recentOrders.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12a1 1 0 112 0V9a1 1 0 10-2 0v3zm1-5a1 1 0 110-2 1 1 0 010 2z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v1a1 1 0 102 0V5z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg font-medium">Nuk ka porosi të fundit</p>
              <p className="text-gray-400 text-sm mt-2">Porositë do të shfaqen këtu pasi të bëhen</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {recentOrders.map(order => (
                <div key={order._id} className="group bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                  <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">Tavolina {order.table?.number || 'N/A'}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('sq-AL')} • {new Date(order.createdAt).toLocaleTimeString('sq-AL', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Artikuj</div>
                        <div className="font-semibold text-gray-800">{order.items?.length || 0}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-sm text-gray-500">Status</div>
                        <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${
                          order.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                          order.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status === 'active' ? '🔄 Aktive' :
                          order.status === 'completed' ? '✅ Përfunduar' : order.status}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Totali</div>
                        <div className="font-bold text-lg text-gray-800">{formatCurrency(order.totalAmount)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>

        {/* Enhanced Quick Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link to="/manager/menu" className="group bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-blue-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-700 transition-colors duration-200">Menaxho Menunë</h3>
                  <p className="text-blue-600 text-sm font-medium">Artikuj dhe çmime</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Shto, ndrysho ose fshi artikuj në menu</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>

          <Link to="/manager/tables" className="group bg-gradient-to-br from-emerald-50 to-green-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-emerald-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-200">Menaxho Tavolinat</h3>
                  <p className="text-emerald-600 text-sm font-medium">Statuset dhe rezervimet</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Shiko dhe ndrysho statuset e tavolinave</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-green-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>

          <Link to="/manager/users" className="group bg-gradient-to-br from-purple-50 to-violet-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-purple-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-700 transition-colors duration-200">Menaxho Përdoruesit</h3>
                  <p className="text-purple-600 text-sm font-medium">Stafi dhe lejet</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Shto, ndrysho ose fshi përdoruesit e sistemit</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-purple-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>

          <Link to="/manager/reports" className="group bg-gradient-to-br from-amber-50 to-yellow-100 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-amber-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 group-hover:text-amber-700 transition-colors duration-200">Raportet</h3>
                  <p className="text-amber-600 text-sm font-medium">Analizat dhe statistikat</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Shiko raportet e shitjeve dhe statistikat</p>
            </div>
            <div className="h-1 bg-gradient-to-r from-amber-500 to-yellow-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </Link>

          <div className="group bg-gradient-to-br from-rose-50 to-red-100 rounded-3xl shadow-lg border border-rose-200 overflow-hidden opacity-60 cursor-not-allowed relative">
            <div className="absolute top-3 right-3 bg-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">Së shpejti</div>
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center mr-4">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Konfigurimet</h3>
                  <p className="text-rose-600 text-sm font-medium">Cilësimet e sistemit</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Ndryshoni konfigurimet e restorantit</p>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-pink-50 to-fuchsia-100 rounded-3xl shadow-lg border border-pink-200 overflow-hidden opacity-60 cursor-not-allowed relative">
            <div className="absolute top-3 right-3 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full z-10">Së shpejti</div>
            <div className="p-8">
              <div className="flex items-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mr-4">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Porosia e Klientit</h3>
                  <p className="text-pink-600 text-sm font-medium">Self-service</p>
                </div>
              </div>
              <p className="text-gray-600 leading-relaxed">Menaxhoni sistemin e porosisë së klientit</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
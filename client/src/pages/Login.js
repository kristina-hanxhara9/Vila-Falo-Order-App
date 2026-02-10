import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated, user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'waiter') {
        navigate('/waiter');
      } else if (user.role === 'kitchen') {
        navigate('/kitchen');
      } else if (user.role === 'manager') {
        navigate('/manager');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username) {
      setError('Ju lutem shkruani emrin e perdoruesit');
      return;
    }

    if (!pin || pin.length !== 4) {
      setError('Ju lutem shkruani PIN-in (4 shifra)');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const user = await login(username, pin);

      if (user.role === 'waiter') {
        navigate('/waiter');
      } else if (user.role === 'kitchen') {
        navigate('/kitchen');
      } else if (user.role === 'manager') {
        navigate('/manager');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Kredencialet jane te gabuara');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Vila Falo</h1>
          <p className="text-gray-600">Sistemi i Menaxhimit te Porosive</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="username" className="block text-gray-700 text-sm font-bold mb-2">
              Emri i perdoruesit
            </label>
            <input
              type="text"
              id="username"
              className="input w-full"
              placeholder="Shkruani emrin e perdoruesit"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="pin" className="block text-gray-700 text-sm font-bold mb-2">
              PIN (4 shifra)
            </label>
            <input
              type="password"
              id="pin"
              inputMode="numeric"
              maxLength={4}
              pattern="[0-9]*"
              className="input w-full text-center text-2xl tracking-widest"
              placeholder="****"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Duke u ngarkuar...
                </span>
              ) : (
                'Hyr'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

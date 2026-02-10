import React, { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Dicka shkoi keq</h1>
            <p className="text-gray-600 mb-6">
              Ndodhi nje gabim i papritur. Provoni te rifreskoni faqen.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Rifresko faqen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

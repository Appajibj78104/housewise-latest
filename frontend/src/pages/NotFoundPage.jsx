import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center animate-fade-in">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-coral-500">404</h1>
          <h2 className="text-title text-content-primary mt-4">Page Not Found</h2>
          <p className="text-content-muted text-body mt-2">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>

        <div className="space-y-3">
          <Link to="/" className="btn btn-primary w-full flex items-center justify-center">
            <Home size={18} className="mr-2" />
            Go Home
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-secondary w-full flex items-center justify-center">
            <ArrowLeft size={18} className="mr-2" />
            Go Back
          </button>
        </div>

        <p className="mt-8 text-micro text-content-muted">If you think this is an error, please contact our support team.</p>
      </div>
    </div>
  );
};

export default NotFoundPage;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageX, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/common/Button';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <PackageX className="w-8 h-8" />
        </div>

        <h2 className="text-3xl font-black text-slate-900 dark:text-white">
          404
        </h2>
        <h3 className="text-base font-bold text-slate-700 dark:text-slate-300 mt-1">
          Page Not Found
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 mb-6">
          The requested route does not exist in the StockSense ERP application.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="w-4 h-4" />}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export const AccessDenied: React.FC = () => {
  const { user, role, quickDemoLogin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          Access Denied
        </h2>

        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Your current role (<span className="font-semibold text-rose-600 dark:text-rose-400">{role}</span>) does not have permission to view or manage this section of the system.
        </p>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl my-6 text-xs text-left space-y-1 text-slate-600 dark:text-slate-300">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Role Capabilities Summary:</p>
          <p>&bull; <span className="font-medium">Admin</span>: Unrestricted system-wide access.</p>
          <p>&bull; <span className="font-medium">Inventory Manager</span>: Products, stock transfers, adjustments, reports, & warehouses.</p>
          <p>&bull; <span className="font-medium">Warehouse Staff</span>: Receipts, deliveries, transfers, and physical counts.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            icon={<ArrowLeft className="w-4 h-4" />}
            size="sm"
          >
            Go Back
          </Button>

          <Button
            variant="primary"
            onClick={() => navigate('/dashboard')}
            icon={<Home className="w-4 h-4" />}
            size="sm"
          >
            Dashboard
          </Button>

          {role !== 'Admin' && (
            <Button
              variant="secondary"
              onClick={async () => {
                await quickDemoLogin('Admin');
                navigate('/dashboard');
              }}
              size="sm"
            >
              Switch to Admin
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

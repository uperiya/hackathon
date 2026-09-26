import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Shield, Calendar, LogOut, CheckCircle2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { StatusBadge } from '../components/common/StatusBadge';
import { formatDate } from '../lib/utils';

export const Profile: React.FC = () => {
  const { user, role, updateName, logout } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await updateName(name.trim());
      showToast('success', 'Profile name updated successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 pb-16 max-w-3xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
          User Profile
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Account credentials, role assignment, and system permissions.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-8">
        {/* User Identity Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="w-16 h-16 rounded-2xl bg-[#714B67] text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-[#714B67]/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {user?.name || 'Administrator'}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
            <div className="mt-2">
              <StatusBadge status={role} />
            </div>
          </div>
        </div>

        {/* Update Name Form */}
        <form onSubmit={handleUpdate} className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Personal Information
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
              required
            />

            <Input
              label="Email Address"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText="Managed by corporate directory / Firebase Auth"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Assigned Role"
              value={role}
              disabled
              leftIcon={<Shield className="w-4 h-4" />}
            />

            <Input
              label="Account Member Since"
              value={formatDate(user?.createdAt, 'MMMM dd, yyyy')}
              disabled
              leftIcon={<Calendar className="w-4 h-4" />}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Update Profile Name
            </Button>
          </div>
        </form>

        {/* Role Privileges Card */}
        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-[#714B67]" />
            <span>Assigned Permissions for {role}</span>
          </h4>

          <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
            {role === 'Admin' && (
              <>
                <li>Full unrestricted administrative rights across all warehouse systems</li>
                <li>Manage user accounts, company configurations, and master databases</li>
                <li>Validate, adjust, and reconcile all physical and software stock movements</li>
                <li>Export and import Excel inventory and movement histories</li>
              </>
            )}
            {role === 'Inventory Manager' && (
              <>
                <li>Create, update, and manage product catalog, SKUs, and categories</li>
                <li>Execute incoming receipts, delivery dispatches, and warehouse transfers</li>
                <li>Perform stock reconciliations and access full analytical reporting</li>
                <li>Configure warehouses and storage locations</li>
              </>
            )}
            {role === 'Warehouse Staff' && (
              <>
                <li>Floor execution: Receive incoming goods and validate GRN receipts</li>
                <li>Prepare and dispatch customer delivery orders</li>
                <li>Execute internal rack-to-rack stock transfers</li>
                <li>Perform physical inventory counting and submit adjustment counts</li>
              </>
            )}
          </ul>
        </div>

        {/* Logout Action */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button
            variant="danger"
            onClick={handleLogout}
            icon={<LogOut className="w-4 h-4" />}
          >
            Sign Out of StockSense
          </Button>
        </div>
      </div>
    </div>
  );
};

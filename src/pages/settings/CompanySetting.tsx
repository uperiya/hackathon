import React, { useState, useEffect } from 'react';
import { Building, Save, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';
import { CompanySettings, Warehouse } from '../../types';
import { getCollectionData, setDocumentData, resetDatabaseToSeed } from '../../lib/storage';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

export const CompanySetting: React.FC = () => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSeedOpen, setConfirmSeedOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [stList, whs] = await Promise.all([
        getCollectionData<CompanySettings>('settings'),
        getCollectionData<Warehouse>('warehouses')
      ]);

      if (stList.length > 0) {
        setSettings(stList[0]);
      } else {
        setSettings({
          id: 'company_settings',
          companyName: 'StockSense Global Logistics Inc.',
          companyAddress: '100 Enterprise Way, Suite 400, Chicago, IL 60601',
          defaultWarehouseId: whs[0]?.id || 'wh_main',
          defaultCurrency: 'USD',
          timezone: 'America/Chicago',
          lowStockAlertThreshold: 20,
          emailAlertsEnabled: true,
          enableSoundEffects: true,
        });
      }
      setWarehouses(whs);
      setLoading(false);
    };

    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    try {
      await setDocumentData('settings', 'company_settings', settings);
      showToast('success', 'Company enterprise settings updated and persisted successfully.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSeedData = () => {
    resetDatabaseToSeed();
    setConfirmSeedOpen(false);
    showToast('success', 'Database re-seeded with 10 products, 2 warehouses, and complete sample transactions.');
  };

  if (loading || !settings) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <Building className="w-6 h-6 text-[#714B67]" />
          <span>Company & ERP System Settings</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure corporate entity profiles, default operating currency, and low-stock alert thresholds.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 sm:p-10 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3">
          Organization Profile
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Input
            label="Legal Company Name"
            value={settings.companyName}
            onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
            required
          />

          <Select
            label="Default Receiving Warehouse"
            value={settings.defaultWarehouseId}
            onChange={(e) => setSettings({ ...settings, defaultWarehouseId: e.target.value })}
            options={warehouses.map(w => ({ value: w.id, label: w.name }))}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Corporate Headquarters Address
          </label>
          <textarea
            rows={2}
            value={settings.companyAddress}
            onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-3 text-xs focus:ring-2 focus:ring-[#714B67]/30"
          />
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-3 pt-4">
          Financial & Inventory Automation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Select
            label="Base Reporting Currency"
            value={settings.defaultCurrency}
            onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
            options={[
              { value: 'USD', label: 'USD ($) - US Dollar' },
              { value: 'EUR', label: 'EUR (€) - Euro' },
              { value: 'GBP', label: 'GBP (£) - British Pound' },
              { value: 'CAD', label: 'CAD ($) - Canadian Dollar' },
              { value: 'INR', label: 'INR (₹) - Indian Rupee' },
            ]}
          />

          <Select
            label="System Operating Timezone"
            value={settings.timezone}
            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
            options={[
              { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
              { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
              { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
              { value: 'Europe/London', label: 'London, GMT' },
              { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
            ]}
          />

          <Input
            label="Global Low-Stock Alert Level"
            type="number"
            min="1"
            value={settings.lowStockAlertThreshold}
            onChange={(e) => setSettings({ ...settings, lowStockAlertThreshold: Number(e.target.value) })}
            helperText="Default threshold for new products"
          />
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailAlertsEnabled}
              onChange={(e) => setSettings({ ...settings, emailAlertsEnabled: e.target.checked })}
              className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67]"
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Enable automated restock notifications when inventory falls below reorder limits
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            icon={<Save className="w-4 h-4" />}
          >
            Save Settings
          </Button>
        </div>
      </form>

      {/* Development & Hackathon Demo Reset Section */}
      <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <span>Developer Seed & Demo Reset</span>
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 max-w-xl">
            Reset all inventory, categories, receipts, deliveries, and stock ledger entries back to the clean baseline demo dataset (10 products with realistic stock).
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfirmSeedOpen(true)}
          className="border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
        >
          Re-seed Demo Data
        </Button>
      </div>

      <ConfirmDialog
        isOpen={confirmSeedOpen}
        onClose={() => setConfirmSeedOpen(false)}
        onConfirm={handleResetSeedData}
        title="Re-seed Demo Database?"
        message="This will wipe recent experimental transactions and restore the standard sample inventory, receipts, and deliveries. Continue?"
        variant="primary"
        confirmText="Confirm Re-seed"
      />
    </div>
  );
};

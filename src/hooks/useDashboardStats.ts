import { useState, useEffect, useCallback } from 'react';
import {
  DashboardKPIs,
  CategoryValuation,
  WarehouseOccupancy,
  StockLedgerEntry
} from '../types';
import { dashboardService } from '../services/dashboardService';

export function useDashboardStats() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [valuations, setValuations] = useState<CategoryValuation[]>([]);
  const [occupancies, setOccupancies] = useState<WarehouseOccupancy[]>([]);
  const [recentActivities, setRecentActivities] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [kpiData, valData, occData, recData] = await Promise.all([
        dashboardService.getKPIs(),
        dashboardService.getValuationByCategory(),
        dashboardService.getWarehouseOccupancies(),
        dashboardService.getRecentActivities(8)
      ]);
      setKpis(kpiData);
      setValuations(valData);
      setOccupancies(occData);
      setRecentActivities(recData);
    } catch (err: any) {
      setError(err?.message || 'Failed to calculate dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Listen for storage or update events to recalculate dashboard live
    const handleUpdate = () => {
      fetchStats();
    };

    window.addEventListener('stocksense_db_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('stocksense_db_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchStats]);

  return {
    kpis,
    valuations,
    occupancies,
    recentActivities,
    loading,
    error,
    refresh: fetchStats
  };
}

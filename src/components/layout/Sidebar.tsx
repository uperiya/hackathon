import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Layers,
  Repeat,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  SlidersHorizontal,
  History,
  BarChart3,
  Settings,
  Warehouse as WarehouseIcon,
  MapPin,
  Building,
  User,
  LogOut,
  ChevronDown,
  Box,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../common/StatusBadge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  // Collapsible menu groups
  const [productsOpen, setProductsOpen] = useState(true);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isStaff = role === 'Warehouse Staff';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800 bg-slate-950/60">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#714B67] to-[#017E84] flex items-center justify-center text-white shadow-md shadow-[#714B67]/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>StockSense</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#714B67] text-white">ERP</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide">
              Smart Inventory Management
            </p>
          </div>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#714B67]/40 border border-[#714B67] flex items-center justify-center text-xs font-bold text-white">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || 'Guest User'}
              </p>
              <div className="mt-0.5">
                <StatusBadge status={role} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 text-xs font-medium">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                isActive
                  ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`
            }
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </NavLink>

          {/* Products Group - (Admin & Inventory Manager) */}
          {!isStaff && (
            <div className="pt-2">
              <button
                onClick={() => setProductsOpen(!productsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Package className="w-3.5 h-3.5 text-slate-400" />
                  <span>Products</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    productsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {productsOpen && (
                <div className="space-y-1 pl-4 mt-1">
                  <NavLink
                    to="/products"
                    onClick={onClose}
                    end
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`
                    }
                  >
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span>All Products</span>
                  </NavLink>
                  <NavLink
                    to="/categories"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`
                    }
                  >
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <span>Categories</span>
                  </NavLink>
                  <NavLink
                    to="/reordering-rules"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`
                    }
                  >
                    <Repeat className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reordering Rules</span>
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Operations Group */}
          <div className="pt-2">
            <button
              onClick={() => setOperationsOpen(!operationsOpen)}
              className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200 transition"
            >
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400" />
                <span>Operations</span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                  operationsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {operationsOpen && (
              <div className="space-y-1 pl-4 mt-1">
                <NavLink
                  to="/operations/receipts"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <ArrowDownLeft className="w-3.5 h-3.5 text-teal-400" />
                  <span>Receipts</span>
                </NavLink>
                <NavLink
                  to="/operations/deliveries"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Delivery Orders</span>
                </NavLink>
                <NavLink
                  to="/operations/transfers"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
                  <span>Internal Transfers</span>
                </NavLink>
                <NavLink
                  to="/operations/adjustments"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                    }`
                  }
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Inventory Adjustments</span>
                </NavLink>
              </div>
            )}
          </div>

          {/* Move History */}
          <div className="pt-2">
            <NavLink
              to="/move-history"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <History className="w-4 h-4 text-slate-300" />
              <span>Move History</span>
            </NavLink>
          </div>

          {/* Reports (Admin & Manager) */}
          {!isStaff && (
            <NavLink
              to="/reports"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Reports</span>
            </NavLink>
          )}

          {/* Settings Group (Admin & Manager) */}
          {!isStaff && (
            <div className="pt-2">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-slate-400 hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span>Settings</span>
                </div>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-500 transition-transform ${
                    settingsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {settingsOpen && (
                <div className="space-y-1 pl-4 mt-1">
                  <NavLink
                    to="/settings/warehouses"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`
                    }
                  >
                    <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Warehouses</span>
                  </NavLink>
                  <NavLink
                    to="/settings/locations"
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                        isActive
                          ? 'bg-slate-800 text-white font-semibold'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                      }`
                    }
                  >
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>Locations</span>
                  </NavLink>
                  {role === 'Admin' && (
                    <NavLink
                      to="/settings/company"
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2 rounded-lg transition ${
                          isActive
                            ? 'bg-slate-800 text-white font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                        }`
                      }
                    >
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>Company Settings</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          <div className="pt-2 border-t border-slate-800/60">
            <NavLink
              to="/profile"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-[#714B67] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </NavLink>
          </div>
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:text-rose-200 hover:bg-rose-950/40 transition text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

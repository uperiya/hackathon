import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  'dashboard': 'Dashboard',
  'products': 'Products',
  'categories': 'Categories',
  'reordering-rules': 'Reordering Rules',
  'operations': 'Operations',
  'receipts': 'Receipts (Incoming)',
  'deliveries': 'Delivery Orders (Outgoing)',
  'transfers': 'Internal Transfers',
  'adjustments': 'Inventory Adjustments',
  'move-history': 'Move History',
  'reports': 'Reports',
  'settings': 'Settings',
  'warehouses': 'Warehouses',
  'locations': 'Locations',
  'company': 'Company Settings',
  'profile': 'My Profile',
  'new': 'New Document',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 py-2.5 px-1 overflow-x-auto whitespace-nowrap">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 hover:text-[#714B67] dark:hover:text-purple-300 transition font-medium"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Home</span>
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const displayName = ROUTE_LABELS[name] || (name.length > 20 ? `${name.substring(0, 8)}...` : name);

        return (
          <React.Fragment key={routeTo}>
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400 flex-shrink-0" />
            {isLast ? (
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {displayName}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-[#714B67] dark:hover:text-purple-300 transition"
              >
                {displayName}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

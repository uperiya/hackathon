import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from '../common/Breadcrumbs';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200">
      {/* Fixed Left Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Body Column (offset by 64 = 16rem = 256px on lg screens) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <Header onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Content Wrapper */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-4">
          <div className="no-print">
            <Breadcrumbs />
          </div>
          <Outlet />
        </main>

        {/* Professional Footer */}
        <footer className="no-print py-4 px-6 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <span>StockSense ERP &bull; Smart Inventory Management System</span>
        </footer>
      </div>
    </div>
  );
};

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';

import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Auth Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';

// ERP Core Pages
import { Dashboard } from './pages/Dashboard';
import { ProductsList } from './pages/products/ProductsList';
import { ProductDetail } from './pages/products/ProductDetail';
import { Categories } from './pages/products/Categories';
import { ReorderingRules } from './pages/products/ReorderingRules';

// Operations Pages
import { ReceiptsList } from './pages/operations/ReceiptsList';
import { ReceiptDetail } from './pages/operations/ReceiptDetail';
import { DeliveriesList } from './pages/operations/DeliveriesList';
import { DeliveryDetail } from './pages/operations/DeliveryDetail';
import { TransfersList } from './pages/operations/TransfersList';
import { TransferDetail } from './pages/operations/TransferDetail';
import { AdjustmentsList } from './pages/operations/AdjustmentsList';
import { AdjustmentForm } from './pages/operations/AdjustmentForm';

// History & Reports
import { MoveHistory } from './pages/MoveHistory';
import { Reports } from './pages/Reports';

// Settings & Profile
import { WarehousesSetting } from './pages/settings/WarehousesSetting';
import { LocationsSetting } from './pages/settings/LocationsSetting';
import { CompanySetting } from './pages/settings/CompanySetting';
import { Profile } from './pages/Profile';
import { AccessDenied } from './pages/AccessDenied';
import { NotFound } from './pages/NotFound';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Protected ERP Application Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Products Group */}
                <Route path="/products" element={<ProductsList />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/reordering-rules" element={<ReorderingRules />} />

                {/* Operations - Receipts */}
                <Route path="/operations/receipts" element={<ReceiptsList />} />
                <Route path="/operations/receipts/new" element={<ReceiptDetail />} />
                <Route path="/operations/receipts/:id" element={<ReceiptDetail />} />

                {/* Operations - Deliveries */}
                <Route path="/operations/deliveries" element={<DeliveriesList />} />
                <Route path="/operations/deliveries/new" element={<DeliveryDetail />} />
                <Route path="/operations/deliveries/:id" element={<DeliveryDetail />} />

                {/* Operations - Transfers */}
                <Route path="/operations/transfers" element={<TransfersList />} />
                <Route path="/operations/transfers/new" element={<TransferDetail />} />
                <Route path="/operations/transfers/:id" element={<TransferDetail />} />

                {/* Operations - Adjustments */}
                <Route path="/operations/adjustments" element={<AdjustmentsList />} />
                <Route path="/operations/adjustments/new" element={<AdjustmentForm />} />

                {/* Movement History & Reports */}
                <Route path="/move-history" element={<MoveHistory />} />
                <Route path="/reports" element={<Reports />} />

                {/* Settings & Profile */}
                <Route path="/settings/warehouses" element={<WarehousesSetting />} />
                <Route path="/settings/locations" element={<LocationsSetting />} />
                <Route path="/settings/company" element={<CompanySetting />} />
                <Route path="/profile" element={<Profile />} />

                {/* Access Denied */}
                <Route path="/access-denied" element={<AccessDenied />} />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;

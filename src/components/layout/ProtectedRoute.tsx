import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied } from '../../pages/AccessDenied';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: ('Admin' | 'Inventory Manager' | 'Warehouse Staff')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading, canAccessRoute } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#714B67] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check specific roles if provided
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <AccessDenied />;
  }

  // Check generic route permission
  if (!canAccessRoute(location.pathname)) {
    return <AccessDenied />;
  }

  return children ? <>{children}</> : null;
};

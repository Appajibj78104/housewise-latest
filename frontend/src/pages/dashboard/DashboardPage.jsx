import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const normalizeUserRole = (role) => {
  if (role === 'provider') return 'housewife';
  return role;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const role = normalizeUserRole(user?.role);

  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'housewife') return <Navigate to="/provider/dashboard" replace />;
  if (role === 'customer') return <Navigate to="/customer/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

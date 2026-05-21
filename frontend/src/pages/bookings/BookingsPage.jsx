import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const normalizeUserRole = (role) => {
  if (role === 'provider') return 'housewife';
  return role;
};

export default function BookingsPage() {
  const { user } = useAuth();
  const role = normalizeUserRole(user?.role);

  if (role === 'housewife') return <Navigate to="/provider/bookings" replace />;
  if (role === 'customer') return <Navigate to="/customer/bookings" replace />;
  if (role === 'admin') return <Navigate to="/admin/bookings" replace />;
  return <Navigate to="/login" replace />;
}

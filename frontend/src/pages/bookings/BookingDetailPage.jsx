import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const normalizeUserRole = (role) => {
  if (role === 'provider') return 'housewife';
  return role;
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const role = normalizeUserRole(user?.role);

  if (role === 'customer') return <Navigate to={`/customer/bookings/${id}`} replace />;
  if (role === 'housewife') return <Navigate to="/provider/bookings" replace />;
  if (role === 'admin') return <Navigate to="/admin/bookings" replace />;
  return <Navigate to="/login" replace />;
}

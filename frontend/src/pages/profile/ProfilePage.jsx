import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const normalizeUserRole = (role) => {
  if (role === 'provider') return 'housewife';
  return role;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const role = normalizeUserRole(user?.role);

  if (role === 'housewife') return <Navigate to="/provider/profile" replace />;
  if (role === 'customer') return <Navigate to="/customer/profile" replace />;
  if (role === 'admin') return <Navigate to="/admin/settings" replace />;
  return <Navigate to="/login" replace />;
}

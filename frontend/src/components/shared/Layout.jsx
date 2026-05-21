import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, LogOut, ChevronRight } from 'lucide-react';

const Layout = ({ 
  children, 
  navigation, 
  title, 
  userRole, 
  theme = 'dark',
  accentColor = 'blue',
  hideTopbar = false
}) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const accentMap = {
    blue: { bg: 'bg-accent-blue', ring: 'ring-accent-blue/30', text: 'text-accent-blue-light' },
    red: { bg: 'bg-danger', ring: 'ring-danger/30', text: 'text-danger-light' },
    coral: { bg: 'bg-coral-500', ring: 'ring-coral-500/30', text: 'text-coral-400' },
  };
  const accent = accentMap[accentColor] || accentMap.blue;

  useEffect(() => {
    const token = userRole === 'admin'
      ? localStorage.getItem('adminToken')
      : localStorage.getItem('token');
    const storedUser = userRole === 'admin'
      ? localStorage.getItem('adminUser')
      : localStorage.getItem('user');

    if (!token) { navigate('/login'); return; }
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      const normalizedUserRole = userData.role === 'housewife' ? 'provider' : userData.role;
      if (normalizedUserRole !== userRole && userData.role !== userRole) {
        navigate('/login'); return;
      }
    } else { navigate('/login'); return; }
  }, [navigate, userRole]);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result.success) navigate('/login', { replace: true });
    } catch { navigate('/login', { replace: true }); }
  };

  const isActivePath = (path) => location.pathname === path;

  const getUserDisplayData = () => {
    if (userRole === 'admin') {
      try {
        const adminUser = localStorage.getItem('adminUser');
        return adminUser ? JSON.parse(adminUser) : { name: 'Administrator', email: 'admin@housewise.com' };
      } catch { return { name: 'Administrator', email: 'admin@housewise.com' }; }
    }
    return user || { name: 'User', email: 'user@example.com' };
  };

  const userData = getUserDisplayData();
  const initials = (userData.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-raised border-r border-surface-border
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 ${accent.bg} rounded-lg flex items-center justify-center shadow-sm`}>
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-content-primary font-semibold text-[15px] tracking-tight">
              {title || 'HouseWise'}
            </span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-content-muted hover:text-content-primary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-6 pb-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => { navigate(item.href); setSidebarOpen(false); }}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-xl transition-all duration-150 ${
                    active
                      ? `${accent.bg} text-white shadow-sm`
                      : 'text-content-secondary hover:text-content-primary hover:bg-surface-hover'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-white' : 'text-content-muted group-hover:text-content-secondary'}`} />
                  <span className="flex-1 text-left">{item.name}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4 mt-auto border-t border-surface-border">
          <div className="pt-4 mb-3">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-overlay">
              <div className={`h-8 w-8 ${accent.bg}/20 rounded-lg flex items-center justify-center`}>
                <span className={`text-xs font-semibold ${accent.text}`}>{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-content-primary truncate">{userData.name}</div>
                <div className="text-micro text-content-muted capitalize">
                  {userRole === 'housewife' || userRole === 'provider' ? 'Service Provider' : userRole}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium text-content-muted hover:text-danger-light hover:bg-danger-muted rounded-xl transition-all duration-150"
          >
            <LogOut className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="lg:pl-64 min-h-screen flex flex-col bg-surface">
        {hideTopbar ? (
          /* Mobile-only hamburger when topbar is hidden */
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-3 left-3 z-30 h-10 w-10 rounded-xl bg-surface-raised/80 backdrop-blur-xl border border-surface-border flex items-center justify-center text-content-muted hover:text-content-primary transition-colors shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : (
          /* Topbar */
          <header className="sticky top-0 z-10 h-16 bg-surface-raised/80 backdrop-blur-xl border-b border-surface-border px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-content-muted hover:text-content-primary transition-colors">
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="text-heading text-content-primary">
                {navigation.find(item => isActivePath(item.href))?.name || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-detail text-content-muted hidden sm:block">
                {userData.name}
              </span>
              <div className={`h-8 w-8 ${accent.bg}/20 rounded-lg flex items-center justify-center`}>
                <span className={`text-micro font-semibold ${accent.text}`}>{initials}</span>
              </div>
            </div>
          </header>
        )}

        {/* Page content */}
        <main className={`flex-1 animate-fade-in ${hideTopbar ? '' : 'p-4 sm:p-6 lg:p-8'}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Calendar, MessageSquare,
  Settings, Clock, Package, FolderTree, DollarSign, Bell, Sliders,
  FileText, Headphones, Menu, X, LogOut, ChevronRight,
  Search, Sun, Moon, PanelLeftClose, PanelLeft, Activity, Bot,
  ShieldCheck, ShieldAlert
} from 'lucide-react';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { useTheme } from '../../context/ThemeContext';
import { adminAPIService } from '../../services/adminAPI';
import AdminGlobalSearch from './AdminGlobalSearch';
import AdminNotificationBell from './AdminNotificationBell';

const NAVIGATION = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Providers', href: '/admin/providers', icon: UserCheck },
  { name: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { name: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
  { name: 'Services', href: '/admin/services', icon: Package },
  { name: 'Categories', href: '/admin/categories', icon: FolderTree },
  { name: 'Financial', href: '/admin/financial', icon: DollarSign },
  { name: 'KYC', href: '/admin/kyc', icon: ShieldCheck },
  { name: 'Disputes', href: '/admin/disputes', icon: ShieldAlert },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'System Settings', href: '/admin/system-settings', icon: Sliders },
  { name: 'Content', href: '/admin/content', icon: FileText },
  { name: 'Support', href: '/admin/support', icon: Headphones },
  { name: 'Health', href: '/admin/health', icon: Activity },
  { name: 'Review AI', href: '/admin/review-automation', icon: Bot },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const BREADCRUMB_MAP = {
  '/admin/dashboard': [{ label: 'Dashboard' }],
  '/admin/customers': [{ label: 'Customers' }],
  '/admin/providers': [{ label: 'Providers' }],
  '/admin/bookings': [{ label: 'Bookings' }],
  '/admin/reviews': [{ label: 'Reviews' }],
  '/admin/services': [{ label: 'Services' }],
  '/admin/categories': [{ label: 'Categories' }],
  '/admin/financial': [{ label: 'Financial' }],
  '/admin/kyc': [{ label: 'KYC Review' }],
  '/admin/disputes': [{ label: 'Disputes' }],
  '/admin/notifications': [{ label: 'Notifications' }],
  '/admin/system-settings': [{ label: 'System Settings' }],
  '/admin/content': [{ label: 'Content' }],
  '/admin/support': [{ label: 'Support' }],
  '/admin/health': [{ label: 'System Health' }],
  '/admin/review-automation': [{ label: 'Review Automation' }],
  '/admin/settings': [{ label: 'Settings' }],
};

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('admin-sidebar-collapsed') === 'true');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('admin-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  // Cmd+K / Ctrl+K global search
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleTimeout = useCallback(() => {
    adminAPIService.logActivity({ action: 'session_expired', details: 'Admin session timed out' }).catch(() => {});
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  }, [navigate]);

  const { showWarning, remainingSeconds, resetActivity } = useSessionTimeout({
    onTimeout: handleTimeout,
  });

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) navigate('/login', { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    navigate('/login', { replace: true });
  };

  const isActive = (path) => location.pathname === path || (path !== '/admin/dashboard' && location.pathname.startsWith(path + '/'));

  const getUserData = () => {
    try {
      const raw = localStorage.getItem('adminUser');
      return raw ? JSON.parse(raw) : { name: 'Admin', email: 'admin@housewise.com' };
    } catch { return { name: 'Admin', email: 'admin@housewise.com' }; }
  };
  const userData = getUserData();
  const initials = (userData.name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Breadcrumbs
  const getBreadcrumbs = () => {
    const path = location.pathname;
    if (path.match(/^\/admin\/providers\/.+$/)) {
      return [{ label: 'Providers', href: '/admin/providers' }, { label: 'Provider Detail' }];
    }
    return BREADCRUMB_MAP[path] || [{ label: path.split('/').pop() }];
  };
  const breadcrumbs = getBreadcrumbs();

  const formatTime = (seconds) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-[72px]' : 'w-64'} bg-surface-raised border-r border-surface-border
        transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        transition-all duration-300 ease-out lg:translate-x-0 flex flex-col`}>
        
        {/* Logo */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-surface-border">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="h-8 w-8 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            {!collapsed && <span className="text-content-primary font-semibold text-sm whitespace-nowrap">HouseWise Admin</span>}
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-content-muted hover:text-content-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 pt-4 pb-3 overflow-y-auto scrollbar-thin">
          <div className="space-y-0.5">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <button
                  key={item.name}
                  onClick={() => { navigate(item.href); setSidebarOpen(false); }}
                  title={collapsed ? item.name : undefined}
                  className={`group w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 ${
                    active
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'text-content-secondary hover:text-content-primary hover:bg-surface-hover'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${active ? 'text-red-400' : 'text-content-muted group-hover:text-content-secondary'}`} />
                  {!collapsed && <span className="flex-1 text-left truncate">{item.name}</span>}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Collapse toggle (desktop) */}
        <div className="hidden lg:block px-2 pb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-content-muted hover:text-content-primary hover:bg-surface-hover rounded-lg transition-colors"
          >
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <><PanelLeftClose className="w-4 h-4" /><span>Collapse</span></>}
          </button>
        </div>

        {/* User + Logout */}
        <div className="px-2 pb-3 border-t border-surface-border">
          {!collapsed && (
            <div className="pt-3 mb-2">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-overlay">
                <div className="h-7 w-7 bg-red-500/20 rounded-md flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-red-400">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-content-primary truncate">{userData.name}</div>
                  <div className="text-[10px] text-content-muted">Administrator</div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-2.5 px-3 py-2 text-xs text-content-muted hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className={`${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'} min-h-screen flex flex-col bg-surface transition-all duration-300`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 bg-surface-raised/80 backdrop-blur-xl border-b border-surface-border px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-content-muted hover:text-content-primary">
              <Menu className="h-5 w-5" />
            </button>
            {/* Breadcrumbs */}
            <nav className="hidden sm:flex items-center gap-1.5 text-xs min-w-0">
              <span className="text-content-muted">Admin</span>
              {breadcrumbs.map((bc, i) => (
                <React.Fragment key={i}>
                  <ChevronRight className="w-3 h-3 text-content-muted/50 flex-shrink-0" />
                  {bc.href ? (
                    <button onClick={() => navigate(bc.href)} className="text-content-muted hover:text-content-primary transition-colors truncate">{bc.label}</button>
                  ) : (
                    <span className="text-content-primary font-medium truncate">{bc.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Global search trigger */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-hover/50 border border-surface-border text-content-muted hover:text-content-primary hover:border-content-muted/30 transition-all text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Search...</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-overlay text-[10px] text-content-muted border border-surface-border">⌘K</kbd>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors"
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification bell */}
            <AdminNotificationBell />

            {/* User avatar */}
            <div className="h-8 w-8 bg-red-500/20 rounded-lg flex items-center justify-center ml-1">
              <span className="text-[10px] font-semibold text-red-400">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 animate-fade-in">
          {children}
        </main>
      </div>

      {/* Global Search Overlay */}
      {searchOpen && <AdminGlobalSearch onClose={() => setSearchOpen(false)} />}

      {/* Session Timeout Warning */}
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-content-primary">Session Expiring</h3>
                <p className="text-xs text-content-muted">Logging out due to inactivity</p>
              </div>
            </div>
            <div className="text-center py-3">
              <p className="text-2xl font-bold text-yellow-400 tabular-nums">{formatTime(remainingSeconds)}</p>
            </div>
            <button onClick={resetActivity} className="w-full py-2 px-4 bg-accent-blue-muted text-accent-blue-light rounded-xl text-sm font-medium hover:bg-accent-blue-muted/80 transition-colors">
              Keep me logged in
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLayout;

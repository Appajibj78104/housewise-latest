import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard, Briefcase, Calendar, IndianRupee, Star, User,
  LogOut, Menu, X, ChevronRight, Sun, Moon, ShieldCheck
} from 'lucide-react';
import NotificationDropdown from '../shared/NotificationDropdown';

/* ── Nav config ── */
const NAV_MAIN = [
  { name: 'Dashboard', href: '/provider/dashboard', icon: LayoutDashboard },
  { name: 'My Services', href: '/provider/services', icon: Briefcase },
];
const NAV_BUSINESS = [
  { name: 'Bookings', href: '/provider/bookings', icon: Calendar },
  { name: 'Earnings', href: '/provider/earnings', icon: IndianRupee },
  { name: 'Reviews', href: '/provider/reviews', icon: Star },
  { name: 'KYC Verification', href: '/provider/kyc', icon: ShieldCheck },
  { name: 'Profile', href: '/provider/profile', icon: User },
];

/* ── Page titles ── */
const PAGE_META = {
  '/provider/dashboard':  { title: 'Dashboard',   crumb: 'Dashboard' },
  '/provider/services':   { title: 'My Services',  crumb: 'Services' },
  '/provider/services/new': { title: 'New Service', crumb: 'New Service' },
  '/provider/bookings':   { title: 'Bookings',     crumb: 'Bookings' },
  '/provider/earnings':   { title: 'Earnings',     crumb: 'Earnings' },
  '/provider/reviews':    { title: 'Reviews',      crumb: 'Reviews' },
  '/provider/kyc':        { title: 'KYC Verification', crumb: 'KYC' },
  '/provider/profile':    { title: 'Profile',      crumb: 'Profile' },
};

const ProviderLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  /* Auth guard */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token) { navigate('/login'); return; }
    if (storedUser) {
      const u = JSON.parse(storedUser);
      const role = u.role === 'housewife' ? 'provider' : u.role;
      if (role !== 'provider') { navigate('/login'); return; }
    } else { navigate('/login'); }
  }, [navigate]);

  const isActive = (href) => location.pathname === href;
  const meta = PAGE_META[location.pathname] || { title: 'Page', crumb: 'Page' };
  const userData = user || { name: 'User', email: '' };
  const initials = (userData.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    try { await logout(); } catch {} finally { navigate('/login', { replace: true }); }
  };

  const navTo = (href) => { navigate(href); setMobileOpen(false); };

  const ThemeToggleBtn = () => (
    <button onClick={toggleTheme} className="p-2 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-hover transition-colors" title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
    </button>
  );

  /* Nav item renderer */
  const NavItem = ({ item }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <button onClick={() => navTo(item.href)}
        className={`psl-nav-item ${active ? 'psl-nav-active' : ''}`}>
        <span className="psl-nav-indicator" />
        <Icon style={{ width: 18, height: 18 }} className="psl-nav-icon" />
        <span className="psl-nav-label">{item.name}</span>
        {active && <ChevronRight style={{ width: 14, height: 14 }} className="psl-nav-chevron" />}
      </button>
    );
  };

  return (
    <div className="psl-app">
      {/* Mobile overlay */}
      {mobileOpen && <div className="psl-overlay" onClick={() => setMobileOpen(false)} />}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`psl-sidebar ${mobileOpen ? 'psl-sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="psl-brand">
          <div className="psl-brand-row">
            <div className="psl-logo-mark"><span>H</span></div>
            <div className="psl-brand-text">
              <span className="psl-brand-name">HouseWise</span>
              <span className="psl-brand-role">Provider</span>
            </div>
            <button className="psl-mobile-close" onClick={() => setMobileOpen(false)}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <div className="psl-brand-sep" />
        </div>

        {/* Navigation */}
        <nav className="psl-nav">
          <div className="psl-nav-group">
            {NAV_MAIN.map(item => <NavItem key={item.href} item={item} />)}
          </div>
          <div className="psl-nav-divider" />
          <div className="psl-nav-group">
            <span className="psl-nav-section-label">BUSINESS</span>
            {NAV_BUSINESS.map(item => <NavItem key={item.href} item={item} />)}
          </div>
        </nav>

        {/* User panel */}
        <div className="psl-user-panel">
          <div className="psl-user-sep" />
          <div className="psl-user-card">
            <div className="psl-user-avatar"><span>{initials}</span></div>
            <div className="psl-user-info">
              <span className="psl-user-name">{userData.name}</span>
              <span className="psl-user-role">Service Provider</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14 }} className="psl-user-chevron" />
          </div>
          <button className="psl-signout" onClick={handleLogout}>
            <LogOut style={{ width: 16, height: 16 }} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT PANEL ═══ */}
      <div className="psl-main">
        {/* Topbar */}
        <header className="psl-topbar">
          <div className="psl-topbar-left">
            <button className="psl-hamburger" onClick={() => setMobileOpen(true)}>
              <Menu style={{ width: 18, height: 18 }} />
            </button>
            <div className="psl-breadcrumb">
              <span className="psl-crumb-base">HouseWise</span>
              <span className="psl-crumb-sep">/</span>
              <span className="psl-crumb-current">{meta.crumb}</span>
            </div>
          </div>
          <div className="psl-topbar-right">
            <ThemeToggleBtn />
            <NotificationDropdown />
            <button className="psl-topbar-avatar" onClick={() => navTo('/provider/profile')}>
              <span>{initials}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="psl-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProviderLayout;

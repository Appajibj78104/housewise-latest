import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Home, Search, Map, Calendar, Star, User, LogOut,
  Menu, X, ChevronRight, Sun, Moon, Gift, FileText,
  Heart, Repeat, ShieldAlert
} from 'lucide-react';
import NotificationDropdown from '../shared/NotificationDropdown';

/* ── Nav config ── */
const NAV_MAIN = [
  { name: 'Dashboard', href: '/customer/dashboard', icon: Home, emoji: '🏠' },
  { name: 'Browse Services', href: '/customer/services', icon: Search, emoji: '🔍' },
  { name: 'Map View', href: '/customer/map', icon: Map, emoji: '🗺' },
];
const NAV_ACTIVITY = [
  { name: 'My Bookings', href: '/customer/bookings', icon: Calendar, emoji: '📅' },
  { name: 'Recurring', href: '/customer/recurring', icon: Repeat, emoji: '🔁' },
  { name: 'Saved Providers', href: '/customer/saved-providers', icon: Heart, emoji: '💖' },
  { name: 'My Reviews', href: '/customer/reviews', icon: Star, emoji: '⭐' },
  { name: 'Disputes', href: '/customer/disputes', icon: ShieldAlert, emoji: '🛡️' },
  { name: 'Referrals', href: '/customer/referrals', icon: Gift, emoji: '🎁' },
  { name: 'Invoices', href: '/customer/invoices', icon: FileText, emoji: '🧾' },
  { name: 'Profile', href: '/customer/profile', icon: User, emoji: '👤' },
];

/* ── Page titles ── */
const PAGE_META = {
  '/customer/dashboard': { title: 'Dashboard', crumb: 'Dashboard' },
  '/customer/services': { title: 'Browse Services', crumb: 'Services' },
  '/customer/map': { title: 'Map View', crumb: 'Map' },
  '/customer/bookings': { title: 'My Bookings', crumb: 'Bookings' },
  '/customer/recurring': { title: 'Recurring Bookings', crumb: 'Recurring' },
  '/customer/saved-providers': { title: 'Saved Providers', crumb: 'Saved' },
  '/customer/invoices': { title: 'My Invoices', crumb: 'Invoices' },
  '/customer/disputes': { title: 'My Disputes', crumb: 'Disputes' },
  '/customer/reviews': { title: 'My Reviews', crumb: 'Reviews' },
  '/customer/reviews/new': { title: 'Write Review', crumb: 'Write Review' },
  '/customer/referrals': { title: 'Referrals', crumb: 'Referrals' },
  '/customer/profile': { title: 'Profile', crumb: 'Profile' },
};

const CustomerLayout = ({ children }) => {
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
      if (u.role !== 'customer') { navigate('/login'); return; }
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
        className={`csl-nav-item ${active ? 'csl-nav-active' : ''}`}>
        <span className="csl-nav-indicator" />
        <Icon style={{ width: 18, height: 18 }} className="csl-nav-icon" />
        <span className="csl-nav-label">{item.name}</span>
        {active && <ChevronRight style={{ width: 14, height: 14 }} className="csl-nav-chevron" />}
      </button>
    );
  };

  return (
    <div className="csl-app">
      {/* Mobile overlay */}
      {mobileOpen && <div className="csl-overlay" onClick={() => setMobileOpen(false)} />}

      {/* ═══ SIDEBAR ═══ */}
      <aside className={`csl-sidebar ${mobileOpen ? 'csl-sidebar-open' : ''}`}>
        {/* Brand */}
        <div className="csl-brand">
          <div className="csl-brand-row">
            <div className="csl-logo-mark"><span>H</span></div>
            <div className="csl-brand-text">
              <span className="csl-brand-name">HouseWise</span>
              <span className="csl-brand-role">Customer</span>
            </div>
            <button className="csl-mobile-close" onClick={() => setMobileOpen(false)}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
          <div className="csl-brand-sep" />
        </div>

        {/* Navigation */}
        <nav className="csl-nav">
          <div className="csl-nav-group">
            {NAV_MAIN.map(item => <NavItem key={item.href} item={item} />)}
          </div>
          <div className="csl-nav-divider" />
          <div className="csl-nav-group">
            <span className="csl-nav-section-label">MY ACTIVITY</span>
            {NAV_ACTIVITY.map(item => <NavItem key={item.href} item={item} />)}
          </div>
        </nav>

        {/* User panel */}
        <div className="csl-user-panel">
          <div className="csl-user-sep" />
          <div className="csl-user-card">
            <div className="csl-user-avatar"><span>{initials}</span></div>
            <div className="csl-user-info">
              <span className="csl-user-name">{userData.name}</span>
              <span className="csl-user-role">Customer</span>
            </div>
            <ChevronRight style={{ width: 14, height: 14 }} className="csl-user-chevron" />
          </div>
          <button className="csl-signout" onClick={handleLogout}>
            <LogOut style={{ width: 16, height: 16 }} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ═══ MAIN CONTENT PANEL ═══ */}
      <div className="csl-main">
        {/* Topbar */}
        <header className="csl-topbar">
          <div className="csl-topbar-left">
            <button className="csl-hamburger" onClick={() => setMobileOpen(true)}>
              <Menu style={{ width: 18, height: 18 }} />
            </button>
            <div className="csl-breadcrumb">
              <span className="csl-crumb-base">HouseWise</span>
              <span className="csl-crumb-sep">/</span>
              <span className="csl-crumb-current">{meta.crumb}</span>
            </div>
          </div>
          <div className="csl-topbar-right">
            <ThemeToggleBtn />
            <NotificationDropdown />
            <button className="csl-topbar-avatar" onClick={() => navTo('/customer/profile')}>
              <span>{initials}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="csl-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default CustomerLayout;

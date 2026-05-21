import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useSpring, useMotionValueEvent } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import ThemeLanguageToggle from '../shared/ThemeLanguageToggle';
import {
  Menu, X, User, LogOut, Settings, Home, Search,
  Calendar, Star, Shield, ChevronDown, Gift, FileText,
} from 'lucide-react';

/* ── Active section observer ── */
const useActiveSection = (sectionIds) => {
  const [active, setActive] = useState('');
  useEffect(() => {
    if (!sectionIds.length) return;
    const visible = new Map();
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) visible.set(e.target.id, e.intersectionRatio);
          else visible.delete(e.target.id);
        });
        if (visible.size === 0) {
          setActive('');
        } else {
          let bestId = '';
          let bestRatio = 0;
          visible.forEach((ratio, id) => {
            if (ratio > bestRatio) { bestRatio = ratio; bestId = id; }
          });
          setActive(bestId);
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] },
    );
    sectionIds.forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [sectionIds]);
  return active;
};

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const lastY = useRef(0);

  const { scrollYProgress, scrollY } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  useMotionValueEvent(scrollY, 'change', (y) => {
    setScrolled(y > 80);
    lastY.current = y;
  });

  const isHome = location.pathname === '/';
  const sectionIds = isHome && !isAuthenticated ? ['services', 'how-it-works', 'about-us', 'contact'] : [];
  const activeSection = useActiveSection(sectionIds);

  useEffect(() => {
    const h = (e) => { if (profileOpen && !e.target.closest('[data-profile-menu]')) setProfileOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [profileOpen]);

  const handleLogout = async () => { await logout(); navigate('/'); setProfileOpen(false); };
  const isActivePath = (p) => location.pathname === p;

  const publicNavItems = [
    { label: 'Services', href: '/#services', sectionId: 'services' },
    { label: 'How It Works', href: '/#how-it-works', sectionId: 'how-it-works' },
    { label: 'About', href: '/#about-us', sectionId: 'about-us' },
    { label: 'Contact', href: '/#contact', sectionId: 'contact' },
  ];

  const getAuthenticatedLinks = () => {
    if (user?.role === 'customer') return [
      { path: '/customer/dashboard', label: 'Dashboard', icon: Home },
      { path: '/customer/services', label: 'Browse Services', icon: Search },
      { path: '/customer/bookings', label: 'My Bookings', icon: Calendar },
      { path: '/customer/reviews', label: 'My Reviews', icon: Star },
      { path: '/customer/referrals', label: 'Referrals', icon: Gift },
    ];
    if (user?.role === 'housewife' || user?.role === 'provider') return [
      { path: '/provider/dashboard', label: 'Dashboard', icon: Home },
      { path: '/provider/services', label: 'My Services', icon: Search },
      { path: '/provider/bookings', label: 'Bookings', icon: Calendar },
    ];
    if (user?.role === 'admin') return [
      { path: '/admin/dashboard', label: 'Admin Dashboard', icon: Shield },
      { path: '/admin/customers', label: 'Customers', icon: User },
      { path: '/admin/providers', label: 'Providers', icon: Star },
    ];
    return [
      { path: '/dashboard', label: 'Dashboard', icon: Home },
      { path: '/bookings', label: 'Bookings', icon: Calendar },
    ];
  };
  const authenticatedLinks = getAuthenticatedLinks();

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      if (window.__lenis) window.__lenis.scrollTo(el, { offset: -80, duration: 1.2 });
      else window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const d = document.getElementById(sectionId);
        if (d) {
          if (window.__lenis) window.__lenis.scrollTo(d, { offset: -80, duration: 1.2 });
          else window.scrollTo({ top: d.offsetTop - 80, behavior: 'smooth' });
        }
      }, 200);
    }
  };

  const handleNav = (href, e) => {
    e.preventDefault();
    if (href.startsWith('/#')) {
      const id = href.substring(2);
      if (location.pathname !== '/') navigate('/', { state: { scrollTo: id } });
      else scrollToSection(id);
    } else navigate(href);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (location.pathname === '/' && location.state?.scrollTo) {
      const t = setTimeout(() => {
        scrollToSection(location.state.scrollTo);
        navigate('/', { replace: true, state: {} });
      }, 100);
      return () => clearTimeout(t);
    }
  }, [location, navigate]);

  return (
    <>
      {isHome && <motion.div className="scroll-progress-bar" style={{ scaleX }} />}

      <motion.header
        initial={{ y: 0 }}
        animate={{ y: hidden ? -100 : 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'backdrop-blur-xl bg-brand-dark/60 border-b border-white/[0.06] shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-5 sm:px-6 flex items-center justify-between h-[72px]">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-pink to-brand-purple flex items-center justify-center shadow-lg shadow-brand-pink/20 group-hover:shadow-brand-pink/40 transition-shadow"
            >
              <span className="text-white font-extrabold text-sm leading-none">H</span>
            </motion.div>
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="text-content-primary font-display font-bold text-lg tracking-tight"
            >
              HouseWise
            </motion.span>
          </Link>

          {/* Center nav */}
          <nav className="hidden lg:flex items-center">
            <div className={`flex items-center gap-1 px-1.5 py-1.5 rounded-full transition-all duration-300 ${
              scrolled ? 'bg-white/[0.04] border border-white/[0.06]' : ''
            }`}>
              {!isAuthenticated && publicNavItems.map((item, i) => {
                const isActive = activeSection === item.sectionId;
                return (
                  <motion.button
                    key={item.href}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.15 + i * 0.05 }}
                    onClick={(e) => handleNav(item.href, e)}
                    className="relative group px-4 py-2 text-[13px] font-medium rounded-full transition-all duration-300"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        className="absolute inset-0 rounded-full bg-gradient-to-r from-brand-pink/15 to-brand-purple/15 border border-brand-pink/20"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-200'}`}>
                      {item.label}
                    </span>
                    {/* Underline hover */}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-6 bg-gradient-to-r from-brand-pink to-brand-purple rounded-full transition-all duration-300" />
                  </motion.button>
                );
              })}
              {isAuthenticated && authenticatedLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-full transition-all ${
                      isActivePath(link.path) ? 'text-white bg-white/[0.08]' : 'text-gray-500 hover:text-gray-200'
                    }`}
                  >
                    <Icon size={14} />{link.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            <ThemeLanguageToggle className="hidden sm:flex" />
            {!isAuthenticated ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="hidden lg:flex items-center gap-3"
              >
                <Link to="/login"
                  className="px-5 py-2 text-[13px] font-medium text-gray-400 hover:text-white rounded-full border border-white/[0.08] hover:border-white/[0.15] transition-all"
                >Log in</Link>
                <Link to="/register"
                  className="px-5 py-2 text-[13px] font-semibold text-white bg-gradient-to-r from-brand-pink to-brand-purple rounded-full hover:shadow-lg hover:shadow-brand-pink/25 transition-all hover:scale-[1.02]"
                >Sign up</Link>
              </motion.div>
            ) : (
              <div className="relative" data-profile-menu>
                <button onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-pink to-brand-purple flex items-center justify-center text-white text-[11px] font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-[13px] text-gray-300 font-medium hidden sm:inline">{user?.name?.split(' ')[0]}</span>
                  <ChevronDown size={12} className={`text-gray-500 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-brand-card/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden z-50"
                    >
                      <div className="px-4 py-3 border-b border-white/[0.04]">
                        <p className="text-[13px] font-medium text-white truncate">{user?.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to={`/${user?.role === 'admin' ? 'admin' : user?.role === 'housewife' || user?.role === 'provider' ? 'provider' : 'customer'}/dashboard`}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-300 rounded-xl hover:bg-white/[0.05] transition-colors"
                        ><Home size={14} /> Dashboard</Link>
                        <Link to="/profile" onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-gray-300 rounded-xl hover:bg-white/[0.05] transition-colors"
                        ><Settings size={14} /> Settings</Link>
                      </div>
                      <div className="p-1.5 border-t border-white/[0.04]">
                        <button onClick={handleLogout}
                          className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[13px] text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                        ><LogOut size={14} /> Sign Out</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>

        {/* Mobile full-screen menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
              className="lg:hidden fixed inset-0 top-[72px] bg-brand-dark/95 backdrop-blur-2xl z-40"
            >
              <div className="p-6 space-y-1">
                {/* Theme toggle for mobile */}
                <div className="flex justify-end mb-4">
                  <ThemeLanguageToggle />
                </div>
                {!isAuthenticated && publicNavItems.map((item, i) => (
                  <motion.button
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={(e) => handleNav(item.href, e)}
                    className={`block w-full text-left px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                      activeSection === item.sectionId ? 'text-white bg-white/[0.05]' : 'text-gray-400 hover:text-white'
                    }`}
                  >{item.label}</motion.button>
                ))}
                {isAuthenticated && authenticatedLinks.map((link, i) => {
                  const Icon = link.icon;
                  return (
                    <motion.div key={link.path} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                      <Link to={link.path} onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3.5 text-base font-medium rounded-xl transition-colors ${
                          isActivePath(link.path) ? 'text-white bg-white/[0.05]' : 'text-gray-400 hover:text-white'
                        }`}
                      ><Icon size={18} /> {link.label}</Link>
                    </motion.div>
                  );
                })}
                {!isAuthenticated && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="pt-6 mt-4 border-t border-white/[0.06] flex flex-col gap-3"
                  >
                    <Link to="/login" onClick={() => setMenuOpen(false)}
                      className="text-center px-4 py-3 text-base font-medium text-gray-300 rounded-xl border border-white/[0.08]"
                    >Log in</Link>
                    <Link to="/register" onClick={() => setMenuOpen(false)}
                      className="text-center px-4 py-3 text-base font-semibold text-white bg-gradient-to-r from-brand-pink to-brand-purple rounded-xl"
                    >Sign up</Link>
                  </motion.div>
                )}
                {isAuthenticated && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                    className="pt-6 mt-4 border-t border-white/[0.06]"
                  >
                    <button onClick={() => { handleLogout(); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-3.5 text-base text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                    ><LogOut size={18} /> Sign Out</button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </>
  );
};

export default Navbar;

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, UserCheck, Calendar, MessageSquare, Package, Headphones, X } from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';

const QUICK_LINKS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: Search },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Providers', href: '/admin/providers', icon: UserCheck },
  { label: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { label: 'Reviews', href: '/admin/reviews', icon: MessageSquare },
  { label: 'Services', href: '/admin/services', icon: Package },
  { label: 'Support Tickets', href: '/admin/support', icon: Headphones },
];

const AdminGlobalSearch = ({ onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        // Search across multiple entities
        const [bookingsRes, customersRes] = await Promise.allSettled([
          adminAPIService.searchBookings({ search: query, limit: 3 }),
          adminAPIService.getCustomers({ search: query, limit: 3 }),
        ]);

        const items = [];
        if (bookingsRes.status === 'fulfilled' && bookingsRes.value?.success) {
          (bookingsRes.value.data?.bookings || []).forEach(b => {
            items.push({ type: 'booking', label: `Booking: ${b.customer?.name || ''} - ${b.service?.title || ''}`, href: '/admin/bookings', id: b._id });
          });
        }
        if (customersRes.status === 'fulfilled' && customersRes.value?.success) {
          (customersRes.value.data?.customers || []).forEach(c => {
            items.push({ type: 'customer', label: `Customer: ${c.name} (${c.email})`, href: '/admin/customers', id: c._id });
          });
        }

        // Also match nav items
        const navMatches = QUICK_LINKS.filter(l => l.label.toLowerCase().includes(query.toLowerCase()));
        navMatches.forEach(n => items.push({ type: 'page', label: `Go to ${n.label}`, href: n.href }));

        setResults(items.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (item) => {
    navigate(item.href);
    onClose();
  };

  const handleKeyDown = (e) => {
    const items = results.length > 0 ? results : QUICK_LINKS.map(l => ({ ...l, href: l.href }));
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % items.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => (i - 1 + items.length) % items.length); }
    else if (e.key === 'Enter' && items[selectedIndex]) { handleSelect(items[selectedIndex]); }
    else if (e.key === 'Escape') onClose();
  };

  const displayItems = results.length > 0 ? results : (query ? [] : QUICK_LINKS.map(l => ({ type: 'page', label: l.label, href: l.href, icon: l.icon })));

  return (
    <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg mx-4 bg-surface-overlay border border-surface-border rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border">
          <Search className="w-5 h-5 text-content-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search bookings, customers, pages..."
            className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-muted outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-surface-border border-t-accent-blue-light rounded-full animate-spin" />}
          <button onClick={onClose} className="p-1 text-content-muted hover:text-content-primary"><X className="w-4 h-4" /></button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {displayItems.length === 0 && query && !loading && (
            <div className="px-4 py-8 text-center text-sm text-content-muted">No results found</div>
          )}
          {displayItems.map((item, i) => {
            const Icon = item.icon || (item.type === 'booking' ? Calendar : item.type === 'customer' ? Users : Search);
            return (
              <button
                key={`${item.type}-${item.id || item.href}-${i}`}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === selectedIndex ? 'bg-surface-hover text-content-primary' : 'text-content-secondary hover:bg-surface-hover'
                }`}
              >
                <Icon className="w-4 h-4 text-content-muted flex-shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.type && item.type !== 'page' && (
                  <span className="ml-auto text-[10px] text-content-muted px-1.5 py-0.5 rounded bg-surface-raised">{item.type}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-surface-border">
          <span className="text-[10px] text-content-muted">↑↓ Navigate</span>
          <span className="text-[10px] text-content-muted">↵ Select</span>
          <span className="text-[10px] text-content-muted">Esc Close</span>
        </div>
      </div>
    </div>
  );
};

export default AdminGlobalSearch;

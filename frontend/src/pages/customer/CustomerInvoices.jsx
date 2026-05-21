import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Download, Calendar, DollarSign, Search, Filter,
  AlertCircle, Loader2, ChevronRight, ArrowUpRight
} from 'lucide-react';
import api, { customerAPI } from '../../services/api';
import EmptyState from '../../components/shared/EmptyState';
import toast from 'react-hot-toast';

/* ─── Helpers ─── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/* Shimmer skeleton */
const Shimmer = ({ className = '' }) => <div className={`ci-shimmer ${className}`} />;
const InvoicesSkeleton = () => (
  <div className="ci-page">
    <Shimmer className="ci-skel-header" />
    <Shimmer className="ci-skel-filters" />
    {[1, 2, 3].map(i => <Shimmer key={i} className="ci-skel-card" />)}
  </div>
);

/* ═══════════════════════════════════════ */
const CustomerInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [downloading, setDownloading] = useState(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await customerAPI.getBookings({ limit: 100 });
      const bookings = res.data?.bookings || res.bookings || [];
      
      // Filter only completed/resolved bookings (eligible for invoices)
      const invoiceBookings = bookings.filter(b => 
        ['completed', 'resolved'].includes(b.status)
      );
      
      setInvoices(invoiceBookings);
    } catch (err) {
      console.error('Fetch invoices error:', err);
      setError('Failed to load invoices');
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /* ─── Filter & Sort ─── */
  const filtered = invoices
    .filter(inv => {
      const match = !searchTerm ||
        inv.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.service?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.provider?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      return match;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.scheduledDate) - new Date(a.scheduledDate);
      if (sortBy === 'oldest') return new Date(a.scheduledDate) - new Date(b.scheduledDate);
      if (sortBy === 'amount-high') return (b.pricing?.agreedAmount || 0) - (a.pricing?.agreedAmount || 0);
      if (sortBy === 'amount-low') return (a.pricing?.agreedAmount || 0) - (b.pricing?.agreedAmount || 0);
      return 0;
    });

  const handleDownloadInvoice = async (bookingId, e) => {
    e.preventDefault();
    try {
      setDownloading(bookingId);
      const response = await api.get(`/invoices/${bookingId}/download`, { 
        responseType: 'blob' 
      });
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${bookingId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error('Failed to download invoice');
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return <InvoicesSkeleton />;

  const totalAmount = invoices.reduce((sum, inv) => sum + (inv.pricing?.agreedAmount || 0), 0);

  return (
    <div className="ci-page">
      {/* ═══ HEADER ═══ */}
      <header className="ci-header ci-section">
        <div className="ci-header-left">
          <h1 className="ci-title">My Invoices</h1>
          <p className="ci-subtitle">Access and manage all your service invoices in one place</p>
        </div>
        <div className="ci-header-stat">
          <div className="ci-stat-icon">
            <DollarSign style={{ width: 20, height: 20 }} />
          </div>
          <div className="ci-stat-content">
            <span className="ci-stat-label">Total Spent</span>
            <span className="ci-stat-value">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </header>

      {/* ═══ FILTERS ═══ */}
      <div className="ci-filters ci-section">
        <div className="ci-search">
          <Search style={{ width: 18, height: 18 }} />
          <input
            type="text"
            placeholder="Search invoices by ID, service or provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="ci-search-input"
          />
        </div>
        <div className="ci-filter-group">
          <Filter style={{ width: 16, height: 16 }} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ci-filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="ci-error ci-section">
          <AlertCircle style={{ width: 16, height: 16 }} />
          <span>{error}</span>
          <button className="ci-error-retry" onClick={fetchInvoices}>Retry</button>
        </div>
      )}

      {/* ═══ INVOICES LIST ═══ */}
      {filtered.length === 0 ? (
        <EmptyState
          type="invoices"
          title={searchTerm ? 'No invoices found' : 'No invoices yet'}
          description={searchTerm ? 'Try adjusting your search' : 'Invoices appear after services are completed'}
          actionText="Browse Services"
          actionTo="/customer/services"
        />
      ) : (
        <div className="ci-list">
          {filtered.map((invoice, idx) => (
            <Link
              key={invoice._id}
              to={`/customer/invoice/${invoice._id}`}
              className="ci-card ci-section"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Left: Icon + Service Info */}
              <div className="ci-card-left">
                <div className="ci-card-icon-box">
                  <div className="ci-card-icon">
                    <FileText style={{ width: 20, height: 20 }} />
                  </div>
                </div>
                <div className="ci-card-info">
                  <div className="ci-card-service">{invoice.service?.title || 'Service'}</div>
                  <div className="ci-card-meta">
                    <div className="ci-meta-item">
                      <span className="ci-meta-label">Booking ID</span>
                      <span className="ci-meta-value ci-booking-id">{invoice.bookingId}</span>
                    </div>
                    <span className="ci-meta-separator">•</span>
                    <div className="ci-meta-item">
                      <span className="ci-meta-label">Date</span>
                      <span className="ci-meta-value">{fmt(invoice.scheduledDate)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Middle: Provider Info */}
              <div className="ci-card-middle">
                <div className="ci-provider-section">
                  {invoice.provider?.profileImage ? (
                    <img 
                      src={invoice.provider.profileImage} 
                      alt={invoice.provider.name} 
                      className="ci-provider-img"
                      onError={(e) => {
                        if (e.target.src !== 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face') {
                          e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
                        }
                      }}
                    />
                  ) : (
                    <div className="ci-provider-avatar">
                      {(invoice.provider?.name || 'P')[0].toUpperCase()}
                    </div>
                  )}
                  <div className="ci-provider-info">
                    <span className="ci-provider-name">{invoice.provider?.name || 'Provider'}</span>
                    <span className="ci-provider-cat">{invoice.service?.category}</span>
                  </div>
                </div>
              </div>

              {/* Right: Amount + Actions */}
              <div className="ci-card-right">
                <div className="ci-amount-section">
                  <span className="ci-amount-label">Invoice Amount</span>
                  <span className="ci-amount-value">₹{invoice.pricing?.agreedAmount?.toLocaleString('en-IN') || '0'}</span>
                </div>
                <div className="ci-card-actions">
                  <button
                    onClick={(e) => handleDownloadInvoice(invoice._id, e)}
                    className="ci-action-btn ci-action-download"
                    title="Download Invoice PDF"
                    disabled={downloading === invoice._id}
                  >
                    {downloading === invoice._id ? (
                      <Loader2 style={{ width: 18, height: 18 }} className="ci-spin" />
                    ) : (
                      <Download style={{ width: 18, height: 18 }} />
                    )}
                  </button>
                  <div className="ci-action-btn ci-action-view" title="View Full Invoice">
                    <ArrowUpRight style={{ width: 18, height: 18 }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerInvoices;

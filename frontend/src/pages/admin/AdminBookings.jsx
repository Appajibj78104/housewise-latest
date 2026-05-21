import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User, DollarSign, Filter, Search, Eye, RefreshCw,
  CheckCircle, XCircle, AlertCircle, ArrowUpDown,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import { toast } from 'react-hot-toast';
import AdminSkeleton from '../../components/admin/AdminSkeleton';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-400' },
  in_progress: { label: 'In Progress', color: 'bg-indigo-500/10 text-indigo-400' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-400' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400' },
  no_show: { label: 'No Show', color: 'bg-gray-500/10 text-gray-400' },
};

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingDetail, setBookingDetail] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [refundForm, setRefundForm] = useState({ show: false, bookingId: null, amount: '', reason: '' });
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const fetchBookings = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20, sortBy, sortOrder };
      if (search) params.search = search;
      if (status) params.status = status;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await adminAPIService.searchBookings(params);
      if (response.success) {
        setBookings(response.data.bookings || []);
        setPagination(response.data.pagination || { current: 1, pages: 1, total: 0 });
      }
    } catch (err) {
      console.error('Fetch bookings error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, status, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchBookings(), search ? 400 : 0);
    return () => clearTimeout(timeout);
  }, [fetchBookings]);

  const openDetail = async (booking) => {
    try {
      const response = await adminAPIService.getBookingDetail(booking._id);
      if (response.success) setBookingDetail(response.data);
    } catch (err) {
      console.error('Booking detail error:', err);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      const response = await adminAPIService.updateBookingStatus(bookingId, newStatus);
      if (response.success) {
        toast.success(`Status updated to ${newStatus}`);
        fetchBookings(pagination.current);
        setBookingDetail(null);
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleRefund = async () => {
    if (!refundForm.bookingId) return;
    try {
      const response = await adminAPIService.processRefund(refundForm.bookingId, {
        amount: parseFloat(refundForm.amount) || undefined,
        reason: refundForm.reason,
      });
      if (response.success) {
        toast.success('Refund processed');
        setRefundForm({ show: false, bookingId: null, amount: '', reason: '' });
        fetchBookings(pagination.current);
      }
    } catch (err) {
      toast.error('Refund failed');
    }
  };

  const handleBulkStatus = async () => {
    if (!selectedIds.length || !bulkStatus) return;
    try {
      const response = await adminAPIService.bulkBookingStatus({ bookingIds: selectedIds, status: bulkStatus });
      if (response.success) {
        toast.success(response.message);
        setSelectedIds([]);
        setBulkStatus('');
        fetchBookings(pagination.current);
      }
    } catch (err) {
      toast.error('Bulk update failed');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === bookings.length) setSelectedIds([]);
    else setSelectedIds(bookings.map(b => b._id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">Booking Management</h1>
          <p className="text-body text-content-muted mt-1">Search, filter, and manage all bookings</p>
        </div>
        <span className="text-sm text-content-muted">{pagination.total} bookings</span>
      </div>

      {/* Search & Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
            <input type="text" placeholder="Search customer, provider, service or booking ID..." value={search} onChange={e => setSearch(e.target.value)} className="form-input pl-9 w-full" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} className="form-input">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2"><label className="text-xs text-content-muted">From:</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input text-sm" /></div>
          <div className="flex items-center gap-2"><label className="text-xs text-content-muted">To:</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input text-sm" /></div>
          <button onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); }} className="text-xs text-content-muted hover:text-content-primary">Clear</button>
        </div>
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-accent-blue-muted/30 rounded-lg">
            <span className="text-sm text-content-primary font-medium">{selectedIds.length} selected</span>
            <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)} className="form-input text-sm">
              <option value="">Bulk action...</option>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => <option key={key} value={key}>Set {val.label}</option>)}
            </select>
            <button onClick={() => setBulkConfirm(true)} disabled={!bulkStatus} className="btn btn-primary btn-sm">Apply</button>
            <button onClick={() => setSelectedIds([])} className="text-xs text-content-muted">Deselect</button>
          </div>
        )}
      </div>

      {/* Bookings Table */}
      {loading ? (
        <AdminSkeleton type="table" rows={8} cols={7} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="px-3 py-3 text-left"><input type="checkbox" checked={selectedIds.length === bookings.length && bookings.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" /></th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">Customer</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">Provider</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">Service</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase cursor-pointer" onClick={() => { setSortBy('scheduledDate'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}><span className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></span></th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">Amount</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-content-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b._id} className="border-b border-surface-border/50 hover:bg-surface-hover/50">
                    <td className="px-3 py-3"><input type="checkbox" checked={selectedIds.includes(b._id)} onChange={() => toggleSelect(b._id)} className="w-4 h-4 rounded" /></td>
                    <td className="px-3 py-3 text-xs text-content-muted font-mono">{b.bookingId || b._id?.slice(-6)}</td>
                    <td className="px-3 py-3 text-sm text-content-primary">{b.customer?.name || 'N/A'}</td>
                    <td className="px-3 py-3 text-sm text-content-secondary">{b.provider?.name || 'N/A'}</td>
                    <td className="px-3 py-3 text-sm text-content-secondary">{b.service?.title || 'N/A'}</td>
                    <td className="px-3 py-3 text-xs text-content-muted">{b.scheduledDate ? new Date(b.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '-'}</td>
                    <td className="px-3 py-3 text-sm text-content-primary">â‚¹{b.pricing?.agreedAmount || 0}</td>
                    <td className="px-3 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[b.status]?.color || ''}`}>{STATUS_CONFIG[b.status]?.label || b.status}</span></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetail(b)} className="p-1.5 rounded hover:bg-surface-hover text-content-muted" title="View"><Eye className="w-4 h-4" /></button>
                        {b.status === 'completed' && (
                          <button onClick={() => setRefundForm({ show: true, bookingId: b._id, amount: b.pricing?.agreedAmount || '', reason: '' })} className="p-1.5 rounded hover:bg-surface-hover text-orange-400" title="Refund"><DollarSign className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {bookings.length === 0 && <div className="text-center py-12"><Calendar className="w-10 h-10 text-content-muted mx-auto mb-3" /><p className="text-content-muted">No bookings found</p></div>}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
              <span className="text-xs text-content-muted">Page {pagination.current}/{pagination.pages} ({pagination.total} total)</span>
              <div className="flex gap-2">
                <button onClick={() => fetchBookings(pagination.current - 1)} disabled={pagination.current <= 1} className="btn btn-secondary btn-sm">Prev</button>
                <button onClick={() => fetchBookings(pagination.current + 1)} disabled={pagination.current >= pagination.pages} className="btn btn-secondary btn-sm">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Booking Detail Modal */}
      {bookingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBookingDetail(null)}>
          <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading text-content-primary mb-4">Booking Detail <span className="text-xs text-content-muted ml-2 font-mono">{bookingDetail.booking?.bookingId}</span></h3>
            <div className="mb-6">
              <h4 className="text-sm font-medium text-content-primary mb-3">Status Timeline</h4>
              <div className="space-y-2">
                {bookingDetail.timeline?.map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${event.status === 'completed' ? 'bg-green-400' : event.status === 'cancelled' ? 'bg-red-400' : event.status === 'pending' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                    <div>
                      <p className="text-sm text-content-primary">{event.event}</p>
                      <p className="text-xs text-content-muted">{new Date(event.date).toLocaleString('en-IN')}</p>
                      {event.reason && <p className="text-xs text-red-400 mt-0.5">Reason: {event.reason}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div><p className="text-xs text-content-muted">Customer</p><p className="text-content-primary">{bookingDetail.booking?.customer?.name}</p></div>
              <div><p className="text-xs text-content-muted">Provider</p><p className="text-content-primary">{bookingDetail.booking?.provider?.name}</p></div>
              <div><p className="text-xs text-content-muted">Service</p><p className="text-content-primary">{bookingDetail.booking?.service?.title}</p></div>
              <div><p className="text-xs text-content-muted">Amount</p><p className="text-content-primary">â‚¹{bookingDetail.booking?.pricing?.agreedAmount || 0}</p></div>
              <div><p className="text-xs text-content-muted">Scheduled</p><p className="text-content-primary">{bookingDetail.booking?.scheduledDate ? new Date(bookingDetail.booking.scheduledDate).toLocaleDateString('en-IN') : '-'}</p></div>
              <div><p className="text-xs text-content-muted">Status</p><span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CONFIG[bookingDetail.booking?.status]?.color || ''}`}>{STATUS_CONFIG[bookingDetail.booking?.status]?.label}</span></div>
            </div>
            {bookingDetail.review && (
              <div className="mb-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <p className="text-xs text-content-muted mb-1">Review</p>
                <div className="flex gap-0.5 mb-1">{[...Array(5)].map((_, i) => <span key={i} className={`text-sm ${i < (bookingDetail.review.rating?.overall || 0) ? 'text-yellow-400' : 'text-surface-border'}`}>â˜…</span>)}</div>
                <p className="text-sm text-content-secondary">{bookingDetail.review.comment}</p>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-4 border-t border-surface-border">
              <span className="text-xs text-content-muted self-center mr-2">Update:</span>
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <button key={key} onClick={() => handleStatusUpdate(bookingDetail.booking?._id, key)} disabled={bookingDetail.booking?.status === key} className={`text-xs px-2.5 py-1 rounded-lg ${bookingDetail.booking?.status === key ? 'opacity-50 bg-surface-hover' : 'hover:bg-surface-hover text-content-muted hover:text-content-primary'}`}>{val.label}</button>
              ))}
            </div>
            <button onClick={() => setBookingDetail(null)} className="btn btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundForm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-heading text-content-primary mb-4">Process Refund</h3>
            <div className="space-y-3">
              <div><label className="text-xs text-content-muted mb-1 block">Amount (â‚¹)</label><input type="number" value={refundForm.amount} onChange={e => setRefundForm({...refundForm, amount: e.target.value})} className="form-input w-full" placeholder="Leave empty for full" /></div>
              <div><label className="text-xs text-content-muted mb-1 block">Reason</label><textarea value={refundForm.reason} onChange={e => setRefundForm({...refundForm, reason: e.target.value})} className="form-input w-full resize-y min-h-[80px]" placeholder="Reason..." /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleRefund} className="btn btn-primary flex-1">Process</button>
              <button onClick={() => setRefundForm({ show: false, bookingId: null, amount: '', reason: '' })} className="btn btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Confirmation */}
      <ConfirmDialog
        open={bulkConfirm}
        title="Bulk Status Update"
        message={`Update ${selectedIds.length} booking(s) to "${bulkStatus}"? This action affects multiple records.`}
        confirmLabel="Update All"
        variant="warning"
        onConfirm={() => { setBulkConfirm(false); handleBulkStatus(); }}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  );
};

export default AdminBookings;

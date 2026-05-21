import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Filter, Star, Eye, EyeOff, Award,
  CheckCircle, XCircle, ToggleLeft, ToggleRight,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';

const AdminServices = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [featured, setFeatured] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pages: 1, total: 0 });
  const [selectedService, setSelectedService] = useState(null);

  const categories = ['cooking', 'tailoring', 'tuition', 'beauty', 'cleaning', 'childcare', 'eldercare', 'handicrafts', 'catering', 'other'];

  const fetchServices = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (category) params.category = category;
      if (status) params.status = status;
      if (featured) params.featured = featured;

      const response = await adminAPIService.getServices(params);
      if (response.success) {
        setServices(response.data.services);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Fetch services error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, category, status, featured]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleToggle = async (serviceId, field) => {
    try {
      await adminAPIService.toggleService(serviceId, field);
      fetchServices(pagination.current);
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const getStatusBadge = (service) => {
    if (!service.isApproved) return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Pending</span>;
    if (!service.isActive) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Suspended</span>;
    return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">Active</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">Services Management</h1>
          <p className="text-body text-content-muted mt-1">View, approve, suspend, and feature services</p>
        </div>
        <span className="text-sm text-content-muted">{pagination.total} services total</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-muted" />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="form-input">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="form-input">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Suspended</option>
          <option value="pending">Pending Approval</option>
        </select>
        <select value={featured} onChange={e => setFeatured(e.target.value)} className="form-input">
          <option value="">All</option>
          <option value="true">Featured Only</option>
        </select>
      </div>

      {/* Services Table */}
      {loading ? (
        <AdminSkeleton type="table" rows={6} cols={5} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Service</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Provider</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Rating</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-content-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service._id} className="border-b border-surface-border/50 hover:bg-surface-hover/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {service.featured && <Award className="w-4 h-4 text-yellow-400" />}
                        <div>
                          <p className="text-sm font-medium text-content-primary">{service.title}</p>
                          <p className="text-xs text-content-muted">{service.totalBookings || 0} bookings</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-content-secondary">{service.provider?.name || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-content-secondary capitalize">{service.category}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-content-secondary">
                      ₹{service.pricing?.amount || 0}
                      <span className="text-xs text-content-muted ml-1">/{service.pricing?.type || 'fixed'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current" />
                        <span className="text-sm text-content-secondary">{service.rating?.average?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-content-muted">({service.rating?.count || 0})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(service)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggle(service._id, 'isActive')}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                          title={service.isActive ? 'Suspend' : 'Activate'}
                        >
                          {service.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleToggle(service._id, 'isApproved')}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                          title={service.isApproved ? 'Revoke Approval' : 'Approve'}
                        >
                          {service.isApproved ? <CheckCircle className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-yellow-400" />}
                        </button>
                        <button
                          onClick={() => handleToggle(service._id, 'featured')}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                          title={service.featured ? 'Remove Featured' : 'Set Featured'}
                        >
                          <Award className={`w-4 h-4 ${service.featured ? 'text-yellow-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => setSelectedService(service)}
                          className="p-1.5 rounded-lg hover:bg-surface-hover text-content-muted hover:text-content-primary transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {services.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted">No services found</p>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
              <span className="text-xs text-content-muted">Page {pagination.current} of {pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchServices(pagination.current - 1)}
                  disabled={pagination.current <= 1}
                  className="btn btn-secondary btn-sm"
                >Previous</button>
                <button
                  onClick={() => fetchServices(pagination.current + 1)}
                  disabled={pagination.current >= pagination.pages}
                  className="btn btn-secondary btn-sm"
                >Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Service Detail Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedService(null)}>
          <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-heading text-content-primary mb-4">{selectedService.title}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-content-muted">Category:</span><span className="text-content-primary capitalize">{selectedService.category}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">Provider:</span><span className="text-content-primary">{selectedService.provider?.name}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">Price:</span><span className="text-content-primary">₹{selectedService.pricing?.amount} ({selectedService.pricing?.type})</span></div>
              <div className="flex justify-between"><span className="text-content-muted">Duration:</span><span className="text-content-primary">{selectedService.duration?.estimated} {selectedService.duration?.unit}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">Bookings:</span><span className="text-content-primary">{selectedService.totalBookings}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">Views:</span><span className="text-content-primary">{selectedService.views}</span></div>
              <div className="flex justify-between"><span className="text-content-muted">Rating:</span><span className="text-content-primary">{selectedService.rating?.average?.toFixed(1)} ({selectedService.rating?.count} reviews)</span></div>
              <div><span className="text-content-muted">Description:</span><p className="text-content-secondary mt-1">{selectedService.description}</p></div>
              {selectedService.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedService.tags.map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-content-muted">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setSelectedService(null)} className="btn btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServices;

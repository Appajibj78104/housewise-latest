import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UserCheck, 
  Clock, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle,
  UserX,
  Star,
  MapPin,
  ExternalLink
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import { toast } from 'react-hot-toast';
import AdminSkeleton from '../../components/admin/AdminSkeleton';
// AdminLayout wrapper removed - handled in App.jsx

const AdminProviders = () => {
  const navigate = useNavigate();
  const [pendingProviders, setPendingProviders] = useState([]);
  const [approvedProviders, setApprovedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    page: 1,
    limit: 20
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  useEffect(() => {
    fetchProviders();
  }, [activeTab, filters]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      let response;
      
      if (activeTab === 'pending') {
        response = await adminAPIService.getPendingProviders(filters);
        if (response.success) {
          setPendingProviders(response.data.providers);
          setPagination(response.data.pagination);
        }
      } else {
        response = await adminAPIService.getApprovedProviders(filters);
        if (response.success) {
          setApprovedProviders(response.data.providers);
          setPagination(response.data.pagination);
        }
      }
      
      if (!response.success) {
        setError('Failed to fetch providers');
      }
    } catch (err) {
      setError('Failed to fetch providers');
      console.error('Fetch providers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleApproveProvider = async (providerId) => {
    try {
      const response = await adminAPIService.approveProvider(providerId);
      if (response.success) {
        // Remove from pending list
        setPendingProviders(prev => prev.filter(p => p._id !== providerId));
        // Refresh data
        fetchProviders();
      }
    } catch (err) {
      console.error('Approve provider error:', err);
      setError('Failed to approve provider');
    }
  };

  const handleRejectProvider = async (providerId) => {
    try {
      const response = await adminAPIService.rejectProvider(providerId);
      if (response.success) {
        // Remove from pending list
        setPendingProviders(prev => prev.filter(p => p._id !== providerId));
        // Refresh data
        fetchProviders();
      }
    } catch (err) {
      console.error('Reject provider error:', err);
      setError('Failed to reject provider');
    }
  };

  const handleToggleStatus = async (providerId) => {
    try {
      const response = await adminAPIService.toggleProviderStatus(providerId);
      if (response.success) {
        // Update the provider in the list
        setApprovedProviders(prev => prev.map(provider => 
          provider._id === providerId 
            ? { ...provider, isActive: !provider.isActive }
            : provider
        ));
        
        // Update selected provider if it's the same one
        if (selectedProvider && selectedProvider._id === providerId) {
          setSelectedProvider(prev => ({ ...prev, isActive: !prev.isActive }));
        }
      }
    } catch (err) {
      console.error('Toggle provider status error:', err);
      setError('Failed to update provider status');
    }
  };

  const handleViewProfile = (provider) => {
    setSelectedProvider(provider);
    setShowModal(true);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const list = activeTab === 'pending' ? pendingProviders : approvedProviders;
    if (selectedIds.length === list.length) setSelectedIds([]);
    else setSelectedIds(list.map(p => p._id));
  };

  const handleBulkAction = async () => {
    if (!selectedIds.length || !bulkAction) return;
    try {
      const response = await adminAPIService.bulkProviderAction({ providerIds: selectedIds, action: bulkAction });
      if (response.success) {
        toast.success(response.message || `Bulk ${bulkAction} completed`);
        setSelectedIds([]);
        setBulkAction('');
        fetchProviders();
      }
    } catch (err) {
      toast.error('Bulk action failed');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const currentProviders = activeTab === 'pending' ? pendingProviders : approvedProviders;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-content-primary">Service Provider Management</h1>
            <p className="text-body text-content-muted mt-1">Approve new providers and manage existing ones</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge-warning"><Clock className="w-3 h-3 mr-1 inline" />{pendingProviders.length} pending</span>
            <span className="badge-success"><UserCheck className="w-3 h-3 mr-1 inline" />{approvedProviders.length} approved</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="card p-0 overflow-hidden">
          <div className="flex border-b border-surface-border">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-6 py-3 text-detail font-medium transition-colors ${
                activeTab === 'pending'
                  ? 'text-warning-text border-b-2 border-warning-text'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Pending Approvals ({pendingProviders.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-6 py-3 text-detail font-medium transition-colors ${
                activeTab === 'approved'
                  ? 'text-success-text border-b-2 border-success-text'
                  : 'text-content-muted hover:text-content-primary'
              }`}
            >
              Approved Providers ({approvedProviders.length})
            </button>
          </div>

          {/* Filters */}
          <div className="p-5">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" />
                  <input
                    type="text"
                    placeholder="Search providers by name or email..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="input pl-10"
                  />
                </div>
              </div>
              {activeTab === 'approved' && (
                <div className="min-w-[150px]">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="select"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedIds.length > 0 && (
            <div className="px-5 pb-4 flex items-center gap-3">
              <span className="text-sm text-content-primary font-medium">{selectedIds.length} selected</span>
              <select value={bulkAction} onChange={e => setBulkAction(e.target.value)} className="select text-sm">
                <option value="">Bulk action...</option>
                <option value="approve">Approve</option>
                <option value="reject">Reject</option>
                <option value="activate">Activate</option>
                <option value="deactivate">Deactivate</option>
              </select>
              <button onClick={handleBulkAction} disabled={!bulkAction} className="btn btn-primary btn-sm">Apply</button>
              <button onClick={() => setSelectedIds([])} className="text-xs text-content-muted">Deselect</button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="card p-4 border-danger">
            <span className="text-danger-text text-detail">{error}</span>
          </div>
        )}

        {/* Providers Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <AdminSkeleton type="table" rows={6} cols={6} />
          ) : currentProviders.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted text-detail">
                {activeTab === 'pending' ? 'No pending providers' : 'No approved providers found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-3 py-3 text-left"><input type="checkbox" checked={selectedIds.length === currentProviders.length && currentProviders.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" /></th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Provider</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Contact & Location</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Experience</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Joined Date</th>
                    {activeTab === 'approved' && (
                      <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Status</th>
                    )}
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {currentProviders.map((provider) => (
                    <tr key={provider._id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-3 py-4"><input type="checkbox" checked={selectedIds.includes(provider._id)} onChange={() => toggleSelect(provider._id)} className="w-4 h-4 rounded" /></td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-detail font-medium text-content-primary">{provider.name}</p>
                        <p className="text-caption text-content-muted">{provider.email}</p>
                        {provider.rating?.average && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3.5 h-3.5 text-coral-400 fill-current" />
                            <span className="text-caption text-coral-400">{provider.rating.average.toFixed(1)}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-detail text-content-secondary">{provider.phone || 'Not provided'}</p>
                        {provider.address?.city && (
                          <div className="flex items-center gap-1 text-caption text-content-muted">
                            <MapPin className="w-3 h-3" />
                            <span>{provider.address.city}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-detail text-content-secondary">
                        {provider.experience || 'Not specified'}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-detail text-content-secondary">
                        {formatDate(provider.createdAt)}
                      </td>
                      {activeTab === 'approved' && (
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={provider.isActive ? 'badge-success' : 'badge-danger'}>
                            {provider.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/admin/providers/${provider._id}`)}
                            className="p-2 text-content-muted hover:text-accent-blue-light hover:bg-surface-hover rounded-lg transition-colors"
                            title="View Detail Page"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleViewProfile(provider)}
                            className="p-2 text-content-muted hover:text-accent-blue-light hover:bg-surface-hover rounded-lg transition-colors"
                            title="Quick View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {activeTab === 'pending' ? (
                            <>
                              <button
                                onClick={() => handleApproveProvider(provider._id)}
                                className="p-2 text-success-text hover:bg-success-muted rounded-lg transition-colors"
                                title="Approve Provider"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRejectProvider(provider._id)}
                                className="p-2 text-danger-text hover:bg-danger-muted rounded-lg transition-colors"
                                title="Reject Provider"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleToggleStatus(provider._id)}
                              className={`p-2 rounded-lg transition-colors ${
                                provider.isActive
                                  ? 'text-danger-text hover:bg-danger-muted'
                                  : 'text-success-text hover:bg-success-muted'
                              }`}
                              title={provider.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {provider.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-caption text-content-muted">
              Showing {((pagination.current - 1) * filters.limit) + 1} to {Math.min(pagination.current * filters.limit, pagination.total)} of {pagination.total} providers
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleFilterChange('page', pagination.current - 1)} disabled={pagination.current === 1} className="btn btn-secondary btn-sm">Previous</button>
              <span className="text-caption text-content-muted">Page {pagination.current} of {pagination.pages}</span>
              <button onClick={() => handleFilterChange('page', pagination.current + 1)} disabled={pagination.current === pagination.pages} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}

        {/* Provider Profile Modal */}
        {showModal && selectedProvider && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative card max-w-4xl w-full p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title text-content-primary">Provider Profile</h2>
                <button onClick={() => setShowModal(false)} className="text-content-muted hover:text-content-primary transition-colors">×</button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-heading text-content-primary mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Name</label>
                      <p className="text-detail text-content-primary">{selectedProvider.name}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Email</label>
                      <p className="text-detail text-content-primary">{selectedProvider.email}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Phone</label>
                      <p className="text-detail text-content-primary">{selectedProvider.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Experience</label>
                      <p className="text-detail text-content-primary">{selectedProvider.experience || 'Not specified'}</p>
                    </div>
                  </div>
                </div>

                {selectedProvider.bio && (
                  <div>
                    <h3 className="text-heading text-content-primary mb-3">Bio</h3>
                    <div className="bg-surface-raised rounded-xl p-4">
                      <p className="text-detail text-content-secondary">{selectedProvider.bio}</p>
                    </div>
                  </div>
                )}

                {selectedProvider.address && (
                  <div>
                    <h3 className="text-heading text-content-primary mb-3">Address</h3>
                    <div className="bg-surface-raised rounded-xl p-4">
                      <p className="text-detail text-content-secondary">
                        {selectedProvider.address.street && `${selectedProvider.address.street}, `}
                        {selectedProvider.address.city && `${selectedProvider.address.city}, `}
                        {selectedProvider.address.state && `${selectedProvider.address.state} `}
                        {selectedProvider.address.pincode && selectedProvider.address.pincode}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-heading text-content-primary mb-3">Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Joined Date</label>
                      <p className="text-detail text-content-primary">{formatDate(selectedProvider.createdAt)}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Status</label>
                      <span className={selectedProvider.isActive ? 'badge-success' : 'badge-danger'}>
                        {selectedProvider.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {selectedProvider.rating?.average && (
                      <div>
                        <label className="block text-caption font-medium text-content-muted mb-1">Rating</label>
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-coral-400 fill-current" />
                          <span className="text-coral-400">{selectedProvider.rating.average.toFixed(1)}</span>
                          <span className="text-caption text-content-muted">({selectedProvider.rating.count} reviews)</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                  {activeTab === 'pending' ? (
                    <>
                      <button onClick={() => { handleApproveProvider(selectedProvider._id); setShowModal(false); }} className="btn btn-success btn-sm">Approve Provider</button>
                      <button onClick={() => { handleRejectProvider(selectedProvider._id); setShowModal(false); }} className="btn btn-danger btn-sm">Reject Provider</button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleToggleStatus(selectedProvider._id)}
                      className={`btn btn-sm ${selectedProvider.isActive ? 'btn-danger' : 'btn-success'}`}
                    >
                      {selectedProvider.isActive ? 'Deactivate Provider' : 'Activate Provider'}
                    </button>
                  )}
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Close</button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    );
};

export default AdminProviders;

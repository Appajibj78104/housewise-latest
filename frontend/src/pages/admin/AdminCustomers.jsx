import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  UserX, 
  UserCheck,
  Calendar,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';
import AdminErrorBoundary from '../../components/admin/AdminErrorBoundary';
// AdminLayout wrapper removed - handled in App.jsx

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
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
    fetchCustomers();
  }, [filters]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await adminAPIService.getCustomers(filters);
      if (response.success) {
        setCustomers(response.data.customers);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch customers');
      }
    } catch (err) {
      setError('Failed to fetch customers');
      console.error('Fetch customers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handleToggleStatus = async (customerId) => {
    try {
      const response = await adminAPIService.toggleCustomerStatus(customerId);
      if (response.success) {
        // Update the customer in the list
        setCustomers(prev => prev.map(customer => 
          customer._id === customerId 
            ? { ...customer, isActive: !customer.isActive }
            : customer
        ));
        
        // Update selected customer if it's the same one
        if (selectedCustomer && selectedCustomer._id === customerId) {
          setSelectedCustomer(prev => ({ ...prev, isActive: !prev.isActive }));
        }
      }
    } catch (err) {
      console.error('Toggle customer status error:', err);
      setError('Failed to update customer status');
    }
  };

  const handleViewProfile = (customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-content-primary">Customer Management</h1>
            <p className="text-body text-content-muted mt-1">Manage and monitor customer accounts</p>
          </div>
          <span className="badge-neutral">
            <Users className="w-3.5 h-3.5 mr-1 inline" />
            {pagination.total} customers
          </span>
        </div>

        {/* Filters */}
        <div className="card p-5">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" />
                <input
                  type="text"
                  placeholder="Search customers by name or email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
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
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="card p-4 border-danger">
            <span className="text-danger-text text-detail">{error}</span>
          </div>
        )}

        {/* Customers Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <AdminSkeleton type="table" rows={6} cols={5} />
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted text-detail">No customers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Contact</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Joined Date</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-detail font-medium text-content-primary">{customer.name}</p>
                        <p className="text-caption text-content-muted">{customer.email}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-detail text-content-secondary">{customer.phone || 'Not provided'}</p>
                        {customer.address?.city && (
                          <p className="text-caption text-content-muted">{customer.address.city}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-detail text-content-secondary">
                        {formatDate(customer.createdAt)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className={customer.isActive ? 'badge-success' : 'badge-danger'}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewProfile(customer)}
                            className="p-2 text-content-muted hover:text-accent-blue-light hover:bg-surface-hover rounded-lg transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(customer._id)}
                            className={`p-2 rounded-lg transition-colors ${
                              customer.isActive
                                ? 'text-danger-text hover:bg-danger-muted'
                                : 'text-success-text hover:bg-success-muted'
                            }`}
                            title={customer.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {customer.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                          </button>
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
              Showing {((pagination.current - 1) * filters.limit) + 1} to {Math.min(pagination.current * filters.limit, pagination.total)} of {pagination.total} customers
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFilterChange('page', pagination.current - 1)}
                disabled={pagination.current === 1}
                className="btn btn-secondary btn-sm"
              >
                Previous
              </button>
              <span className="text-caption text-content-muted">
                Page {pagination.current} of {pagination.pages}
              </span>
              <button
                onClick={() => handleFilterChange('page', pagination.current + 1)}
                disabled={pagination.current === pagination.pages}
                className="btn btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Customer Profile Modal */}
        {showModal && selectedCustomer && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative card max-w-2xl w-full p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title text-content-primary">Customer Profile</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-content-muted hover:text-content-primary transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-heading text-content-primary mb-3">Basic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Name</label>
                      <p className="text-detail text-content-primary">{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Email</label>
                      <p className="text-detail text-content-primary">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Phone</label>
                      <p className="text-detail text-content-primary">{selectedCustomer.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Status</label>
                      <span className={selectedCustomer.isActive ? 'badge-success' : 'badge-danger'}>
                        {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedCustomer.address && (
                  <div>
                    <h3 className="text-heading text-content-primary mb-3">Address</h3>
                    <div className="bg-surface-raised rounded-xl p-4">
                      <p className="text-detail text-content-secondary">
                        {selectedCustomer.address.street && `${selectedCustomer.address.street}, `}
                        {selectedCustomer.address.city && `${selectedCustomer.address.city}, `}
                        {selectedCustomer.address.state && `${selectedCustomer.address.state} `}
                        {selectedCustomer.address.pincode && selectedCustomer.address.pincode}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-heading text-content-primary mb-3">Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Joined Date</label>
                      <p className="text-detail text-content-primary">{formatDate(selectedCustomer.createdAt)}</p>
                    </div>
                    <div>
                      <label className="block text-caption font-medium text-content-muted mb-1">Last Updated</label>
                      <p className="text-detail text-content-primary">{formatDate(selectedCustomer.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                  <button
                    onClick={() => handleToggleStatus(selectedCustomer._id)}
                    className={`btn btn-sm ${selectedCustomer.isActive ? 'btn-danger' : 'btn-success'}`}
                  >
                    {selectedCustomer.isActive ? 'Deactivate Account' : 'Activate Account'}
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn btn-secondary btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}
      </div>
    );
};

export default AdminCustomers;

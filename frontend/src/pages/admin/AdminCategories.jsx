import React, { useState, useEffect } from 'react';
import {
  FolderTree, Plus, Edit2, Trash2, Save, X, GripVertical,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', displayName: '', description: '', icon: '', color: '#6B7280' });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await adminAPIService.getCategories();
      if (response.success) setCategories(response.data);
    } catch (err) {
      console.error('Fetch categories error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async () => {
    try {
      if (!form.name || !form.displayName) return;
      const response = await adminAPIService.createCategory(form);
      if (response.success) {
        setShowCreate(false);
        setForm({ name: '', displayName: '', description: '', icon: '', color: '#6B7280' });
        fetchCategories();
      }
    } catch (err) {
      console.error('Create error:', err);
    }
  };

  const handleUpdate = async (id) => {
    try {
      const response = await adminAPIService.updateCategory(id, editing);
      if (response.success) {
        setEditing(null);
        fetchCategories();
      }
    } catch (err) {
      console.error('Update error:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      const response = await adminAPIService.deleteCategory(id);
      if (response.success) fetchCategories();
      else alert(response.message);
    } catch (err) {
      alert(err.response?.data?.message || 'Cannot delete category');
    }
  };

  const handleToggleActive = async (cat) => {
    try {
      await adminAPIService.updateCategory(cat._id, { ...cat, isActive: !cat.isActive });
      fetchCategories();
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">Categories Management</h1>
          <p className="text-body text-content-muted mt-1">Manage service categories and subcategories</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card p-5 border-l-4 border-l-accent-blue-light">
          <h3 className="text-heading text-content-primary mb-4">New Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-content-muted mb-1 block">Name (lowercase, unique)</label>
              <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="form-input w-full" placeholder="e.g. gardening" />
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Display Name</label>
              <input type="text" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} className="form-input w-full" placeholder="e.g. Gardening & Landscaping" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-content-muted mb-1 block">Description</label>
              <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="form-input w-full" placeholder="Brief description..." />
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Icon (emoji)</label>
              <input type="text" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} className="form-input w-full" placeholder="🌱" />
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="w-8 h-8 rounded cursor-pointer" />
                <input type="text" value={form.color} onChange={e => setForm({...form, color: e.target.value})} className="form-input flex-1" />
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} className="btn btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Create</button>
            <button onClick={() => setShowCreate(false)} className="btn btn-secondary flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> Cancel</button>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {loading ? (
        <AdminSkeleton type="cards" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <div key={cat._id} className={`card p-4 border-l-4 ${cat.isActive ? '' : 'opacity-60'}`} style={{ borderLeftColor: cat.color || '#6B7280' }}>
              {editing?._id === cat._id ? (
                <div className="space-y-3">
                  <input type="text" value={editing.displayName} onChange={e => setEditing({...editing, displayName: e.target.value})} className="form-input w-full text-sm" />
                  <input type="text" value={editing.description || ''} onChange={e => setEditing({...editing, description: e.target.value})} className="form-input w-full text-sm" placeholder="Description" />
                  <div className="flex gap-2">
                    <input type="text" value={editing.icon || ''} onChange={e => setEditing({...editing, icon: e.target.value})} className="form-input w-16 text-sm" placeholder="🌱" />
                    <input type="color" value={editing.color || '#6B7280'} onChange={e => setEditing({...editing, color: e.target.value})} className="w-8 h-8 rounded cursor-pointer" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(cat._id)} className="btn btn-primary btn-sm">Save</button>
                    <button onClick={() => setEditing(null)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{cat.icon || '📁'}</span>
                      <div>
                        <h3 className="text-sm font-medium text-content-primary">{cat.displayName || cat.name}</h3>
                        <p className="text-xs text-content-muted">{cat.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing({...cat})} className="p-1 rounded hover:bg-surface-hover text-content-muted">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(cat._id)} className="p-1 rounded hover:bg-surface-hover text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  {cat.description && <p className="text-xs text-content-muted mb-2">{cat.description}</p>}
                  <div className="flex items-center justify-between text-xs mt-2">
                    <span className="text-content-muted">{cat.liveServiceCount || 0} services</span>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`px-2 py-0.5 rounded-full ${cat.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}
                    >
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                  {cat.subcategories?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-surface-border">
                      <p className="text-xs text-content-muted mb-1">Subcategories:</p>
                      <div className="flex flex-wrap gap-1">
                        {cat.subcategories.map((sub, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-surface-hover text-content-secondary">
                            {sub.displayName || sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="text-center py-12">
          <FolderTree className="w-10 h-10 text-content-muted mx-auto mb-3" />
          <p className="text-content-muted">No categories found. Create your first one!</p>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;

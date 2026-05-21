import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Edit2, Trash2, Save, X, Eye, EyeOff,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';

const CATEGORIES = ['faq', 'terms', 'privacy', 'about', 'landing', 'help'];

const AdminContent = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('');

  const fetchPages = async () => {
    try {
      setLoading(true);
      const params = filter ? { category: filter } : {};
      const response = await adminAPIService.getContentPages(params);
      if (response.success) setPages(response.data);
    } catch (err) {
      console.error('Fetch content error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPages(); }, [filter]);

  const handleSave = async () => {
    if (!editing?.slug || !editing?.title || !editing?.content) return;
    try {
      const response = await adminAPIService.upsertContentPage(editing.slug, {
        title: editing.title,
        content: editing.content,
        category: editing.category || 'help',
        isPublished: editing.isPublished ?? false,
        sortOrder: editing.sortOrder || 0,
      });
      if (response.success) {
        setEditing(null);
        fetchPages();
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (slug) => {
    if (!window.confirm('Delete this page?')) return;
    try {
      await adminAPIService.deleteContentPage(slug);
      fetchPages();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleNew = () => {
    setEditing({ slug: '', title: '', content: '', category: 'help', isPublished: false, sortOrder: 0, isNew: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">Content Management</h1>
          <p className="text-body text-content-muted mt-1">FAQ, terms, privacy policy, and landing page content</p>
        </div>
        <button onClick={handleNew} className="btn btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Page
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 text-xs rounded-lg ${!filter ? 'bg-accent-blue-muted text-accent-blue-light' : 'text-content-muted hover:bg-surface-hover'}`}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1.5 text-xs rounded-lg capitalize ${filter === cat ? 'bg-accent-blue-muted text-accent-blue-light' : 'text-content-muted hover:bg-surface-hover'}`}>{cat}</button>
        ))}
      </div>

      {/* Editor */}
      {editing && (
        <div className="card p-5 border-l-4 border-l-accent-blue-light">
          <h3 className="text-heading text-content-primary mb-4">{editing.isNew ? 'Create Page' : 'Edit Page'}</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-content-muted mb-1 block">Slug (URL path)</label>
                <input
                  type="text"
                  value={editing.slug}
                  onChange={e => setEditing({...editing, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')})}
                  className="form-input w-full"
                  placeholder="e.g. refund-policy"
                  disabled={!editing.isNew}
                />
              </div>
              <div>
                <label className="text-xs text-content-muted mb-1 block">Category</label>
                <select value={editing.category} onChange={e => setEditing({...editing, category: e.target.value})} className="form-input w-full">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editing.isPublished} onChange={e => setEditing({...editing, isPublished: e.target.checked})} className="w-4 h-4 rounded" />
                  <span className="text-sm text-content-secondary">Published</span>
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Title</label>
              <input type="text" value={editing.title} onChange={e => setEditing({...editing, title: e.target.value})} className="form-input w-full" placeholder="Page title" />
            </div>
            <div>
              <label className="text-xs text-content-muted mb-1 block">Content (Markdown supported)</label>
              <textarea
                value={editing.content}
                onChange={e => setEditing({...editing, content: e.target.value})}
                className="form-input w-full min-h-[200px] resize-y font-mono text-sm"
                placeholder="Write content here..."
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn btn-primary flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
              <button onClick={() => setEditing(null)} className="btn btn-secondary flex items-center gap-1.5"><X className="w-3.5 h-3.5" /> Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Pages List */}
      {loading ? (
        <AdminSkeleton type="table" rows={5} cols={4} />
      ) : pages.length > 0 ? (
        <div className="card overflow-hidden divide-y divide-surface-border">
          {pages.map(page => (
            <div key={page._id} className="flex items-center justify-between p-4 hover:bg-surface-hover/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-4 h-4 text-content-muted flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-content-primary truncate">{page.title}</p>
                    {page.isPublished ? (
                      <Eye className="w-3 h-3 text-green-400" />
                    ) : (
                      <EyeOff className="w-3 h-3 text-content-muted" />
                    )}
                  </div>
                  <p className="text-xs text-content-muted">/{page.slug} · {page.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <span className="text-xs text-content-muted">
                  {new Date(page.updatedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
                <button onClick={() => setEditing({...page, isNew: false})} className="p-1.5 rounded hover:bg-surface-hover text-content-muted hover:text-content-primary">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(page.slug)} className="p-1.5 rounded hover:bg-surface-hover text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 text-content-muted mx-auto mb-3" />
          <p className="text-content-muted">No content pages yet. Create your first one!</p>
        </div>
      )}
    </div>
  );
};

export default AdminContent;

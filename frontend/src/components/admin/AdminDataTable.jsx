import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Columns, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * AdminDataTable - Reusable data table with:
 * - Column sorting (client-side or callback)
 * - Column visibility toggle
 * - Row selection with bulk actions
 * - Sticky headers on scroll
 * - Responsive touch-friendly design
 *
 * Props:
 *   columns: Array<{ key, label, sortable?, render?, width?, editable? }>
 *   data: Array<object>
 *   loading?: boolean
 *   selectable?: boolean
 *   selectedIds?: string[]
 *   onSelectionChange?: (ids: string[]) => void
 *   onSort?: (key: string, order: 'asc'|'desc') => void  // server-side sort callback
 *   sortKey?: string
 *   sortOrder?: 'asc'|'desc'
 *   pagination?: { current, pages, total }
 *   onPageChange?: (page: number) => void
 *   onInlineEdit?: (rowId, key, value) => void
 *   emptyIcon?: ReactNode
 *   emptyMessage?: string
 *   idKey?: string  (default: '_id')
 *   bulkActions?: ReactNode
 *   stickyHeader?: boolean
 */
const AdminDataTable = ({
  columns: allColumns,
  data = [],
  loading = false,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  onSort,
  sortKey = '',
  sortOrder = 'asc',
  pagination,
  onPageChange,
  onInlineEdit,
  emptyIcon,
  emptyMessage = 'No data found',
  idKey = '_id',
  bulkActions,
  stickyHeader = true,
}) => {
  const [visibleColumns, setVisibleColumns] = useState(() => allColumns.map(c => c.key));
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // { rowId, key }
  const [editValue, setEditValue] = useState('');

  // Local sort state (for client-side sorting when onSort not provided)
  const [localSort, setLocalSort] = useState({ key: '', order: 'asc' });

  const columns = useMemo(() => allColumns.filter(c => visibleColumns.includes(c.key)), [allColumns, visibleColumns]);

  const sortedData = useMemo(() => {
    if (onSort || !localSort.key) return data; // server-side or no sort
    return [...data].sort((a, b) => {
      const aVal = a[localSort.key] ?? '';
      const bVal = b[localSort.key] ?? '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return localSort.order === 'asc' ? cmp : -cmp;
    });
  }, [data, localSort, onSort]);

  const handleSort = (key) => {
    if (onSort) {
      const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
      onSort(key, newOrder);
    } else {
      setLocalSort(prev => ({
        key,
        order: prev.key === key && prev.order === 'asc' ? 'desc' : 'asc',
      }));
    }
  };

  const currentSortKey = onSort ? sortKey : localSort.key;
  const currentSortOrder = onSort ? sortOrder : localSort.order;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === data.length) onSelectionChange([]);
    else onSelectionChange(data.map(r => r[idKey]));
  };

  const toggleOne = (id) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    );
  };

  const startEdit = (rowId, key, currentValue) => {
    setEditingCell({ rowId, key });
    setEditValue(currentValue ?? '');
  };

  const commitEdit = () => {
    if (editingCell && onInlineEdit) {
      onInlineEdit(editingCell.rowId, editingCell.key, editValue);
    }
    setEditingCell(null);
  };

  const SortIcon = ({ colKey }) => {
    if (currentSortKey !== colKey) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return currentSortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  if (loading) {
    return (
      <div className="card overflow-hidden">
        <div className="animate-pulse space-y-0">
          <div className="h-10 bg-surface-raised" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-t border-surface-border/30 flex items-center gap-4 px-4">
              <div className="h-3 w-16 bg-surface-hover rounded" />
              <div className="h-3 w-24 bg-surface-hover rounded" />
              <div className="h-3 w-20 bg-surface-hover rounded" />
              <div className="h-3 w-12 bg-surface-hover rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Column visibility & bulk actions bar */}
      {(selectable && selectedIds.length > 0) || true ? (
        <div className="flex items-center justify-between px-4 py-2 border-b border-surface-border bg-surface-raised/50">
          <div className="flex items-center gap-3">
            {selectable && selectedIds.length > 0 && (
              <span className="text-xs font-medium text-content-primary">{selectedIds.length} selected</span>
            )}
            {selectable && selectedIds.length > 0 && bulkActions}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowColumnPicker(!showColumnPicker)}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-content-muted hover:text-content-primary rounded transition-colors"
            >
              <Columns className="w-3 h-3" />
              <span className="hidden sm:inline">Columns</span>
            </button>
            {showColumnPicker && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface-overlay border border-surface-border rounded-lg shadow-xl z-20 py-1">
                {allColumns.map(col => (
                  <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 text-xs text-content-secondary hover:bg-surface-hover cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(col.key)}
                      onChange={(e) => {
                        if (e.target.checked) setVisibleColumns(prev => [...prev, col.key]);
                        else setVisibleColumns(prev => prev.filter(k => k !== col.key));
                      }}
                      className="w-3.5 h-3.5 rounded"
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={stickyHeader ? 'sticky top-0 z-10 bg-surface-raised' : 'bg-surface-raised'}>
            <tr className="border-b border-surface-border">
              {selectable && (
                <th className="px-3 py-2.5 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2.5 text-left text-[11px] font-semibold text-content-muted uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer select-none hover:text-content-primary' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && <SortIcon colKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row[idKey]} className="border-b border-surface-border/40 hover:bg-surface-hover/40 transition-colors">
                {selectable && (
                  <td className="px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row[idKey])}
                      onChange={() => toggleOne(row[idKey])}
                      className="w-4 h-4 rounded"
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className="px-3 py-2.5 text-sm">
                    {editingCell?.rowId === row[idKey] && editingCell?.key === col.key ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }}
                        autoFocus
                        className="form-input text-xs px-2 py-1 w-full"
                      />
                    ) : col.render ? (
                      col.render(row[col.key], row)
                    ) : (
                      <span
                        className={`text-content-primary ${col.editable ? 'cursor-pointer hover:bg-surface-hover px-1 -mx-1 rounded' : ''}`}
                        onDoubleClick={() => col.editable && startEdit(row[idKey], col.key, row[col.key])}
                      >
                        {row[col.key] ?? '-'}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {data.length === 0 && (
        <div className="text-center py-12">
          {emptyIcon && <div className="mx-auto mb-3">{emptyIcon}</div>}
          <p className="text-sm text-content-muted">{emptyMessage}</p>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
          <span className="text-xs text-content-muted">
            Page {pagination.current} of {pagination.pages} ({pagination.total} total)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.current - 1)}
              disabled={pagination.current <= 1}
              className="p-1.5 rounded hover:bg-surface-hover text-content-muted disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.current + 1)}
              disabled={pagination.current >= pagination.pages}
              className="p-1.5 rounded hover:bg-surface-hover text-content-muted disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDataTable;

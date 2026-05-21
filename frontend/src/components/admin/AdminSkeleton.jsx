import React from 'react';

/**
 * AdminSkeleton - Configurable skeleton loader for admin pages
 * type: 'table' | 'cards' | 'detail' | 'chart'
 */
const AdminSkeleton = ({ type = 'table', rows = 5, cols = 4 }) => {
  if (type === 'cards') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 bg-surface-hover rounded animate-pulse" />
          <div className="h-8 w-24 bg-surface-hover rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex items-center justify-between mb-3">
                <div className="h-3 w-20 bg-surface-hover rounded" />
                <div className="h-8 w-8 bg-surface-hover rounded-lg" />
              </div>
              <div className="h-7 w-16 bg-surface-hover rounded mb-2" />
              <div className="h-2 w-full bg-surface-hover rounded" />
            </div>
          ))}
        </div>
        <div className="card p-0 overflow-hidden animate-pulse">
          <div className="h-10 bg-surface-raised" />
          {[...Array(rows)].map((_, i) => (
            <div key={i} className="h-14 border-t border-surface-border/30 flex items-center gap-4 px-4">
              {[...Array(cols)].map((_, j) => (
                <div key={j} className="h-3 bg-surface-hover rounded" style={{ width: `${60 + Math.random() * 60}px` }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-surface-hover rounded-xl" />
          <div className="space-y-2">
            <div className="h-5 w-40 bg-surface-hover rounded" />
            <div className="h-3 w-24 bg-surface-hover rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-3 w-20 bg-surface-hover rounded mb-2" />
              <div className="h-6 w-16 bg-surface-hover rounded" />
            </div>
          ))}
        </div>
        <div className="card p-5">
          <div className="h-4 w-32 bg-surface-hover rounded mb-4" />
          <div className="h-40 w-full bg-surface-hover rounded-lg" />
        </div>
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="card p-5 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 bg-surface-hover rounded" />
          <div className="h-6 w-20 bg-surface-hover rounded" />
        </div>
        <div className="h-48 w-full bg-surface-hover rounded-lg" />
      </div>
    );
  }

  // Default: table skeleton
  return (
    <div className="card p-0 overflow-hidden animate-pulse">
      <div className="h-10 bg-surface-raised" />
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="h-14 border-t border-surface-border/30 flex items-center gap-4 px-4">
          {[...Array(cols)].map((_, j) => (
            <div key={j} className="h-3 bg-surface-hover rounded" style={{ width: `${50 + Math.random() * 80}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
};

export default AdminSkeleton;

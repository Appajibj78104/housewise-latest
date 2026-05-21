import React from 'react';
import { AlertTriangle, Trash2, Ban, RotateCcw } from 'lucide-react';

/**
 * ConfirmDialog - Destructive action confirmation with undo capability
 * 
 * Props:
 *   open: boolean
 *   title: string
 *   message: string
 *   confirmLabel?: string (default: "Confirm")
 *   cancelLabel?: string (default: "Cancel")
 *   variant?: 'danger' | 'warning' | 'info'
 *   onConfirm: () => void
 *   onCancel: () => void
 */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const variants = {
    danger: { icon: Trash2, iconBg: 'bg-red-500/10', iconColor: 'text-red-400', btnClass: 'bg-red-500 hover:bg-red-600 text-white' },
    warning: { icon: AlertTriangle, iconBg: 'bg-yellow-500/10', iconColor: 'text-yellow-400', btnClass: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    info: { icon: Ban, iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400', btnClass: 'bg-blue-500 hover:bg-blue-600 text-white' },
  };

  const v = variants[variant] || variants.danger;
  const Icon = v.icon;

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${v.iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${v.iconColor}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
            <p className="text-xs text-content-muted mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onConfirm} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${v.btnClass}`}>
            {confirmLabel}
          </button>
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-surface-hover text-content-primary hover:bg-surface-border transition-colors">
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;

/**
 * useUndoAction - Hook for undo-able actions with toast
 * Returns { execute, undo, pending }
 */
export function useUndoAction(actionFn, undoFn, { delay = 5000, toastFn } = {}) {
  const [pending, setPending] = React.useState(null);

  const execute = React.useCallback((...args) => {
    const timeout = setTimeout(async () => {
      await actionFn(...args);
      setPending(null);
    }, delay);

    setPending({ timeout, args });

    if (toastFn) {
      toastFn(`Action scheduled. Undo?`, {
        duration: delay,
        icon: <RotateCcw className="w-4 h-4" />,
      });
    }
  }, [actionFn, delay, toastFn]);

  const undo = React.useCallback(() => {
    if (pending) {
      clearTimeout(pending.timeout);
      setPending(null);
      if (undoFn) undoFn(...pending.args);
    }
  }, [pending, undoFn]);

  return { execute, undo, pending: !!pending };
}

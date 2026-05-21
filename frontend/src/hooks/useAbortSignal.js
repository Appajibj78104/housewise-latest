import { useRef, useEffect, useCallback } from 'react';

// Global fallback controller for when hooks fail
let globalController = null;

/**
 * Returns a function that creates an AbortController signal scoped to the
 * component's lifecycle.  Call `getSignal()` at the start of each fetch;
 * the previous in-flight request is automatically aborted.
 *
 * On unmount every pending request is cancelled — prevents
 * "setState on unmounted component" warnings and race conditions.
 *
 * Usage:
 *   const getSignal = useAbortSignal();
 *   const fetchData = async () => {
 *     const signal = getSignal();
 *     const res = await api.get('/foo', { signal });
 *     ...
 *   };
 */
export default function useAbortSignal() {
  const controllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
    };
  }, []);

  const getSignal = useCallback(() => {
    // Abort previous request if still pending
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    return controller.signal;
  }, []);

  return getSignal;
}

/**
 * Helper: returns true if an error is an AbortError (request was cancelled).
 * Use this to silently swallow expected cancellation errors.
 */
export function isAbortError(err) {
  if (!err) return false;
  if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') return true;
  if (err.message === 'canceled') return true;
  return false;
}

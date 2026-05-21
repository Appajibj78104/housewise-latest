import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_TIMEOUT = 30 * 60 * 1000;     // 30 minutes of inactivity
const WARNING_BEFORE = 5 * 60 * 1000;     // Show warning 5 minutes before timeout

/**
 * Admin session timeout hook.
 * Tracks user activity (mouse, keyboard, scroll, touch).
 * Fires onTimeout when session expires, shows warning before.
 */
export function useSessionTimeout({ onTimeout, onWarningDismiss }) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const lastActivity = useRef(Date.now());
  const warningTimer = useRef(null);
  const countdownTimer = useRef(null);

  const resetActivity = useCallback(() => {
    lastActivity.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
      onWarningDismiss?.();
    }
  }, [showWarning, onWarningDismiss]);

  // Track user activity
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handler = () => { lastActivity.current = Date.now(); };
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => { events.forEach(e => window.removeEventListener(e, handler)); };
  }, []);

  // Check timeout periodically
  useEffect(() => {
    const check = () => {
      const elapsed = Date.now() - lastActivity.current;
      const remaining = IDLE_TIMEOUT - elapsed;

      if (remaining <= 0) {
        // Timeout — force logout
        setShowWarning(false);
        onTimeout();
      } else if (remaining <= WARNING_BEFORE && !showWarning) {
        setShowWarning(true);
        setRemainingSeconds(Math.ceil(remaining / 1000));
      }
    };

    warningTimer.current = setInterval(check, 5000); // Check every 5s
    return () => clearInterval(warningTimer.current);
  }, [onTimeout, showWarning]);

  // Countdown when warning is shown
  useEffect(() => {
    if (showWarning) {
      countdownTimer.current = setInterval(() => {
        const remaining = IDLE_TIMEOUT - (Date.now() - lastActivity.current);
        if (remaining <= 0) {
          onTimeout();
        } else {
          setRemainingSeconds(Math.ceil(remaining / 1000));
        }
      }, 1000);
    } else {
      clearInterval(countdownTimer.current);
    }
    return () => clearInterval(countdownTimer.current);
  }, [showWarning, onTimeout]);

  return { showWarning, remainingSeconds, resetActivity };
}

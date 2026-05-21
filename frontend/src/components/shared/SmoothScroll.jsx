import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

/**
 * Accepts an `enabled` prop so callers can turn Lenis on/off
 * based on the current route (dashboards use their own scroll container).
 */
export default function SmoothScroll({ children, enabled = true }) {
  const lenisRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Make sure any existing instance is destroyed
      if (lenisRef.current) {
        lenisRef.current.destroy();
        lenisRef.current = null;
        window.__lenis = null;
      }
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Expose lenis instance globally so scrollToSection can use it
    window.__lenis = lenis;

    return () => {
      lenis.destroy();
      window.__lenis = null;
    };
  }, [enabled]);

  return children;
}

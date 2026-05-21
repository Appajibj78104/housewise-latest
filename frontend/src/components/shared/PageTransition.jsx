import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

/**
 * Wraps page content with a smooth fade + slide-up transition.
 * Uses the route pathname as key so AnimatePresence triggers on navigation.
 *
 * Usage:
 *   <PageTransition>
 *     <YourPageContent />
 *   </PageTransition>
 */
const variants = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0 },
  exit:     { opacity: 0, y: -8 },
};

const transition = {
  duration: 0.3,
  ease: [0.25, 0.1, 0.25, 1], // cubic-bezier ease-out
};

export default function PageTransition({ children }) {
  const location = useLocation();

  return (
    <motion.div
      key={location.pathname}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      transition={transition}
      style={{ width: '100%', height: '100%', flex: 1, minHeight: 0 }}
    >
      {children}
    </motion.div>
  );
}

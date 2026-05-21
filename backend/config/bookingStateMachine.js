/**
 * Booking State Machine
 * Defines valid state transitions and enforces business rules.
 */

// Valid transitions: { currentStatus: [allowedNextStatuses] }
const TRANSITIONS = {
  quote_pending: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: ['disputed'],   // Customer can raise a dispute post-completion
  disputed: ['resolved'],    // Admin resolves disputes
  resolved: [],              // Terminal
  declined: [],              // Terminal
  cancelled: [],             // Terminal
  no_show: [],               // Terminal
};

// Who can trigger each transition
const TRANSITION_ROLES = {
  'quote_pending->pending': ['customer', 'admin'],
  'quote_pending->confirmed': ['provider', 'admin'],
  'quote_pending->cancelled': ['customer', 'provider', 'admin'],
  'pending->confirmed': ['provider', 'admin'],
  'pending->declined': ['provider', 'admin'],
  'pending->cancelled': ['customer', 'provider', 'admin'],
  'confirmed->in_progress': ['provider', 'admin'],
  'confirmed->cancelled': ['customer', 'provider', 'admin'],
  'confirmed->no_show': ['provider', 'admin'],
  'in_progress->completed': ['provider', 'admin'],
  'in_progress->cancelled': ['admin'], // Only admin can cancel in-progress
  'completed->disputed': ['customer', 'admin'],
  'disputed->resolved': ['admin'],
};

/**
 * Check if a status transition is valid
 * @param {string} from - Current status
 * @param {string} to - Target status
 * @returns {boolean}
 */
function isValidTransition(from, to) {
  const allowed = TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

/**
 * Check if a user role can perform a specific transition
 * @param {string} from - Current status
 * @param {string} to - Target status
 * @param {string} role - User role (customer|housewife|admin)
 * @param {string} userId - Current user's ID
 * @param {object} booking - Booking document
 * @returns {{ allowed: boolean, reason?: string }}
 */
function canTransition(from, to, role, userId, booking) {
  if (!isValidTransition(from, to)) {
    return { allowed: false, reason: `Cannot transition from '${from}' to '${to}'` };
  }

  const key = `${from}->${to}`;
  const allowedRoles = TRANSITION_ROLES[key];

  if (!allowedRoles) {
    return { allowed: false, reason: `Transition '${key}' not configured` };
  }

  // Map 'housewife' role to 'provider' for comparison
  const normalizedRole = role === 'housewife' ? 'provider' : role;

  if (!allowedRoles.includes(normalizedRole)) {
    return { allowed: false, reason: `Role '${role}' cannot perform transition '${key}'` };
  }

  // Additional business rules
  if (to === 'cancelled' && normalizedRole === 'customer') {
    // Customer can only cancel if > 2 hours before scheduled time
    const scheduledTime = new Date(booking.scheduledDate);
    const hoursUntil = (scheduledTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntil < 2) {
      return { allowed: false, reason: 'Cannot cancel less than 2 hours before scheduled time' };
    }
  }

  return { allowed: true };
}

/**
 * Get available transitions for a booking given the user's role
 * @param {string} currentStatus - Current booking status
 * @param {string} role - User role
 * @returns {string[]} Available next statuses
 */
function getAvailableTransitions(currentStatus, role) {
  const normalizedRole = role === 'housewife' ? 'provider' : role;
  const allowed = TRANSITIONS[currentStatus] || [];
  
  return allowed.filter(to => {
    const key = `${currentStatus}->${to}`;
    const roles = TRANSITION_ROLES[key];
    return roles && roles.includes(normalizedRole);
  });
}

module.exports = { isValidTransition, canTransition, getAvailableTransitions, TRANSITIONS };

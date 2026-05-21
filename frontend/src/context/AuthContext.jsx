import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { authAPI, setAuthData, clearAuthData, getStoredUser, clearBrowserCache } from '../services/api';
import { invalidateCache } from '../utils/apiCache';
import { useSocket } from '../hooks/useSocket';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const { connect: connectSocket, disconnect: disconnectSocket } = useSocket();

  // Connect socket when authenticated
  useEffect(() => {
    if (state.isAuthenticated && !state.isLoading) {
      connectSocket();
    }
  }, [state.isAuthenticated, state.isLoading, connectSocket]);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing authentication state');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

        // Check for admin token first
        const adminToken = localStorage.getItem('adminToken');
        const adminUserData = localStorage.getItem('adminUser');

        if (adminToken && adminUserData) {
          try {
            const adminUser = JSON.parse(adminUserData);
            console.log('AuthContext: Found admin user, logging in');
            dispatch({
              type: AUTH_ACTIONS.LOGIN_SUCCESS,
              payload: { user: adminUser },
            });
            return;
          } catch (error) {
            console.error('Error parsing admin user data:', error);
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
          }
        }

        // Check for regular user token
        const storedUser = getStoredUser();
        const token = localStorage.getItem('token');

        if (token && storedUser) {
          // Use stored user data instead of making API call to prevent infinite loops
          console.log('AuthContext: Found valid user token, logging in user:', storedUser.role);
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user: storedUser },
          });
        } else {
          // No valid authentication found - user needs to login
          console.log('AuthContext: No valid authentication found, user needs to login');
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, []); // Empty dependency array to run only once

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await authAPI.login(credentials);
      const { user, token, refreshToken, isAdmin } = response.data;

      // Store admin token separately if it's an admin login
      if (isAdmin) {
        localStorage.setItem('adminToken', token);
        localStorage.setItem('adminUser', JSON.stringify(user));
      } else {
        setAuthData(token, user, refreshToken);
      }

      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user },
      });

      return { success: true, user, isAdmin };
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

      const response = await authAPI.register(userData);
      const { user, token, refreshToken } = response.data;

      setAuthData(token, user, refreshToken);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user },
      });

      return { success: true, user };
    } catch (error) {
      const errorMessage = error.message || 'Registration failed';
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorMessage,
      });
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Enhanced logout function with robust session clearing
  const logout = async () => {
    try {
      // Disconnect socket
      disconnectSocket();

      // Clear auth state immediately to trigger re-renders
      dispatch({ type: AUTH_ACTIONS.LOGOUT });

      // Clear all API caches to prevent stale data across sessions
      invalidateCache();

      // Clear authentication data from browser storage
      clearBrowserCache();
      clearAuthData();

      // Try to call logout API (but don't wait for it or let it fail the logout)
      authAPI.logout().catch(() => {});

      toast.success('Logged out successfully');

      return { success: true };
    } catch (error) {
      // Even if there's an error, ensure complete cleanup
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      clearBrowserCache();
      clearAuthData();

      return { success: true };
    }
  };

  // Update user profile
  const updateUser = (userData) => {
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData,
    });

    // Update stored user data
    const currentUser = getStoredUser();
    if (currentUser) {
      setAuthData(localStorage.getItem('token'), { ...currentUser, ...userData });
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      await authAPI.changePassword(passwordData);
      toast.success('Password changed successfully');
      return { success: true };
    } catch (error) {
      const errorMessage = error.message || 'Failed to change password';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // Check if user is housewife or provider (both are service providers)
  const isHousewife = () => hasRole('housewife');
  const isProvider = () => hasRole('provider');
  const isServiceProvider = () => isHousewife() || isProvider();

  // Check if user is customer
  const isCustomer = () => hasRole('customer');

  // Check if user is admin
  const isAdmin = () => hasRole('admin');

  // Validate current session and force logout if invalid
  const validateSession = () => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    const user = getStoredUser();

    if (!token || !user) {
      console.log('AuthContext: Invalid session detected, forcing logout');
      logout();
      return false;
    }

    return true;
  };

  const value = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    updateUser,
    changePassword,
    clearError,
    hasRole,
    isHousewife,
    isProvider,
    isServiceProvider,
    isCustomer,
    isAdmin,
    validateSession,
  }), [state]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

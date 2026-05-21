import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsAPI, providerAPI, customerAPI } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Hook to fetch bookings with TanStack Query (auto-caching, deduplication, background refetch)
 */
export function useBookings(params = {}, options = {}) {
  return useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingsAPI.getBookings(params),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch a single booking
 */
export function useBooking(id, options = {}) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsAPI.getBookingById(id),
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch available transitions for a booking
 */
export function useBookingTransitions(id, options = {}) {
  return useQuery({
    queryKey: ['booking-transitions', id],
    queryFn: () => bookingsAPI.getTransitions(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to update booking status with optimistic updates
 */
export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, statusData }) => bookingsAPI.updateBookingStatus(id, statusData),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      queryClient.invalidateQueries({ queryKey: ['booking-transitions', id] });
      toast.success(`Booking ${data?.data?.booking?.status || 'updated'}`);
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update booking');
    },
  });
}

/**
 * Hook for provider bookings
 */
export function useProviderBookings(params = {}, options = {}) {
  return useQuery({
    queryKey: ['provider-bookings', params],
    queryFn: () => providerAPI.getMyBookings(params),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for customer bookings
 */
export function useCustomerBookings(params = {}, options = {}) {
  return useQuery({
    queryKey: ['customer-bookings', params],
    queryFn: () => customerAPI.getBookings(params),
    staleTime: 2 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook for favorites
 */
export function useFavorites(options = {}) {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: () => customerAPI.getFavorites(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to toggle favorite
 */
export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (serviceId) => customerAPI.toggleFavorite(serviceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      toast.success(data?.data?.added ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: () => {
      toast.error('Failed to update favorites');
    },
  });
}

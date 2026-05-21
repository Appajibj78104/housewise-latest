import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * useDistanceAnalysis
 *
 * Calls GET /api/services/distance-analysis with the user's coordinates
 * and returns smart, cluster-based distance tiers.
 *
 * Returns:
 *   { tiers, clusters, loading, error, recommended, refresh }
 *
 * Each tier: { radius, count, label, clusters, isRecommended }
 */
export default function useDistanceAnalysis(lat, lng, category) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(null);
  const lastKey = useRef('');

  const fetch = useCallback(async () => {
    if (!lat || !lng) return;

    const key = `${lat.toFixed(5)},${lng.toFixed(5)},${category || ''}`;
    if (key === lastKey.current && data) return; // already fetched for same params
    lastKey.current = key;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const params = { lat, lng, maxKm: 200 };
      if (category) params.category = category;

      const res = await api.get('/services/distance-analysis', {
        params,
        signal: controller.signal
      });

      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
        setError('Failed to analyze distances');
      }
    } finally {
      setLoading(false);
    }
  }, [lat, lng, category]);

  useEffect(() => {
    fetch();
    return () => abortRef.current?.abort();
  }, [fetch]);

  const tiers = data?.tiers || [];
  const clusters = data?.clusters || [];
  const recommended = data?.recommendedRadius || null;

  return { tiers, clusters, loading, error, recommended, total: data?.total || 0, refresh: fetch };
}

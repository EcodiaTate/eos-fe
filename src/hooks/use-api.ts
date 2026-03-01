/**
 * React hook for API calls with loading/error state.
 *
 * Design principles:
 * - Always fetches on mount (never starts with stale null).
 * - Preserves the last successful `data` while re-fetching so the UI never
 *   flashes blank on polling intervals or page re-focus.
 * - `loading` is true only on the very first fetch (no data yet); subsequent
 *   background polls do NOT set loading=true so the UI stays stable.
 * - `enabled=false` pauses polling but does NOT wipe existing data.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiResult<T> extends UseApiState<T> {
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options?: { intervalMs?: number; enabled?: boolean },
): UseApiResult<T> {
  const { intervalMs, enabled = true } = options ?? {};
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  // Stable reference to the fetcher so the effect deps don't change
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  // Track whether we have ever received data to avoid showing loading
  // spinner on background refreshes.
  const hasDataRef = useRef(false);

  const doFetch = useCallback(async () => {
    // Only show loading spinner on the initial fetch (no data yet).
    if (!hasDataRef.current) {
      setState((prev) => ({ ...prev, loading: true }));
    }
    try {
      const data = await fetcherRef.current();
      hasDataRef.current = true;
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Preserve stale data on error so the UI doesn't go blank.
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Pause polling but keep existing data visible.
      return;
    }

    doFetch();

    if (intervalMs && intervalMs > 0) {
      const id = setInterval(doFetch, intervalMs);
      return () => clearInterval(id);
    }
  }, [doFetch, intervalMs, enabled]);

  return { ...state, refetch: doFetch };
}

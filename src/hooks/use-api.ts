/**
 * React hook for API calls with loading/error state.
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

/**
 * Fetch data from an API endpoint. Calls immediately on mount and
 * optionally polls at `intervalMs`.
 */
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

  // Stable reference to the fetcher
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const doFetch = useCallback(async () => {
    try {
      const data = await fetcherRef.current();
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null });
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

import { useState, useEffect } from "react";

/**
 * Debounces a value by the given delay (ms).
 * Use this for search inputs / filter fields to avoid firing on every keystroke.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(searchQuery, 300);
 *   useEffect(() => { fetchResults(debouncedQuery); }, [debouncedQuery]);
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
'use client';

import { useEffect, useMemo, useState } from 'react';
import debounce from 'lodash.debounce';

// Returns a debounced copy of `value` that catches up `delay` ms after it
// stops changing. Backed by lodash.debounce so the trailing-edge timing and
// cancellation are battle-tested.
export function useDebounce<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);

  const update = useMemo(
    () => debounce((v: T) => setDebounced(v), delay),
    [delay],
  );

  useEffect(() => {
    update(value);
  }, [value, update]);

  useEffect(() => () => update.cancel(), [update]);

  return debounced;
}

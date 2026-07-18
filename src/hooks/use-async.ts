import { useCallback, useEffect, useState } from 'react';

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string;
  reload: () => void;
};

type Settled<T> = { key: string; data: T | null; error: string };

/**
 * Runs an async fetch and tracks its state.
 *
 * The request is aborted on unmount and whenever `deps` change, so a slow
 * response from a stale query cannot overwrite fresher data.
 *
 * `loading` is derived by comparing the settled result's key against the
 * current one rather than being toggled from inside the effect: a result only
 * counts once it belongs to the deps that are live now.
 */
export function useAsync<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: unknown[]
): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  const key = `${JSON.stringify(deps)}#${nonce}`;
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetcher(controller.signal)
      .then((data) => {
        if (active) setSettled({ key, data, error: '' });
      })
      .catch((e: unknown) => {
        if (!active || controller.signal.aborted) return;
        setSettled({
          key,
          data: null,
          error: e instanceof Error ? e.message : 'Something went wrong.',
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
    // `fetcher` is typically an inline arrow and would re-run this every render;
    // `key` already encodes everything the request depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = settled?.key === key ? settled : null;

  return {
    data: current?.data ?? null,
    loading: !current,
    error: current?.error ?? '',
    reload,
  };
}

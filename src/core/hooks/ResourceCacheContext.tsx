import React, {
  createContext, createRef,
  ReactNode,
  useEffect,
  useMemo, useRef,
  useState,
} from 'react';
import { Box, SxProps } from '@mui/material';

export function createResource<T>(fetchFn: () => Promise<T>) {
  let status = 'initial';
  let result: T | undefined;
  let error: unknown;

  const sendPromise = () => fetchFn().then(
    (r) => {
      status = 'success';
      result = r;
    },
    (e) => {
      status = 'error';
      error = e;
    }
  );

  let promise: Promise<void>;

  return {
    /**
     * Fetches the resource cache for example on stale data. If you want it to suspend, set suspend=true.
     * Doesn't fetch again if there is already a pending fetch.
     */
    fetch(suspend?: boolean) {
      if (status === "pending-suspend" || status === "pending") {
        return;
      }
      promise = sendPromise();
      status = suspend ? "pending-suspend" : "pending";
    },
    /**
     * Read reads out the current result if available. Otherwise suspends or throws an error.
     */
    read(): T | undefined {
      if (status === 'pending-suspend') {
        throw promise;
      }
      if (status === 'error') {
        throw error;
      }
      return result;
    },
  };
}

export type ResourceCache<T = unknown> = ReturnType<typeof createResource<T>>

export const ResourceCacheContext = createContext({
  cache: createRef<Map<string, ResourceCache>>(),
  hasLoaded: false,
});

type Props = {
  children: ReactNode;
};

export const ResourceCacheProvider: React.FC<Props> = ({ children }) => {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setHasLoaded(true);
  }, []);

  const sx: SxProps = useMemo(
    () => ({
      display: hasLoaded ? undefined : 'none',
    }),
    [hasLoaded]
  );

  const cache = useRef(new Map<string, ResourceCache>());

  const ctx = useMemo(() => ({
    cache,
    hasLoaded,
  }), [hasLoaded, cache]);

  return (
    <Box sx={sx}>
      <ResourceCacheContext.Provider value={ctx}>{children}</ResourceCacheContext.Provider>
    </Box>
  );
};

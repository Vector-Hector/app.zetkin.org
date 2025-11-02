import React, {
  createContext,
  createRef,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Box, SxProps } from '@mui/material';

export function createResource<T>(fetchFn: () => Promise<T>) {
  let status = 'initial';
  let result: T | undefined;
  let error: unknown;

  const sendPromise = () =>
    fetchFn().then(
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
      if (status === 'pending-suspend' || status === 'pending') {
        return;
      }
      promise = sendPromise();
      status = suspend ? 'pending-suspend' : 'pending';
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

export type ResourceCache = ReturnType<typeof createResource>;

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

  const ctx = useMemo(
    () => ({
      cache,
      hasLoaded,
    }),
    [hasLoaded, cache]
  );

  return (
    <Box sx={sx}>
      <ResourceCacheContext.Provider value={ctx}>
        {children}
      </ResourceCacheContext.Provider>
    </Box>
  );
};

export const useResourceCache = (
  cacheKey: string,
  fetchFn: () => Promise<unknown>
) => {
  const resourceCacheCtx = useContext(ResourceCacheContext);
  if (resourceCacheCtx.hasLoaded && resourceCacheCtx.cache.current) {
    const resource = resourceCacheCtx.cache.current.get(cacheKey);
    if (resource) {
      resource.read(); // suspend if necessary
    }
  }

  useEffect(() => {
    if (!resourceCacheCtx.cache.current) {
      return;
    }

    if (!resourceCacheCtx.cache.current.get(cacheKey)) {
      resourceCacheCtx.cache.current.set(cacheKey, createResource(fetchFn));
    }
  }, [resourceCacheCtx.cache, cacheKey, fetchFn]);

  return useCallback(() => {
    if (!resourceCacheCtx.cache.current) {
      return undefined;
    }

    return resourceCacheCtx.cache.current.get(cacheKey);
  }, [resourceCacheCtx.cache]);
};

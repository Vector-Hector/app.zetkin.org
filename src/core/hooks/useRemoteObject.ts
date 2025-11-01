import { PayloadAction } from '@reduxjs/toolkit';
import { useContext, useEffect } from 'react';

import { useAppDispatch } from './index';
import shouldLoad from '../caching/shouldLoad';
import { RemoteItem, RemoteList } from 'utils/storeUtils';
import { AppDispatch } from 'core/store';
import {
  createResource,
  ResourceCacheContext,
} from 'core/hooks/ResourceCacheContext';

export type Hooks<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType
> = {
  actionOnError?: (err: unknown) => PayloadAction<unknown>;
  actionOnLoad: () => PayloadAction<OnLoadPayload>;
  actionOnSuccess:
    | ((item: DataType) => PayloadAction<OnSuccessPayload>)
    | ((items: DataType[]) => PayloadAction<OnSuccessPayload>);
  cacheKey?: string;
  isNecessary?: () => boolean;
  loader: (() => Promise<DataType>) | (() => Promise<DataType[]>);
};

async function makePromise<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType
>(
  dispatch: AppDispatch,
  hooks: Hooks<DataType, OnLoadPayload, OnSuccessPayload>
): Promise<DataType | DataType[] | null> {
  try {
    dispatch(hooks.actionOnLoad());
    const val = await hooks.loader();
    dispatch(hooks.actionOnSuccess(val as never));
    return val;
  } catch (err) {
    {
      if (hooks.actionOnError) {
        dispatch(hooks.actionOnError(err));
        return null;
      } else {
        throw err;
      }
    }
  }
}

function useRemoteObject<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType
>(
  remoteObject: RemoteItem<DataType> | RemoteList<DataType> | undefined | null,
  hooks: Hooks<DataType, OnLoadPayload, OnSuccessPayload>
) {
  const dispatch = useAppDispatch();
  const loadIsNecessary = hooks.isNecessary?.() ?? shouldLoad(remoteObject);

  const cacheKey = hooks.cacheKey || hooks.loader.toString();

  const stateHasLoadedOnce =
    !!remoteObject &&
    (remoteObject.isLoading ||
      !!remoteObject.error ||
      !!remoteObject.loaded ||
      'data' in remoteObject ||
      ('items' in remoteObject && remoteObject.items.length > 0) ||
      ('isStale' in remoteObject && remoteObject.isStale) ||
      ('mutating' in remoteObject &&
        (remoteObject.mutating as string[]).length > 0));

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
      resourceCacheCtx.cache.current.set(
        cacheKey,
        createResource(() =>
          makePromise<DataType, OnLoadPayload, OnSuccessPayload>(
            dispatch,
            hooks
          )
        )
      );
    }

    if (!loadIsNecessary) {
      return;
    }

    const cache = resourceCacheCtx.cache.current.get(cacheKey);

    if (!cache) {
      return;
    }

    cache.fetch(!stateHasLoadedOnce);
  });
}

export default useRemoteObject;

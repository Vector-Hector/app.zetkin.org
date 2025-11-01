import { PayloadAction } from '@reduxjs/toolkit';
import { useContext, useEffect } from 'react';

import { useAppDispatch } from './index';
import shouldLoad from '../caching/shouldLoad';
import { RemoteItem, RemoteList } from 'utils/storeUtils';
import { AppDispatch } from 'core/store';
import {
  createResource,
  ResourceCacheContext,
  useResourceCache,
} from 'core/hooks/ResourceCacheContext';

export type Hooks<
  DataType,
  LoaderPayload = DataType | DataType[],
  OnLoadPayload = void,
  OnSuccessPayload = DataType
> = {
  actionOnError?: (err: unknown) => PayloadAction<unknown>;
  actionOnLoad: () => PayloadAction<OnLoadPayload>;
  actionOnSuccess: (item: LoaderPayload) => PayloadAction<OnSuccessPayload>;
  cacheKey?: string;
  hasLoadedOnce: () => boolean;
  isNecessary: () => boolean;
  loader: () => Promise<LoaderPayload>;
};

async function makePromise<
  DataType,
  LoaderPayload = DataType | DataType[],
  OnLoadPayload = void,
  OnSuccessPayload = DataType
>(
  dispatch: AppDispatch,
  hooks: Hooks<DataType, LoaderPayload, OnLoadPayload, OnSuccessPayload>
): Promise<LoaderPayload | null> {
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

export function hasLoadedOnce<DataType>(
  remoteObject: RemoteItem<DataType> | RemoteList<DataType> | undefined | null
) {
  return (
    !!remoteObject &&
    (remoteObject.isLoading ||
      !!remoteObject.error ||
      !!remoteObject.loaded ||
      'data' in remoteObject ||
      ('items' in remoteObject && remoteObject.items.length > 0) ||
      ('isStale' in remoteObject && remoteObject.isStale) ||
      ('mutating' in remoteObject &&
        (remoteObject.mutating as string[]).length > 0))
  );
}

export function useRemoteObject<
  DataType,
  LoaderPayload = DataType | DataType[],
  OnLoadPayload = void,
  OnSuccessPayload = DataType
>(
  hooks: Hooks<DataType, LoaderPayload, OnLoadPayload, OnSuccessPayload> & {
    hasLoadedOnce: () => boolean;
    isNecessary: () => boolean;
  }
) {
  const dispatch = useAppDispatch();
  const loadIsNecessary = hooks.isNecessary();

  const cacheKey = hooks.cacheKey || hooks.loader.toString();

  const getResourceCache = useResourceCache(cacheKey, () =>
    makePromise<DataType, LoaderPayload, OnLoadPayload, OnSuccessPayload>(
      dispatch,
      hooks
    )
  );

  useEffect(() => {
    if (!loadIsNecessary) {
      return;
    }

    const cache = getResourceCache();

    if (!cache) {
      return;
    }

    cache.fetch(!hooks.hasLoadedOnce());
  });
}

export default useRemoteObject;

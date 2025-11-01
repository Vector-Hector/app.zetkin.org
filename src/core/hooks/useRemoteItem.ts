import { PayloadAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';

import { RemoteItem } from 'utils/storeUtils';
import useRemoteObject, { hasLoadedOnce, Hooks } from './useRemoteObject';
import shouldLoad from 'core/caching/shouldLoad';

export default function useRemoteItem<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType
>(
  remoteItem: RemoteItem<DataType> | undefined | null,
  hooks: {
    actionOnError?: (err: unknown) => PayloadAction<unknown>;
    actionOnLoad: () => PayloadAction<OnLoadPayload>;
    actionOnSuccess: (items: DataType) => PayloadAction<OnSuccessPayload>;
    cacheKey?: string;
    isNecessary?: () => boolean;
    loader: () => Promise<DataType>;
  }
): DataType | null {
  const objHooks: Hooks<DataType, DataType, OnLoadPayload, OnSuccessPayload> =
    useMemo(
      () => ({
        ...hooks,
        hasLoadedOnce: () => hasLoadedOnce(remoteItem),
        isNecessary: () => hooks.isNecessary?.() ?? shouldLoad(remoteItem),
      }),
      [hooks, remoteItem]
    );

  useRemoteObject(objHooks);

  return remoteItem?.data || null;
}

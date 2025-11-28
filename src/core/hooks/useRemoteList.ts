import { PayloadAction } from '@reduxjs/toolkit';
import { useMemo } from 'react';

import { RemoteList } from 'utils/storeUtils';
import useRemoteObject, { hasLoadedOnce, Hooks } from './useRemoteObject';
import shouldLoad from 'core/caching/shouldLoad';

export default function useRemoteList<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType[]
>(
  remoteList: RemoteList<DataType> | undefined,
  hooks: {
    actionOnError?: (err: unknown) => PayloadAction<unknown>;
    actionOnLoad: () => PayloadAction<OnLoadPayload>;
    actionOnSuccess: (items: DataType[]) => PayloadAction<OnSuccessPayload>;
    cacheKey?: string;
    isNecessary?: () => boolean;
    loader: () => Promise<DataType[]>;
  }
): DataType[] {
  const objHooks: Hooks<DataType, DataType[], OnLoadPayload, OnSuccessPayload> =
    useMemo(
      () => ({
        ...hooks,
        hasLoadedOnce: () => hasLoadedOnce(remoteList),
        isNecessary: () =>
          hooks.isNecessary ? hooks.isNecessary() : shouldLoad(remoteList),
      }),
      [hooks, remoteList]
    );

  useRemoteObject(objHooks);

  return (remoteList?.items || [])
    .filter((item) => !item.deleted)
    .map((item) => item.data)
    .filter((data) => !!data) as DataType[];
}

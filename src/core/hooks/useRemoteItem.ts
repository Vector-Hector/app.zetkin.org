import { PayloadAction } from '@reduxjs/toolkit';

import { RemoteItem } from 'utils/storeUtils';
import useRemoteObject from './useRemoteObject';

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
  useRemoteObject(remoteItem, hooks);

  return remoteItem?.data || null;
}

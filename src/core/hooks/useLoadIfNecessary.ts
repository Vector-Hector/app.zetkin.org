import { useEffect, useState } from 'react';

import { RemoteItem, RemoteList } from 'utils/storeUtils';
import { AppDispatch } from '../store';
import { IFuture } from '../caching/futures';
import {
  Hooks,
  loadItemIfNecessary,
  loadListIfNecessary,
} from '../caching/cacheUtils';

type RemoteObject<T> = RemoteList<T> | RemoteItem<T>;

/**
 * Used by data fetching hooks to manage cache invalidation and fetching for their collection.
 * Never dynamically switch between a remote list and a remote item.
 *
 * A typical call to `useLoadIfNecessary` looks like this one.
 *
 * ```typescript
 * const hooks = useMemo(() => ({
 *   actionOnLoad: () => tasksLoad(),
 *   actionOnSuccess: (data) => tasksLoaded(data),
 *   loader: () =>
 *     apiClient.get<ZetkinTask[]>(
 *       `/api/orgs/${orgId}/campaigns/${campId}/tasks`
 *     ),
 * }), [tasksLoad, tasksLoaded, apiClient]);
 *
 * const tasksFuture = useLoadIfNecessary(tasksList, dispatch, hooks);
 * ```
 *
 * Under the hood, {@link shouldLoad shouldLoad} is used for cache invalidation.
 *
 * @category Cache
 * @param {RemoteList | RemoteItem} obj The remote list to check and load.
 * @param {AppDispatch} dispatch The Redux dispatch function.
 * @param {Object} hooks Callbacks to handle the loading process.
 * @return {IFuture} An {@link IFuture} object that can be used to render a loading spinner or the data itself.
 */
function useLoadIfNecessary<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType[]
>(
  obj: RemoteList<DataType> | undefined | null,
  dispatch: AppDispatch,
  hooks: Hooks<DataType[], OnLoadPayload, OnSuccessPayload>
): IFuture<DataType[]>;
function useLoadIfNecessary<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType
>(
  obj: RemoteItem<DataType> | undefined | null,
  dispatch: AppDispatch,
  hooks: Hooks<DataType, OnLoadPayload, OnSuccessPayload>
): IFuture<DataType>;
function useLoadIfNecessary<
  DataType,
  OnLoadPayload = void,
  OnSuccessPayload = DataType | DataType[]
>(
  obj: RemoteObject<DataType> | undefined | null,
  dispatch: AppDispatch,
  hooks: Hooks<DataType | DataType[]>
): IFuture<DataType | DataType[]> {
  const [futureState, setFutureState] = useState<
    IFuture<DataType | DataType[]>
  >({
    data: null,
    error: null,
    isLoading: false,
  });

  useEffect(() => {
    if (!obj) {
      return;
    }

    const isListVersion = Object.prototype.hasOwnProperty.call(obj, 'items');

    const wrappedHooks: Hooks<DataType | DataType[]> = {
      actionOnError: (err: unknown) => {
        setFutureState({
          data: null,
          error: err,
          isLoading: false,
        });
        if (!hooks.actionOnError) {
          return { payload: null, type: 'NO_OP' };
        }
        return hooks.actionOnError(err);
      },
      actionOnLoad: () => {
        setFutureState({
          data: null,
          error: null,
          isLoading: true,
        });
        return hooks.actionOnLoad();
      },
      actionOnSuccess: (data: DataType | DataType[]) => {
        setFutureState({
          data: data,
          error: null,
          isLoading: false,
        });
        return hooks.actionOnSuccess(data);
      },
      loader: async () => {
        return await hooks.loader();
      },
    };

    let result: IFuture<DataType> | IFuture<DataType[]>;
    if (isListVersion) {
      result = loadListIfNecessary<DataType, OnLoadPayload, OnSuccessPayload>(
        obj as RemoteList<DataType>,
        dispatch,
        wrappedHooks
      );
    } else {
      result = loadItemIfNecessary<DataType, OnLoadPayload, OnSuccessPayload>(
        obj as RemoteItem<DataType>,
        dispatch,
        wrappedHooks
      );
    }

    setFutureState({
      data: result.data,
      error: result.error,
      isLoading: result.isLoading,
    });
  }, [obj, dispatch, hooks.actionOnLoad, hooks.actionOnSuccess, hooks.loader]);

  return futureState;
}

export default useLoadIfNecessary;

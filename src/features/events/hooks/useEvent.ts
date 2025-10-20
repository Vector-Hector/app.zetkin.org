import { useMemo } from 'react';

import { IFuture } from 'core/caching/futures';
import { ZetkinEvent } from 'utils/types/zetkin';
import { eventLoad, eventLoaded } from '../store';
import { useApiClient, useAppDispatch, useAppSelector } from 'core/hooks';
import useLoadIfNecessary from 'core/hooks/useLoadIfNecessary';

export default function useEvent(
  orgId: number,
  id: number
): IFuture<ZetkinEvent> | null {
  const apiClient = useApiClient();
  const dispatch = useAppDispatch();
  const eventList = useAppSelector((state) => state.events.eventList);

  const item = eventList.items.find((item) => item.id == id);

  const hooks = useMemo(
    () => ({
      actionOnLoad: () => eventLoad(id),
      actionOnSuccess: (event: ZetkinEvent) => eventLoaded(event),
      loader: () =>
        apiClient.get<ZetkinEvent>(`/api/orgs/${orgId}/actions/${id}`),
    }),
    [orgId, id]
  );

  return useLoadIfNecessary(
    item && item.deleted ? null : item,
    dispatch,
    hooks
  );
}

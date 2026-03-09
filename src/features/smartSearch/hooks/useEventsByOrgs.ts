import {
  useApiClient,
  useAppDispatch,
  useAppSelector,
  useNumericRouteParams,
} from 'core/hooks';
import { ZetkinEvent } from 'utils/types/zetkin';
import {
  ErrorFuture,
  IFuture,
  LoadingFuture,
  ResolvedFuture,
} from 'core/caching/futures';
import { eventsByOrgLoad, eventsByOrgLoaded } from '../store';
import { loadListIfNecessary } from 'core/caching/cacheUtils';

export default function useEventsByOrgs(
  orgIds?: number[]
): IFuture<ZetkinEvent[]> {
  const apiClient = useApiClient();
  const { orgId } = useNumericRouteParams();
  const eventsState = useAppSelector(
    (state) => state.smartSearch.eventsByOrgId[orgId]
  );
  const dispatch = useAppDispatch();

  const eventsFuture = loadListIfNecessary(eventsState, dispatch, {
    actionOnLoad: () => eventsByOrgLoad(orgId),
    actionOnSuccess: (data) => eventsByOrgLoaded([orgId, data]),
    loader: () => apiClient.get(`/api/orgs/${orgId}/actions?recursive`),
  });

  if (!orgIds) {
    return eventsFuture;
  }

  if (eventsFuture.isLoading) {
    return new LoadingFuture();
  } else if (eventsFuture.error) {
    return new ErrorFuture(eventsFuture.error);
  } else {
    const orgIdSet = new Set(orgIds);
    return new ResolvedFuture(
      (eventsFuture.data || []).filter((event) =>
        orgIdSet.has(event.organization.id)
      )
    );
  }
}

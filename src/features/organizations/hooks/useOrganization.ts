import { useMemo } from 'react';

import { IFuture } from 'core/caching/futures';
import { ZetkinOrganization } from 'utils/types/zetkin';
import { organizationLoad, organizationLoaded } from '../store';
import { useApiClient, useAppDispatch, useAppSelector } from 'core/hooks';
import useLoadIfNecessary from 'core/hooks/useLoadIfNecessary';

const useOrganization = (orgId: number): IFuture<ZetkinOrganization> => {
  const dispatch = useAppDispatch();
  const apiClient = useApiClient();
  const organizationState = useAppSelector((state) => state.organizations);

  const hooks = useMemo(
    () => ({
      actionOnLoad: () => organizationLoad(),
      actionOnSuccess: (data) => organizationLoaded(data),
      loader: () => apiClient.get<ZetkinOrganization>(`/api/orgs/${orgId}`),
    }),
    [organizationLoad, organizationLoaded, apiClient]
  );

  return useLoadIfNecessary(organizationState.orgData, dispatch, hooks);
};

export default useOrganization;

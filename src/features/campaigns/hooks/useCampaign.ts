import { useCallback, useMemo } from 'react';

import { generateRandomColor } from 'utils/colorUtils';
import { ZetkinCampaign } from 'utils/types/zetkin';
import {
  campaignDeleted,
  campaignLoad,
  campaignLoaded,
  campaignUpdate,
  campaignUpdated,
} from '../store';
import { IFuture, PromiseFuture } from 'core/caching/futures';
import { useApiClient, useAppDispatch, useAppSelector } from 'core/hooks';
import useLoadIfNecessary from 'core/hooks/useLoadIfNecessary';

interface UseCampaignReturn {
  campaignFuture: IFuture<ZetkinCampaign>;
  deleteCampaign: () => void;
  updateCampaign: (data: Partial<ZetkinCampaign>) => IFuture<ZetkinCampaign>;
}

export default function useCampaign(
  orgId: number,
  campId: number
): UseCampaignReturn {
  const apiClient = useApiClient();
  const dispatch = useAppDispatch();
  const campaignsSlice = useAppSelector((state) => state.campaigns);
  const campaignItems = campaignsSlice.campaignList.items;

  const campaignItem = campaignItems.find((item) => item.id == campId);

  const campaignHooks = useMemo(
    () => ({
      actionOnLoad: () => campaignLoad(campId),
      actionOnSuccess: (data) => campaignLoaded(data),
      loader: async () => {
        const campaign = await apiClient.get<ZetkinCampaign>(
          `/api/orgs/${orgId}/campaigns/${campId}`
        );
        return {
          ...campaign,
          color: generateRandomColor(campaign.id.toString()),
        };
      },
    }),
    [orgId, campId, apiClient]
  );

  const campaignFuture = useLoadIfNecessary(
    campaignItem,
    dispatch,
    campaignHooks
  );

  const deleteCampaign = useCallback(() => {
    apiClient.delete(`/api/orgs/${orgId}/campaigns/${campId}`);
    dispatch(campaignDeleted([orgId, campId]));
  }, [orgId, campId, apiClient]);

  const updateCampaign = useCallback(
    (data: Partial<ZetkinCampaign>): IFuture<ZetkinCampaign> => {
      const mutatingAttributes = Object.keys(data);

      dispatch(campaignUpdate([campId, mutatingAttributes]));
      const promise = apiClient
        .patch<ZetkinCampaign>(`/api/orgs/${orgId}/campaigns/${campId}`, data)
        .then((data: ZetkinCampaign) => {
          dispatch(campaignUpdated(data));
          return data;
        });

      return new PromiseFuture(promise);
    },
    [orgId, campId, apiClient]
  );

  return { campaignFuture, deleteCampaign, updateCampaign };
}

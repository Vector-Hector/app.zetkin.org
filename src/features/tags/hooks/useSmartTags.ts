import { loadListIfNecessary } from 'core/caching/cacheUtils';
import { useApiClient, useAppDispatch, useAppSelector } from 'core/hooks';
import { fetchAllPaginated } from 'utils/fetchAllPaginated';
import { smartTagsLoad, smartTagsLoaded, smartTagsLoadFailed } from '../store';
import { ZetkinSmartTag } from '../types';

export default function useSmartTags(orgId: number) {
  const apiClient = useApiClient();
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.tags.smartTagsByOrgId[orgId]);

  return loadListIfNecessary(list, dispatch, {
    actionOnError: (error) => smartTagsLoadFailed([orgId, error]),
    actionOnLoad: () => smartTagsLoad(orgId),
    actionOnSuccess: (tags) => smartTagsLoaded([orgId, tags]),
    loader: () =>
      fetchAllPaginated<ZetkinSmartTag>((page) =>
        apiClient.get(`/api2/orgs/${orgId}/smart_tags?size=100&page=${page}`)
      ),
  });
}

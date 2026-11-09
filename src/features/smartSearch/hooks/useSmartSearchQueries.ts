import useSmartTags from 'features/tags/hooks/useSmartTags';
import { loadListIfNecessary } from 'core/caching/cacheUtils';
import { ZetkinQuery } from '../components/types';
import { queriesLoad, queriesLoaded } from '../store';
import { useApiClient, useAppDispatch, useAppSelector } from 'core/hooks';

export default function useSmartSearchQueries(orgId: number) {
  const apiClient = useApiClient();
  const dispatch = useAppDispatch();
  const list = useAppSelector((state) => state.smartSearch.queryList);

  const smartTags = useSmartTags(orgId).data || [];
  const future = loadListIfNecessary(list, dispatch, {
    actionOnLoad: () => queriesLoad(),
    actionOnSuccess: (queries) => queriesLoaded(queries),
    loader: () =>
      apiClient.get<ZetkinQuery[]>(`/api/orgs/${orgId}/people/queries`),
  });

  return {
    data:
      future.data?.map((query) => ({
        ...query,
        title:
          smartTags.find((tag) => tag.query_id === query.id)?.title ||
          query.title,
      })) || null,
    error: future.error,
    isLoading: future.isLoading,
  };
}

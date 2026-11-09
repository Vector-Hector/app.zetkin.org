import { useApiClient, useAppDispatch } from 'core/hooks';
import { ZetkinQuery } from 'features/smartSearch/components/types';
import { querySaved } from 'features/smartSearch/store';
import { smartTagDeleted, smartTagSaved } from '../store';
import useCreateTagGroup from './useCreateTagGroup';
import { SmartTagFormData, SmartTagInput, ZetkinSmartTag } from '../types';

export default function useSmartTagMutations(orgId: number) {
  const apiClient = useApiClient();
  const dispatch = useAppDispatch();
  const createTagGroup = useCreateTagGroup(orgId);
  const path = `/api2/orgs/${orgId}/smart_tags`;

  const createQuery = async (
    title: string,
    filterSpec: ZetkinQuery['filter_spec']
  ) => {
    const query = await apiClient.post<ZetkinQuery>(
      `/api/orgs/${orgId}/people/queries`,
      { filter_spec: filterSpec, title }
    );
    dispatch(querySaved(query));
    return query;
  };

  const resolveGroup = async ({ group, ...data }: SmartTagFormData) => ({
    ...data,
    group_id: group ? (await createTagGroup(group)).id : data.group_id,
  });

  return {
    async createSmartTag(
      data: SmartTagFormData,
      filterSpec: ZetkinQuery['filter_spec']
    ) {
      const body = await resolveGroup(data);
      const query = await createQuery(data.title, filterSpec);
      const tag = await apiClient.post<ZetkinSmartTag, SmartTagInput>(path, {
        ...body,
        query_id: query.id,
      });
      dispatch(smartTagSaved(tag));
      return tag;
    },
    async deleteSmartTag(tagId: number) {
      await apiClient.delete(`${path}/${tagId}`);
      dispatch(smartTagDeleted([orgId, tagId]));
    },
    async updateSmartTag(
      tagId: number,
      data: SmartTagInput & Pick<SmartTagFormData, 'group'>,
      filterSpec?: ZetkinQuery['filter_spec']
    ) {
      const { query_id, ...formData } = data;
      const body = { ...(await resolveGroup(formData)), query_id };
      if (filterSpec) {
        const query = await apiClient.patch<ZetkinQuery>(
          `/api/orgs/${orgId}/people/queries/${data.query_id}`,
          { filter_spec: filterSpec }
        );
        dispatch(querySaved(query));
      }
      const tag = await apiClient.patch<ZetkinSmartTag, SmartTagInput>(
        `${path}/${tagId}`,
        body
      );
      dispatch(smartTagSaved(tag));
      return tag;
    },
  };
}

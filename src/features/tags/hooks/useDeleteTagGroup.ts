import useSmartTagMutations from './useSmartTagMutations';
import { tagGroupDeleted } from '../store';
import { useApiClient, useAppDispatch, useAppSelector } from 'core/hooks';
import useTagMutations from 'features/tags/hooks/useTagMutations';

export default function useDeleteTagGroup(orgId: number) {
  const tagList = useAppSelector((state) => state.tags.tagList);
  const smartTagList = useAppSelector(
    (state) => state.tags.smartTagsByOrgId[orgId]
  );
  const { updateSmartTag } = useSmartTagMutations(orgId);
  const apiClient = useApiClient();
  const dispatch = useAppDispatch();
  const { updateTag } = useTagMutations(orgId);

  return async (tagGroupId: number) => {
    await apiClient.delete(`/api/orgs/${orgId}/tag_groups/${tagGroupId}`);
    dispatch(tagGroupDeleted(tagGroupId));

    for (const item of smartTagList?.items || []) {
      if (!item.deleted && item.data?.group_id === tagGroupId) {
        const { color, description, query_id, title } = item.data;
        await updateSmartTag(item.id as number, {
          color,
          description,
          group_id: null,
          query_id,
          title,
        });
      }
    }

    for (const tagItem of tagList.items) {
      if (tagItem.data?.group?.id == tagGroupId) {
        await updateTag({
          ...tagItem.data,
          group: undefined,
          group_id: undefined,
        });
      }
    }
  };
}

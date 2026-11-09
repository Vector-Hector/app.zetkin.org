import useTagGroups from './useTagGroups';
import useSmartTags from './useSmartTags';
import useTags from './useTags';
import { ZetkinTag } from 'utils/types/zetkin';

export default function useSelectableTags(orgId: number) {
  const groups = useTagGroups(orgId);
  const tags = useTags(orgId);
  const smartTags = useSmartTags(orgId);

  return {
    data: [
      ...(tags.data || []),
      ...(smartTags.data || []).map(
        (tag): ZetkinTag => ({
          color: tag.color,
          description: tag.description || '',
          group:
            groups.data?.find((group) => group.id === tag.group_id) || null,
          hidden: false,
          id: -tag.id,
          organization: { id: tag.organization_id, title: '' },
          title: tag.title,
          value_type: null,
        })
      ),
    ],
    error: tags.error || smartTags.error || groups.error,
    isLoading: tags.isLoading || smartTags.isLoading || groups.isLoading,
  };
}

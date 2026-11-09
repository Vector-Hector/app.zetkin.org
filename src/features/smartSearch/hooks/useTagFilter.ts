import { useNumericRouteParams } from 'core/hooks';
import useSmartTags from 'features/tags/hooks/useSmartTags';
import {
  AnyFilterConfig,
  CONDITION_OPERATOR,
  FILTER_TYPE,
  IN_OPERATOR,
  NewSmartSearchFilter,
  SmartSearchFilterWithId,
} from '../components/types';

export default function useTagFilter<
  T extends SmartSearchFilterWithId<AnyFilterConfig> | NewSmartSearchFilter,
>(filter: T): T {
  const { orgId } = useNumericRouteParams();
  const smartTags = useSmartTags(orgId).data || [];
  const queryId =
    filter.type === FILTER_TYPE.SUB_QUERY &&
    'config' in filter &&
    'query_id' in filter.config
      ? filter.config.query_id
      : undefined;
  const smartTag = smartTags.find((tag) => tag.query_id === queryId);

  if (!smartTag || !('config' in filter)) {
    return filter;
  }

  return {
    ...filter,
    config: {
      condition:
        'operator' in filter.config &&
        filter.config.operator === IN_OPERATOR.NOTIN
          ? CONDITION_OPERATOR.NONE
          : CONDITION_OPERATOR.ALL,
      tags: [-smartTag.id],
    },
    type: FILTER_TYPE.PERSON_TAGS,
  };
}

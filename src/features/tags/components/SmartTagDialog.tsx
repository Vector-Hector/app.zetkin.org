import useTagGroups from '../hooks/useTagGroups';
import TagDialog from './TagManager/components/TagDialog';
import useSmartTagMutations from '../hooks/useSmartTagMutations';
import { ZetkinSmartTag } from '../types';

export default function SmartTagDialog({
  onClose,
  onDelete,
  orgId,
  tag,
}: {
  onClose: () => void;
  onDelete?: () => void;
  orgId: number;
  tag: ZetkinSmartTag;
}) {
  const groups = useTagGroups(orgId).data || [];
  const { updateSmartTag } = useSmartTagMutations(orgId);

  return (
    <TagDialog
      groups={groups}
      onClose={onClose}
      onDelete={onDelete}
      onSubmit={() => undefined}
      onSubmitSmartTag={(data, filters) =>
        updateSmartTag(tag.id, { ...data, query_id: tag.query_id }, filters)
      }
      open
      tag={tag}
    />
  );
}

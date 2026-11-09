import { Autocomplete, TextField } from '@mui/material';

import { useMessages } from 'core/i18n';
import { useNumericRouteParams } from 'core/hooks';
import useTagGroups from '../hooks/useTagGroups';
import useSmartTags from '../hooks/useSmartTags';
import messageIds from '../l10n/messageIds';
import { ZetkinSmartTag } from '../types';

export default function SmartTagSelect({
  onChange,
  value = null,
}: {
  onChange: (tag: ZetkinSmartTag | null) => void;
  value?: ZetkinSmartTag | null;
}) {
  const { orgId } = useNumericRouteParams();
  const groups = useTagGroups(orgId).data || [];
  const tags = useSmartTags(orgId);
  const messages = useMessages(messageIds);

  const groupTitle = (tag: ZetkinSmartTag) =>
    groups.find((group) => group.id === tag.group_id)?.title ||
    messages.manager.ungroupedHeader();

  return (
    <Autocomplete
      getOptionLabel={(tag) => tag.title}
      groupBy={groupTitle}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      loading={tags.isLoading}
      onChange={(_, tag) => onChange(tag)}
      options={[...(tags.data || [])].sort(
        (first, second) =>
          groupTitle(first).localeCompare(groupTitle(second)) ||
          first.title.localeCompare(second.title)
      )}
      renderInput={(params) => (
        <TextField {...params} label={messages.smartTags.select()} />
      )}
      sx={{ minWidth: 250 }}
      value={value}
    />
  );
}

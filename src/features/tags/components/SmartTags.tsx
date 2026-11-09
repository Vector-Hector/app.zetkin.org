import { Alert, Box, Chip, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import { ApiClientError } from 'core/api/errors';
import { useApiClient } from 'core/hooks';
import { useMessages } from 'core/i18n';
import useTagGroups from '../hooks/useTagGroups';
import useSmartTags from '../hooks/useSmartTags';
import messageIds from '../l10n/messageIds';
import { DEFAULT_TAG_COLOR } from './TagManager/utils';
import { getContrastColor } from 'utils/colorUtils';

export default function SmartTags({
  orgId,
  personId,
}: {
  orgId: number;
  personId: number;
}) {
  const messages = useMessages(messageIds);
  const apiClient = useApiClient();
  const tagsFuture = useSmartTags(orgId);
  const groups = useTagGroups(orgId).data || [];
  const [matchingIds, setMatchingIds] = useState<number[]>([]);
  const [matchError, setMatchError] = useState(false);
  const tags = tagsFuture.data;

  const tagQueries = JSON.stringify(
    tags?.map((tag) => [tag.id, tag.query_id]) || []
  );

  useEffect(() => {
    let active = true;
    setMatchingIds([]);
    setMatchError(false);
    if (personId !== undefined) {
      Promise.all(
        (JSON.parse(tagQueries) as [number, number][]).map(
          async ([id, queryId]) => {
            try {
              await apiClient.get(
                `/api/orgs/${orgId}/people/queries/${queryId}/matches/${personId}`
              );
              return id;
            } catch (error) {
              if (error instanceof ApiClientError && error.status === 404) {
                return null;
              }
              throw error;
            }
          }
        )
      )
        .then((ids) => {
          if (active) {
            setMatchingIds(ids.filter((id): id is number => id !== null));
          }
        })
        .catch(() => active && setMatchError(true));
    }
    return () => {
      active = false;
    };
  }, [apiClient, orgId, personId, tagQueries]);

  const visibleTags = (tags || []).filter(
    (tag) => personId === undefined || matchingIds.includes(tag.id)
  );

  return (
    <Box>
      <Typography variant="overline">{messages.smartTags.title()}</Typography>
      {(tagsFuture.error || matchError) && (
        <Alert severity="error">{messages.smartTags.error()}</Alert>
      )}
      {Array.from(new Set(visibleTags.map((tag) => tag.group_id))).map(
        (groupId) => (
          <Box key={groupId ?? 'ungrouped'} sx={{ marginBottom: 1 }}>
            <Typography variant="overline">
              {groups.find((group) => group.id === groupId)?.title ||
                messages.manager.ungroupedHeader()}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {visibleTags
                .filter((tag) => tag.group_id === groupId)
                .map((tag) => (
                  <Chip
                    key={tag.id}
                    label={tag.title}
                    sx={{
                      backgroundColor: tag.color || DEFAULT_TAG_COLOR,
                      color: getContrastColor(tag.color || DEFAULT_TAG_COLOR),
                    }}
                    title={tag.description || messages.smartTags.membership()}
                  />
                ))}
            </Box>
          </Box>
        )
      )}
    </Box>
  );
}

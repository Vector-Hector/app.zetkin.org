'use client';

import { Box } from '@mui/system';
import { FC, PropsWithChildren, useMemo } from 'react';
import NextLink from 'next/link';

import ActivistPortalHeader from '../components/ActivistPortlHeader';
import ZUIOrgLogoAvatar from 'zui/components/ZUIOrgLogoAvatar';
import ZUIText from 'zui/components/ZUIText';
import { useMessages } from 'core/i18n';
import messageIds from '../l10n/messageIds';
import ZUITimeSpan from 'zui/ZUITimeSpan';
import useIsMobile from 'utils/hooks/useIsMobile';
import { removeOffset } from 'utils/dateUtils';
import useMyAreaAssignments from '../../canvass/hooks/useMyAreaAssignments';
import useOrganization from '../hooks/useOrganization';
import ZUIFutures from 'zui/ZUIFutures';

type Props = PropsWithChildren<{
  areaAssId: number;
}>;

export const PublicCanvassLayout: FC<Props> = ({ children, areaAssId }) => {
  const assignments = useMyAreaAssignments();
  const assignment = useMemo(
    () => assignments.find((assignment) => assignment.id == areaAssId),
    [assignments, areaAssId]
  );

  const orgFuture = useOrganization(assignment.organization_id);

  const messages = useMessages(messageIds);
  const isMobile = useIsMobile();

  return (
    <ZUIFutures futures={{ org: orgFuture }}>
      {({ data: { org } }) => (
        <Box
          sx={{
            minHeight: '100dvh',
          }}
        >
          <Box
            sx={{
              marginX: 'auto',
              maxWidth: 960,
            }}
          >
            <Box bgcolor="white">
              <ActivistPortalHeader
                subtitle={
                  <Box
                    sx={{
                      alignItems: isMobile ? 'flex-start' : 'center',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: 1,
                    }}
                  >
                    <ZUIText>
                      {assignment.start_date && assignment.end_date && (
                        <ZUITimeSpan
                          end={new Date(removeOffset(assignment.end_date))}
                          start={new Date(removeOffset(assignment.start_date))}
                        />
                      )}
                    </ZUIText>
                  </Box>
                }
                title={assignment.title || messages.eventPage.defaultTitle()}
                topLeftComponent={
                  <NextLink href={`/o/${assignment.organization_id}`} passHref>
                    <Box
                      sx={{
                        alignItems: 'center',
                        display: 'inline-flex',
                        gap: 1,
                      }}
                    >
                      <ZUIOrgLogoAvatar
                        orgId={assignment.organization_id}
                        size="small"
                      />
                      <ZUIText>{org.title ?? ''}</ZUIText>
                    </Box>
                  </NextLink>
                }
              />
            </Box>
            {children}
          </Box>
        </Box>
      )}
    </ZUIFutures>
  );
};
export default PublicCanvassLayout;

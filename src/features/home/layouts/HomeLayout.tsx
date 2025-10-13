'use client';

import { Box } from '@mui/material';
import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Home, Settings, Event } from '@mui/icons-material';

import { useMessages } from 'core/i18n';
import messageIds from '../l10n/messageIds';
import ZUIPublicFooter from 'zui/components/ZUIPublicFooter';
import ActivistPortalHeader from 'features/organizations/components/ActivistPortlHeader';

type Props = {
  children: ReactNode;
  title?: string;
};

const HomeLayout: FC<Props> = ({ children, title }) => {
  const messages = useMessages(messageIds);

  const path = usePathname();
  const lastSegment = path?.split('/').pop() ?? 'home';

  return (
    <Box
      sx={{
        marginX: 'auto',
        maxWidth: 960,
      }}
    >
      <ActivistPortalHeader
        selectedTab={lastSegment}
        tabs={[
          {
            href: `/my/home`,
            label: messages.tabs.home(),
            value: 'home',
            icon: Home,
          },
          {
            href: `/my/feed`,
            label: messages.tabs.feed(),
            value: 'feed',
            icon: Event,
          },
          {
            href: `/my/settings`,
            label: messages.tabs.settings(),
            value: 'settings',
            icon: Settings,
          },
        ]}
        title={title || messages.title()}
      />
      <Box minHeight="90dvh">{children}</Box>
      <ZUIPublicFooter />
    </Box>
  );
};

export default HomeLayout;

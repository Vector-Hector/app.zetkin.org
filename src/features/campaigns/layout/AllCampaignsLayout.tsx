import { FunctionComponent } from 'react';

import CampaignsActionButtons from '../components/CampaignsActionButtons';
import TabbedLayout from '../../../utils/layout/TabbedLayout';
import { useMessages } from 'core/i18n';
import messageIds from '../l10n/messageIds';
import { useOrgPathParam } from 'core/hooks/useOrgPathParam';

interface AllCampaignsLayoutProps {
  children: React.ReactNode;
  fixedHeight?: boolean;
}

const AllCampaignsLayout: FunctionComponent<AllCampaignsLayoutProps> = ({
  children,
  fixedHeight,
}) => {
  const orgPathParam = useOrgPathParam();
  const messages = useMessages(messageIds);

  return (
    <TabbedLayout
      actionButtons={<CampaignsActionButtons />}
      baseHref={`/organize/${orgPathParam}/projects`}
      defaultTab="/"
      fixedHeight={fixedHeight}
      tabs={[
        { href: `/`, label: messages.layout.overview() },
        {
          href: `/calendar`,
          label: messages.layout.calendar(),
        },
        {
          href: '/activities',
          label: messages.layout.activities(),
        },
        {
          href: '/archive',
          label: messages.layout.archive(),
        },
      ]}
      title={messages.layout.allCampaigns()}
    >
      {children}
    </TabbedLayout>
  );
};

export default AllCampaignsLayout;

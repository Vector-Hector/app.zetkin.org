'use client';

import StyledGroupedSelect from 'features/smartSearch/components/inputs/StyledGroupedSelect';
import useMessages from 'core/i18n/useMessages';
import messageIds from 'features/smartSearch/l10n/messageIds';
import useCampaigns from 'features/campaigns/hooks/useCampaigns';

const localMessageIds = messageIds.filters.campaignParticipation;
const DEFAULT_VALUE = 'any';

export default function Page() {
  const messages = useMessages(localMessageIds);
  const campaignsFuture = useCampaigns(1);
  const campaigns = campaignsFuture.data;
  if (!campaigns) {
    return null;
  }

  return (
    <StyledGroupedSelect
      items={[
        {
          group: null,
          id: DEFAULT_VALUE,
          label: messages.campaignSelect.any(),
        },
        ...campaigns.map((campaign) => ({
          group: campaign.organization.title,
          id: campaign.id,
          label: campaign.title,
        })),
      ]}
      onChange={(e) => {
        // handleCampaignSelectChange(e.target.value);
        console.log('hellooo');
      }}
      value={DEFAULT_VALUE}
    />
  );
}

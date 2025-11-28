'use server';

import { FC } from 'react';

import PublicOrgPage from 'features/public/pages/PublicOrgPage';

type Props = {
  params: Promise<{
    orgId: number;
  }>;
};

const Page = async (props: Props) => {
  const params = await props.params;
  return <PublicOrgPage orgId={params.orgId} />;
};

export default Page;

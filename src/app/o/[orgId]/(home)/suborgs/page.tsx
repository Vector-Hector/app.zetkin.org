'use server';

import { FC } from 'react';

import SubOrgsPage from 'features/public/pages/SubOrgsPage';

type Props = {
  params: Promise<{
    orgId: number;
  }>;
};

const Page = async (props: Props) => {
  const params = await props.params;
  return <SubOrgsPage orgId={params.orgId} />;
};

export default Page;

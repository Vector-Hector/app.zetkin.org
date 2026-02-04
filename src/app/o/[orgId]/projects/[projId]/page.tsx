'use server';

import PublicProjPage from 'features/public/pages/PublicProjPage';

type Props = {
  params: Promise<{
    orgId: number;
    projId: number;
  }>;
};

const Page = async (props: Props) => {
  const params = await props.params;
  return <PublicProjPage campId={params.projId} orgId={params.orgId} />;
};

export default Page;

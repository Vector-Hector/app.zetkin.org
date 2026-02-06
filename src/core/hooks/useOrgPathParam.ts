import { useRouter } from 'next/router';

export const useOrgPathParam = () => {
  const { orgId: orgSlugOrId } = useRouter().query;
  if (Array.isArray(orgSlugOrId)) {
    return orgSlugOrId[0];
  }
  return orgSlugOrId;
};

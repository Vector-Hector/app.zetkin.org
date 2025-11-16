'use server';

import Iron from '@hapi/iron';
import { notFound } from 'next/navigation';

import { renderJoinForm } from 'features/joinForms/components/EmbeddedJoinForm';
import { EmbeddedJoinFormData } from 'features/joinForms/types';
import { EmbeddedJoinFormStyles } from 'features/joinForms/components/EmbeddedJoinFormStyles';

type PageProps = {
  params: {
    formData: string;
    orgId: string;
  };
  searchParams: {
    stylesheet?: string;
  };
};

export default async function Page({ params, searchParams }: PageProps) {
  const { formData } = params;

  try {
    const formDataStr = decodeURIComponent(formData);
    const formDataObj = (await Iron.unseal(
      formDataStr,
      process.env.SESSION_PASSWORD || '',
      Iron.defaults
    )) as EmbeddedJoinFormData;

    return (
      <div>
        {
          await renderJoinForm({
            encrypted: formDataStr,
            fields: formDataObj.fields,
            orgId: params.orgId,
            stylesheet: searchParams.stylesheet,
          })
        }
        <EmbeddedJoinFormStyles stylesheet={searchParams.stylesheet} />
      </div>
    );
  } catch (err) {
    return notFound();
  }
}

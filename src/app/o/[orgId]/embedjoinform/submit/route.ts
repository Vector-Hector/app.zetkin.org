import { NextRequest } from 'next/server';

import submitJoinForm from 'features/joinForms/actions/submitEmbeddedJoinForm';

export const POST = async (request: NextRequest) => {
  const url = new URL(request.url);
  const stylesheet = url.searchParams.get('stylesheet') ?? undefined;

  const formData = await request.formData();
  await submitJoinForm(formData, stylesheet);
};

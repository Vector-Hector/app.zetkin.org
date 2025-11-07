import { z } from 'zod';

import IApiClient from 'core/api/client/IApiClient';
import { makeRPCDef } from 'core/rpc/types';
import { ZetkinSurveyOption } from 'utils/types/zetkin';

const paramsSchema = z.object({
  elemId: z.number(),
  options: z.array(z.string()),
  orgId: z.number(),
  surveyId: z.number(),
});

type Params = z.input<typeof paramsSchema>;
type Result = {
  addedOptions: ZetkinSurveyOption[];
  removedOptions: ZetkinSurveyOption[];
};

export const addBulkOptionsDef = {
  handler: handle,
  name: 'addBulkOptions',
  schema: paramsSchema,
};

export default makeRPCDef<Params, Result>(addBulkOptionsDef.name);

async function handle(params: Params, apiClient: IApiClient): Promise<Result> {
  const { orgId, surveyId, elemId, options } = params;

  const existingOptions = await apiClient.get<ZetkinSurveyOption[]>(
    `/api/orgs/${orgId}/surveys/${surveyId}/elements/${elemId}/options`
  );

  const addedOptions = await Promise.all(
    options.map((optionText) =>
      apiClient.post<ZetkinSurveyOption>(
        `/api/orgs/${orgId}/surveys/${surveyId}/elements/${elemId}/options`,
        { text: optionText }
      )
    )
  );

  // Delete all empty options
  const removedOptions = (
    await Promise.all(
      existingOptions.map(async (oldOption) => {
        if (oldOption.text.trim() == '') {
          await apiClient.delete(
            `/api/orgs/${orgId}/surveys/${surveyId}/elements/${elemId}/options/${oldOption.id}`
          );
          return oldOption;
        }
        return null;
      })
    )
  ).filter((option) => !!option);

  return {
    addedOptions,
    removedOptions,
  };
}

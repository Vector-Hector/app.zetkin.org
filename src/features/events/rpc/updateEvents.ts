import { z } from 'zod';

import IApiClient from 'core/api/client/IApiClient';
import { makeRPCDef } from 'core/rpc/types';
import { ZetkinEvent } from 'utils/types/zetkin';

const paramsSchema = z.object({
  events: z.array(
    z.object({
      cancelled: z.string().nullable().optional(),
      end_time: z.string().optional(),
      id: z.number(),
      published: z.string().nullable().optional(),
      start_time: z.string().optional(),
    })
  ),
  orgId: z.string(),
});

type Params = z.input<typeof paramsSchema>;
type Result = ZetkinEvent[];

export const updateEventsDef = {
  handler: handle,
  name: 'updateEvents',
  schema: paramsSchema,
};

export default makeRPCDef<Params, Result>(updateEventsDef.name);

async function handle(params: Params, apiClient: IApiClient): Promise<Result> {
  const { events, orgId } = params;
  return await Promise.all(
    events.map(async (event) => {
      const { id, ...data } = event;
      return await apiClient.patch<ZetkinEvent>(
        `/api/orgs/${orgId}/actions/${id}`,
        data
      );
    })
  );
}

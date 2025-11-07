import { z } from 'zod';

import IApiClient from 'core/api/client/IApiClient';
import { makeRPCDef } from 'core/rpc/types';

const paramsSchema = z.object({
  events: z.array(z.number()),
  orgId: z.number(),
});

type Params = z.input<typeof paramsSchema>;
type Result = {
  removedEvents: number[];
};

export const deleteEventsDef = {
  handler: handle,
  name: 'deleteEvents',
  schema: paramsSchema,
};

export default makeRPCDef<Params, Result>(deleteEventsDef.name);

async function handle(params: Params, apiClient: IApiClient): Promise<Result> {
  const { events, orgId } = params;

  return {
    removedEvents: await Promise.all(
      events.map(async (eventId) => {
        await apiClient.delete(`/api/orgs/${orgId}/actions/${eventId}`);
        return eventId;
      })
    ),
  };
}

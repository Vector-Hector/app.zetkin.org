import { expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import createStore from 'core/store';
import { makeWrapper } from 'utils/testing';
import mockApiClient from 'utils/testing/mocks/mockApiClient';
import mockState from 'utils/testing/mocks/mockState';
import { remoteListLoaded } from 'utils/storeUtils';
import useDeleteTagGroup from './useDeleteTagGroup';

it('clears smart tag group links without changing their membership queries', async () => {
  const state = mockState();
  const tag = {
    color: null,
    description: null,
    group_id: 10,
    id: 1,
    organization_id: 1,
    query_id: 123,
    title: 'Smart',
  };
  state.tags.tagList = remoteListLoaded([]);
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([tag]);
  const apiClient = mockApiClient();
  apiClient.patch.mockResolvedValueOnce({ ...tag, group_id: null });
  const store = createStore(state);
  const { result } = renderHook(() => useDeleteTagGroup(1), {
    wrapper: makeWrapper(store, apiClient),
  });
  await act(async () => {
    await result.current(10);
  });
  expect(apiClient.delete).toHaveBeenCalledWith('/api/orgs/1/tag_groups/10');
  expect(apiClient.patch).toHaveBeenCalledWith('/api2/orgs/1/smart_tags/1', {
    color: null,
    description: null,
    group_id: null,
    query_id: 123,
    title: 'Smart',
  });
  expect(apiClient.patch).toHaveBeenCalledTimes(1);
  expect(
    store.getState().tags.smartTagsByOrgId[1].items[0].data?.group_id
  ).toBeNull();
});

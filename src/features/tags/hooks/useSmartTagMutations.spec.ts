import { describe, expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import createStore from 'core/store';
import { FILTER_TYPE, OPERATION } from 'features/smartSearch/components/types';
import { makeWrapper } from 'utils/testing';
import mockApiClient from 'utils/testing/mocks/mockApiClient';
import mockTag from 'utils/testing/mocks/mockTag';
import mockState from 'utils/testing/mocks/mockState';
import { remoteListLoaded } from 'utils/storeUtils';
import useSmartTagMutations from './useSmartTagMutations';
import { ZetkinSmartTag } from '../types';

const input = {
  color: '#ff8800',
  description: null,
  group_id: null,
  title: 'Active volunteers',
};
const filters = [{ config: {}, op: OPERATION.ADD, type: FILTER_TYPE.ALL }];
const query = { filter_spec: filters, id: 123 };
const tag = { ...input, id: 1, organization_id: 1, query_id: query.id };

function setup() {
  const apiClient = mockApiClient();
  const state = mockState();
  state.tags.tagGroupList = remoteListLoaded([]);
  state.tags.tagList = remoteListLoaded([mockTag({ id: 1 })]);
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([tag]);
  const store = createStore(state);
  const { result } = renderHook(() => useSmartTagMutations(1), {
    wrapper: makeWrapper(store, apiClient),
  });
  return { apiClient, result, store };
}

describe('useSmartTagMutations', () => {
  it('waits for a saved Core 1 query before creating the Core 2 smart tag', async () => {
    const { apiClient, result, store } = setup();
    let resolveQuery: (value: typeof query) => void = () => undefined;
    const pendingQuery = new Promise<typeof query>((resolve) => {
      resolveQuery = resolve;
    });
    apiClient.post.mockResolvedValueOnce(pendingQuery);
    apiClient.post.mockResolvedValueOnce(tag);
    let creation: Promise<ZetkinSmartTag>;
    await act(async () => {
      creation = result.current.createSmartTag(input, filters);
    });
    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(apiClient.post).toHaveBeenCalledWith('/api/orgs/1/people/queries', {
      filter_spec: filters,
      title: input.title,
    });
    await act(async () => {
      resolveQuery(query);
      await creation;
    });
    expect(apiClient.post).toHaveBeenLastCalledWith(
      '/api2/orgs/1/smart_tags',
      tagBody()
    );
    expect(store.getState().tags.smartTagsByOrgId[1].items[0].data).toEqual(
      tag
    );
  });

  it('creates a smart tag in an existing group', async () => {
    const { apiClient, result } = setup();
    apiClient.post
      .mockResolvedValueOnce(query)
      .mockResolvedValueOnce({ ...tag, group_id: 10 });
    await act(async () => {
      await result.current.createSmartTag({ ...input, group_id: 10 }, filters);
    });
    expect(apiClient.post).toHaveBeenLastCalledWith('/api2/orgs/1/smart_tags', {
      ...tagBody(),
      group_id: 10,
    });
    expect(apiClient.post).toHaveBeenCalledTimes(2);
  });

  it('creates an inline group before linking a smart tag to it', async () => {
    const { apiClient, result, store } = setup();
    apiClient.post
      .mockResolvedValueOnce({ id: 10, title: 'Volunteers' })
      .mockResolvedValueOnce(query)
      .mockResolvedValueOnce({ ...tag, group_id: 10 });
    await act(async () => {
      await result.current.createSmartTag(
        { ...input, group: { title: 'Volunteers' } },
        filters
      );
    });
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/api/orgs/1/tag_groups',
      { title: 'Volunteers' }
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      3,
      '/api2/orgs/1/smart_tags',
      { ...tagBody(), group_id: 10 }
    );
    expect(store.getState().tags.tagGroupList.isLoading).toBe(false);
  });

  it('does not create a smart tag when saving its query fails', async () => {
    const { apiClient, result } = setup();
    apiClient.post.mockRejectedValueOnce(new Error('Query rejected'));
    await expect(result.current.createSmartTag(input, filters)).rejects.toThrow(
      'Query rejected'
    );
    expect(apiClient.post).toHaveBeenCalledTimes(1);
  });

  it('patches metadata and a query link without modifying the saved query', async () => {
    const { apiClient, result } = setup();
    apiClient.patch.mockResolvedValueOnce(tag);
    await act(async () => {
      await result.current.updateSmartTag(1, tagBody());
    });
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api2/orgs/1/smart_tags/1',
      tagBody()
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('updates the linked query so existing filters and columns retain dynamic membership', async () => {
    const { apiClient, result } = setup();
    apiClient.patch.mockResolvedValueOnce(query).mockResolvedValueOnce(tag);
    await act(async () => {
      await result.current.updateSmartTag(1, tagBody(), filters);
    });
    expect(apiClient.patch).toHaveBeenNthCalledWith(
      1,
      '/api/orgs/1/people/queries/123',
      { filter_spec: filters }
    );
    expect(apiClient.patch).toHaveBeenNthCalledWith(
      2,
      '/api2/orgs/1/smart_tags/1',
      tagBody()
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('deletes only the smart tag and preserves ordinary tags with the same ID', async () => {
    const { apiClient, result, store } = setup();
    await act(async () => {
      await result.current.deleteSmartTag(1);
    });
    expect(store.getState().tags.tagList.items[0].deleted).toBeFalsy();
    expect(apiClient.delete).toHaveBeenCalledTimes(1);
    expect(apiClient.delete).toHaveBeenCalledWith('/api2/orgs/1/smart_tags/1');
    expect(
      store.getState().tags.smartTagsByOrgId[1].items[0].deleted
    ).toBeTruthy();
  });
});

function tagBody() {
  return { ...input, query_id: query.id };
}

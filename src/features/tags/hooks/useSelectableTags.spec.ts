import { expect, it } from '@jest/globals';
import { act, renderHook } from '@testing-library/react';

import createStore from 'core/store';
import { makeWrapper } from 'utils/testing';
import mockApiClient from 'utils/testing/mocks/mockApiClient';
import mockState from 'utils/testing/mocks/mockState';
import mockTag from 'utils/testing/mocks/mockTag';
import { remoteListLoaded } from 'utils/storeUtils';
import { tagGroupDeleted, tagGroupUpdated } from '../store';
import useSelectableTags from './useSelectableTags';

it('keeps ordinary and smart tags with the same ID independently selectable', () => {
  const state = mockState();
  state.tags.tagGroupList = remoteListLoaded([]);
  state.tags.tagList = remoteListLoaded([
    mockTag({ id: 1, title: 'Ordinary' }),
  ]);
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([
    {
      color: '#ff8800',
      description: null,
      group_id: null,
      id: 1,
      organization_id: 1,
      query_id: 123,
      title: 'Smart',
    },
  ]);
  const apiClient = mockApiClient();
  const { result } = renderHook(() => useSelectableTags(1), {
    wrapper: makeWrapper(createStore(state), apiClient),
  });
  expect(result.current.data.map((tag) => [tag.id, tag.title])).toEqual([
    [1, 'Ordinary'],
    [-1, 'Smart'],
  ]);
  expect(result.current.data[1].group).toBeNull();
  expect(apiClient.get).not.toHaveBeenCalled();
});

it('uses shared group names and ungroups smart tags when the group is deleted', () => {
  const state = mockState();
  const group = {
    id: 10,
    organization: { id: 1, title: 'Organization' },
    title: 'Volunteers',
  };
  state.tags.tagGroupList = remoteListLoaded([group]);
  state.tags.tagList = remoteListLoaded([]);
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([
    {
      color: null,
      description: null,
      group_id: 10,
      id: 1,
      organization_id: 1,
      query_id: 123,
      title: 'Smart',
    },
  ]);
  const store = createStore(state);
  const { result } = renderHook(() => useSelectableTags(1), {
    wrapper: makeWrapper(store),
  });
  expect(result.current.data[0].group?.title).toBe('Volunteers');
  act(() => {
    store.dispatch(tagGroupUpdated({ ...group, title: 'Renamed' }));
  });
  expect(result.current.data[0].group?.title).toBe('Renamed');
  act(() => {
    store.dispatch(tagGroupDeleted(10));
  });
  expect(result.current.data[0].group).toBeNull();
  expect(
    store.getState().tags.smartTagsByOrgId[1].items[0].data?.group_id
  ).toBeNull();
});

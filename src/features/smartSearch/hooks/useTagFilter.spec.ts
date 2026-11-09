import { beforeEach, expect, it, jest } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react';
import singletonRouter from 'next/router';

import createStore from 'core/store';
import { makeWrapper } from 'utils/testing';
import mockApiClient from 'utils/testing/mocks/mockApiClient';
import mockState from 'utils/testing/mocks/mockState';
import { remoteListLoaded } from 'utils/storeUtils';
import {
  CONDITION_OPERATOR,
  FILTER_TYPE,
  IN_OPERATOR,
  OPERATION,
} from '../components/types';
import useTagFilter from './useTagFilter';

jest.mock('next/dist/client/router', () =>
  jest.requireActual('next-router-mock')
);

beforeEach(() => {
  singletonRouter.query = { orgId: '1' };
});

const filter = {
  config: { operator: IN_OPERATOR.IN, query_id: 123 },
  id: 7,
  op: OPERATION.SUB,
  type: FILTER_TYPE.SUB_QUERY,
};

it('leaves saved queries without a matching smart tag unchanged', () => {
  const state = mockState();
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([]);
  const { result } = renderHook(() => useTagFilter(filter), {
    wrapper: makeWrapper(createStore(state)),
  });
  expect(result.current).toBe(filter);
});

it('loads all pages of smart tags and recognizes a query from a later page', async () => {
  const tag = {
    color: null,
    description: null,
    group_id: null,
    id: 101,
    organization_id: 1,
    query_id: 123,
    title: 'Active volunteers',
  };
  const apiClient = mockApiClient();
  apiClient.get
    .mockResolvedValueOnce(
      Array.from({ length: 100 }, (_, index) => ({
        ...tag,
        id: index + 1,
        query_id: index + 1000,
      }))
    )
    .mockResolvedValueOnce([tag]);
  const { result } = renderHook(() => useTagFilter(filter), {
    wrapper: makeWrapper(createStore(mockState()), apiClient),
  });
  await waitFor(() => {
    expect(result.current).toEqual({
      config: { condition: CONDITION_OPERATOR.ALL, tags: [-101] },
      id: 7,
      op: OPERATION.SUB,
      type: FILTER_TYPE.PERSON_TAGS,
    });
  });
  expect(apiClient.get).toHaveBeenCalledWith(
    '/api2/orgs/1/smart_tags?size=100&page=1'
  );
  expect(apiClient.get).toHaveBeenCalledWith(
    '/api2/orgs/1/smart_tags?size=100&page=2'
  );
  expect(filter.config).toEqual({ operator: IN_OPERATOR.IN, query_id: 123 });
});

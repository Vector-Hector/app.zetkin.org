import { describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import createStore from 'core/store';
import { ApiClientError } from 'core/api/errors';
import { makeWrapper } from 'utils/testing';
import mockApiClient from 'utils/testing/mocks/mockApiClient';
import mockState from 'utils/testing/mocks/mockState';
import { remoteListLoaded } from 'utils/storeUtils';
import SmartTags from './SmartTags';

jest.mock('features/organizations/hooks/useMembership', () => ({
  __esModule: true,
  default: () => ({ data: { role: 'organizer' } }),
}));

jest.mock('./SmartTagDialog', () => ({
  __esModule: true,
  default: () => null,
}));

const tag = {
  color: null,
  description: null,
  group_id: null,
  id: 1,
  organization_id: 1,
  query_id: 123,
  title: 'Active volunteers',
};

function setup() {
  const apiClient = mockApiClient();
  const state = mockState();
  state.tags.tagGroupList = remoteListLoaded([]);
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([tag]);
  const store = createStore(state);
  return { apiClient, wrapper: makeWrapper(store, apiClient) };
}

function personTags(personId: number) {
  return (
    <IntlProvider locale="en">
      <SmartTags orgId={1} personId={personId} />
    </IntlProvider>
  );
}

describe('SmartTags', () => {
  it('displays matching tags without assignment or removal controls', async () => {
    const { apiClient, wrapper } = setup();
    apiClient.get.mockResolvedValueOnce({ id: 5 });
    const { findByText, queryByRole } = render(personTags(5), { wrapper });
    await findByText(tag.title);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/orgs/1/people/queries/123/matches/5'
    );
    expect(queryByRole('button')).toBeNull();
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('does not display membership for a nonmatch or a deleted query', async () => {
    const { apiClient, wrapper } = setup();
    apiClient.get.mockRejectedValueOnce(new ApiClientError(404, '/matches/5'));
    const { queryByText, queryByRole } = render(personTags(5), { wrapper });
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));
    expect(queryByText(tag.title)).toBeNull();
    expect(queryByRole('alert')).toBeNull();
  });

  it('shows API failures instead of reporting absent membership', async () => {
    const { apiClient, wrapper } = setup();
    apiClient.get.mockRejectedValueOnce(new ApiClientError(403, '/matches/5'));
    const { findByRole } = render(personTags(5), { wrapper });
    await findByRole('alert');
  });

  it('rechecks membership when the person changes', async () => {
    const { apiClient, wrapper } = setup();
    apiClient.get.mockResolvedValueOnce({ id: 5 });
    const { findByText, queryByText, rerender } = render(personTags(5), {
      wrapper,
    });
    await findByText(tag.title);
    apiClient.get.mockRejectedValueOnce(new ApiClientError(404, '/matches/6'));
    rerender(personTags(6));
    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/orgs/1/people/queries/123/matches/6'
      )
    );
    expect(queryByText(tag.title)).toBeNull();
  });
});

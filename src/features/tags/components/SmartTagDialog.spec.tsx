import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import singletonRouter from 'next/router';
import userEvent from '@testing-library/user-event';

import createStore from 'core/store';
import messageIds from '../l10n/messageIds';
import SmartSearchDialog, {
  SmartSearchDialogProps,
} from 'features/smartSearch/components/SmartSearchDialog';
import { FILTER_TYPE, OPERATION } from 'features/smartSearch/components/types';
import { remoteListLoaded } from 'utils/storeUtils';
import { makeWrapper, render, waitFor } from 'utils/testing';
import mockApiClient from 'utils/testing/mocks/mockApiClient';
import mockState from 'utils/testing/mocks/mockState';
import TagDialog from './TagManager/components/TagDialog';
import useSmartTagMutations from '../hooks/useSmartTagMutations';
import SmartTagDialog from './SmartTagDialog';
import { ZetkinSmartTag } from '../types';

jest.mock('next/dist/client/router', () =>
  jest.requireActual('next-router-mock')
);

jest.mock('features/smartSearch/components/SmartSearchDialog', () => ({
  __esModule: true,
  default: jest.fn(({ onSave, query }: SmartSearchDialogProps) => (
    <button onClick={() => onSave({ filter_spec: query?.filter_spec || [] })}>
      Save membership
    </button>
  )),
}));

const group = {
  id: 10,
  organization: { id: 1, title: 'Organization' },
  title: 'Volunteers',
};
const filters = [{ config: {}, op: OPERATION.ADD, type: FILTER_TYPE.ALL }];
const tag: ZetkinSmartTag = {
  color: null,
  description: null,
  group_id: null,
  id: 1,
  organization_id: 1,
  query_id: 123,
  title: 'Active volunteers',
};

function CreateTagDialog({ onClose }: { onClose: () => void }) {
  const { createSmartTag } = useSmartTagMutations(1);
  return (
    <TagDialog
      groups={[group]}
      onClose={onClose}
      onSubmit={() => undefined}
      onSubmitSmartTag={(data, filters) => createSmartTag(data, filters!)}
      open
    />
  );
}

function setup(existingTag?: ZetkinSmartTag) {
  const apiClient = mockApiClient();
  const state = mockState();
  state.tags.tagGroupList = remoteListLoaded([group]);
  const Wrapper = makeWrapper(createStore(state), apiClient);
  const onClose = jest.fn();
  const result = render(
    <Wrapper>
      {existingTag ? (
        <SmartTagDialog onClose={onClose} orgId={1} tag={existingTag} />
      ) : (
        <CreateTagDialog onClose={onClose} />
      )}
    </Wrapper>
  );
  return { ...result, apiClient, onClose };
}

describe('SmartTagDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    singletonRouter.query = { orgId: '1' };
  });

  it('creates a smart tag directly after editing membership without selecting a saved query', async () => {
    const {
      apiClient,
      getByLabelText,
      getByRole,
      getByTestId,
      getByText,
      onClose,
      queryByRole,
    } = setup();
    apiClient.post
      .mockResolvedValueOnce({ filter_spec: [], id: 123 })
      .mockResolvedValueOnce(tag);
    await userEvent.click(
      getByRole('radio', { name: messageIds.dialog.types.smart._id })
    );
    expect(queryByRole('combobox')).toBeTruthy();
    await userEvent.click(getByTestId('TagManager-TagDialog-tagGroupSelect'));
    await userEvent.click(getByText(group.title));
    await userEvent.type(
      getByLabelText(/feat.tags.dialog.titleLabel/),
      tag.title
    );
    const submit = getByTestId(
      'SubmitCancelButtons-submitButton'
    ) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    await userEvent.click(
      getByRole('button', { name: messageIds.smartTags.editQuery._id })
    );
    await userEvent.click(getByText('Save membership'));
    expect(submit.disabled).toBe(false);
    expect(queryByRole('combobox')).toBeTruthy();
    await userEvent.click(submit);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/api/orgs/1/people/queries',
      { filter_spec: [], title: tag.title }
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api2/orgs/1/smart_tags',
      {
        color: null,
        description: null,
        group_id: 10,
        query_id: 123,
        title: tag.title,
      }
    );
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('restores an existing group and allows clearing it without changing membership', async () => {
    const { apiClient, getByLabelText, getByTestId, onClose } = setup({
      ...tag,
      group_id: 10,
    });
    expect(
      (getByTestId('TagManager-TagDialog-tagGroupSelect') as HTMLInputElement)
        .value
    ).toBe(group.title);
    apiClient.patch.mockResolvedValueOnce(tag);
    await userEvent.click(getByLabelText('Clear'));
    await userEvent.click(getByTestId('SubmitCancelButtons-submitButton'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiClient.patch).toHaveBeenCalledWith('/api2/orgs/1/smart_tags/1', {
      color: null,
      description: null,
      group_id: null,
      query_id: 123,
      title: tag.title,
    });
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(apiClient.patch).toHaveBeenCalledTimes(1);
  });

  it('loads only the tags membership query and preserves its link when editing', async () => {
    const { apiClient, getByRole, getByTestId, getByText, onClose } =
      setup(tag);
    apiClient.get.mockResolvedValueOnce({ filter_spec: filters, id: 123 });
    apiClient.patch
      .mockResolvedValueOnce({ filter_spec: filters, id: 123 })
      .mockResolvedValueOnce(tag);
    await userEvent.click(
      getByRole('button', { name: messageIds.smartTags.editQuery._id })
    );
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/orgs/1/people/queries/123'
    );
    expect(jest.mocked(SmartSearchDialog).mock.calls.at(-1)?.[0].query).toEqual(
      { filter_spec: filters, id: 123 }
    );
    await userEvent.click(getByText('Save membership'));
    await userEvent.click(getByTestId('SubmitCancelButtons-submitButton'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(apiClient.patch).toHaveBeenNthCalledWith(
      1,
      '/api/orgs/1/people/queries/123',
      { filter_spec: filters }
    );
    expect(apiClient.post).not.toHaveBeenCalled();
  });
});

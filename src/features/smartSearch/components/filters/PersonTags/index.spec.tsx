import { beforeEach, expect, it, jest } from '@jest/globals';
import { FormEventHandler, ReactElement } from 'react';
import { IntlProvider } from 'react-intl';
import singletonRouter from 'next/router';
import userEvent from '@testing-library/user-event';

import createStore from 'core/store';
import {
  CONDITION_OPERATOR,
  FILTER_TYPE,
  IN_OPERATOR,
  OPERATION,
} from '../../types';
import { makeWrapper, render } from 'utils/testing';
import mockState from 'utils/testing/mocks/mockState';
import mockTag from 'utils/testing/mocks/mockTag';
import { remoteListLoaded } from 'utils/storeUtils';
import PersonTags from '.';
import messageIds from '../../../l10n/messageIds';
import getFilterComponents from '../../SmartSearchDialog/QueryOverview/getFilterComponents';
import useTagFilter from '../../../hooks/useTagFilter';
import FilterEditor from '../../SmartSearchDialog/FilterEditor';
import { SmartSearchFilterWithId } from '../../types';

jest.mock('next/dist/client/router', () =>
  jest.requireActual('next-router-mock')
);
jest.mock('../../FilterForm', () => ({
  __esModule: true,
  default: ({
    onSubmit,
    renderSentence,
  }: {
    onSubmit: FormEventHandler;
    renderSentence: () => ReactElement;
  }) => (
    <form onSubmit={onSubmit}>
      {renderSentence()}
      <button type="submit">Save filter</button>
    </form>
  ),
}));

beforeEach(() => {
  singletonRouter.query = { orgId: '1' };
});

function setup(children: ReactElement) {
  const state = mockState();
  state.tags.tagGroupList = remoteListLoaded([]);
  state.tags.tagList = remoteListLoaded([
    mockTag({ id: 1, title: 'Ordinary tag' }),
  ]);
  state.tags.smartTagsByOrgId[1] = remoteListLoaded([
    {
      color: '#ff8800',
      description: null,
      group_id: null,
      id: 1,
      organization_id: 1,
      query_id: 123,
      title: 'Smart tag',
    },
  ]);
  const Wrapper = makeWrapper(createStore(state));
  return render(
    <Wrapper>
      <IntlProvider
        locale="en"
        messages={{
          [messageIds.filters.personTags.inputString._id]:
            '{tags} {condition} {addRemoveSelect}',
        }}
      >
        {children}
      </IntlProvider>
    </Wrapper>
  );
}

const filter = {
  config: { condition: CONDITION_OPERATOR.ALL, tags: [1] },
  id: 7,
  op: OPERATION.LIMIT,
  type: FILTER_TYPE.PERSON_TAGS,
};

it('saves a selected smart tag as a saved-query filter', async () => {
  const onSubmit = jest.fn();
  const { getAllByRole, getByRole, getByText } = setup(
    <PersonTags
      filter={{ type: FILTER_TYPE.PERSON_TAGS }}
      onCancel={() => undefined}
      onSubmit={onSubmit}
    />
  );
  await userEvent.click(
    getAllByRole('combobox').find((element) => element.tagName === 'INPUT')!
  );
  await userEvent.click(getByText('Smart tag'));
  expect(onSubmit).not.toHaveBeenCalled();
  await userEvent.click(getByRole('button', { name: 'Save filter' }));
  expect(onSubmit).toHaveBeenCalledWith({
    config: { operator: IN_OPERATOR.IN, query_id: 123 },
    op: OPERATION.ADD,
    type: FILTER_TYPE.SUB_QUERY,
  });
});

it('keeps ordinary tag filters in the existing format', async () => {
  const onSubmit = jest.fn();
  const { getByRole } = setup(
    <PersonTags
      filter={filter}
      onCancel={() => undefined}
      onSubmit={onSubmit}
    />
  );
  await userEvent.click(getByRole('button', { name: 'Save filter' }));
  expect(onSubmit).toHaveBeenCalledWith(filter);
});

const smartTagFilter = {
  config: { operator: IN_OPERATOR.NOTIN, query_id: 123 },
  id: 7,
  op: OPERATION.LIMIT,
  type: FILTER_TYPE.SUB_QUERY,
};

function TagPreview({ filter }: { filter: SmartSearchFilterWithId }) {
  const tagFilter = useTagFilter(filter);
  return getFilterComponents(tagFilter).displayFilter;
}

it('recognizes a matching saved query as a smart tag in the preview', () => {
  const { getByText, queryByText } = setup(
    <TagPreview filter={smartTagFilter} />
  );
  expect(getByText('Smart tag')).toBeTruthy();
  expect(queryByText('Ordinary tag')).toBeNull();
});

it.each([IN_OPERATOR.IN, IN_OPERATOR.NOTIN, undefined])(
  'edits a recognized smart tag and preserves its saved query, operation and %s operator',
  async (operator) => {
    const onSubmit = jest.fn();
    const { getByRole, getByText } = setup(
      <FilterEditor
        filter={{ ...smartTagFilter, config: { operator, query_id: 123 } }}
        onCancelSubmitFilter={() => undefined}
        onSubmitFilter={onSubmit}
      />
    );
    expect(getByText('Smart tag')).toBeTruthy();
    await userEvent.click(getByRole('button', { name: 'Save filter' }));
    expect(onSubmit).toHaveBeenCalledWith({
      ...smartTagFilter,
      config: { operator: operator || IN_OPERATOR.IN, query_id: 123 },
    });
  }
);

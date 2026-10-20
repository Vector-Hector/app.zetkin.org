import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import Activities from './activities';
import { collection, request } from './api';
import { ApiClientError } from 'core/api/errors';

jest.mock('./api', () => ({
  ...jest.requireActual<typeof import('./api')>('./api'),
  collection: jest.fn(),
  request: jest.fn(),
}));
const collectionMock = collection as jest.Mock<
  (path: string) => Promise<unknown[]>
>;
const requestMock = request as jest.Mock<
  (path: string, method?: string, data?: unknown) => Promise<unknown>
>;
const call = {
  allocation_time: '2026-10-01',
  assignment_id: 10,
  caller: { id: 7 },
  id: 1,
  organization_id: 1,
  state: 0,
  target: { name: 'Recipient' },
  update_time: '2026-10-02',
};

beforeEach(() => {
  collectionMock.mockReset();
  requestMock.mockReset();
  collectionMock.mockResolvedValue([]);
  requestMock.mockImplementation(async (path: string, method?: string) => {
    if (method) {
      return undefined;
    }
    if (path.startsWith('/api/users/me/outgoing_calls?')) {
      return [
        call,
        { ...call, id: 2, state: 1 },
        { ...call, id: 3, organization_id: 2 },
      ];
    }
    if (path.endsWith('/assigned_tasks')) {
      return [];
    }
    return { ...call, state: path.endsWith('/2') ? 1 : 0 };
  });
});

it('offers deletion only for an own allocated call in the selected organization', async () => {
  render(<Activities orgId={1} profiles={[]} />);
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'View call report' }))[0]
  );
  await screen.findByRole('button', { name: 'Delete allocated call' });
  expect(
    screen.getAllByRole('button', { name: 'Delete allocated call' })
  ).toHaveLength(1);
  expect(screen.queryByRole('heading', { name: /Call #3/ })).toBeNull();
});

it('loads only the first history page and no call details until requested', async () => {
  render(<Activities orgId={1} profiles={[]} />);
  await screen.findAllByRole('button', { name: 'View call report' });
  expect(
    requestMock.mock.calls.filter(([path]) => path.includes('/outgoing_calls'))
  ).toEqual([['/api/users/me/outgoing_calls?p=0&pp=100']]);
  expect(
    requestMock.mock.calls.some(([path]) => path.includes('/calls/'))
  ).toBe(false);
  fireEvent.click(
    screen.getByRole('button', { name: 'Load more call history' })
  );
  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      '/api/users/me/outgoing_calls?p=1&pp=100'
    )
  );
  expect(requestMock.mock.calls.some(([path]) => path.includes('p=2&'))).toBe(
    false
  );
  expect(
    requestMock.mock.calls.some(([path]) => path.includes('/calls/'))
  ).toBe(false);
});

it('loads only the opened call detail and keeps it stable across parent renders', async () => {
  const { rerender } = render(<Activities orgId={1} profiles={[]} />);
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'View call report' }))[0]
  );
  await screen.findByRole('button', { name: 'Edit' });
  rerender(<Activities orgId={1} profiles={[]} />);
  await waitFor(() =>
    expect(
      requestMock.mock.calls.filter(([path]) => path.includes('/calls/'))
    ).toEqual([['/api/orgs/1/calls/1']])
  );
});

it('deduplicates event rows and loads participation only when opened', async () => {
  const event = {
    id: 679,
    organization: { id: 1 },
    start_time: '2026-10-01',
    title: 'My event',
  };
  const profile = {
    first_name: 'Ada',
    id: 4004,
    last_name: 'L',
    organization: { id: 1, title: 'Org' },
  };
  collectionMock.mockImplementation(async (path) =>
    path.endsWith('/actions') ? [event, event] : []
  );
  const { rerender } = render(<Activities orgId={1} profiles={[profile]} />);
  await screen.findByRole('button', { name: 'View participation' });
  expect(
    requestMock.mock.calls.some(([path]) => path.includes('/participants/'))
  ).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'View participation' }));
  await screen.findByRole('button', { name: 'Edit' });
  rerender(<Activities orgId={1} profiles={[{ ...profile }]} />);
  await waitFor(() =>
    expect(
      requestMock.mock.calls.filter(([path]) => path.includes('/participants/'))
    ).toEqual([['/api/orgs/1/actions/679/participants/4004']])
  );
});

it('sends a numeric call state and only changed fields', async () => {
  render(<Activities orgId={1} profiles={[]} />);
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'View call report' }))[0]
  );
  const editButtons = await screen.findAllByRole('button', { name: 'Edit' });
  fireEvent.click(editButtons[0]);
  fireEvent.mouseDown(screen.getByLabelText('Outcome'));
  fireEvent.click(screen.getByRole('option', { name: 'Successful' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith('/api/orgs/1/calls/1', 'PATCH', {
      state: 1,
    })
  );
});

it('shows a permission failure without offering call edits or deletion', async () => {
  requestMock.mockImplementation(async (path: string) => {
    if (path.startsWith('/api/users/me/outgoing_calls?')) {
      return [
        call,
        { ...call, id: 2, state: 1 },
        { ...call, id: 3, organization_id: 2 },
      ];
    }
    if (path.endsWith('/assigned_tasks')) {
      return [];
    }
    throw new ApiClientError(403, path);
  });
  render(<Activities orgId={1} profiles={[]} />);
  fireEvent.click(
    (await screen.findAllByRole('button', { name: 'View call report' }))[0]
  );
  await screen.findAllByText(/Access denied/);
  expect(
    screen.queryByRole('button', { name: 'Delete allocated call' })
  ).toBeNull();
  expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
});

it('warns before replacing attendance status and sends null to clear it', async () => {
  collectionMock.mockImplementation(async (path) =>
    path.endsWith('/actions')
      ? [
          {
            id: 10,
            organization: { id: 1 },
            start_time: '2026-10-01',
            title: 'My event',
          },
        ]
      : []
  );
  requestMock.mockImplementation(async (path, method) => {
    if (method) {
      return undefined;
    }
    if (path.startsWith('/api/users/me/outgoing_calls?')) {
      return [
        call,
        { ...call, id: 2, state: 1 },
        { ...call, id: 3, organization_id: 2 },
      ];
    }
    if (path.endsWith('/assigned_tasks')) {
      return [];
    }
    return { attended: '2026-10-01', cancelled: null, noshow: null };
  });
  render(
    <Activities
      orgId={1}
      profiles={[
        {
          first_name: 'Ada',
          id: 7,
          last_name: 'L',
          organization: { id: 1, title: 'Org' },
        },
      ]}
    />
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'View participation' })
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
  expect(
    screen.getByText(/Saving replaces all attendance status timestamps/)
  ).toBeTruthy();
  fireEvent.mouseDown(screen.getByLabelText('Participation status'));
  fireEvent.click(screen.getByRole('option', { name: 'No status' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      '/api/orgs/1/actions/10/participants/7',
      'PUT',
      { status: null }
    )
  );
});

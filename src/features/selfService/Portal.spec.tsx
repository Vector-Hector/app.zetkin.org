import { beforeEach, expect, it, jest } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import Portal from './Portal';
import { collection, request } from './api';
import { ApiClientError } from 'core/api/errors';

jest.mock('./api', () => ({
  ...jest.requireActual<typeof import('./api')>('./api'),
  collection: jest.fn(),
  request: jest.fn(),
}));
const requestMock = request as jest.Mock<
  (path: string, method?: string, data?: unknown) => Promise<unknown>
>;
const collectionMock = collection as jest.Mock<
  (path: string) => Promise<unknown[]>
>;
const org = { id: 1, title: 'First organization' };
const other = { id: 2, title: 'Second organization' };
const profile = {
  first_name: 'Contact',
  id: 7,
  last_name: 'One',
  organization: org,
};
const profiles = [
  profile,
  { ...profile, id: 8, last_name: 'Two' },
  { ...profile, organization: other },
];
const submissions = [
  {
    id: 40,
    organization: org,
    respondent: { id: 7 },
    submitted: '2026-10-01',
    survey: { id: 1, title: 'My linked survey' },
  },
  {
    id: 41,
    organization: org,
    respondent: { id: 99 },
    submitted: '2026-10-01',
    survey: { id: 2, title: 'Another person’s survey' },
  },
];

beforeEach(() => {
  requestMock.mockReset();
  collectionMock.mockReset();
  requestMock.mockImplementation(async (path: string) => {
    if (path === '/api/session') {
      return { level: 1 };
    }
    if (path === '/api/users/me') {
      return {
        email: 'account@example.org',
        email_is_verified: true,
        first_name: 'Account',
        id: 10,
        lang: 'en',
        last_name: 'Name',
        phone: '123',
      };
    }
    if (path === '/api/users/me/memberships') {
      return [
        { follow: true, organization: org, profile: { id: 7 } },
        { follow: false, organization: org, profile: { id: 8 } },
      ];
    }
    if (
      path === '/api/users/me/assigned_tasks' ||
      path.startsWith('/api/users/me/outgoing_calls?')
    ) {
      return [];
    }
    if (path === '/api/orgs/1/survey_submissions') {
      return submissions;
    }
    if (path.includes('/people/')) {
      return {
        city: 'Berlin',
        email: 'contact@example.org',
        first_name: 'Contact',
        id: Number(path.split('/').pop()),
        is_user: true,
        last_name: 'One',
      };
    }
    throw new Error(`Unexpected request ${path}`);
  });
  collectionMock.mockImplementation(async (path: string) => {
    if (path === '/api/users/me/profiles') {
      return profiles;
    }
    return [];
  });
});

it('keeps duplicate person links and account details separate and explains shared edits', async () => {
  render(<Portal />);
  await screen.findByRole('heading', {
    name: 'Contact record #8: Contact Two',
  });
  expect(
    screen.getByRole('heading', { name: 'Contact record #7: Contact One' })
  ).toBeTruthy();
  expect(
    screen.getByText(
      /This person record is shared by First organization, Second organization/
    )
  ).toBeTruthy();
  expect(screen.getByText(/account@example.org/)).toBeTruthy();
  expect(screen.getAllByText('contact@example.org')).toHaveLength(2);
  expect(screen.getByText(/Following changes are unavailable/)).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'Unfollow organization' })
  ).toBeNull();
  expect(
    screen.queryByRole('button', { name: /Delete (person|account)/ })
  ).toBeNull();
});

it('shows only linked survey respondents even when the account has organizer access', async () => {
  render(<Portal />);
  await screen.findByText(/My linked survey/);
  expect(screen.queryByText(/Another person’s survey/)).toBeNull();
  expect(
    screen.queryByRole('button', { name: /Delete submission|Edit answers/ })
  ).toBeNull();
});

it('loads the full survey collection without triggering the backend pagination/filter-order bug', async () => {
  render(<Portal />);
  await screen.findByText(/My linked survey/);
  expect(requestMock).toHaveBeenCalledWith('/api/orgs/1/survey_submissions');
  expect(
    collectionMock.mock.calls.some(([path]) =>
      path.includes('/survey_submissions')
    )
  ).toBe(false);
  expect(
    requestMock.mock.calls.some(([path]) =>
      path.includes('/survey_submissions?')
    )
  ).toBe(false);
});

it('keeps stored survey answers visible when historical question content is unavailable', async () => {
  const original = requestMock.getMockImplementation()!;
  requestMock.mockImplementation(async (path, method, data) => {
    if (path.endsWith('/survey_submissions/40')) {
      return {
        id: 40,
        organization: org,
        respondent: { id: 7 },
        responses: [
          { question_id: 5, response: 'My stored answer' },
          { options: [20], question_id: 6 },
        ],
        survey: { id: 1 },
      };
    }
    if (path.endsWith('/surveys/1')) {
      throw new ApiClientError(403, path);
    }
    return original(path, method, data);
  });
  render(<Portal />);
  fireEvent.click(await screen.findByRole('button', { name: 'View answers' }));
  await screen.findByText(
    /Historical question and option labels are unavailable/
  );
  expect(screen.getByText('My stored answer', { exact: false })).toBeTruthy();
  expect(screen.getByText(/Option #20/)).toBeTruthy();
});

it('keeps other sections visible when a collection is forbidden', async () => {
  const original = requestMock.getMockImplementation()!;
  requestMock.mockImplementation(async (path, method, data) => {
    if (path.endsWith('/survey_submissions')) {
      throw new ApiClientError(403, path);
    }
    return original(path, method, data);
  });
  render(<Portal />);
  await screen.findByText(/Access denied/);
  expect(
    screen.getByRole('heading', { name: 'Your assigned tasks' })
  ).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Account details' })).toBeTruthy();
});

it('reports a survey server failure explicitly without hiding account or task sections', async () => {
  const original = requestMock.getMockImplementation()!;
  requestMock.mockImplementation(async (path, method, data) => {
    if (path.endsWith('/survey_submissions')) {
      throw new ApiClientError(500, path);
    }
    return original(path, method, data);
  });
  render(<Portal />);
  await screen.findByText(/server returned an error \(HTTP 500\)/);
  expect(screen.queryByText(/My linked survey/)).toBeNull();
  expect(screen.getByRole('heading', { name: 'Account details' })).toBeTruthy();
  expect(
    screen.getByRole('heading', { name: 'Your assigned tasks' })
  ).toBeTruthy();
});

it('patches only the edited contact field, using its organization and person IDs', async () => {
  requestMock.mockImplementation(async (path: string, method?: string) => {
    if (method === 'PATCH') {
      return undefined;
    }
    if (path === '/api/session') {
      return { level: 1 };
    }
    if (path === '/api/users/me') {
      return { first_name: 'Account', id: 10 };
    }
    if (
      path === '/api/users/me/memberships' ||
      path === '/api/users/me/assigned_tasks' ||
      path.startsWith('/api/users/me/outgoing_calls?')
    ) {
      return [];
    }
    if (path.includes('/people/')) {
      return { city: 'Berlin', first_name: 'Contact', id: 7 };
    }
    throw new Error(path);
  });
  render(<Portal />);
  const heading = await screen.findByRole('heading', {
    name: 'Contact record #8: Contact Two',
  });
  const section = within(heading.closest('section')!);
  fireEvent.click(section.getByRole('button', { name: 'Edit' }));
  fireEvent.change(section.getByLabelText('City'), {
    target: { value: 'Hamburg' },
  });
  fireEvent.click(section.getByRole('button', { name: 'Save changes' }));
  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith('/api/orgs/1/people/8', 'PATCH', {
      city: 'Hamburg',
    })
  );
  expect(
    requestMock.mock.calls.filter(([, method]) => method === 'PATCH')
  ).toHaveLength(1);
});

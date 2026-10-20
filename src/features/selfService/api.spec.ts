import { afterAll, beforeEach, expect, it, jest } from '@jest/globals';

import { ApiClientError } from 'core/api/errors';
import {
  assignmentAccessible,
  collection,
  errorMessage,
  request,
  sharedOrganizations,
} from './api';

const fetchMock =
  jest.fn<(...args: Parameters<typeof fetch>) => Promise<unknown>>();
const originalFetch = global.fetch;
function respond(data: unknown, meta?: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({ data, meta }),
  };
}

beforeEach(() => {
  global.fetch = fetchMock as typeof fetch;
  fetchMock.mockReset();
});
afterAll(() => {
  global.fetch = originalFetch;
});

it('uses the signed-in session proxy without browser tokens and accepts empty success', async () => {
  const text = jest.fn();
  fetchMock.mockResolvedValue({ ok: true, status: 204, text });
  await expect(
    request('/api/users/me/following/12', 'DELETE')
  ).resolves.toBeUndefined();
  expect(text).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/users/me/following/12',
    expect.objectContaining({
      cache: 'no-store',
      credentials: 'same-origin',
      headers: undefined,
      method: 'DELETE',
    })
  );
});

it('does not parse an empty successful PATCH body', async () => {
  fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
  await expect(
    request('/api/users/me', 'PATCH', { first_name: 'Ada' })
  ).resolves.toBeUndefined();
});

it('loads v1 pages with p and pp, including short intermediate pages', async () => {
  fetchMock
    .mockResolvedValueOnce(respond([{ id: 1 }]))
    .mockResolvedValueOnce(respond([{ id: 2 }]))
    .mockResolvedValueOnce(respond([]));
  await expect(collection('/api/users/me/profiles')).resolves.toEqual([
    { id: 1 },
    { id: 2 },
  ]);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api/users/me/profiles?p=0&pp=100',
    '/api/users/me/profiles?p=1&pp=100',
    '/api/users/me/profiles?p=2&pp=100',
  ]);
});

it('uses one-based v2 pagination and its collection metadata', async () => {
  fetchMock
    .mockResolvedValueOnce(
      respond([{ id: 1 }], { pagination: { page: 1, size: 1, total: 2 } })
    )
    .mockResolvedValueOnce(
      respond([{ id: 2 }], { pagination: { page: 2, size: 1, total: 2 } })
    );
  await expect(
    collection('/api2/users/me/area_assignments')
  ).resolves.toHaveLength(2);
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    '/api2/users/me/area_assignments?page=1&size=100',
    '/api2/users/me/area_assignments?page=2&size=100',
  ]);
});

it('reports pagination that fails to advance instead of truncating or looping', async () => {
  fetchMock.mockResolvedValue(respond([{ id: 1 }]));
  await expect(collection('/api/users/me/profiles')).rejects.toThrow(
    'pagination'
  );
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('rejects malformed and incomplete collections', async () => {
  fetchMock.mockResolvedValueOnce(respond({ not: 'a list' }));
  await expect(collection('/api/users/me/profiles')).rejects.toThrow(
    'Unexpected collection'
  );
  fetchMock.mockResolvedValueOnce(
    respond([], { pagination: { page: 1, size: 100, total: 10 } })
  );
  await expect(collection('/api2/users/me/area_assignments')).rejects.toThrow(
    'incomplete'
  );
});

it.each([401, 403, 404])(
  'preserves status %s for per-section permission handling',
  async (status) => {
    fetchMock.mockResolvedValue({
      json: async () => ({}),
      ok: false,
      status,
      url: '/api/users/me/profiles',
    });
    await expect(collection('/api/users/me/profiles')).rejects.toMatchObject({
      status,
    });
  }
);

it('distinguishes authentication, forbidden and concealed records', () => {
  expect(errorMessage(new ApiClientError(401, ''))).toContain('authentication');
  expect(errorMessage(new ApiClientError(403, ''))).toContain('Access denied');
  expect(errorMessage(new ApiClientError(404, ''))).toContain(
    'does not mean it was erased'
  );
});

it('preserves a 500 with a null JSON body and explains server unavailability', async () => {
  fetchMock.mockResolvedValue({
    json: async () => null,
    ok: false,
    status: 500,
    url: '/api/orgs/1/survey_submissions',
  });
  let failure: unknown;
  try {
    await request('/api/orgs/1/survey_submissions');
  } catch (error) {
    failure = error;
  }
  expect(failure).toBeInstanceOf(ApiClientError);
  expect(failure).toMatchObject({ status: 500 });
  expect(errorMessage(failure)).toContain('HTTP 500');
  expect(errorMessage(failure)).toContain(
    'does not mean your records are empty or deleted'
  );
});

it('retains shared organizations without merging different linked people', () => {
  const profile = { first_name: 'Ada', id: 7, last_name: 'L' };
  const profiles = [
    { ...profile, organization: { id: 1, title: 'One' } },
    { ...profile, id: 8, organization: { id: 1, title: 'One' } },
    { ...profile, organization: { id: 2, title: 'Two' } },
  ];
  expect(sharedOrganizations(profiles, 7).map((org) => org.id)).toEqual([1, 2]);
  expect(sharedOrganizations(profiles, 8).map((org) => org.id)).toEqual([1]);
});

it('matches assignment access dates, including undated and expired assignments', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  expect(assignmentAccessible({ end_date: null, start_date: null }, now)).toBe(
    false
  );
  expect(
    assignmentAccessible(
      { end_date: '2026-10-19', start_date: '2026-10-01' },
      now
    )
  ).toBe(false);
  expect(
    assignmentAccessible({ end_date: null, start_date: '2026-10-21' }, now)
  ).toBe(false);
  expect(
    assignmentAccessible({ end_date: null, start_date: '2026-10-01' }, now)
  ).toBe(true);
});

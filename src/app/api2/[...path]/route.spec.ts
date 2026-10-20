/** @jest-environment node */

import { afterEach, beforeEach, expect, it, jest } from '@jest/globals';
import { getIronSession } from 'iron-session';
import { NextRequest } from 'next/server';

import { GET, DELETE } from './route';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('iron-session', () => ({ getIronSession: jest.fn() }));
jest.mock('utils/requiredEnvVar', () => ({
  __esModule: true,
  default: (name: string) =>
    ({
      SESSION_PASSWORD: 'test-session-password',
      ZETKIN_API_HOST: 'api.example.org',
      ZETKIN_CLIENT_ID: 'test-client',
      ZETKIN_CLIENT_SECRET: 'test-secret',
    })[name as 'SESSION_PASSWORD'],
}));

const originalFetch = global.fetch;
const fetchMock = jest.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
});
afterEach(() => {
  global.fetch = originalFetch;
});

it.each([200, 204])(
  'forwards the refreshed account token and handles status %s',
  async (status) => {
    const session = {
      save: jest.fn<() => Promise<void>>().mockResolvedValue(),
      tokenData: { access_token: 'old-token', refresh_token: 'refresh-token' },
    };
    jest.mocked(getIronSession).mockResolvedValue(session as never);
    global.fetch = fetchMock;
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'invalid_token' }), { status: 401 })
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'refreshed-account-token',
          refresh_token: 'refresh-token',
        }),
        { status: 200 }
      )
    );
    fetchMock.mockResolvedValueOnce(
      status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify({ data: [{ id: 1 }] }), { status })
    );
    const handler = status === 204 ? DELETE : GET;
    const response = await handler(
      new NextRequest('http://localhost/api2/users/me/area_assignments', {
        method: status === 204 ? 'DELETE' : 'GET',
      }),
      { params: { path: ['users', 'me', 'area_assignments'] } }
    );
    expect(response.status).toBe(status);
    expect(session.save).toHaveBeenCalledTimes(1);
    const headers = fetchMock.mock.calls[2][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer refreshed-account-token');
    if (status === 200) {
      expect(await response.json()).toEqual({ data: [{ id: 1 }] });
    } else {
      expect(await response.text()).toBe('');
    }
  }
);

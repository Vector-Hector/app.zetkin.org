import { ApiClientError } from 'core/api/errors';

type Envelope<T> = {
  data: T;
  meta?: { pagination?: { page: number; size: number; total: number } };
};

// Use the existing session proxies. Tokens and client credentials stay server-side.
async function envelope<T>(
  path: string,
  method = 'GET',
  data?: unknown
): Promise<Envelope<T> | undefined> {
  const response = await fetch(path, {
    body: data === undefined ? undefined : JSON.stringify(data),
    cache: 'no-store',
    credentials: 'same-origin',
    headers:
      data === undefined ? undefined : { 'Content-Type': 'application/json' },
    method,
  });
  if (!response.ok) {
    throw await ApiClientError.fromResponse(response);
  }
  if (response.status === 204) {
    return undefined;
  }
  const text = await response.text();
  return text ? JSON.parse(text) : undefined;
}

export async function request<T>(
  path: string,
  method = 'GET',
  data?: unknown
): Promise<T> {
  return (await envelope<T>(path, method, data))?.data as T;
}

// Continue until empty: several legacy collections cap pp independently. Never
// silently return only the first page, or loop forever if pagination is ignored.
export async function collection<T>(path: string): Promise<T[]> {
  const v2 = path.startsWith('/api2/');
  const result: T[] = [];
  const seen = new Set<string>();
  for (let page = v2 ? 1 : 0; ; page++) {
    const separator = path.includes('?') ? '&' : '?';
    const query = v2 ? `page=${page}&size=100` : `p=${page}&pp=100`;
    const response = await envelope<T[]>(`${path}${separator}${query}`);
    const batch = response?.data;
    if (!Array.isArray(batch)) {
      throw new Error('Unexpected collection response');
    }
    if (!batch.length) {
      const total = response?.meta?.pagination?.total;
      if (typeof total === 'number' && result.length < total) {
        throw new Error('The server returned an incomplete collection');
      }
      return result;
    }
    const signature = JSON.stringify(batch);
    if (seen.has(signature)) {
      throw new Error(
        'The server did not advance pagination. A complete list is unavailable.'
      );
    }
    seen.add(signature);
    result.push(...batch);
    const pagination = response?.meta?.pagination;
    if (v2 && pagination && result.length >= pagination.total) {
      return result;
    }
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status >= 500) {
      return `The server returned an error (HTTP ${error.status}). This section is unavailable; this does not mean your records are empty or deleted. Please retry, or contact the organization if the problem continues.`;
    }
    if (error.status === 401) {
      return 'Your session needs authentication. Sign in again to access this section.';
    }
    if (error.status === 403) {
      return 'Access denied. Your verification, permissions, token scope or current assignment may not allow this operation.';
    }
    if (error.status === 404) {
      return 'This record is unavailable. It may no longer be accessible to your account; this does not mean it was erased.';
    }
    if (error.status === 400 || error.status === 422) {
      return (
        error.errorDescription ||
        'The server rejected one or more values. Check their format and allowed choices before saving again.'
      );
    }
  }
  return 'Could not complete this request. Please retry. No complete result is available.';
}

export type Organization = { id: number; title: string };
export type Profile = {
  first_name: string;
  id: number;
  last_name: string;
  organization: Organization;
};

export function sharedOrganizations(profiles: Profile[], personId: number) {
  return [
    ...new Map(
      profiles
        .filter((p) => p.id === personId)
        .map((p) => [p.organization.id, p.organization])
    ).values(),
  ];
}

export function assignmentAccessible(
  assignment: { end_date: string | null; start_date: string | null },
  now = new Date()
) {
  // Match the API's timestamp comparison, including its null-start exclusion.
  const start = assignment.start_date
    ? new Date(assignment.start_date).getTime()
    : NaN;
  const end = assignment.end_date
    ? new Date(assignment.end_date).getTime()
    : Infinity;
  return start <= now.getTime() && end >= now.getTime();
}

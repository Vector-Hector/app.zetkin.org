import { beforeEach, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import AssignmentReports from './reports';
import { collection, request } from './api';
import { ZetkinAreaAssignment } from 'features/areaAssignments/types';

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
const assignment: ZetkinAreaAssignment = {
  end_date: null,
  id: 11,
  instructions: '',
  organization_id: 1,
  project_id: 1,
  reporting_level: 'location',
  start_date: '2000-01-01',
  title: 'Current assignment',
};
const base = '/api2/orgs/1/area_assignments/11';

beforeEach(() => {
  requestMock.mockReset();
  collectionMock.mockReset();
  requestMock.mockImplementation(async (_path: string, method?: string) =>
    method ? undefined : { id: 42 }
  );
  collectionMock.mockImplementation(async (path: string) => {
    if (path.endsWith('/metrics')) {
      return [{ id: 1, question: 'Did you speak?', type: 'bool' }];
    }
    if (path.endsWith('/locations')) {
      return [{ id: 10, title: 'Main Street' }];
    }
    if (path.endsWith('/household_visits')) {
      return [];
    }
    if (path.endsWith('/visits')) {
      return [
        {
          assignment_id: 11,
          created: '2026-10-01',
          created_by_user_id: 42,
          id: 100,
          location_id: 10,
          metrics: [{ metric_id: 1, num_no: 1, num_yes: 2 }],
          num_households_visited: 3,
        },
        {
          assignment_id: 11,
          created: '2026-10-01',
          created_by_user_id: 99,
          id: 101,
          location_id: 10,
          metrics: [{ metric_id: 1, num_no: 999, num_yes: 999 }],
          num_households_visited: 999,
        },
      ];
    }
    throw new Error(path);
  });
});

async function openReports() {
  render(<AssignmentReports assignment={assignment} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'View assignment reports' })
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'View your reports' })
  );
  await screen.findByRole('heading', { name: /Your location report #100/ });
}

it('never displays another reporter’s work or edit/delete controls for it', async () => {
  await openReports();
  expect(screen.queryByText(/#101|999/)).toBeNull();
  expect(screen.getAllByRole('button', { name: 'Delete report' })).toHaveLength(
    1
  );
});

it('patches own reports with their required metrics and household count', async () => {
  await openReports();
  fireEvent.click(screen.getByRole('button', { name: 'Edit report' }));
  fireEvent.change(screen.getByRole('spinbutton', { name: /Yes count/ }), {
    target: { value: '4' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save report' }));
  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      `${base}/locations/10/visits/100`,
      'PATCH',
      {
        metrics: [{ metric_id: 1, num_no: 1, num_yes: 4 }],
        num_households_visited: 3,
      }
    )
  );
});

it('requires confirmation for own report soft deletion', async () => {
  await openReports();
  fireEvent.click(screen.getByRole('button', { name: 'Delete report' }));
  expect(requestMock.mock.calls.some(([, method]) => method === 'DELETE')).toBe(
    false
  );
  expect(screen.getByText(/marks your report as deleted/)).toBeTruthy();
  fireEvent.click(
    screen.getByRole('button', { name: 'Confirm: Delete report' })
  );
  await waitFor(() =>
    expect(requestMock).toHaveBeenCalledWith(
      `${base}/locations/10/visits/100`,
      'DELETE',
      undefined
    )
  );
});

it('explicitly reports unavailable historical access without fetching expired reports', () => {
  render(
    <AssignmentReports assignment={{ ...assignment, end_date: '2001-01-01' }} />
  );
  expect(screen.getByText(/Historical reports unavailable/)).toBeTruthy();
  expect(
    screen.queryByRole('button', { name: 'View assignment reports' })
  ).toBeNull();
  expect(collectionMock).not.toHaveBeenCalled();
});

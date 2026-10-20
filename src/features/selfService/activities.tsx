'use client';

import { useCallback, useState } from 'react';
import { Alert, Box, Button, Divider, Stack, Typography } from '@mui/material';

import { collection, Organization, Profile, request } from './api';
import { EditFields, Field, Mutation, Resource, Section } from './components';
import {
  ZetkinCallAssignment,
  ZetkinEvent,
  ZetkinEventParticipant,
} from 'utils/types/zetkin';
import { ZetkinCall, CallState } from 'features/call/types';

type Task = {
  assignee: { id: number };
  id: number;
  status: string;
  task: { organization: Organization; title: string };
};
type Interest = {
  action: ZetkinEvent;
  organization_id: number;
  person: { id: number };
  response_date: string;
};
type Call = ZetkinCall & { organization_id: number };
type Assignment = ZetkinCallAssignment & { organization_id: number };

const loadTasks = () => request<Task[]>('/api/users/me/assigned_tasks');
const loadEvents = () => collection<ZetkinEvent>('/api/users/me/actions');
const loadInterests = () =>
  collection<Interest>('/api/users/me/action_responses');
const loadCalling = () =>
  collection<Assignment>('/api/users/me/call_assignments');

function Attendance({
  event,
  profile,
}: {
  event: ZetkinEvent;
  profile: Profile;
}) {
  const [expanded, setExpanded] = useState(false);
  const path = `/api/orgs/${event.organization.id}/actions/${event.id}/participants/${profile.id}`;
  const load = useCallback(() => request<ZetkinEventParticipant>(path), [path]);
  return (
    <Box>
      <Typography variant="subtitle2">Contact #{profile.id}</Typography>
      <Button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide participation' : 'View participation'}
      </Button>
      {expanded && (
        <Resource load={load}>
          {(attendance, reload) => (
            <Stack spacing={1}>
              <Typography>
                Attendance: {attendance.attended || 'Not recorded'} · Cancelled:{' '}
                {attendance.cancelled || 'No'} · No-show:{' '}
                {attendance.noshow || 'No'} · Reminder sent:{' '}
                {attendance.reminder_sent || 'No'}
              </Typography>
              <EditFields
                fields={[
                  {
                    label: 'Participation status',
                    name: 'status',
                    nullable: true,
                    options: [
                      { label: 'No status', value: '' },
                      { label: 'Attended', value: 'attended' },
                      { label: 'Cancelled', value: 'cancelled' },
                      { label: 'No-show', value: 'noshow' },
                    ],
                  },
                ]}
                method="PUT"
                onSaved={reload}
                path={path}
                values={{
                  status: attendance.attended
                    ? 'attended'
                    : attendance.cancelled
                      ? 'cancelled'
                      : attendance.noshow
                        ? 'noshow'
                        : '',
                }}
                warning="Saving replaces all attendance status timestamps, including organizer-recorded attendance and no-show information. Cancellation retains your participation record; it does not delete it."
              />
              <Mutation
                label="Record positive interest"
                method="PUT"
                onSaved={reload}
                path={`/api/orgs/${event.organization.id}/actions/${event.id}/responses/${profile.id}`}
              />
            </Stack>
          )}
        </Resource>
      )}
    </Box>
  );
}

function CallReport({ call, onSaved }: { call: Call; onSaved: () => void }) {
  const path = `/api/orgs/${call.organization_id}/calls/${call.id}`;
  // Detail access verifies the legacy selected-membership caller check. Never
  // offer report edits solely because a record appears in the account list.
  const load = useCallback(() => request<Call>(path), [path]);
  const fields: Field[] = [
    {
      label: 'Outcome',
      name: 'state',
      options: [
        { label: 'Allocated', value: String(CallState.UNFINISHED) },
        { label: 'Successful', value: String(CallState.SUCCESSFUL) },
        { label: 'No pickup', value: String(CallState.NO_PICKUP) },
        { label: 'Line busy', value: String(CallState.LINE_BUSY) },
        { label: 'Call back', value: String(CallState.CALL_BACK) },
        { label: 'Not available', value: String(CallState.NOT_AVAILABLE) },
        { label: 'Left message', value: String(CallState.LEFT_MESSAGE) },
        { label: 'Wrong number', value: String(CallState.WRONG_NUMBER) },
      ],
      type: 'number',
    },
    { label: 'Message to organizer', name: 'message_to_organizer' },
  ];
  return (
    <Box>
      <Typography component="h3" variant="subtitle1">
        Call #{call.id} · {call.target?.name || 'Recipient details unavailable'}
      </Typography>
      <Typography variant="body2">
        Allocated: {call.allocation_time} · Last updated: {call.update_time}.
        These timestamps do not measure call duration.
      </Typography>
      <Resource load={load}>
        {(detail, reload) => (
          <Stack spacing={1}>
            <Typography sx={{ whiteSpace: 'pre-wrap' }}>
              Notes: {detail.notes || 'No notes'} · Callback:{' '}
              {detail.call_back_after || 'None'}
            </Typography>
            <EditFields
              fields={fields}
              onSaved={() => {
                reload();
                onSaved();
              }}
              path={path}
              values={detail as unknown as Record<string, unknown>}
              warning="Saving changes updates the report timestamp. The assignment may disable caller notes; use the calling workflow for note and callback changes."
            />
            {detail.state === 0 && (
              <Mutation
                color="error"
                label="Delete allocated call"
                method="DELETE"
                onSaved={onSaved}
                path={path}
                warning="This permanently removes this allocated call. Reports in other states cannot be deleted through self-service."
              />
            )}
          </Stack>
        )}
      </Resource>
    </Box>
  );
}

function CallHistoryRow({
  call,
  onSaved,
}: {
  call: Call;
  onSaved: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Box>
      <Typography>
        Call #{call.id} · {call.allocation_time}
      </Typography>
      <Button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide call report' : 'View call report'}
      </Button>
      {expanded && <CallReport call={call} onSaved={onSaved} />}
    </Box>
  );
}

function CallHistoryPage({
  orgId,
  page,
  onNext,
}: {
  onNext?: () => void;
  orgId: number;
  page: number;
}) {
  const load = useCallback(
    () => request<Call[]>(`/api/users/me/outgoing_calls?p=${page}&pp=100`),
    [page]
  );
  return (
    <Resource
      empty="No more accessible call reports were returned."
      load={load}
    >
      {(calls, reload) => {
        const own = [
          ...new Map(
            calls
              .filter((call) => call.organization_id === orgId)
              .map((call) => [call.id, call])
          ).values(),
        ];
        return (
          <Stack divider={<Divider />} spacing={2}>
            {own.length ? (
              own.map((call) => (
                <CallHistoryRow key={call.id} call={call} onSaved={reload} />
              ))
            ) : (
              <Typography>
                No reports for this organization in this page of your account
                history.
              </Typography>
            )}
            {onNext && <Button onClick={onNext}>Load more call history</Button>}
          </Stack>
        );
      }}
    </Resource>
  );
}

function CallHistory({ orgId }: { orgId: number }) {
  const [pageCount, setPageCount] = useState(1);
  return (
    <Stack spacing={2}>
      <Typography variant="body2">
        Your account history is loaded one page at a time across all
        organizations. Load more to find older reports for the selected
        organization.
      </Typography>
      {Array.from({ length: pageCount }, (_, page) => (
        <CallHistoryPage
          key={page}
          onNext={
            page === pageCount - 1
              ? () => setPageCount((count) => count + 1)
              : undefined
          }
          orgId={orgId}
          page={page}
        />
      ))}
    </Stack>
  );
}

export default function Activities({
  orgId,
  profiles,
}: {
  orgId: number;
  profiles: Profile[];
}) {
  const linked = [
    ...new Map(
      profiles
        .filter((profile) => profile.organization.id === orgId)
        .map((profile) => [profile.id, profile])
    ).values(),
  ];
  return (
    <>
      <Section title="Events and participation">
        <Alert severity="info">
          This is an accessible event list, not a complete lifetime history.
          Draft, unpublished and cancelled events may be unavailable. Attendance
          changes replace status timestamps, including information recorded by
          organizers.
        </Alert>
        <Resource load={loadEvents}>
          {(events) => {
            const own = [
              ...new Map(
                events
                  .filter((event) => event.organization.id === orgId)
                  .map((event) => [event.id, event])
              ).values(),
            ];
            return own.length ? (
              <Stack divider={<Divider />} spacing={2}>
                {own.map((event) => (
                  <Stack key={event.id} spacing={1}>
                    <Typography component="h3" variant="subtitle1">
                      {event.title ||
                        event.activity?.title ||
                        `Event #${event.id}`}{' '}
                      · {event.start_time}
                    </Typography>
                    {linked.length ? (
                      linked.map((profile) => (
                        <Attendance
                          key={profile.id}
                          event={event}
                          profile={profile}
                        />
                      ))
                    ) : (
                      <Typography>
                        Participant details require a linked person record.
                      </Typography>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography>
                No accessible participation records were returned for this
                organization.
              </Typography>
            );
          }}
        </Resource>
      </Section>
      <Section title="Event interest">
        <Typography variant="body2">
          Only positive responses to visible events are returned. Removing
          interest does not remove an attendance record.
        </Typography>
        <Resource load={loadInterests}>
          {(interests, reload) => {
            const own = interests.filter(
              (interest) =>
                interest.organization_id === orgId &&
                linked.some((p) => p.id === interest.person.id)
            );
            return own.length ? (
              <Stack spacing={2}>
                {own.map((interest) => (
                  <Stack
                    key={`${interest.action.id}-${interest.person.id}`}
                    spacing={1}
                  >
                    <Typography>
                      {interest.action.title ||
                        interest.action.activity?.title ||
                        `Event #${interest.action.id}`}{' '}
                      · Contact #{interest.person.id} · {interest.response_date}
                    </Typography>
                    <Mutation
                      label="Remove interest"
                      method="DELETE"
                      onSaved={reload}
                      path={`/api/orgs/${orgId}/actions/${interest.action.id}/responses/${interest.person.id}`}
                    />
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography>
                No accessible positive interest responses for this organization.
              </Typography>
            );
          }}
        </Resource>
      </Section>
      <Section title="Your assigned tasks">
        <Typography variant="body2">
          Only available tasks are returned. Expired and deleted tasks are not a
          complete archive. Tasks cannot be deleted here.
        </Typography>
        <Resource load={loadTasks}>
          {(tasks, reload) => {
            const own = tasks.filter(
              (task) => task.task.organization.id === orgId
            );
            return own.length ? (
              <Stack spacing={2}>
                {own.map((task) => (
                  <Box key={task.id}>
                    <Typography component="h3" variant="subtitle1">
                      {task.task.title} · Contact #{task.assignee.id}
                    </Typography>
                    <EditFields
                      fields={[
                        {
                          label: 'Status',
                          name: 'status',
                          options: [
                            { label: 'Assigned', value: 'assigned' },
                            { label: 'Completed', value: 'completed' },
                            { label: 'Ignored', value: 'ignored' },
                          ],
                        },
                      ]}
                      onSaved={reload}
                      path={`/api/users/me/assigned_tasks/${task.id}`}
                      values={task}
                    />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Typography>No available tasks for this organization.</Typography>
            );
          }}
        </Resource>
      </Section>
      <Section title="Calling assignments">
        <Resource load={loadCalling}>
          {(assignments, reload) => {
            const own = assignments.filter((a) => a.organization_id === orgId);
            return own.length ? (
              <Stack spacing={2}>
                {own.map((assignment) => (
                  <Stack key={assignment.id} spacing={1}>
                    <Typography>
                      {assignment.title} ·{' '}
                      {assignment.start_date || 'No start date'} –{' '}
                      {assignment.end_date || 'No end date'}
                    </Typography>
                    {linked.length === 1 ? (
                      <Mutation
                        color="error"
                        label="Leave calling assignment"
                        method="DELETE"
                        onSaved={reload}
                        path={`/api/orgs/${orgId}/call_assignments/${assignment.id}/callers/${linked[0].id}`}
                        warning="This removes your caller membership from this assignment. Your past call reports are retained."
                      />
                    ) : (
                      <Alert severity="info">
                        Removing caller membership needs an unambiguous person
                        link. The API does not expose your caller identity for
                        this assignment.
                      </Alert>
                    )}
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography>
                No calling assignments for this organization.
              </Typography>
            );
          }}
        </Resource>
      </Section>
      <Section title="Call reports you recorded">
        <Typography variant="body2">
          These are outgoing reports you recorded about other people. Calls you
          received are not available through self-service. Deleted calls and
          deleted linked people are excluded.
        </Typography>
        <CallHistory key={orgId} orgId={orgId} />
      </Section>
    </>
  );
}

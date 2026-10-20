'use client';

import { useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { assignmentAccessible, collection, request } from './api';
import { Failure, Mutation, Resource, useResource } from './components';
import {
  ZetkinAreaAssignment,
  ZetkinLocation,
  ZetkinMetric,
} from 'features/areaAssignments/types';
import {
  ZetkinHouseholdVisit,
  ZetkinLocationVisit,
} from 'features/canvass/types';

const loadAccount = () => request<{ id: number }>('/api/users/me');
type Visit = ZetkinHouseholdVisit | ZetkinLocationVisit;

function Report({
  visit,
  base,
  metrics,
  onSaved,
}: {
  base: string;
  metrics?: ZetkinMetric[];
  onSaved: () => void;
  visit: Visit;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(visit.metrics);
  const [households, setHouseholds] = useState(
    'num_households_visited' in visit ? visit.num_households_visited : 0
  );
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const locationReport = 'location_id' in visit;
  const path = `${base}/${locationReport ? `locations/${visit.location_id}` : `households/${visit.household_id}`}/visits/${visit.id}`;
  const canEdit =
    metrics &&
    visit.metrics.every((answer) =>
      metrics.some((metric) => metric.id === answer.metric_id)
    );
  return (
    <Stack spacing={1}>
      <Typography component="h4" variant="subtitle2">
        Your {locationReport ? 'location' : 'household'} report #{visit.id} ·{' '}
        {visit.created}
      </Typography>
      {editing ? (
        <Stack
          component="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(undefined);
            try {
              await request(path, 'PATCH', {
                metrics: draft,
                ...(locationReport
                  ? { num_households_visited: households }
                  : {}),
              });
              setEditing(false);
              onSaved();
            } catch (error) {
              setError(error);
            } finally {
              setBusy(false);
            }
          }}
          spacing={2}
        >
          {error ? <Failure error={error} /> : null}
          {draft.map((answer, index) => {
            const metric = metrics?.find(
              (metric) => metric.id === answer.metric_id
            );
            const update = (key: string, value: unknown) =>
              setDraft(
                draft.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, [key]: value } : entry
                ) as Visit['metrics']
              );
            return (
              <Stack key={answer.metric_id} spacing={1}>
                <Typography>
                  {metric?.question || `Metric #${answer.metric_id}`}
                </Typography>
                {'num_yes' in answer ? (
                  <Box display="flex" gap={1}>
                    <TextField
                      disabled={busy}
                      inputProps={{ min: 0, step: 1 }}
                      label="Yes count"
                      onChange={(e) =>
                        update('num_yes', Number(e.target.value))
                      }
                      required
                      type="number"
                      value={answer.num_yes}
                    />
                    <TextField
                      disabled={busy}
                      inputProps={{ min: 0, step: 1 }}
                      label="No count"
                      onChange={(e) => update('num_no', Number(e.target.value))}
                      required
                      type="number"
                      value={answer.num_no}
                    />
                  </Box>
                ) : 'num_values' in answer ? (
                  <Stack spacing={1}>
                    {answer.num_values.map((count, position) => (
                      <TextField
                        key={position}
                        disabled={busy}
                        inputProps={{ min: 0, step: 1 }}
                        label={`Count for scale value ${position + 1}`}
                        onChange={(e) =>
                          update(
                            'num_values',
                            answer.num_values.map((value, i) =>
                              i === position ? Number(e.target.value) : value
                            )
                          )
                        }
                        required
                        type="number"
                        value={count}
                      />
                    ))}
                  </Stack>
                ) : (
                  <TextField
                    disabled={busy}
                    label="Answer"
                    onChange={(e) =>
                      update(
                        'response',
                        metric?.type === 'bool'
                          ? e.target.value
                          : Number(e.target.value)
                      )
                    }
                    select
                    value={answer.response}
                  >
                    {(metric?.type === 'bool'
                      ? ['yes', 'no']
                      : [1, 2, 3, 4, 5]
                    ).map((value) => (
                      <MenuItem key={value} value={value}>
                        {value}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
            );
          })}
          {locationReport && (
            <TextField
              disabled={busy}
              inputProps={{ min: 0, step: 1 }}
              label="Households visited"
              onChange={(e) => setHouseholds(Number(e.target.value))}
              required
              type="number"
              value={households}
            />
          )}
          <Box>
            <Button disabled={busy} type="submit" variant="contained">
              Save report
            </Button>
            <Button disabled={busy} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </Box>
        </Stack>
      ) : (
        <>
          {visit.metrics.map((answer) => (
            <Typography key={answer.metric_id}>
              {metrics?.find((metric) => metric.id === answer.metric_id)
                ?.question || `Metric #${answer.metric_id}`}
              :{' '}
              {'num_yes' in answer
                ? `Yes: ${answer.num_yes}, No: ${answer.num_no}`
                : 'num_values' in answer
                  ? answer.num_values
                      .map((value, i) => `${i + 1}: ${value}`)
                      .join(', ')
                  : answer.response}
            </Typography>
          ))}
          {locationReport && (
            <Typography>
              Households visited: {visit.num_households_visited}
            </Typography>
          )}
          {canEdit ? (
            <Button
              onClick={() => {
                setDraft(visit.metrics);
                setEditing(true);
              }}
              sx={{ alignSelf: 'flex-start' }}
              variant="outlined"
            >
              Edit report
            </Button>
          ) : (
            <Typography variant="body2">
              Editing needs accessible metric definitions.
            </Typography>
          )}
          <Mutation
            color="error"
            label="Delete report"
            method="DELETE"
            onSaved={onSaved}
            path={path}
            warning="This marks your report as deleted. It is not full data erasure. Access and authorship will be checked again when saving."
          />
        </>
      )}
    </Stack>
  );
}

function LocationReports({
  location,
  base,
  accountId,
  metrics,
}: {
  accountId: number;
  base: string;
  location: ZetkinLocation;
  metrics?: ZetkinMetric[];
}) {
  const [expanded, setExpanded] = useState(false);
  const loadLocation = useCallback(
    async () =>
      (
        await collection<ZetkinLocationVisit>(
          `${base}/locations/${location.id}/visits`
        )
      ).filter((visit) => visit.created_by_user_id === accountId),
    [accountId, base, location.id]
  );
  const loadHouseholds = useCallback(
    async () =>
      (
        await collection<ZetkinHouseholdVisit>(
          `${base}/locations/${location.id}/household_visits`
        )
      ).filter((visit) => visit.created_by_user_id === accountId),
    [accountId, base, location.id]
  );
  return (
    <Box>
      <Typography component="h3" variant="subtitle1">
        {location.title || `Location #${location.id}`}
      </Typography>
      <Button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide reports' : 'View your reports'}
      </Button>
      {expanded && (
        <Stack spacing={2}>
          <Resource
            empty="No accessible location reports authored by you were returned."
            load={loadLocation}
          >
            {(visits, reload) => (
              <Stack divider={<Divider />} spacing={2}>
                {visits.map((visit) => (
                  <Report
                    key={visit.id}
                    base={base}
                    metrics={metrics}
                    onSaved={reload}
                    visit={visit}
                  />
                ))}
              </Stack>
            )}
          </Resource>
          <Resource
            empty="No accessible household reports authored by you were returned."
            load={loadHouseholds}
          >
            {(visits, reload) => (
              <Stack divider={<Divider />} spacing={2}>
                {visits.map((visit) => (
                  <Report
                    key={visit.id}
                    base={base}
                    metrics={metrics}
                    onSaved={reload}
                    visit={visit}
                  />
                ))}
              </Stack>
            )}
          </Resource>
        </Stack>
      )}
    </Box>
  );
}

export default function AssignmentReports({
  assignment,
}: {
  assignment: ZetkinAreaAssignment;
}) {
  const [expanded, setExpanded] = useState(false);
  const accessible = assignmentAccessible(assignment);
  return (
    <Stack spacing={1}>
      <Typography component="h3" variant="subtitle1">
        {assignment.title}
      </Typography>
      <Typography variant="body2">
        {assignment.start_date || 'No start date'} –{' '}
        {assignment.end_date || 'No end date'}
      </Typography>
      {accessible ? (
        <>
          <Button
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
            sx={{ alignSelf: 'flex-start' }}
          >
            {expanded ? 'Hide assignment' : 'View assignment reports'}
          </Button>
          {expanded && <AccessibleReports assignment={assignment} />}
        </>
      ) : (
        <Alert severity="info">
          Historical reports unavailable: this assignment is expired, has not
          started or has no start date. Authorship does not preserve access
          after unassignment or expiry.
        </Alert>
      )}
    </Stack>
  );
}

function AccessibleReports({
  assignment,
}: {
  assignment: ZetkinAreaAssignment;
}) {
  const base = `/api2/orgs/${assignment.organization_id}/area_assignments/${assignment.id}`;
  const loadMetrics = useCallback(
    () => collection<ZetkinMetric>(`${base}/metrics`),
    [base]
  );
  const loadLocations = useCallback(
    () => collection<ZetkinLocation>(`${base}/locations`),
    [base]
  );
  const account = useResource(loadAccount);
  const metrics = useResource(loadMetrics);
  return (
    <Stack spacing={2}>
      {account.error ? (
        <Failure error={account.error} retry={account.reload} />
      ) : null}
      {metrics.error ? (
        <Failure error={metrics.error} retry={metrics.reload} />
      ) : null}
      <Resource load={loadLocations}>
        {(locations) =>
          account.data ? (
            <Stack spacing={2}>
              {locations.map((location) => (
                <LocationReports
                  key={location.id}
                  accountId={account.data!.id}
                  base={base}
                  location={location}
                  metrics={metrics.data}
                />
              ))}
            </Stack>
          ) : (
            <Typography>
              Account identity is required to identify your reports.
            </Typography>
          )
        }
      </Resource>
    </Stack>
  );
}

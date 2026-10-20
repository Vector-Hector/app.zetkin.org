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

import {
  collection,
  Organization,
  Profile,
  request,
  sharedOrganizations,
} from './api';
import {
  EditFields,
  Failure,
  Field,
  Mutation,
  Resource,
  Section,
  useResource,
} from './components';
import Activities from './activities';
import AssignmentReports from './reports';
import {
  ZetkinMembership,
  ZetkinPerson,
  ZetkinSurveyExtended,
  ZetkinSurveySubmission,
  ZetkinUser,
} from 'utils/types/zetkin';
import { ZetkinAreaAssignment } from 'features/areaAssignments/types';

const loadAccount = () => request<ZetkinUser>('/api/users/me');
const loadSession = () => request<{ level: number }>('/api/session');
const loadProfiles = () => collection<Profile>('/api/users/me/profiles');
// These two legacy handlers return the whole collection and ignore pagination.
const loadMemberships = () =>
  request<ZetkinMembership[]>('/api/users/me/memberships');
const loadAssignments = () =>
  collection<ZetkinAreaAssignment>('/api2/users/me/area_assignments');

const contactFields: Field[] = [
  { label: 'First name', name: 'first_name' },
  { label: 'Last name', name: 'last_name' },
  { label: 'Email', name: 'email', type: 'email' },
  { label: 'Phone', name: 'phone', type: 'tel' },
  { label: 'Alternative phone', name: 'alt_phone', type: 'tel' },
  { label: 'Care of', name: 'co_address' },
  { label: 'Street address', name: 'street_address' },
  { label: 'Postal code', name: 'zip_code' },
  { label: 'City', name: 'city' },
  { label: 'Country', name: 'country' },
  { label: 'External / member ID', name: 'ext_id' },
  {
    label: 'Gender',
    name: 'gender',
    nullable: true,
    options: [
      { label: 'Not provided', value: '' },
      { label: 'Female', value: 'f' },
      { label: 'Male', value: 'm' },
      { label: 'Other', value: 'o' },
    ],
  },
];

function Account() {
  const session = useResource(loadSession);
  return (
    <Section title="Account details">
      <Typography>
        Your login account is separate from every organization’s contact record.
        Saving here does not update those records.
      </Typography>
      <Resource load={loadAccount}>
        {(user, reload) => {
          const fields: Field[] = [
            { label: 'First name', name: 'first_name' },
            { label: 'Last name', name: 'last_name' },
            {
              label: 'Language',
              name: 'lang',
              nullable: true,
              options: [
                { label: 'Default', value: '' },
                { label: 'Dansk', value: 'da' },
                { label: 'Deutsch', value: 'de' },
                { label: 'English', value: 'en' },
                { label: 'Français', value: 'fr' },
                { label: 'Nynorsk', value: 'nn' },
                { label: 'Svenska', value: 'sv' },
              ],
            },
          ];
          if (!user.email_is_verified || (session.data?.level || 0) >= 2) {
            fields.push({
              label: 'Email',
              name: 'email',
              required: true,
              type: 'email',
            });
          }
          if (!user.phone) {
            fields.push({ label: 'Add phone', name: 'phone', type: 'tel' });
          }
          return (
            <>
              <Typography>
                Account #{user.id} · {user.email || 'No email'} ·{' '}
                {user.phone || 'No phone'}
              </Typography>
              <EditFields
                fields={fields}
                onSaved={reload}
                path="/api/users/me"
                values={user as unknown as Record<string, unknown>}
                warning="Changing a verified email requires a strong sign-in and sends a new verification message. An existing account phone cannot be changed here."
              />
              {user.email_is_verified && (session.data?.level || 0) < 2 && (
                <Alert severity="info">
                  To change your verified email, sign in again with your
                  password.{' '}
                  <Button href="/login?redirect=/my/data">Sign in</Button>
                </Alert>
              )}
              {session.error ? (
                <Failure error={session.error} retry={session.reload} />
              ) : null}
              <Typography variant="body2">
                Account deletion and full data erasure are not available through
                self-service.
              </Typography>
            </>
          );
        }}
      </Resource>
    </Section>
  );
}

function Contact({
  profile,
  profiles,
  reloadProfiles,
}: {
  profile: Profile;
  profiles: Profile[];
  reloadProfiles: () => void;
}) {
  const path = `/api/orgs/${profile.organization.id}/people/${profile.id}`;
  const load = useCallback(() => request<ZetkinPerson>(path), [path]);
  const shared = sharedOrganizations(profiles, profile.id);
  return (
    <Section
      title={`Contact record #${profile.id}: ${profile.first_name} ${profile.last_name}`}
    >
      <Alert severity={shared.length > 1 ? 'warning' : 'info'}>
        {shared.length > 1
          ? `This person record is shared by ${shared.map((org) => org.title).join(', ')}. Editing contact details changes the shared record in all these organizations.`
          : 'Contact details belong to a person record and may be shared with other organizations. Changes do not update your login account.'}
      </Alert>
      <Resource load={load}>
        {(person, reload) => {
          const native = new Set([
            ...contactFields.map((field) => field.name),
            'id',
            'is_user',
            'organization',
          ]);
          const custom = Object.entries(person).filter(
            ([key]) => !native.has(key)
          );
          return (
            <>
              <EditFields
                fields={contactFields}
                onSaved={() => {
                  reload();
                  reloadProfiles();
                }}
                path={path}
                values={person}
              />
              <Divider />
              <Typography component="h3" variant="subtitle1">
                Additional values
              </Typography>
              {custom.length ? (
                custom.map(([slug, value]) => (
                  <Stack key={slug} alignItems="flex-start" spacing={1}>
                    <Typography sx={{ overflowWrap: 'anywhere' }}>
                      <strong>{slug}: </strong>
                      {typeof value === 'object' && value !== null
                        ? JSON.stringify(value)
                        : String(value ?? 'Not provided')}
                    </Typography>
                    {value !== null && (
                      <Mutation
                        color="error"
                        data={{ [slug]: null }}
                        label={`Clear ${slug}`}
                        method="PATCH"
                        onSaved={reload}
                        path={path}
                        warning="This removes this value from the person record, which may affect multiple organizations. Inherited fields may be read-only; the server will check whether clearing is allowed."
                      />
                    )}
                  </Stack>
                ))
              ) : (
                <Typography>No additional values were returned.</Typography>
              )}
              <Typography variant="body2">
                Field labels, types and allowed choices are not available
                through the self-service API. These values are shown by their
                stored names; a general editor needs backend metadata support.
                Person deletion is not supported.
              </Typography>
            </>
          );
        }}
      </Resource>
    </Section>
  );
}

function Surveys({ orgId, profiles }: { orgId: number; profiles: Profile[] }) {
  const load = useCallback(async () => {
    // The legacy self-service handler filters by respondent after applying
    // LIMIT/OFFSET, which raises InvalidRequestError whenever p is supplied.
    // Without pagination it returns the full collection with the same access
    // checks. Restore pagination once the backend applies ownership filters first.
    const submissions = await request<ZetkinSurveySubmission[]>(
      `/api/orgs/${orgId}/survey_submissions`
    );
    const ids = new Set(
      profiles.filter((p) => p.organization.id === orgId).map((p) => p.id)
    );
    // An organizer account can receive other people's submissions from this same
    // endpoint. Only display linked respondents; never infer ownership by email.
    return submissions.filter(
      (sub) => sub.respondent?.id && ids.has(sub.respondent.id)
    );
  }, [orgId, profiles]);
  return (
    <Section title="Your survey submissions">
      <Typography variant="body2">
        Only submissions linked to your person records are available. Anonymous
        or unlinked submissions and some records with duplicate organization
        links may be unavailable. Existing answers cannot be edited or deleted
        here.
      </Typography>
      <Resource load={load}>
        {(submissions) => (
          <Stack spacing={2}>
            {submissions.map((submission) => (
              <Survey
                key={submission.id}
                orgId={orgId}
                personIds={profiles
                  .filter((p) => p.organization.id === orgId)
                  .map((p) => p.id)}
                submission={submission}
              />
            ))}
          </Stack>
        )}
      </Resource>
    </Section>
  );
}

function Survey({
  submission,
  orgId,
  personIds,
}: {
  orgId: number;
  personIds: number[];
  submission: ZetkinSurveySubmission;
}) {
  const [expanded, setExpanded] = useState(false);
  const load = useCallback(async () => {
    const detail = await request<ZetkinSurveySubmission>(
      `/api/orgs/${orgId}/survey_submissions/${submission.id}`
    );
    if (!detail.respondent?.id || !personIds.includes(detail.respondent.id)) {
      throw new Error('Respondent is not linked');
    }
    return detail;
  }, [orgId, submission.id, personIds]);
  return (
    <Box>
      <Typography component="h3" variant="subtitle1">
        {submission.survey.title} · {submission.submitted}
      </Typography>
      <Typography variant="body2">
        Owning organization: {submission.organization.title} · Contact #
        {submission.respondent?.id}
      </Typography>
      <Button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Hide answers' : 'View answers'}
      </Button>
      {expanded && (
        <Resource load={load}>
          {(detail) =>
            detail.responses ? (
              <SurveyAnswers detail={detail} />
            ) : (
              <Alert severity="info">
                Answer details were not returned. Historical answers may be
                unavailable.
              </Alert>
            )
          }
        </Resource>
      )}
    </Box>
  );
}

function SurveyAnswers({ detail }: { detail: ZetkinSurveySubmission }) {
  const load = useCallback(
    () =>
      request<ZetkinSurveyExtended>(
        `/api/orgs/${detail.organization.id}/surveys/${detail.survey.id}`
      ),
    [detail.organization.id, detail.survey.id]
  );
  const content = useResource(load);
  return (
    <Stack spacing={1}>
      <Typography variant="body2">
        Submission name/email snapshots: {detail.respondent?.first_name}{' '}
        {detail.respondent?.last_name} ·{' '}
        {detail.respondent?.email || 'No email recorded'}. These do not update
        when your contact details change.
      </Typography>
      {content.error ? (
        <>
          <Failure error={content.error} retry={content.reload} />
          <Typography variant="body2">
            Historical question and option labels are unavailable. Your stored
            answers remain visible by ID.
          </Typography>
        </>
      ) : null}
      {!detail.responses?.length && (
        <Typography>No recorded answers were returned.</Typography>
      )}
      {detail.responses?.map((response, index) => {
        const element = content.data?.elements?.find(
          (element) => element.id === response.question_id
        );
        const question =
          element && 'question' in element ? element.question : undefined;
        return (
          <Typography
            key={`${response.question_id}-${index}`}
            sx={{ whiteSpace: 'pre-wrap' }}
          >
            <strong>
              {question?.question || `Question #${response.question_id}`}:{' '}
            </strong>
            {'response' in response
              ? response.response
              : 'options' in response
                ? response.options
                    .map((id) =>
                      question && 'options' in question
                        ? question.options?.find((option) => option.id === id)
                            ?.text || `Option #${id}`
                        : `Option #${id}`
                    )
                    .join(', ')
                : 'No answer'}
          </Typography>
        );
      })}
    </Stack>
  );
}

export default function Portal() {
  const assignments = useResource(loadAssignments);
  const memberships = useResource(loadMemberships);
  const profiles = useResource(loadProfiles);
  const [selected, setSelected] = useState('');
  const orgs = new Map<number, Organization>();
  memberships.data?.forEach((m) => orgs.set(m.organization.id, m.organization));
  profiles.data?.forEach((p) => orgs.set(p.organization.id, p.organization));
  assignments.data?.forEach((a) => {
    if (!orgs.has(a.organization_id)) {
      orgs.set(a.organization_id, {
        id: a.organization_id,
        title: `Organization #${a.organization_id}`,
      });
    }
  });
  const organizations = [...orgs.values()].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  const orgId =
    selected && orgs.has(Number(selected))
      ? Number(selected)
      : organizations[0]?.id;
  const connections = memberships.data?.filter(
    (m) => m.organization.id === orgId
  );
  const linked = profiles.data?.filter((p) => p.organization.id === orgId);
  return (
    <Stack spacing={3} sx={{ p: { md: 3, xs: 2 } }}>
      <Box>
        <Typography component="h1" variant="h4">
          Your data
        </Typography>
        <Typography>
          View and manage the information available to your signed-in account,
          by organization.
        </Typography>
      </Box>
      <Account />
      <Section title="Organization records">
        {profiles.error ? (
          <Failure error={profiles.error} retry={profiles.reload} />
        ) : null}
        {memberships.error ? (
          <Failure error={memberships.error} retry={memberships.reload} />
        ) : null}
        {(profiles.loading || memberships.loading || assignments.loading) && (
          <Typography role="status">
            Loading your organization connections…
          </Typography>
        )}
        {!!organizations.length && (
          <TextField
            label="Organization"
            onChange={(event) => setSelected(event.target.value)}
            select
            value={String(orgId)}
          >
            {organizations.map((org) => (
              <MenuItem key={org.id} value={String(org.id)}>
                {org.title}
              </MenuItem>
            ))}
          </TextField>
        )}
        {!organizations.length &&
          !profiles.loading &&
          !memberships.loading &&
          !assignments.loading && (
            <Typography>
              No organization connections are available from the records loaded.
            </Typography>
          )}
        {!!connections?.length && (
          <>
            {connections.map((m) => (
              <Typography key={`${m.organization.id}-${m.profile.id}`}>
                Contact #{m.profile.id} · Role: {m.role || 'Member'} ·{' '}
                {m.follow ? 'Following' : 'Not following'}
              </Typography>
            ))}
            {connections.length === 1 ? (
              <Mutation
                data={undefined}
                label={
                  connections[0].follow
                    ? 'Unfollow organization'
                    : 'Follow organization'
                }
                method={connections[0].follow ? 'DELETE' : 'PUT'}
                onSaved={() => memberships.reload()}
                path={`/api/users/me/following/${orgId}`}
              />
            ) : (
              <Alert severity="info">
                Following changes are unavailable because this account has
                multiple contact links in this organization. The backend does
                not identify which connection to update.
              </Alert>
            )}
          </>
        )}
        <Typography variant="body2">
          Following controls a preference. Unfollowing does not disconnect your
          membership or erase data. Leaving an organization is not supported by
          the self-service API.
        </Typography>
      </Section>
      {orgId && (
        <Box key={orgId}>
          <Stack spacing={3}>
            {linked?.map((profile) => (
              <Contact
                key={`${orgId}-${profile.id}`}
                profile={profile}
                profiles={profiles.data || []}
                reloadProfiles={profiles.reload}
              />
            ))}
            {!profiles.loading && !profiles.error && !linked?.length && (
              <Alert severity="info">
                No linked contact record was returned for this organization.
                Account-linked assignments can still appear below.
              </Alert>
            )}
            {profiles.data && (
              <Surveys orgId={orgId} profiles={profiles.data} />
            )}
            <Activities orgId={orgId} profiles={profiles.data || []} />
            <Section title="Canvassing reports you recorded">
              <Typography variant="body2">
                Assignment access is temporary. Expired, unassigned or undated
                assignments do not provide a durable archive of your reports.
                Only reports authored by your account are shown.
              </Typography>
              {assignments.error ? (
                <Failure error={assignments.error} retry={assignments.reload} />
              ) : null}
              {assignments.data
                ?.filter((a) => a.organization_id === orgId)
                .map((assignment) => (
                  <AssignmentReports
                    key={assignment.id}
                    assignment={assignment}
                  />
                ))}
              {assignments.data &&
                !assignments.data.some((a) => a.organization_id === orgId) && (
                  <Typography>
                    No accessible assignments were returned for this
                    organization.
                  </Typography>
                )}
            </Section>
          </Stack>
        </Box>
      )}
      {!orgId && assignments.error ? (
        <Failure error={assignments.error} retry={assignments.reload} />
      ) : null}
      <Section title="Data that needs backend support">
        <Typography>
          Self-service does not provide tags, notes, journeys, a complete
          timeline, calls received, join submissions, email tracking or
          suppression records. Complete historical attendance, expired tasks and
          reports after assignment access ends are also unavailable.
        </Typography>
        <Typography>
          Editable custom-field metadata, survey answer changes and deletion,
          organization disconnection, person deletion, account deletion, a
          complete export and coordinated data erasure require backend work.
          Contact the organization about data that is unavailable here.
        </Typography>
      </Section>
    </Stack>
  );
}

'use client';

import { ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { errorMessage, request } from './api';

export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<{
    data?: T;
    error?: unknown;
    loading: boolean;
  }>({ loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setState((previous) => ({ data: previous.data, loading: true }));
    load().then(
      (data) => active && setState({ data, loading: false }),
      (error) => active && setState({ error, loading: false })
    );
    return () => {
      active = false;
    };
  }, [load, revision]);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  return { ...state, reload };
}

export function Resource<T>({
  load,
  children,
  empty = 'No accessible records were returned.',
}: {
  children: (data: T, reload: () => void) => ReactNode;
  empty?: string;
  load: () => Promise<T>;
}) {
  const state = useResource(load);
  if (state.loading && state.data === undefined) {
    return <CircularProgress aria-label="Loading section" size={24} />;
  }
  if (state.error) {
    return <Failure error={state.error} retry={state.reload} />;
  }
  if (state.data === undefined) {
    return <Alert severity="info">{empty}</Alert>;
  }
  if (Array.isArray(state.data) && !state.data.length) {
    return <Typography>{empty}</Typography>;
  }
  return (
    <>
      {state.loading && (
        <CircularProgress aria-label="Refreshing section" size={16} />
      )}
      {children(state.data, state.reload)}
    </>
  );
}

export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <Alert
      action={
        retry && (
          <Button color="inherit" onClick={retry}>
            Retry
          </Button>
        )
      }
      severity="warning"
    >
      {errorMessage(error)}
    </Alert>
  );
}

export function Section({
  title,
  children,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <Paper component="section" sx={{ p: { md: 3, xs: 2 } }} variant="outlined">
      <Stack spacing={2}>
        <Typography component="h2" variant="h6">
          {title}
        </Typography>
        {children}
      </Stack>
    </Paper>
  );
}

export function Mutation({
  label,
  method,
  path,
  data,
  onSaved,
  warning,
  color,
}: {
  color?: 'error';
  data?: unknown;
  label: string;
  method: string;
  onSaved: () => void;
  path: string;
  warning?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [confirm, setConfirm] = useState(false);
  return (
    <Stack alignItems="flex-start" spacing={1}>
      {error ? <Failure error={error} /> : null}
      {confirm && warning && <Alert severity="warning">{warning}</Alert>}
      <Box display="flex" gap={1}>
        <Button
          color={color}
          disabled={busy}
          onClick={async () => {
            if (warning && !confirm) {
              setConfirm(true);
              return;
            }
            setBusy(true);
            setError(undefined);
            try {
              await request(path, method, data);
              setConfirm(false);
              onSaved();
            } catch (error) {
              setError(error);
            } finally {
              setBusy(false);
            }
          }}
          variant="outlined"
        >
          {busy ? 'Saving…' : confirm ? `Confirm: ${label}` : label}
        </Button>
        {confirm && (
          <Button disabled={busy} onClick={() => setConfirm(false)}>
            Cancel
          </Button>
        )}
      </Box>
    </Stack>
  );
}

export type Field = {
  label: string;
  name: string;
  nullable?: boolean;
  options?: { label: string; value: string }[];
  required?: boolean;
  type?: string;
};

export function EditFields({
  fields,
  values,
  path,
  onSaved,
  method = 'PATCH',
  warning,
}: {
  fields: Field[];
  method?: string;
  onSaved: () => void;
  path: string;
  values: Record<string, unknown>;
  warning?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  if (!editing) {
    return (
      <Stack alignItems="flex-start" spacing={1}>
        {fields.map((field) => (
          <Typography key={field.name}>
            <strong>{field.label}: </strong>
            {String(values[field.name] ?? 'Not provided')}
          </Typography>
        ))}
        {saved && <Alert severity="success">Saved.</Alert>}
        <Button
          onClick={() => {
            setDraft(
              Object.fromEntries(
                fields.map((field) => [
                  field.name,
                  String(values[field.name] ?? ''),
                ])
              )
            );
            setEditing(true);
            setSaved(false);
          }}
          variant="outlined"
        >
          Edit
        </Button>
      </Stack>
    );
  }
  const changed = fields.filter(
    (field) => draft[field.name] !== String(values[field.name] ?? '')
  );
  return (
    <Stack
      component="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(undefined);
        const patch = Object.fromEntries(
          changed.map((field) => [
            field.name,
            field.nullable && !draft[field.name]
              ? null
              : field.type === 'number'
                ? Number(draft[field.name])
                : draft[field.name],
          ])
        );
        try {
          await request(path, method, patch);
          setSaved(true);
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
      {warning && <Alert severity="warning">{warning}</Alert>}
      {error ? <Failure error={error} /> : null}
      {fields.map((field) => (
        <TextField
          key={field.name}
          disabled={busy}
          fullWidth
          label={field.label}
          onChange={(event) =>
            setDraft({ ...draft, [field.name]: event.target.value })
          }
          required={field.required}
          select={!!field.options}
          type={field.type || 'text'}
          value={draft[field.name]}
        >
          {field.options &&
            !field.options.some(
              (option) => option.value === draft[field.name]
            ) && (
              <MenuItem disabled value={draft[field.name]}>
                {draft[field.name] || 'Not provided'} (current)
              </MenuItem>
            )}
          {field.options?.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
      <Box display="flex" gap={1}>
        <Button
          disabled={busy || !changed.length}
          type="submit"
          variant="contained"
        >
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button
          disabled={busy}
          onClick={() => {
            setEditing(false);
            setError(undefined);
          }}
        >
          Cancel
        </Button>
      </Box>
    </Stack>
  );
}

/* eslint-disable jsx-a11y/no-autofocus */
import { Alert, Box, Button, TextField } from '@mui/material';
import { useEffect, useState } from 'react';

import { useApiClient, useNumericRouteParams } from 'core/hooks';
import SmartSearchDialog from 'features/smartSearch/components/SmartSearchDialog';
import { ZetkinQuery } from 'features/smartSearch/components/types';
import { SubmitSmartTag, ZetkinSmartTag } from '../../../../types';
import ColorPicker from './ColorPicker';
import messageIds from '../../../../l10n/messageIds';
import TagGroupSelect from './TagGroupSelect';
import TypeSelect from './TypeSelect';
import ZUIDialog from 'zui/ZUIDialog';
import ZUISubmitCancelButtons from 'zui/ZUISubmitCancelButtons';
import { EditTag, NewTag, NewTagGroup } from '../../types';
import { Msg, useMessages } from 'core/i18n';
import { ZetkinTag, ZetkinTagGroup } from 'utils/types/zetkin';

interface TagDialogProps {
  groups: ZetkinTagGroup[];
  open: boolean;
  onClose: () => void;
  onDelete?: (tagId: number) => void;
  onSubmitSmartTag?: SubmitSmartTag;
  onSubmit: (tag: NewTag | EditTag) => void;
  submitLabel?: string;
  tag?: ZetkinTag | ZetkinSmartTag | Pick<ZetkinTag, 'title'>;
}

const TagDialog: React.FunctionComponent<TagDialogProps> = ({
  groups,
  open,
  onClose,
  onDelete,
  onSubmit,
  onSubmitSmartTag,
  submitLabel,
  tag,
}) => {
  const messages = useMessages(messageIds);
  const apiClient = useApiClient();
  const { orgId } = useNumericRouteParams();
  const [filterSpec, setFilterSpec] = useState<ZetkinQuery['filter_spec']>();
  const [editingQuery, setEditingQuery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState(false);
  const [error, setError] = useState(false);
  const [description, setDescription] = useState('');

  const [title, setTitle] = useState('');
  const [titleEdited, setTitleEdited] = useState(false);
  const [color, setColor] = useState<{ valid: boolean; value: string }>({
    valid: true,
    value: '',
  });
  const [group, setGroup] = useState<
    ZetkinTagGroup | NewTagGroup | null | undefined
  >();
  const [type, setType] = useState<ZetkinTag['value_type'] | 'smart'>(null);

  const editingTag = tag && 'id' in tag;

  useEffect(() => {
    setTitle(tag?.title || '');
    setColor(
      tag && 'color' in tag && tag.color
        ? { valid: true, value: tag.color.slice(1) }
        : { valid: true, value: '' }
    );
    setGroup(tag && 'group' in tag ? tag.group : undefined);
    setType(
      tag && 'query_id' in tag
        ? 'smart'
        : tag && 'value_type' in tag
          ? tag.value_type
          : null
    );
    setDescription(tag && 'description' in tag ? tag.description || '' : '');
    setFilterSpec(undefined);
    setError(false);
  }, [tag]);

  const closeAndClear = () => {
    setTitle('');
    setColor({ valid: true, value: '' });
    setGroup(undefined);
    setTitleEdited(false);
    setType(null);
    setFilterSpec(undefined);
    setDescription('');
    setError(false);
    onClose();
  };

  const selectedGroup =
    group !== undefined
      ? group
      : tag && 'group_id' in tag
        ? groups.find((group) => group.id === tag.group_id) || null
        : null;

  const showDeleteButton = tag && 'id' in tag && onDelete;

  return (
    <>
      <ZUIDialog
        onClose={() => !saving && closeAndClear()}
        open={open}
        title={
          editingTag
            ? messages.dialog.editTitle()
            : messages.dialog.createTitle()
        }
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (type === 'smart') {
              if (
                !onSubmitSmartTag ||
                saving ||
                loadingQuery ||
                (!editingTag && !filterSpec)
              ) {
                return;
              }
              setSaving(true);
              setError(false);
              try {
                await onSubmitSmartTag(
                  {
                    color: color.value ? `#${color.value}`.toLowerCase() : null,
                    description: description || null,
                    group:
                      selectedGroup && !('id' in selectedGroup)
                        ? selectedGroup
                        : undefined,
                    group_id:
                      selectedGroup &&
                      'id' in selectedGroup &&
                      typeof selectedGroup.id === 'number'
                        ? selectedGroup.id
                        : null,
                    title,
                  },
                  filterSpec
                );
                closeAndClear();
              } catch {
                setError(true);
              } finally {
                setSaving(false);
              }
              return;
            }
            const tagBody = {
              ...(color.value && { color: `#${color.value}`.toLowerCase() }),
              ...(tag && 'id' in tag && { id: tag.id }),
              ...(type && { value_type: type }),
              title,
            };
            if (group && 'id' in group) {
              // If selecting existing group, submit with group_id
              onSubmit({
                group_id: group.id,
                ...tagBody,
              });
            } else if (group && !('id' in group)) {
              // If selecting new group, submit with group object
              onSubmit({
                group,
                ...tagBody,
              });
            } else {
              // If no group
              onSubmit({ ...tagBody, group_id: null });
            }
            closeAndClear();
          }}
        >
          {error && (
            <Alert severity="error">{messages.smartTags.error()}</Alert>
          )}
          <TextField
            error={titleEdited && !title}
            fullWidth
            helperText={
              titleEdited && !title && messages.dialog.titleErrorText()
            }
            label={messages.dialog.titleLabel()}
            margin="normal"
            onChange={(e) => {
              setTitle(e.target.value);
              if (!titleEdited) {
                setTitleEdited(true);
              }
            }}
            onClick={(e) => (e.target as HTMLInputElement).focus()}
            required
            slotProps={{
              htmlInput: { 'data-testid': 'TagManager-TagDialog-titleField' },
            }}
            value={title}
            variant="outlined"
          />
          <TypeSelect
            disabled={!!editingTag}
            enableSmartTags={!!onSubmitSmartTag}
            onChange={setType}
            value={type}
          />
          <TagGroupSelect
            groups={groups}
            onChange={setGroup}
            value={selectedGroup}
          />
          {type === 'smart' && (
            <>
              <TextField
                fullWidth
                label={messages.smartTags.description()}
                margin="normal"
                multiline
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
              <Button
                disabled={saving || loadingQuery}
                onClick={async () => {
                  setLoadingQuery(true);
                  setError(false);
                  try {
                    if (tag && 'query_id' in tag && !filterSpec) {
                      const query = await apiClient.get<ZetkinQuery>(
                        `/api/orgs/${orgId}/people/queries/${tag.query_id}`
                      );
                      setFilterSpec(query.filter_spec);
                    }
                    setEditingQuery(true);
                  } catch {
                    setError(true);
                  } finally {
                    setLoadingQuery(false);
                  }
                }}
              >
                {messages.smartTags.editQuery()}
              </Button>
            </>
          )}
          <ColorPicker onChange={setColor} value={color.value} />
          <Box
            alignItems="flex-end"
            display="flex"
            justifyContent="space-between"
          >
            {showDeleteButton && (
              <Button
                onClick={() => {
                  onDelete(tag.id);
                  closeAndClear();
                }}
                sx={{ margin: 1 }}
              >
                <Msg id={messageIds.dialog.deleteButtonLabel} />
              </Button>
            )}
            <ZUISubmitCancelButtons
              onCancel={() => !saving && closeAndClear()}
              submitDisabled={
                !title.trim() ||
                !color.valid ||
                saving ||
                loadingQuery ||
                (type === 'smart' && !editingTag && !filterSpec)
              }
              submitText={
                editingTag
                  ? messages.dialog.updateTagButton()
                  : (type !== 'smart' && submitLabel) ||
                    messages.dialog.createTagButton()
              }
            />
          </Box>
        </form>
      </ZUIDialog>
      {editingQuery && (
        <SmartSearchDialog
          onDialogClose={() => setEditingQuery(false)}
          onSave={(query) => {
            setFilterSpec(query.filter_spec);
            setEditingQuery(false);
          }}
          query={{
            filter_spec: filterSpec || [],
            id: tag && 'query_id' in tag ? tag.query_id : 0,
          }}
        />
      )}
    </>
  );
};

export default TagDialog;

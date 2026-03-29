import {
  ContentCopy,
  Delete,
  Edit,
  FileCopy,
  MoreVert,
  SubdirectoryArrowRight,
} from '@mui/icons-material';
import { FC, ReactNode, useCallback, useMemo, useState } from 'react';
import {
  Grid,
  IconButton,
  ListItem,
  ListItemIcon,
  MenuItem,
  Typography,
} from '@mui/material';
import SvgIcon from '@mui/material/SvgIcon';
import Menu from '@mui/material/Menu';

import { FilterConfigOrgOptions } from '../../types';
import OrgScope from '../../OrgScope';
import { useNumericRouteParams } from 'core/hooks';
import messageIds from 'features/smartSearch/l10n/messageIds';
import { useMessages } from 'core/i18n';

type RenderFunction = (hovered: boolean) => ReactNode;
type Renderable = ReactNode | RenderFunction;

type ContextAction = {
  icon: ReactNode;
  onSelect: () => void;
  title: string;
};

type QueryOverviewListItemProps = {
  canDelete?: boolean;
  canEdit?: boolean;
  diagram?: Renderable;
  filterText?: Renderable;
  icon?: Renderable;
  onClickCopy?: () => void;
  onClickDelete?: () => void;
  onClickDuplicate?: () => void;
  onClickEdit?: () => void;
  onClickPaste?: () => void;
  organizations?: FilterConfigOrgOptions;
};

const emptyIconButton = (
  <IconButton disabled size="small">
    <SvgIcon fontSize="small" />
  </IconButton>
);

const QueryOverviewListItem: FC<QueryOverviewListItemProps> = ({
  canEdit,
  canDelete,
  diagram,
  filterText,
  icon,
  onClickCopy,
  onClickDelete,
  onClickDuplicate,
  onClickEdit,
  onClickPaste,
  organizations,
}) => {
  const messages = useMessages(messageIds);
  const [hovered, setHovered] = useState(false);
  const { orgId } = useNumericRouteParams();

  const render = (renderable: Renderable): ReactNode => {
    if (typeof renderable == 'function') {
      return renderable(hovered);
    }
    return renderable;
  };

  const contextActions = useMemo(() => {
    const actions: ContextAction[] = [];

    if (onClickCopy) {
      actions.push({
        icon: <ContentCopy fontSize="small" />,
        onSelect: onClickCopy,
        title: messages.buttonLabels.filterActions.copy(),
      });
    }

    if (onClickPaste) {
      actions.push({
        icon: <SubdirectoryArrowRight fontSize="small" />,
        onSelect: onClickPaste,
        title: messages.buttonLabels.filterActions.pasteBelow(),
      });
    }

    if (onClickDuplicate) {
      actions.push({
        icon: <FileCopy fontSize="small" />,
        onSelect: onClickDuplicate,
        title: messages.buttonLabels.filterActions.duplicate(),
      });
    }

    if (onClickEdit) {
      actions.push({
        icon: <Edit fontSize="small" />,
        onSelect: onClickEdit,
        title: messages.buttonLabels.filterActions.edit(),
      });
    }

    if (onClickDelete) {
      actions.push({
        icon: <Delete fontSize="small" />,
        onSelect: onClickDelete,
        title: messages.buttonLabels.filterActions.delete(),
      });
    }

    return actions;
  }, [
    messages.buttonLabels.filterActions,
    onClickCopy,
    onClickDelete,
    onClickDuplicate,
    onClickEdit,
    onClickPaste,
  ]);

  const [contextMenuAnchor, setContextMenuAnchor] =
    useState<HTMLButtonElement | null>(null);

  const onContextMenuClose = useCallback(() => {
    setHovered(false);
    setContextMenuAnchor(null);
  }, []);

  return (
    <ListItem
      onMouseOut={() => setHovered(false)}
      onMouseOver={() => setHovered(true)}
      style={{ background: 'white', minHeight: 60, padding: 0 }}
    >
      <Grid
        alignItems="center"
        container
        display="flex"
        justifyContent="space-between"
        width={1}
      >
        <Grid display="flex" size={{ xs: 1 }}>
          {render(icon)}
        </Grid>
        <Grid py={2} size={{ lg: 8, xs: 7 }}>
          {organizations && (
            <OrgScope organizations={organizations} orgId={orgId} />
          )}
          <Typography>{render(filterText)}</Typography>
        </Grid>
        <Grid alignSelf="stretch" px={3} size={{ lg: 2, xs: 3 }}>
          {render(diagram)}
        </Grid>
        <Grid alignItems="center" display="flex" size={{ xs: 1 }}>
          {canEdit ? (
            <IconButton
              data-testid="QueryOverview-editFilterButton"
              onClick={() => onClickEdit && onClickEdit()}
              size="small"
            >
              <Edit fontSize="small" />
            </IconButton>
          ) : (
            emptyIconButton
          )}
          {canDelete ? (
            <IconButton
              onClick={() => onClickDelete && onClickDelete()}
              size="small"
            >
              <Delete fontSize="small" />
            </IconButton>
          ) : (
            emptyIconButton
          )}
          {contextActions.length > 0 ? (
            <>
              <IconButton
                onClick={(e) => setContextMenuAnchor(e.currentTarget)}
                size="small"
              >
                <MoreVert fontSize="small" />
              </IconButton>

              <Menu
                anchorEl={contextMenuAnchor}
                onClose={onContextMenuClose}
                open={!!contextMenuAnchor}
              >
                {contextActions.map((item, index) => (
                  <MenuItem key={index} onClick={item.onSelect}>
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <Typography display="flex">{item.title}</Typography>
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : (
            emptyIconButton
          )}
        </Grid>
      </Grid>
    </ListItem>
  );
};

export default QueryOverviewListItem;

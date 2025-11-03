import NextLink from 'next/link';
import {
  DataGridPro,
  GridCellParams,
  GridColDef,
  GridRowProps,
  GridSortModel,
  useGridApiRef,
} from '@mui/x-data-grid-pro';
import React, {
  Dispatch,
  FC,
  memo,
  MouseEvent,
  MutableRefObject,
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Box, Link, Theme, useMediaQuery } from '@mui/material';
import { GridApiPro } from '@mui/x-data-grid-pro/models/gridApiPro';

import BrowserDraggableItem from './BrowserDragableItem';
import BrowserDragLayer from './BrowserDragLayer';
import BrowserItem from './BrowserItem';
import BrowserItemIcon from './BrowserItemIcon';
import BrowserRow from './BrowserRow';
import useFolder from 'features/views/hooks/useFolder';
import { useMessages, UseMessagesMap } from 'core/i18n';
import { useNumericRouteParams } from 'core/hooks';
import useViewBrowserMutations from 'features/views/hooks/useViewBrowserMutations';
import useViewMutations from 'features/views/hooks/useViewMutations';
import { ZUIConfirmDialogContext } from 'zui/ZUIConfirmDialogProvider';
import ZUIEllipsisMenu from 'zui/ZUIEllipsisMenu';
import ZUIFuture from 'zui/ZUIFuture';
import ZUIPerson from 'zui/ZUIPerson';
import ZUIPersonHoverCard from 'zui/ZUIPersonHoverCard';
import useViewBrowserItems, {
  ViewBrowserItem,
} from 'features/views/hooks/useViewBrowserItems';
import messageIds from 'features/views/l10n/messageIds';
import MoveViewDialog from '../MoveViewDialog';
import { ZUIConfirmDialogProps } from 'zui/ZUIConfirmDialog';
import { ZetkinView } from 'utils/types/zetkin';

type OnSelect = (item: ViewBrowserItem, ev: MouseEvent) => void;

interface ViewBrowserProps {
  autoHeight?: boolean; // @deprecated
  basePath: string;
  enableDragAndDrop?: boolean;
  enableEllipsisMenu?: boolean;
  folderId?: number | null;
  onSelect?: OnSelect;
}

const TYPE_SORT_ORDER = ['back', 'folder', 'view'];

function typeComparator(v0: ViewBrowserItem, v1: ViewBrowserItem): number {
  const index0 = TYPE_SORT_ORDER.indexOf(v0.type);
  const index1 = TYPE_SORT_ORDER.indexOf(v1.type);
  return index0 - index1;
}

const IconColumn = memo(function IconColumn({
  item,
  basePath,
  onSelect,
}: {
  basePath: string;
  item: ViewBrowserItem;
  onSelect?: OnSelect;
}) {
  const subPath = item.folderId ? 'folders/' + item.folderId : '';
  if (item.type == 'back') {
    return (
      <NextLink href={`${basePath}/${subPath}`} legacyBehavior passHref>
        <Link color="inherit" onClick={(ev) => onSelect?.(item, ev)}>
          <BrowserItemIcon item={item} />
        </Link>
      </NextLink>
    );
  } else {
    return (
      <NextLink href={`${basePath}/${item.id}`} legacyBehavior passHref>
        <Link color="inherit" onClick={(ev) => onSelect?.(item, ev)}>
          <BrowserDraggableItem item={item}>
            <BrowserItemIcon item={item} />
          </BrowserDraggableItem>
        </Link>
      </NextLink>
    );
  }
});

const OwnerColumn = memo(function OwnerColumn({
  item,
}: {
  item: ViewBrowserItem;
}) {
  if (item.type == 'view') {
    const owner = item.data.owner;
    return (
      <ZUIPersonHoverCard personId={owner.id}>
        <ZUIPerson id={owner.id} name={owner.name} />
      </ZUIPersonHoverCard>
    );
  } else {
    return <Box />;
  }
});

const EllipsisColumn = memo(function EllipsisColumn({
  deleteFolder,
  deleteView,
  duplicateView,
  gridApiRef,
  item,
  messages,
  setItemToBeMoved,
  showConfirmDialog,
}: {
  deleteFolder: (folderId: number) => void;
  deleteView: (viewId: number) => void;
  duplicateView: (
    oldViewId: number,
    folderId: number | null,
    title: string
  ) => Promise<ZetkinView>;
  gridApiRef: MutableRefObject<GridApiPro>;
  item: ViewBrowserItem;
  messages: UseMessagesMap<typeof messageIds>;
  setItemToBeMoved: Dispatch<SetStateAction<ViewBrowserItem | null>>;
  showConfirmDialog: (newProps: Partial<ZUIConfirmDialogProps>) => void;
}) {
  if (item.type == 'back') {
    return null;
  }
  return (
    <ZUIEllipsisMenu
      items={[
        {
          label: messages.browser.menu.rename(),
          onSelect: (e) => {
            e.preventDefault();
            e.stopPropagation();
            gridApiRef.current.startCellEditMode({
              field: 'title',
              id: item.id,
            });
          },
        },
        {
          id: 'delete-item',
          label: messages.browser.menu.delete(),
          onSelect: (e) => {
            e.stopPropagation();
            showConfirmDialog({
              onSubmit: () => {
                if (item.type == 'folder') {
                  deleteFolder(item.data.id);
                } else if (item.type == 'view') {
                  deleteView(item.data.id);
                }
              },
              title: messages.browser.confirmDelete[item.type].title(),
              warningText: messages.browser.confirmDelete[item.type].warning(),
            });
          },
        },
        {
          id: 'move-item',
          label: messages.browser.menu.move(),
          onSelect: (e) => {
            e.stopPropagation();
            setItemToBeMoved(item);
          },
        },
        {
          disabled: item.type != 'view',
          id: 'duplicate-item',
          label: messages.browser.menu.duplicate(),
          onSelect: (e) => {
            e.stopPropagation();
            duplicateView(
              item.data.id,
              item.folderId,
              messages.browser.menu.viewCopy({ viewName: item.title })
            );
          },
        },
      ]}
    />
  );
});

const ViewBrowser: FC<ViewBrowserProps> = ({
  autoHeight = true,
  basePath,
  enableDragAndDrop = true,
  enableEllipsisMenu = true,
  folderId = null,
  onSelect,
}) => {
  const { orgId } = useNumericRouteParams();

  const messages = useMessages(messageIds);
  const [sortModel, setSortModel] = useState<GridSortModel>([
    { field: 'title', sort: 'asc' },
  ]);
  const { showConfirmDialog } = useContext(ZUIConfirmDialogContext);
  const isMobile = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm')
  );
  const gridApiRef = useGridApiRef();

  const { deleteView, duplicateView } = useViewMutations(orgId);
  const { renameItem } = useViewBrowserMutations(orgId);
  const itemsFuture = useViewBrowserItems(orgId, folderId);
  const { deleteFolder, recentlyCreatedFolder } = useFolder(orgId);

  const [itemToBeMoved, setItemToBeMoved] = useState<ViewBrowserItem | null>(
    null
  );

  // If a folder was created, go into rename state
  useEffect(() => {
    if (gridApiRef.current && recentlyCreatedFolder) {
      gridApiRef.current.startCellEditMode({
        field: 'title',
        id: 'folders/' + recentlyCreatedFolder.id,
      });
    }
  }, [recentlyCreatedFolder]);

  const colDefs: GridColDef<ViewBrowserItem>[] = useMemo(() => {
    const colDefs: GridColDef<ViewBrowserItem>[] = [
      {
        disableColumnMenu: true,
        field: 'icon',
        filterable: false,
        headerName: '',
        renderCell: (params) => (
          <IconColumn
            basePath={basePath}
            item={params.row}
            onSelect={onSelect}
          />
        ),
        sortable: false,
        width: 40,
      },
      {
        disableColumnMenu: true,
        editable: true,
        field: 'title',
        flex: 2,
        headerName: messages.viewsList.columns.title(),
        renderCell: (params) => {
          return (
            <BrowserItem
              basePath={basePath}
              item={params.row}
              onSelect={onSelect}
            />
          );
        },
      },
    ];

    if (!isMobile) {
      colDefs.push({
        disableColumnMenu: true,
        field: 'owner',
        flex: 1,
        headerName: messages.viewsList.columns.owner(),
        renderCell: (params) => <OwnerColumn item={params.row} />,
      });

      if (enableEllipsisMenu) {
        colDefs.push({
          field: 'menu',
          headerName: '',
          renderCell: (params) => (
            <EllipsisColumn
              deleteFolder={deleteFolder}
              deleteView={deleteView}
              duplicateView={duplicateView}
              gridApiRef={gridApiRef}
              item={params.row}
              messages={messages}
              setItemToBeMoved={setItemToBeMoved}
              showConfirmDialog={showConfirmDialog}
            />
          ),
          width: 40,
        });
      }
    }

    return colDefs;
  }, [
    basePath,
    isMobile,
    enableDragAndDrop,
    enableEllipsisMenu,
    messages,
    deleteFolder,
    deleteView,
    duplicateView,
    setItemToBeMoved,
    showConfirmDialog,
    gridApiRef,
    onSelect,
  ]);

  const rows = useMemo(() => {
    return itemsFuture.data?.sort((item0, item1) => {
      const typeSort = typeComparator(item0, item1);
      if (typeSort != 0) {
        return typeSort;
      }

      // If we get this far, none of the items will be of the "back"
      // type, because there is only one 'back' and typeComparator()
      // always returns non-zero when the two items are of different
      // type. We still check for "back" here, because TypeScript
      // doesn't understand the logic described above.
      if (item0.type != 'back' && item1.type != 'back') {
        for (const column of sortModel) {
          let sort = 0;
          if (column.field == 'title') {
            sort = item0.title.localeCompare(item1.title);
          } else if (column.field == 'owner') {
            sort = item0.owner.localeCompare(item1.owner);
          }

          if (sort != 0) {
            return column.sort == 'asc' ? sort : -sort;
          }
        }
      }

      return 0;
    });
  }, [itemsFuture.data]);

  const isCellEditable = useCallback(
    (params: GridCellParams) => params.row.type != 'back',
    []
  );

  const onSortModelChange = useCallback(
    (model: GridSortModel) => setSortModel(model),
    []
  );

  const processRowUpdate = useCallback(
    (item: ViewBrowserItem) => {
      if (item.type != 'back') {
        renameItem(item.type, item.data.id, item.title);
      }
      return item;
    },
    [renameItem]
  );

  const slots = useMemo(
    () => ({
      row: (props: GridRowProps) => {
        const item = props.row as ViewBrowserItem;
        return <BrowserRow item={item} rowProps={props} />;
      },
    }),
    []
  );

  const sx = useMemo(() => ({ borderWidth: 0 }), []);

  const closeMoveViewDialog = useCallback(() => setItemToBeMoved(null), []);

  return (
    <ZUIFuture future={itemsFuture}>
      {() => {
        return (
          <>
            {enableDragAndDrop && <BrowserDragLayer />}
            <DataGridPro
              apiRef={gridApiRef}
              autoHeight={autoHeight}
              columns={colDefs}
              disableRowSelectionOnClick
              hideFooter
              isCellEditable={isCellEditable}
              onSortModelChange={onSortModelChange}
              processRowUpdate={processRowUpdate}
              rowBuffer={20}
              rows={rows!}
              slots={slots}
              sortingMode="server"
              sx={sx}
            />
            {itemToBeMoved && (
              <MoveViewDialog
                close={closeMoveViewDialog}
                itemToMove={itemToBeMoved}
              />
            )}
          </>
        );
      }}
    </ZUIFuture>
  );
};

export default ViewBrowser;

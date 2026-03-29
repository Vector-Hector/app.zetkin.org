import { Divider } from '@mui/material';
import { FC, useCallback, useContext } from 'react';
import copy from 'copy-to-clipboard';

import getFilterComponents from './getFilterComponents';
import QueryOverviewChip from './QueryOverviewChip';
import QueryOverviewListItem from './QueryOverviewListItem';
import { SmartSearchSankeyFilterSegment } from '../../sankeyDiagram';
import {
  AnyFilterConfig,
  FILTER_TYPE,
  SmartSearchFilterWithId,
} from 'features/smartSearch/components/types';
import ZUISnackbarContext from 'zui/ZUISnackbarContext';
import { useMessages } from 'core/i18n';
import messageIds from 'features/smartSearch/l10n/messageIds';

interface QueryOverviewFilterListItemProps {
  filter: SmartSearchFilterWithId<AnyFilterConfig>;
  filterIndex: number;
  onDeleteFilter: (filter: SmartSearchFilterWithId<AnyFilterConfig>) => void;
  onEditFilter: (filter: SmartSearchFilterWithId<AnyFilterConfig>) => void;
  onInsertFilterBelow: (
    filter: SmartSearchFilterWithId<AnyFilterConfig>
  ) => void;
  readOnly: boolean;
  showDiagram: boolean;
}

const QueryOverviewFilterListItem: FC<QueryOverviewFilterListItemProps> = ({
  filter,
  filterIndex,
  onDeleteFilter,
  onEditFilter,
  onInsertFilterBelow,
  readOnly,
  showDiagram,
}) => {
  const { displayFilter, filterOperatorIcon, filterTypeIcon } =
    getFilterComponents(filter);
  const { showSnackbar } = useContext(ZUISnackbarContext);
  const messages = useMessages(messageIds);

  const onClickCopy = useCallback(() => {
    const success = copy(JSON.stringify(filter));
    if (success) {
      showSnackbar(
        'success',
        messages.buttonLabels.filterActions.actionResults.copySuccess()
      );
    } else {
      showSnackbar(
        'error',
        messages.buttonLabels.filterActions.actionResults.copyError()
      );
    }
  }, [filter, messages.buttonLabels.filterActions.actionResults, showSnackbar]);

  const onClickPaste = useCallback(() => {
    navigator.clipboard
      .readText()
      .then((text) => {
        onInsertFilterBelow(JSON.parse(text));
      })
      .catch(() => {
        showSnackbar(
          'error',
          messages.buttonLabels.filterActions.actionResults.pasteError()
        );
      });
  }, [
    messages.buttonLabels.filterActions.actionResults,
    onInsertFilterBelow,
    showSnackbar,
  ]);

  return (
    <>
      <Divider />
      <QueryOverviewListItem
        canDelete={!readOnly}
        canEdit={!readOnly}
        diagram={(hovered) =>
          showDiagram && (
            <SmartSearchSankeyFilterSegment
              filterIndex={filterIndex}
              hovered={hovered}
            />
          )
        }
        filterText={displayFilter}
        icon={
          <QueryOverviewChip
            filterOperatorIcon={filterOperatorIcon}
            filterTypeIcon={filterTypeIcon}
          />
        }
        onClickCopy={onClickCopy}
        onClickDelete={() => onDeleteFilter(filter)}
        onClickDuplicate={() => {
          onInsertFilterBelow(filter);
        }}
        onClickEdit={() => onEditFilter(filter)}
        onClickPaste={onClickPaste}
        organizations={
          filter.type != FILTER_TYPE.ALL && 'organizations' in filter.config
            ? filter.config.organizations
            : undefined
        }
      />
    </>
  );
};

export default QueryOverviewFilterListItem;

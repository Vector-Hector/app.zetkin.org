import { FormControl } from '@mui/material';
import { useState } from 'react';

import { ZetkinSmartTag } from 'features/tags/types';
import SmartTagSelect from 'features/tags/components/SmartTagSelect';
import {
  FILTER_TYPE,
  IN_OPERATOR,
  OPERATION,
} from 'features/smartSearch/components/types';
import TagManager from 'features/tags/components/TagManager';
import { ZetkinAppliedTag } from 'utils/types/zetkin';
import { COLUMN_TYPE, SelectedViewColumn } from '../types';

interface PersonTagConfigProps {
  onOutputConfigured: (columns: SelectedViewColumn[]) => void;
}

const PersonTagConfig = ({ onOutputConfigured }: PersonTagConfigProps) => {
  const [selectedTags, setSelectedTags] = useState<ZetkinAppliedTag[]>([]);

  const [selectedSmartTag, setSelectedSmartTag] =
    useState<ZetkinSmartTag | null>(null);

  const onChangeTags = (
    tags: ZetkinAppliedTag[],
    smartTag = selectedSmartTag
  ) => {
    setSelectedTags(tags);
    const columns: SelectedViewColumn[] = tags.map((tag) => ({
      config: { tag_id: tag.id },
      title: tag.title,
      type: COLUMN_TYPE.PERSON_TAG,
    }));
    if (smartTag) {
      columns.push({
        config: {
          filter_spec: [
            {
              config: { operator: IN_OPERATOR.IN, query_id: smartTag.query_id },
              op: OPERATION.ADD,
              type: FILTER_TYPE.SUB_QUERY,
            },
          ],
        },
        title: smartTag.title,
        type: COLUMN_TYPE.LOCAL_QUERY,
      });
    }
    onOutputConfigured(columns);
  };

  return (
    <FormControl sx={{ width: 300 }}>
      <SmartTagSelect
        onChange={(tag) => {
          setSelectedSmartTag(tag);
          onChangeTags(selectedTags, tag);
        }}
        value={selectedSmartTag}
      />
      <TagManager
        assignedTags={selectedTags}
        disableEditTags={true}
        groupTags={false}
        ignoreValues={true}
        onAssignTag={(tag) => {
          const newAssignedTags = selectedTags.concat([
            tag,
          ] as ZetkinAppliedTag[]);
          onChangeTags(newAssignedTags);
        }}
        onUnassignTag={(tag) => {
          const unassignedTags = selectedTags.filter((t) => t.id != tag.id);
          onChangeTags(unassignedTags);
        }}
      />
    </FormControl>
  );
};

export default PersonTagConfig;

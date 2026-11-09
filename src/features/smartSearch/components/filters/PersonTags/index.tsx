import { Box, Button, MenuItem, Typography } from '@mui/material';
import { FormEvent } from 'react';
import Fuse from 'fuse.js';

import FilterForm from '../../FilterForm';
import useSmartTags from 'features/tags/hooks/useSmartTags';
import StyledItemSelect from 'features/smartSearch/components/inputs/StyledItemSelect';
import StyledNumberInput from '../../inputs/StyledNumberInput';
import StyledSelect from '../../inputs/StyledSelect';
import { useNumericRouteParams } from 'core/hooks';
import useSmartSearchFilter from 'features/smartSearch/hooks/useSmartSearchFilter';
import useSelectableTags from 'features/tags/hooks/useSelectableTags';
import { ZetkinTag } from 'utils/types/zetkin';
import {
  CONDITION_OPERATOR,
  FILTER_TYPE,
  IN_OPERATOR,
  NewSmartSearchFilter,
  OPERATION,
  PersonTagsFilterConfig,
  SmartSearchFilterWithId,
  ZetkinSmartSearchFilter,
} from 'features/smartSearch/components/types';
import messageIds from 'features/smartSearch/l10n/messageIds';
import { Msg, useMessages } from 'core/i18n';
import { groupTags } from 'features/tags/components/TagManager/utils';
import TagChip from 'features/tags/components/TagManager/components/TagChip';

const localMessageIds = messageIds.filters.personTags;

interface PersonTagsProps {
  filter:
    | SmartSearchFilterWithId<PersonTagsFilterConfig>
    | NewSmartSearchFilter;
  onSubmit: (filter: SmartSearchFilterWithId | ZetkinSmartSearchFilter) => void;
  onCancel: () => void;
}

const PersonTags = ({
  onSubmit,
  onCancel,
  filter: initialFilter,
}: PersonTagsProps): JSX.Element => {
  const messages = useMessages(localMessageIds);
  const { orgId } = useNumericRouteParams();
  const { data } = useSelectableTags(orgId);
  const smartTags = useSmartTags(orgId).data || [];
  const tags = data || [];
  const tagsSorted = tags.sort((t1, t2) => {
    return t1.title.localeCompare(t2.title);
  });

  const { filter, setConfig, setOp } =
    useSmartSearchFilter<PersonTagsFilterConfig>(initialFilter, {
      condition: CONDITION_OPERATOR.ALL,
      tags: [],
    });

  const selected = filter.config.condition;

  const selectedTagIds = filter.config.tags;
  const selectedSmartTag = smartTags.find((tag) =>
    selectedTagIds.includes(-tag.id)
  );
  const isTagDisabled = (tag: { id: number }) =>
    selectedTagIds.includes(tag.id) ||
    (tag.id < 0 && !!filter.config.organizations) ||
    (selectedTagIds.length > 0 && (tag.id < 0 || !!selectedSmartTag));

  const selectedTags = selectedTagIds.reduce((acc: ZetkinTag[], id) => {
    const tag = tagsSorted.find((tag) => tag.id === id);
    if (tag) {
      return acc.concat(tag);
    }
    return acc;
  }, []);

  const submittable =
    !!selectedTagIds.length &&
    (selectedTagIds.every((id) => id > 0) || !!selectedSmartTag);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!submittable) {
      return;
    }
    if (selectedSmartTag) {
      onSubmit({
        ...filter,
        config: {
          operator:
            filter.config.condition === CONDITION_OPERATOR.NONE
              ? IN_OPERATOR.NOTIN
              : IN_OPERATOR.IN,
          query_id: selectedSmartTag.query_id,
        },
        type: FILTER_TYPE.SUB_QUERY,
      });
    } else {
      onSubmit(filter);
    }
  };

  const handleConditionChange = (conditionValue: string) => {
    if (conditionValue === CONDITION_OPERATOR.SOME) {
      setConfig({
        ...filter.config,
        condition: CONDITION_OPERATOR.SOME,
        min_matching: 1,
      });
    } else {
      setConfig({
        ...filter.config,
        condition: conditionValue as CONDITION_OPERATOR,
        min_matching: undefined,
      });
    }
  };

  const handleTagChange = (tags: { id: number; title: string }[]) => {
    setConfig({
      ...filter.config,
      condition:
        tags.some((tag) => tag.id < 0) &&
        filter.config.condition === CONDITION_OPERATOR.SOME
          ? CONDITION_OPERATOR.ALL
          : filter.config.condition,
      tags: tags.map((tag) => tag.id),
    });
  };

  const handleTagDelete = (tag: ZetkinTag) => {
    handleTagChange(
      selectedTags.filter((selectedTag) => selectedTag.id !== tag.id)
    );
  };

  const conditionSelect = (
    <StyledSelect
      onChange={(e) => handleConditionChange(e.target.value)}
      value={selected}
    >
      {Object.values(CONDITION_OPERATOR)
        .filter(
          (condition) =>
            !selectedSmartTag ||
            [
              CONDITION_OPERATOR.ALL,
              CONDITION_OPERATOR.ANY,
              CONDITION_OPERATOR.NONE,
            ].includes(condition)
        )
        .map((o) => (
          <MenuItem key={o} value={o}>
            <Msg id={localMessageIds.condition.conditionSelect[o]} />
          </MenuItem>
        ))}
    </StyledSelect>
  );

  const groupedTags = groupTags(tags, messages.noGroup());
  const sortedGroupedTags: ZetkinTag[] = [];
  groupedTags.forEach((group) => {
    sortedGroupedTags.push(...group.tags);
  });

  const groupedSelectedTags = groupTags(selectedTags, messages.noGroup());
  const sortedGroupedSelectedTags: ZetkinTag[] = [];
  groupedSelectedTags.forEach((group) => {
    sortedGroupedSelectedTags.push(...group.tags);
  });

  const fuse = new Fuse(tags, {
    keys: ['title', 'group.title'],
    threshold: 0.4,
  });

  return (
    <FilterForm
      disableSubmit={!submittable}
      enableOrgSelect={!selectedSmartTag}
      onCancel={onCancel}
      onOrgsChange={(orgs) => {
        setConfig({ ...filter.config, organizations: orgs });
      }}
      onSubmit={(e) => handleSubmit(e)}
      renderExamples={() => (
        <>
          <Msg id={localMessageIds.examples.one} />
          <br />
          <Msg id={localMessageIds.examples.two} />
        </>
      )}
      renderSentence={() => (
        <Msg
          id={localMessageIds.inputString}
          values={{
            addRemoveSelect: (
              <StyledSelect
                onChange={(e) => setOp(e.target.value as OPERATION)}
                value={filter.op}
              >
                {Object.values(OPERATION).map((o) => (
                  <MenuItem key={o} value={o}>
                    <Msg id={messageIds.operators[o]} />
                  </MenuItem>
                ))}
              </StyledSelect>
            ),
            condition:
              selected == 'some' ? (
                <Msg
                  id={localMessageIds.condition.edit.some}
                  values={{
                    conditionSelect,
                    minMatchingInput: (
                      <StyledNumberInput
                        onChange={(e) =>
                          setConfig({
                            ...filter.config,
                            condition: CONDITION_OPERATOR.SOME,
                            min_matching: +e.target.value || undefined,
                          })
                        }
                        slotProps={{
                          htmlInput: {
                            max: selectedTags.length,
                            min: '1',
                          },
                        }}
                        value={filter.config.min_matching}
                      />
                    ),
                  }}
                />
              ) : (
                <Msg
                  id={localMessageIds.condition.edit[selected]}
                  values={{ conditionSelect }}
                />
              ),
            tags: (
              <Box
                alignItems="center"
                display="inline-flex"
                sx={{
                  alignItems: 'center',
                  display: 'inline-flex',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                {sortedGroupedSelectedTags.map((tag) => {
                  return (
                    <Box key={tag.id} sx={{ fontSize: '1.1rem' }}>
                      <TagChip
                        onDelete={() => handleTagDelete(tag)}
                        tag={tag}
                      />
                    </Box>
                  );
                })}
                {selectedTags.length < tags.length && (
                  <StyledItemSelect
                    filterOptions={(tags, state) => {
                      const lowerCaseSearchPhrase =
                        state.inputValue.toLowerCase();

                      const matchingTags = fuse
                        .search(lowerCaseSearchPhrase)
                        .map((fuseResult) => fuseResult.item);

                      if (!lowerCaseSearchPhrase) {
                        return tags;
                      }

                      return matchingTags.sort((tag1, tag2) => {
                        const tag1Group =
                          tag1.group?.title || messages.noGroup();
                        const tag2Group =
                          tag2.group?.title || messages.noGroup();

                        return tag1Group.localeCompare(tag2Group);
                      });
                    }}
                    getOptionDisabled={isTagDisabled}
                    groupBy={(option) =>
                      option.group?.title || messages.noGroup()
                    }
                    onChange={(_, v) => handleTagChange(v)}
                    options={sortedGroupedTags.sort((tag1, tag2) => {
                      const tag1Group = tag1.group?.title || messages.noGroup();
                      const tag2Group = tag2.group?.title || messages.noGroup();

                      return tag1Group.localeCompare(tag2Group);
                    })}
                    renderGroup={(params) => {
                      const group = groupedTags.find(
                        (tagGroup) => tagGroup.title == params.group
                      );

                      const allTagsInGroupAreSelected = !group?.tags.some(
                        (tag) => !isTagDisabled(tag) && tag.id > 0
                      );

                      return (
                        <Box
                          key={params.key}
                          component="li"
                          sx={{
                            width: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              alignItems: 'center',
                              display: 'flex',
                              justifyContent: 'space-between',
                              paddingX: 1,
                              width: '100%',
                            }}
                          >
                            <Typography color="secondary">
                              {params.group}
                            </Typography>
                            <Button
                              disabled={allTagsInGroupAreSelected}
                              onClick={() => {
                                const group = groupedTags.find(
                                  (tagGroup) => tagGroup.title == params.group
                                );

                                const existingTags = tags.filter(
                                  (tag) =>
                                    !!selectedTagIds.some(
                                      (tagId) => tagId == tag.id
                                    )
                                );

                                if (group) {
                                  handleTagChange([
                                    ...existingTags,
                                    ...group.tags
                                      .filter(
                                        (tag) =>
                                          tag.id > 0 &&
                                          !isTagDisabled(tag) &&
                                          !existingTags.some(
                                            (t) => t.id == tag.id
                                          )
                                      )
                                      .map((tag) => ({
                                        id: tag.id,
                                        title: tag.title,
                                      })),
                                  ]);
                                }
                              }}
                              size="small"
                            >
                              <Msg
                                id={
                                  messageIds.filters.personTags
                                    .addAllFromGroupButton
                                }
                              />
                            </Button>
                          </Box>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 1,
                              padding: 1,
                            }}
                          >
                            {params.children}
                          </Box>
                        </Box>
                      );
                    }}
                    renderOption={(params, tag) => {
                      const alreadySelected = isTagDisabled(tag);

                      const existingTags = tags.filter(
                        (tag) =>
                          !!selectedTagIds.some((tagId) => tagId == tag.id)
                      );
                      return (
                        <Box
                          key={tag.id}
                          component="li"
                          sx={{ display: 'flex' }}
                        >
                          <TagChip
                            disabled={alreadySelected}
                            onClick={() =>
                              handleTagChange([...existingTags, tag])
                            }
                            tag={tag as ZetkinTag}
                          />
                        </Box>
                      );
                    }}
                    sx={{ minWidth: '300px' }}
                    value={tags.filter((t) => selectedTagIds.includes(t.id))}
                  />
                )}
              </Box>
            ),
          }}
        />
      )}
      selectedOrgs={filter.config.organizations}
    />
  );
};

export default PersonTags;

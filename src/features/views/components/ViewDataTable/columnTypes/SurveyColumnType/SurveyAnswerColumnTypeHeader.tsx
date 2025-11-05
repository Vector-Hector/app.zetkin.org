import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Box, Card, Popper, Typography } from '@mui/material';
import { GridColumnHeaderTitle } from '@mui/x-data-grid-pro';
import { GridColumnHeaderParams } from '@mui/x-data-grid/models/params/gridColumnHeaderParams';

import ZUILink from 'zui/components/ZUILink';
import { useNumericRouteParams } from 'core/hooks';
import useSurveysWithElements from 'features/surveys/hooks/useSurveysWithElements';
import {
  SurveyOptionsViewColumn,
  SurveyOptionViewColumn,
  SurveyResponseViewColumn,
  ZetkinViewColumn,
} from 'features/views/components/types';
import { ELEMENT_TYPE, ZetkinSurveyExtended } from 'utils/types/zetkin';
import ZUIFuture from 'zui/ZUIFuture';
import ZUILabel from 'zui/components/ZUILabel';

const SurveyColumnTypeTooltip = ({
  questionId,
  surveys,
}: {
  questionId: number;
  surveys: ZetkinSurveyExtended[];
}) => {
  const survey = useMemo(() => {
    const getSurveyFromQuestionId = (questionId?: number) => {
      return questionId
        ? surveys.find((s) => s.elements.map((e) => e.id).includes(questionId))
        : undefined;
    };
    return getSurveyFromQuestionId(questionId);
  }, [surveys, questionId]);

  const question = useMemo(() => {
    if (!survey) {
      return undefined;
    }

    return survey.elements.find((e) => e.id === questionId);
  }, [survey, questionId]);

  return survey && survey.campaign && question ? (
    <Box>
      <Typography
        sx={{
          fontSize: '1.1em',
        }}
        variant="h5"
      >
        Survey options column
      </Typography>
      <ZUILabel>
        Survey:{' '}
        <ZUILink
          href={`/organize/${survey.organization.id}/projects/${survey.campaign.id}/surveys/${survey.id}`}
          openInNewTab={true}
          text={survey.title}
        />
      </ZUILabel>
      <ZUILabel>
        Question:{' '}
        {question.type === ELEMENT_TYPE.QUESTION && question.question.question}
      </ZUILabel>
    </Box>
  ) : (
    <Typography>Survey not found.</Typography>
  );
};

const SurveyColumnTypeTooltipWrapper = ({
  column,
  orgId,
}: {
  column:
    | SurveyOptionsViewColumn
    | SurveyOptionViewColumn
    | SurveyResponseViewColumn;
  orgId?: number;
}) => {
  const { orgId: routeOrgId } = useNumericRouteParams();
  orgId = orgId ?? routeOrgId;
  const surveys = useSurveysWithElements(orgId);

  return (
    <Card elevation={5} sx={{ padding: '24px' }} variant="elevation">
      <ZUIFuture future={surveys}>
        {(data) => (
          <SurveyColumnTypeTooltip
            questionId={column.config.question_id}
            surveys={data}
          />
        )}
      </ZUIFuture>
    </Card>
  );
};

export const SurveyAnswerColumnTypeHeader = <
  T extends ZetkinViewColumn,
  V extends ZetkinViewColumn
>({
  column,
  orgId,
  params,
}: {
  column: T;
  orgId?: number;
  params: GridColumnHeaderParams<V>;
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const openPopover = (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
    setAnchorEl(event.currentTarget);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (anchorEl) {
        setOpen(true);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [anchorEl]);

  const closePopover = () => {
    setAnchorEl(null);
    setOpen(false);
  };

  if (column.type !== 'survey_options' && column.type !== 'survey_response') {
    return (
      <GridColumnHeaderTitle
        columnWidth={params.colDef.width || 0}
        label={params.colDef.headerName || ' '}
      />
    );
  }

  return (
    <Box
      onMouseEnter={openPopover}
      onMouseLeave={closePopover}
      style={{ display: 'flex' }}
    >
      <GridColumnHeaderTitle
        columnWidth={params.colDef.width || 0}
        label={params.colDef.headerName || ' '}
      />
      <Popper
        anchorEl={anchorEl}
        id="person-hover-card"
        modifiers={[
          {
            enabled: true,
            name: 'preventOverflow',
            options: {
              altAxis: true,
              padding: 8,
              tether: true,
            },
          },
        ]}
        open={open}
        style={{ zIndex: 1300 }}
      >
        <SurveyColumnTypeTooltipWrapper column={column} orgId={orgId} />
      </Popper>
    </Box>
  );
};

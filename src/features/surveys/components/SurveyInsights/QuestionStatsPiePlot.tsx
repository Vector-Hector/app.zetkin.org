import React, { MutableRefObject, useMemo, useState } from 'react';
import { Alert, Collapse, IconButton } from '@mui/material';
import { PieChartPro } from '@mui/x-charts-pro/PieChartPro';
import CloseIcon from '@mui/icons-material/Close';

import { ZetkinSurveyQuestionElement } from 'utils/types/zetkin';
import { useMessages } from 'core/i18n';
import messageIds from 'features/surveys/l10n/messageIds';
import { getEllipsedString } from 'utils/stringUtils';
import {
  isOptionsQuestion,
  isOptionsStats,
  Zetkin2QuestionStats,
} from 'features/surveys/types';
import {
  CHART_HEIGHT,
  ChartWrapper,
  COLORS,
  UseChartProExportPublicApi,
} from './InsightsCard';
import {
  NLPAnalysisType,
  useFrequencyData,
} from 'features/surveys/hooks/useSurveyFrequencyData';

export const QuestionStatsPiePlot = ({
  exportApi,
  question,
  questionStats,
}: {
  exportApi: MutableRefObject<UseChartProExportPublicApi | undefined>;
  question: ZetkinSurveyQuestionElement;
  questionStats: Zetkin2QuestionStats;
}) => {
  const [analysisType, setAnalysisType] =
    useState<NLPAnalysisType>('word-frequency');

  const freqData = useFrequencyData(questionStats, analysisType);

  const data = useMemo(() => {
    const items = isOptionsStats(questionStats)
      ? (isOptionsQuestion(question.question)
          ? question.question.options || []
          : []
        ).map((option) => ({
          label: getEllipsedString(option.text, 60),
          value:
            questionStats.options.find((c) => c.option_id === option.id)
              ?.count || 0,
        }))
      : Object.entries(freqData).map(([word, count]) => ({
          label: getEllipsedString(word, 60),
          value: count,
        }));
    return items
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(({ value, label }, index) => ({
        color: COLORS[index % COLORS.length],
        label,
        value,
      }));
  }, [questionStats, question, freqData]);
  const messages = useMessages(messageIds);
  const [hasSeenPieInaccuracyWarning, setHasSeenPieInaccuracyWarning] =
    useState(false);

  return (
    <>
      {isOptionsStats(questionStats) &&
        !!questionStats.multiple_selected_options_count && (
          <Collapse in={!hasSeenPieInaccuracyWarning}>
            <Alert
              action={
                <IconButton
                  onClick={() => setHasSeenPieInaccuracyWarning(true)}
                  size={'small'}
                >
                  <CloseIcon fontSize={'inherit'} />
                </IconButton>
              }
              severity={'warning'}
            >
              {messages.insights.optionsFields.warningMultipleSelectedOptionsPie(
                {
                  respondentCount:
                    questionStats.multiple_selected_options_count,
                }
              )}
            </Alert>
          </Collapse>
        )}
      <ChartWrapper
        analysisType={analysisType}
        setAnalysisType={setAnalysisType}
      >
        <PieChartPro
          apiRef={
            exportApi as unknown as MutableRefObject<UseChartProExportPublicApi>
          }
          height={CHART_HEIGHT}
          series={[
            {
              arcLabel: 'value',
              cornerRadius: 5,
              data,
              innerRadius: 80,
              outerRadius: 180,
            },
          ]}
          slotProps={{
            pieArc: {
              strokeWidth: 3,
            },
            pieArcLabel: {
              fill: 'white',
            },
          }}
          sx={{
            '.MuiPieArcLabel-root': {
              fill: 'white !important',
            },
            gap: '20px',
          }}
          width={360}
        />
      </ChartWrapper>
    </>
  );
};

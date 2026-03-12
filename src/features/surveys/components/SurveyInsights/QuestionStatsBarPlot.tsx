import React, { MutableRefObject, RefObject, useMemo, useState } from 'react';
import { useTheme } from '@mui/material';
import {
  BarChartPro,
  BarChartProPluginSignatures,
} from '@mui/x-charts-pro/BarChartPro';
import { ChartPublicAPI } from '@mui/x-charts/internals/plugins/models';

import { ZetkinSurveyQuestionElement } from 'utils/types/zetkin';
import {
  isOptionsQuestion,
  isOptionsStats,
  isTextStats,
  Zetkin2QuestionStats,
} from 'features/surveys/types';
import {
  NLPAnalysisType,
  useFrequencyData,
} from 'features/surveys/hooks/useSurveyFrequencyData';
import {
  CHART_HEIGHT,
  ChartWrapper,
  COLORS,
  UseChartProExportPublicApi,
} from './InsightsCard';

export const QuestionStatsBarPlot = ({
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

  const theme = useTheme();

  const data = useMemo(() => {
    const bars = isOptionsStats(questionStats)
      ? (isOptionsQuestion(question.question)
          ? question.question.options || []
          : []
        ).map((option) => ({
          count:
            questionStats.options.find((c) => c.option_id === option.id)
              ?.count || 0,
          option: option.text,
        }))
      : Object.entries(freqData).map(([word, count]) => ({
          count: count,
          option: word,
        }));
    let sorted = bars.sort((a, b) => b.count - a.count);
    if (isTextStats(questionStats)) {
      sorted = sorted.slice(0, 10);
    }
    return sorted;
  }, [questionStats, question, freqData]);

  return (
    <ChartWrapper analysisType={analysisType} setAnalysisType={setAnalysisType}>
      <BarChartPro
        apiRef={
          exportApi as unknown as RefObject<
            ChartPublicAPI<BarChartProPluginSignatures> | undefined
          >
        }
        grid={{
          vertical: true,
        }}
        height={CHART_HEIGHT}
        layout={'horizontal'}
        series={[
          {
            data: data.map((option) => option.count),
          },
        ]}
        slotProps={{
          tooltip: {
            sx: {
              caption: {
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              },
              maxWidth: '60vw',
              overflow: 'hidden',
            },
          },
        }}
        sx={{
          '.MuiChartsAxis-tick': {
            stroke: `${theme.palette.grey['700']} !important`,
          },
          height: CHART_HEIGHT,
        }}
        xAxis={[
          {
            disableLine: true,
            tickLabelStyle: { fill: theme.palette.grey['700'] },
          },
        ]}
        yAxis={[
          {
            colorMap: {
              colors: COLORS,
              type: 'ordinal',
            },
            data: data.map((option) => option.option),
            disableLine: true,
            disableTicks: true,
            id: 'barCategories',
            tickLabelStyle: { fill: theme.palette.common.black },
            width: 200,
          },
        ]}
      />
    </ChartWrapper>
  );
};

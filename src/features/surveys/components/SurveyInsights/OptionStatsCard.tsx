import React, { useMemo, useRef, useState } from 'react';

import { ZetkinSurveyQuestionElement } from 'utils/types/zetkin';
import { useMessages } from 'core/i18n';
import messageIds from 'features/surveys/l10n/messageIds';
import { Zetkin2OptionsQuestionStats } from 'features/surveys/types';
import { InsightsCard, UseChartProExportPublicApi } from './InsightsCard';
import { QuestionStatsBarPlot } from 'features/surveys/components/SurveyInsights/QuestionStatsBarPlot';
import { QuestionStatsPiePlot } from 'features/surveys/components/SurveyInsights/QuestionStatsPiePlot';

export const OptionsStatsCard = ({
  question,
  questionStats,
}: {
  question: ZetkinSurveyQuestionElement;
  questionStats: Zetkin2OptionsQuestionStats;
}) => {
  const [tab, setTab] = useState('bar-plot');
  const messages = useMessages(messageIds);

  const subheader = useMemo(
    () =>
      messages.insights.optionsFields.subheader({
        answerCount: questionStats.answer_count,
        totalSelectedOptionsCount: questionStats.total_selected_options_count,
      }),
    [questionStats, messages.insights.optionsFields.subheader]
  );

  const exportApi = useRef<UseChartProExportPublicApi>();

  return (
    <InsightsCard
      exportApi={exportApi}
      exportDisabled={false}
      onTabChange={(selected) => setTab(selected)}
      question={question}
      subheader={subheader}
      tabOptions={[
        {
          label: messages.insights.optionsFields.tabs.barPlot(),
          value: 'bar-plot',
        },
        {
          label: messages.insights.optionsFields.tabs.piePlot(),
          value: 'pie-chart',
        },
      ]}
      tabValue={tab}
    >
      {tab === 'bar-plot' && (
        <QuestionStatsBarPlot
          exportApi={exportApi}
          question={question}
          questionStats={questionStats}
        />
      )}
      {tab === 'pie-chart' && (
        <QuestionStatsPiePlot
          exportApi={exportApi}
          question={question}
          questionStats={questionStats}
        />
      )}
    </InsightsCard>
  );
};

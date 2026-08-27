import dayjs from 'dayjs';
import { Tooltip } from '@mui/material';

import { FormattedRelativeTime } from 'core/i18n/reactIntl';
import ZUIDateTime from '../ZUIDateTime';

interface ZUIRelativeTimeProps {
  convertToLocal?: boolean;
  datetime: string; // iso datetime string
  forcePast?: boolean;
}

const ZUIRelativeTime: React.FunctionComponent<ZUIRelativeTimeProps> = ({
  convertToLocal,
  datetime,
  forcePast,
}) => {
  const now = dayjs();
  const absoluteDatetime = dayjs(
    convertToLocal ? new Date(datetime + 'Z') : datetime
  );

  //if forcePast is set and datetime is in the future, set time to "now"
  const difference: number =
    forcePast && absoluteDatetime.unix() - now.unix() > 0
      ? 0
      : absoluteDatetime.unix() - now.unix();

  if (isNaN(difference)) {
    return null;
  }

  const [value, unit, updateInterval] = selectUnit(difference);

  return (
    <Tooltip
      arrow
      title={
        <ZUIDateTime convertToLocal={convertToLocal} datetime={datetime} />
      }
    >
      <span>
        <FormattedRelativeTime
          numeric="auto"
          unit={unit}
          updateIntervalInSeconds={updateInterval}
          value={value}
        />
      </span>
    </Tooltip>
  );
};

function selectUnit(
  seconds: number
): [
  number,
  Intl.RelativeTimeFormatUnitSingular | undefined,
  number | undefined,
] {
  let value = seconds;
  let updateInterval: number | undefined = 60;
  let unit: Intl.RelativeTimeFormatUnitSingular | undefined = undefined;

  const yearInSeconds = 365 * 24 * 60 * 60;
  if (Math.abs(value) > 1.5 * yearInSeconds) {
    value = Math.round(value / yearInSeconds);
    unit = 'year';
    updateInterval = undefined;
  }

  return [value, unit, updateInterval];
}

export default ZUIRelativeTime;

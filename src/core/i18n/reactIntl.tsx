import IntlMessageFormat from 'intl-messageformat';
import { FC, useEffect, useState } from 'react';
import {
  DateTimeFormatOptions,
  NumberFormatOptions,
  useFormatter,
  useLocale,
  useTranslations,
} from 'next-intl';

import { AnyMessage, MessageMap } from './messages';
import { UseMessagesMap } from './useMessages';

type DateValue = Date | number | string;

function toDate(value: DateValue): Date {
  return value instanceof Date ? value : new Date(value);
}

export const FormattedDate: FC<
  DateTimeFormatOptions & { value: DateValue }
> = ({ value, ...options }) => {
  const format = useFormatter();
  return <>{format.dateTime(toDate(value), options)}</>;
};

export const FormattedTime: FC<
  DateTimeFormatOptions & { value: DateValue }
> = ({ value, ...options }) => {
  const format = useFormatter();
  return <>{format.dateTime(toDate(value), options)}</>;
};

export const FormattedNumber: FC<
  NumberFormatOptions & { value: bigint | number }
> = ({ value, ...options }) => {
  const format = useFormatter();
  return <>{format.number(value, options)}</>;
};

const UNIT_SECONDS: Record<Intl.RelativeTimeFormatUnitSingular, number> = {
  day: 86400,
  hour: 3600,
  minute: 60,
  month: 2629800,
  quarter: 3 * 2629800,
  second: 1,
  week: 604800,
  year: 31557600,
};

interface FormattedRelativeTimeProps extends Intl.RelativeTimeFormatOptions {
  unit?: Intl.RelativeTimeFormatUnitSingular;
  updateIntervalInSeconds?: number;
  value: number;
}

export const FormattedRelativeTime: FC<FormattedRelativeTimeProps> = ({
  unit = 'second',
  updateIntervalInSeconds,
  value,
  ...options
}) => {
  const locale = useLocale();
  const [mountedAt] = useState(() => Date.now());
  const [, forceRerender] = useState(0);

  useEffect(() => {
    if (!updateIntervalInSeconds) {
      return;
    }
    const interval = setInterval(
      () => forceRerender((n) => n + 1),
      updateIntervalInSeconds * 1000
    );
    return () => clearInterval(interval);
  }, [updateIntervalInSeconds]);

  const elapsedInUnit = (Date.now() - mountedAt) / 1000 / UNIT_SECONDS[unit];
  const formatter = new Intl.RelativeTimeFormat(locale, options);

  return <>{formatter.format(Math.round(value - elapsedInUnit), unit)}</>;
};

export interface IntlShape {
  formatDate(value: DateValue, options?: DateTimeFormatOptions): string;
  formatDateTimeRange(
    start: DateValue,
    end: DateValue,
    options?: DateTimeFormatOptions
  ): string;
  formatMessage(
    descriptor: { defaultMessage: string; id: string },
    values?: Record<string, number | string>
  ): string;
  formatTime(value: DateValue, options?: DateTimeFormatOptions): string;
  locale: string;
}

export function useIntl(): IntlShape {
  const locale = useLocale();
  const format = useFormatter();
  const t = useTranslations();

  return {
    formatDate: (value, options) => format.dateTime(toDate(value), options),
    formatDateTimeRange: (start, end, options) =>
      format.dateTimeRange(toDate(start), toDate(end), options),
    formatMessage: (descriptor, values) => {
      if (!t.has(descriptor.id)) {
        return new IntlMessageFormat(descriptor.defaultMessage, locale).format(
          values
        ) as string;
      }
      return values ? t(descriptor.id, values) : t(descriptor.id);
    },
    formatTime: (value, options) => format.dateTime(toDate(value), options),
    locale,
  };
}

export function injectIntl<MapType extends MessageMap>(
  map: MapType,
  intl: IntlShape
): UseMessagesMap<MapType> {
  const output: Record<
    string,
    | UseMessagesMap<MessageMap>[string]
    | ((values?: Record<string, number | string>) => string)
  > = {};

  Object.entries(map).forEach(([key, val]) => {
    if (isMessage(val)) {
      output[key] = (values?: Record<string, number | string>) =>
        intl.formatMessage(
          { defaultMessage: val._defaultMessage, id: val._id },
          values
        );
    } else {
      output[key] = injectIntl(val, intl);
    }
  });

  return output as UseMessagesMap<MapType>;
}

function isMessage(val: AnyMessage | MessageMap): val is AnyMessage {
  return '_typeFunc' in val;
}

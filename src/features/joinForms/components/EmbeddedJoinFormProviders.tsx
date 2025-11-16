'use client';

import { ReactNode } from 'react';
import { IntlProvider } from 'react-intl';

import { MessageList } from 'utils/locale';

export const EmbeddedJoinFormProviders = ({
  children,
  lang,
  messages,
}: {
  children: ReactNode;
  lang: string;
  messages: MessageList;
}) => {
  return (
    <IntlProvider defaultLocale="en" locale={lang} messages={messages}>
      {children}
    </IntlProvider>
  );
};

import { ReactNode } from 'react';
import { headers } from 'next/headers';

import { EmbeddedJoinFormProviders } from 'features/joinForms/components/EmbeddedJoinFormProviders';
import BackendApiClient from 'core/api/client/BackendApiClient';
import { ZetkinUser } from 'utils/types/zetkin';
import { getBrowserLanguage, getMessages } from 'utils/locale';

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headersList = headers();
  const headersEntries = headersList.entries();
  const headersObject = Object.fromEntries(headersEntries);
  const apiClient = new BackendApiClient(headersObject);

  let user: ZetkinUser | null;
  try {
    user = await apiClient.get<ZetkinUser>('/api/users/me');
  } catch (e) {
    user = null;
  }

  const lang =
    user?.lang || getBrowserLanguage(headers().get('accept-language') || '');
  const messages = await getMessages(lang);

  return (
    <html lang="en">
      <body>
        <EmbeddedJoinFormProviders lang={lang} messages={messages}>
          {children}
        </EmbeddedJoinFormProviders>
      </body>
    </html>
  );
}

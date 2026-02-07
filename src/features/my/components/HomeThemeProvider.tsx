import { FC, ReactNode } from 'react';
import { cookies } from 'next/headers';

import { ResolvedThemeMode } from 'zui/theme/themeMode';
import HomeThemeProviderClient from 'features/my/components/HomeThemeProviderClient';

type Props = {
  children: ReactNode;
};

const HomeThemeProvider: FC<Props> = ({ children }) => {
  const themeMode =
    (cookies().get('theme')?.value as ResolvedThemeMode) ?? 'light';

  return (
    <HomeThemeProviderClient themeMode={themeMode}>
      {children}
    </HomeThemeProviderClient>
  );
};

export default HomeThemeProvider;

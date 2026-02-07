'use client';

import { ThemeProvider } from '@mui/material';
import { FC, ReactNode, useMemo } from 'react';

import newTheme from 'zui/theme';
import { ResolvedThemeMode } from 'zui/theme/themeMode';

type Props = {
  children: ReactNode;
  themeMode: ResolvedThemeMode;
};

const HomeThemeClientProvider: FC<Props> = ({ children, themeMode }) => {
  const theme = useMemo(() => newTheme(themeMode), []);
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default HomeThemeClientProvider;

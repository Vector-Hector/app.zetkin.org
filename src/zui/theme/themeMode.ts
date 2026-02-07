export type ResolvedThemeMode = 'dark' | 'light';
export type ThemeMode = 'auto' | 'dark' | 'light';

const getCookie = (name: string) => {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

export const updateThemeModeCookie = (
  newDarkMode: ResolvedThemeMode,
  noReload?: boolean
) => {
  const currentCookieValue = getCookie('theme');
  if (currentCookieValue && currentCookieValue === newDarkMode) {
    return;
  }

  document.cookie = `theme=${newDarkMode}; path=/; max-age=31536000`;
  if (!noReload) {
    document.location.reload();
  }
};

export const setModeToLocalStorage = (newDarkMode: ThemeMode) => {
  if (typeof localStorage === 'undefined') {
    return;
  }

  if (newDarkMode !== 'auto') {
    localStorage.setItem('theme-mode', newDarkMode);
    return;
  }

  if (localStorage.getItem('theme-mode') !== null) {
    localStorage.removeItem('theme-mode');
  }
};

export const getResolvedMode = (mode: ThemeMode): ResolvedThemeMode | null => {
  if (mode !== 'auto') {
    return mode;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  return window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

export const getResolvedModeSettingFromLocalStorage = () =>
  getResolvedMode(getModeSettingFromLocalStorage());

export const getModeSettingFromLocalStorage = (): ThemeMode => {
  if (typeof localStorage === 'undefined') {
    return 'auto';
  }

  return (localStorage.getItem('theme-mode') as ThemeMode) ?? 'auto';
};

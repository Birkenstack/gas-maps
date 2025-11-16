import { usePreferences } from '@/contexts/preferences-context';

export function useColorScheme() {
  const { darkMode } = usePreferences();

  return darkMode ? 'dark' : 'light';
}

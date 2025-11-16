import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';

import type { FuelGrade } from '@/constants/sample-stops';

type PreferencesContextValue = {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  showTraffic: boolean;
  setShowTraffic: (value: boolean) => void;
  showOnlyOpenStations: boolean;
  setShowOnlyOpenStations: (value: boolean) => void;
  fuelGrade: FuelGrade;
  setFuelGrade: (value: FuelGrade) => void;
  isHydrated: boolean;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

const STORAGE_KEY = 'gas-maps:preferences:v2';
type StoredPreferences = {
  darkMode?: boolean;
  showTraffic?: boolean;
  showOnlyOpenStations?: boolean;
  fuelGrade?: FuelGrade;
};

export const PreferencesProvider = ({ children }: { children: ReactNode }) => {
  const systemScheme = useNativeColorScheme();
  const [darkMode, setDarkMode] = useState(systemScheme === 'dark');
  const [showTraffic, setShowTraffic] = useState(true);
  const [showOnlyOpenStations, setShowOnlyOpenStations] = useState(true);
  const [fuelGrade, setFuelGrade] = useState<FuelGrade>('regular');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const hydratePreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredPreferences;
          if (typeof parsed.darkMode === 'boolean') {
            setDarkMode(parsed.darkMode);
          }
          if (typeof parsed.showTraffic === 'boolean') {
            setShowTraffic(parsed.showTraffic);
          }
          if (typeof parsed.showOnlyOpenStations === 'boolean') {
            setShowOnlyOpenStations(parsed.showOnlyOpenStations);
          }
          if (parsed.fuelGrade) {
            setFuelGrade(parsed.fuelGrade);
          }
        }
      } catch (error) {
        console.warn('Failed to hydrate preferences', error);
      } finally {
        if (isMounted) {
          setIsHydrated(true);
        }
      }
    };

    hydratePreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const payload = JSON.stringify({
      darkMode,
      showTraffic,
      showOnlyOpenStations,
      fuelGrade,
    });

    AsyncStorage.setItem(STORAGE_KEY, payload).catch((error) => {
      console.warn('Failed to persist preferences', error);
    });
  }, [darkMode, showTraffic, showOnlyOpenStations, isHydrated]);

  const value = useMemo(
    () => ({
      darkMode,
      setDarkMode,
      showTraffic,
      setShowTraffic,
      showOnlyOpenStations,
      setShowOnlyOpenStations,
      fuelGrade,
      setFuelGrade,
      isHydrated,
    }),
    [darkMode, showTraffic, showOnlyOpenStations, fuelGrade, isHydrated]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }

  return context;
};

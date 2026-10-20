import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { randomUUID } from 'expo-crypto';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import { FoodRepository } from '../data/repository';
import { MockApi } from '../services/api';
import { DEFAULT_FILTERS, type Filters } from '../models/types';
import { translate, type TranslationKey } from '../i18n/translations';

const repository = new FoodRepository(AsyncStorage, randomUUID, (url) => new MockApi(url));
function useAppValue() {
  const snapshot = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getSnapshot,
  );
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const language = snapshot.database?.settings.language ?? 'en';
  const t = useMemo(
    () => (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(language, key, values),
    [language],
  );
  useEffect(() => {
    void repository.initialize().then(() => repository.sync());
    const unsubscribeNetwork = NetInfo.addEventListener((state) =>
      repository.setOnline(state.isConnected !== false && state.isInternetReachable !== false),
    );
    const appSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void repository.sync();
    });
    // Reattempt transient API errors without requiring a Sync button.
    const interval = setInterval(() => {
      void repository.sync();
    }, 30000);
    return () => {
      unsubscribeNetwork();
      appSubscription.remove();
      clearInterval(interval);
    };
  }, []);
  return { ...snapshot, repository, filters, setFilters, language, t };
}
const AppContext = createContext<ReturnType<typeof useAppValue> | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const value = useAppValue();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('AppProvider is missing');
  return value;
}

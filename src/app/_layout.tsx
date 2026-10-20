import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from '../contexts/AppContext';
import { FeedbackProvider } from '../components/Feedback';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui';
import { colors, ui } from '../theme';

function AppContent() {
  const { loading, loadError, repository, t } = useApp();
  if (loading || loadError)
    return (
      <View
        style={{
          flex: 1,
          padding: 24,
          gap: 16,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {loading && <ActivityIndicator color={colors.primary} />}
        <Text style={ui.muted}>{loadError ? t('storageCorrupt') : t('loading')}</Text>
        {loadError && (
          <Button
            onPress={() => {
              void repository.initialize();
            }}
          >
            {t('retry')}
          </Button>
        )}
      </View>
    );
  return (
    <FeedbackProvider>
      <AppShell>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        />
      </AppShell>
    </FeedbackProvider>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded && !error)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppProvider>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

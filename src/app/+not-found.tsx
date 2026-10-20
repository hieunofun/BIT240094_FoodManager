import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Button } from '../components/ui';
import { ui } from '../theme';
export default function NotFound() {
  const { t } = useApp();
  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text style={ui.title}>{t('notFoundTitle')}</Text>
      <Button onPress={() => router.replace('/')}>{t('returnToDishes')}</Button>
    </View>
  );
}

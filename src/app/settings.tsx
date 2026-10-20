import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useFeedback } from '../components/Feedback';
import { Badge, Banner, Button, Field, PageHeading } from '../components/ui';
import { PROJECT_NAME, RESOURCES, STUDENT_ID } from '../config';
import { errorKey } from '../i18n/translations';
import { colors, fonts, ui } from '../theme';

export default function Settings() {
  const { database, repository, t, language, online, syncPhase, syncError } = useApp();
  const { toast } = useFeedback();
  const { width } = useWindowDimensions();
  const [url, setUrl] = useState(database?.settings.apiUrl ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    setError('');
    setBusy(true);
    try {
      await repository.configureApi(url);
      toast(t(url.trim() ? 'apiSaved' : 'saved'));
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  };
  const changeLanguage = async (next: 'en' | 'vi') => {
    try {
      await repository.setLanguage(next);
    } catch (err) {
      toast(t(errorKey(err)), true);
    }
  };
  const status = !online
    ? 'offline'
    : syncPhase === 'syncing'
      ? 'syncing'
      : syncPhase === 'error'
        ? 'syncError'
        : database?.settings.apiUrl
          ? 'connected'
          : 'notConfigured';
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        width: '100%',
        maxWidth: 1000,
        alignSelf: 'center',
        padding: width < 768 ? 16 : 32,
        gap: 24,
        paddingBottom: 40,
      }}
    >
      <PageHeading title={t('settings')} />
      <View style={ui.card}>
        <View style={{ gap: 4 }}>
          <Text style={ui.sectionTitle}>{t('language')}</Text>
          <Text style={ui.muted}>{t('languageHint')}</Text>
        </View>
        <View style={ui.row}>
          {(['en', 'vi'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: language === value }}
              onPress={() => {
                void changeLanguage(value);
              }}
              style={{
                flex: 1,
                minHeight: 48,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: language === value ? colors.primary : colors.borderStrong,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons
                name={language === value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={language === value ? colors.primary : colors.muted}
              />
              <Text style={ui.label}>{t(value === 'en' ? 'english' : 'vietnamese')}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={[ui.card, { gap: 20 }]}>
        <View
          style={[
            ui.row,
            {
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 12,
            },
          ]}
        >
          <View style={{ flex: 1, minWidth: 180, gap: 4 }}>
            <Text style={ui.sectionTitle}>{t('connection')}</Text>
            <Text style={ui.muted}>{t('connectionHint')}</Text>
          </View>
          <Badge
            tone={
              status === 'connected'
                ? 'success'
                : status === 'offline' || status === 'syncError'
                  ? 'warning'
                  : 'neutral'
            }
          >
            {t(status)}
          </Badge>
        </View>
        <Field
          label={t('apiUrl')}
          value={url}
          onChangeText={(text) => {
            setUrl(text);
            setError('');
          }}
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="url"
          placeholder={t('apiPlaceholder')}
          error={error && t(errorKey(error))}
        />
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            variant="primary"
            busy={busy}
            disabled={syncPhase === 'syncing'}
            onPress={() => {
              void connect();
            }}
          >
            {t('connect')}
          </Button>
        </View>
        {syncError && (
          <Banner tone="error" title={t('syncError')} description={t(errorKey(syncError))} />
        )}
        {!online && <Banner tone="warning" title={t('offline')} description={t('offlineHint')} />}
        <View style={ui.separator} />
        <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
          <Text style={ui.muted}>{t('lastSynced')}</Text>
          <Text style={ui.body}>
            {database?.settings.lastSyncedAt
              ? new Date(database.settings.lastSyncedAt).toLocaleString(
                  language === 'vi' ? 'vi-VN' : 'en-GB',
                )
              : t('never')}
          </Text>
        </View>
        {repository.pendingCount() > 0 && (
          <Text style={ui.small}>
            {t('waiting', { count: repository.pendingCount() })} · {t('pendingHint')}
          </Text>
        )}
        <Text style={ui.small}>{t('cloudHint')}</Text>
      </View>
      <View style={[ui.card, { gap: 20 }]}>
        <Text style={ui.sectionTitle}>{t('howToConnect')}</Text>
        <View style={{ gap: 16 }}>
          {(['step1', 'step2', 'step3'] as const).map((step, index) => (
            <View key={step} style={[ui.row, { alignItems: 'flex-start', gap: 12 }]}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: colors.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={ui.label}>{index + 1}</Text>
              </View>
              <Text style={[ui.body, { flex: 1 }]}>{t(step)}</Text>
            </View>
          ))}
        </View>
        {[RESOURCES.categories, RESOURCES.dishes].map((resource) => (
          <View
            key={resource}
            style={{ backgroundColor: colors.background, borderRadius: 12, padding: 16, gap: 4 }}
          >
            <Text selectable style={[ui.label, { fontFamily: fonts.semibold }]}>
              {resource}
            </Text>
            <Text style={ui.small}>/{resource}</Text>
          </View>
        ))}
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            icon="open-outline"
            onPress={() => {
              void Linking.openURL('https://mockapi.io');
            }}
          >
            mockapi.io
          </Button>
        </View>
        <Text style={ui.small}>{t('setupDocs')}</Text>
      </View>
      <View style={ui.card}>
        <View style={{ gap: 4 }}>
          <Text style={ui.sectionTitle}>{t('about')}</Text>
          <Text style={ui.muted}>{t('aboutDescription')}</Text>
        </View>
        {[
          [t('studentId'), STUDENT_ID],
          [t('project'), PROJECT_NAME],
          [t('storage'), t('storageValue')],
        ].map(([label, value]) => (
          <View key={label} style={{ gap: 4 }}>
            <Text style={ui.small}>{label}</Text>
            <Text selectable style={ui.label}>
              {value}
            </Text>
          </View>
        ))}
        <Text style={ui.small}>{t('sampleData')}</Text>
      </View>
    </ScrollView>
  );
}

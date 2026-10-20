import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useFeedback } from './Feedback';
import { PROJECT_NAME, STUDENT_ID } from '../config';
import { colors, fonts, ui } from '../theme';
import { errorKey } from '../i18n/translations';

export function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  const path = usePathname();
  const { t, language, database, repository, online, syncPhase } = useApp();
  const { toast } = useFeedback();
  const active = path.startsWith('/categories')
    ? 'categories'
    : path.startsWith('/settings')
      ? 'settings'
      : 'dishes';
  const nav = [
    { key: 'dishes', href: '/', icon: 'restaurant-outline' },
    { key: 'categories', href: '/categories', icon: 'grid-outline' },
    { key: 'settings', href: '/settings', icon: 'options-outline' },
  ] as const;
  const pending = repository.pendingCount();
  const status = !online
    ? t('offline')
    : !database?.settings.apiUrl
      ? t('notConfigured')
      : syncPhase === 'syncing'
        ? t('syncing')
        : syncPhase === 'error'
          ? t('syncError')
          : pending
            ? t('waiting', { count: pending })
            : t('synced');
  const statusColor =
    !online || syncPhase === 'error'
      ? colors.warning
      : database?.settings.apiUrl && !pending
        ? colors.success
        : colors.muted;
  const links = nav.map((item) => (
    <Pressable
      key={item.key}
      accessibilityRole="tab"
      accessibilityLabel={t(item.key)}
      accessibilityState={{ selected: active === item.key }}
      onPress={() => router.replace(item.href)}
      style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
        wide ? styles.navItem : styles.bottomItem,
        active === item.key && (wide ? { backgroundColor: colors.secondary } : {}),
        hovered && active !== item.key && { backgroundColor: colors.background },
      ]}
    >
      <Ionicons
        name={item.icon}
        size={wide ? 20 : 22}
        color={active === item.key ? colors.text : colors.muted}
      />
      <Text
        style={[
          wide ? ui.body : ui.small,
          {
            color: active === item.key ? colors.text : colors.muted,
            fontFamily: active === item.key ? fonts.semibold : fonts.regular,
          },
        ]}
      >
        {t(item.key)}
      </Text>
    </Pressable>
  ));
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.root}>
        {wide && (
          <View style={styles.sidebar}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={t('brand')}
              onPress={() => router.replace('/')}
              style={styles.brand}
            >
              <View style={styles.logo}>
                <Ionicons name="restaurant" size={22} color={colors.onPrimary} />
              </View>
              <View>
                <Text style={styles.brandName}>Food Manager</Text>
                <Text style={ui.small}>{t('workspace')}</Text>
              </View>
            </Pressable>
            <Text style={[ui.small, { paddingHorizontal: 12, marginBottom: 12, marginTop: 32 }]}>
              {t('menu')}
            </Text>
            <View style={{ gap: 4 }}>{links}</View>
            <View style={{ flex: 1 }} />
            <View style={styles.student}>
              <View style={styles.studentAvatar}>
                <Text style={ui.label}>94</Text>
              </View>
              <View>
                <Text style={ui.label}>{STUDENT_ID}</Text>
                <Text style={ui.small}>FoodManager</Text>
              </View>
            </View>
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={[styles.header, { paddingHorizontal: wide ? 32 : 16 }]}>
            {wide ? (
              <View style={ui.row}>
                <Text style={ui.small}>{t('menu')}</Text>
                <Ionicons name="chevron-forward" size={12} color={colors.muted} />
                <Text style={ui.label}>{t(active)}</Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={t('brand')}
                onPress={() => router.replace('/')}
                style={[ui.row, { minHeight: 40 }]}
              >
                <Ionicons name="restaurant" size={21} color={colors.text} />
                <Text style={[ui.label, { fontFamily: fonts.semibold }]}>Food Manager</Text>
              </Pressable>
            )}
            <View style={[ui.row, { gap: wide ? 20 : 8 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={status}
                onPress={() => router.push('/settings')}
                style={[
                  ui.row,
                  {
                    minHeight: 40,
                    minWidth: 40,
                    justifyContent: 'center',
                    maxWidth: wide ? 240 : 150,
                    gap: 6,
                  },
                ]}
              >
                <Ionicons
                  name={
                    !online
                      ? 'cloud-offline-outline'
                      : syncPhase === 'error'
                        ? 'alert-circle-outline'
                        : 'cloud-done-outline'
                  }
                  size={17}
                  color={statusColor}
                />
                {wide && <Text style={[ui.small, { color: statusColor }]}>{status}</Text>}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'en' ? 'Switch to Tiếng Việt' : 'Switch to English'
                }
                onPress={() => {
                  void repository
                    .setLanguage(language === 'en' ? 'vi' : 'en')
                    .catch((error) => toast(t(errorKey(error)), true));
                }}
                style={styles.language}
              >
                <Ionicons name="language-outline" size={17} color={colors.text} />
                <Text style={ui.label}>{language.toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ flex: 1, minHeight: 0 }}>{children}</View>
          {!wide && <View style={styles.bottom}>{links}</View>}
        </View>
      </View>
    </SafeAreaView>
  );
}
export function ProjectFooter() {
  return (
    <Text style={[ui.small, { textAlign: 'center', paddingVertical: 20 }]}>{PROJECT_NAME}</Text>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  root: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  sidebar: {
    width: 232,
    padding: 20,
    borderRightWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  logo: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, lineHeight: 24 },
  navItem: {
    minHeight: 44,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  student: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  header: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderColor: colors.borderStrong,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  language: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
  },
  bottom: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: 8,
  },
  bottomItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
  },
});

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, ui } from '../theme';
import { useApp } from '../contexts/AppContext';

interface Confirmation {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}
const Context = createContext<{
  toast: (message: string, isError?: boolean) => void;
  confirm: (options: Confirmation) => Promise<boolean>;
} | null>(null);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const { t } = useApp();
  const [notice, setNotice] = useState<{ message: string; isError: boolean } | null>(null);
  const [dialog, setDialog] = useState<Confirmation | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => () => resolver.current?.(false), []);
  const resolve = (answer: boolean) => {
    resolver.current?.(answer);
    resolver.current = null;
    setDialog(null);
  };
  return (
    <Context.Provider
      value={{
        toast: (message, isError = false) => setNotice({ message, isError }),
        confirm: (options) =>
          new Promise((done) => {
            resolver.current?.(false);
            resolver.current = done;
            setDialog(options);
          }),
      }}
    >
      {children}
      {notice && (
        <View accessibilityRole="alert" pointerEvents="box-none" style={styles.toastPosition}>
          <View style={[styles.toast, notice.isError && { backgroundColor: colors.errorBg }]}>
            <Ionicons
              name={notice.isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={20}
              color={notice.isError ? colors.error : colors.success}
            />
            <Text style={[ui.body, { flex: 1 }]}>{notice.message}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setNotice(null)}
              accessibilityLabel={t('close')}
              style={styles.icon}
            >
              <Ionicons name="close" size={18} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      )}
      <Modal
        visible={!!dialog}
        transparent
        animationType="fade"
        onRequestClose={() => resolve(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            accessibilityLabel={t('cancel')}
            style={StyleSheet.absoluteFill}
            onPress={() => resolve(false)}
          />
          <View accessibilityViewIsModal style={styles.dialog}>
            <View
              style={[
                styles.dialogIcon,
                { backgroundColor: dialog?.danger ? colors.dangerBg : colors.background },
              ]}
            >
              <Ionicons
                name={dialog?.danger ? 'trash-outline' : 'help-circle-outline'}
                size={24}
                color={dialog?.danger ? colors.danger : colors.text}
              />
            </View>
            <Text accessibilityRole="header" style={ui.sectionTitle}>
              {dialog?.title}
            </Text>
            <Text style={ui.muted}>{dialog?.message}</Text>
            <View style={[ui.row, { justifyContent: 'flex-end', marginTop: 8 }]}>
              <Pressable
                accessibilityRole="button"
                style={styles.cancel}
                onPress={() => resolve(false)}
              >
                <Text style={ui.label}>{t('cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.action,
                  { backgroundColor: dialog?.danger ? colors.dangerBg : colors.primary },
                ]}
                onPress={() => resolve(true)}
              >
                <Text
                  style={[ui.label, { color: dialog?.danger ? colors.danger : colors.onPrimary }]}
                >
                  {dialog?.confirmLabel ?? t('confirmDelete')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Context.Provider>
  );
}
export function useFeedback() {
  const context = useContext(Context);
  if (!context) throw new Error('FeedbackProvider is missing');
  return context;
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 20,
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: colors.surface,
    padding: 24,
    borderRadius: 20,
    gap: 12,
    width: '100%',
    maxWidth: 440,
  },
  dialogIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  cancel: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  toastPosition: {
    position: 'absolute',
    bottom: 92,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    maxWidth: 520,
    width: '100%',
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
});

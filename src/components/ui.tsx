import { Children, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
  type TextInputProps,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../contexts/AppContext';
import { colors, fonts, ui } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
export function Button({
  children,
  onPress,
  variant = 'outline',
  icon,
  busy,
  disabled,
  style,
  label,
}: {
  children?: ReactNode;
  onPress?: () => void;
  variant?: 'outline' | 'primary' | 'ghost' | 'secondary' | 'danger';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const foreground =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;
  const accessibleLabel =
    label ??
    Children.toArray(children)
      .filter((child) => typeof child === 'string' || typeof child === 'number')
      .join('');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibleLabel}
      accessibilityState={{ disabled: disabled || busy, busy }}
      onPress={busy || disabled ? undefined : onPress}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.button,
        styles[variant],
        (pressed || hovered) && {
          backgroundColor:
            variant === 'primary'
              ? colors.primaryHover
              : variant === 'danger'
                ? colors.dangerBg
                : colors.hover,
        },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={foreground} />
      ) : icon ? (
        <Ionicons name={icon} size={18} color={foreground} />
      ) : null}
      {children !== undefined && (
        <Text style={[ui.label, { color: foreground, textAlign: 'center', flexShrink: 1 }]}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}
export function Field({
  label,
  error,
  required,
  hint,
  style,
  ...props
}: TextInputProps & { label: string; error?: string; required?: boolean; hint?: string }) {
  const [focused, setFocused] = useState(false);
  const { width } = useWindowDimensions();
  return (
    <View style={[{ gap: 8 }, style as StyleProp<ViewStyle>]}>
      <Text style={ui.label}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          { minHeight: width < 768 ? 44 : 40 },
          props.multiline && { height: 112, textAlignVertical: 'top', paddingTop: 12 },
          focused && { borderColor: colors.primary },
          error && { borderColor: colors.error },
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[ui.small, { color: colors.error }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={ui.small}>{hint}</Text>
      ) : null}
    </View>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  required,
  error,
  placeholder,
  compact,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  placeholder?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useApp();
  const selected = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 8, minWidth: 0 }}>
      {!compact && (
        <Text style={ui.label}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder ?? t('selectCategory')}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
        style={[styles.select, error && { borderColor: colors.error }]}
      >
        <Text
          style={[ui.body, { flex: 1 }, !selected && { color: colors.muted }]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? t('selectCategory')}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.muted} />
      </Pressable>
      {error && <Text style={[ui.small, { color: colors.error }]}>{error}</Text>}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityLabel={t('close')}
          />
          <View style={styles.selectDialog} accessibilityViewIsModal>
            <View
              style={[
                ui.row,
                {
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: 8,
                  justifyContent: 'space-between',
                },
              ]}
            >
              <Text style={ui.sectionTitle}>{label}</Text>
              <Button
                icon="close"
                variant="ghost"
                label={t('close')}
                onPress={() => setOpen(false)}
                style={{ width: 40, paddingHorizontal: 0 }}
              />
            </View>
            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 8 }}>
              {options.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityState={{ checked: value === option.value }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                    styles.option,
                    {
                      backgroundColor:
                        option.value === value
                          ? colors.secondary
                          : hovered
                            ? colors.hover
                            : colors.surface,
                    },
                  ]}
                >
                  <Text style={[ui.body, { flex: 1 }]}>{option.label}</Text>
                  {option.value === value && (
                    <Ionicons name="checkmark" size={18} color={colors.text} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  const pair =
    tone === 'success'
      ? [colors.successBg, colors.success]
      : tone === 'warning'
        ? [colors.warningBg, colors.warning]
        : [colors.neutralBg, colors.neutral];
  return (
    <View style={[styles.badge, { backgroundColor: pair[0] }]}>
      <Text style={{ color: pair[1], fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 }}>
        {children}
      </Text>
    </View>
  );
}
export function FoodImage({
  uri,
  style,
  label,
}: {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const { t } = useApp();
  // A different image must be retried even if the previous URL failed.
  const [previous, setPrevious] = useState(uri);
  if (uri !== previous) {
    setPrevious(uri);
    setFailed(false);
  }
  return (
    <View style={[styles.image, style]}>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          accessibilityLabel={label}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          onError={() => setFailed(true)}
        />
      ) : (
        <View style={{ gap: 8, alignItems: 'center', padding: 8 }}>
          <Ionicons name="image-outline" size={24} color={colors.muted} />
          <Text style={[ui.small, { textAlign: 'center' }]}>
            {uri ? t('photoFailed') : t('noPhoto')}
          </Text>
        </View>
      )}
    </View>
  );
}
export function Banner({
  title,
  description,
  tone = 'neutral',
  action,
}: {
  title: string;
  description?: string;
  tone?: 'neutral' | 'warning' | 'error';
  action?: ReactNode;
}) {
  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor:
            tone === 'warning'
              ? colors.warningBg
              : tone === 'error'
                ? colors.errorBg
                : colors.surface,
        },
      ]}
    >
      <Ionicons
        name={
          tone === 'error'
            ? 'alert-circle-outline'
            : tone === 'warning'
              ? 'cloud-offline-outline'
              : 'cloud-outline'
        }
        size={20}
        color={tone === 'error' ? colors.error : tone === 'warning' ? colors.warning : colors.muted}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text style={ui.label}>{title}</Text>
        {description && <Text style={ui.muted}>{description}</Text>}
        {action && <View style={{ alignItems: 'flex-start', marginTop: 4 }}>{action}</View>}
      </View>
    </View>
  );
}
export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={[ui.row, { alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }]}>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Text accessibilityRole="header" style={ui.title}>
          {title}
        </Text>
        {subtitle && <Text style={ui.muted}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  outline: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
  primary: { backgroundColor: colors.primary },
  ghost: { backgroundColor: colors.transparent },
  secondary: { backgroundColor: colors.secondary },
  danger: { backgroundColor: colors.dangerBg },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
  },
  select: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectDialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  option: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  image: {
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  banner: {
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
});

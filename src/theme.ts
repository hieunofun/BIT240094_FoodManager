import { StyleSheet } from 'react-native';

// One place to change branding. Inter is bundled with the app, including Vietnamese glyphs.
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};
export const colors = {
  primary: '#181818',
  primaryHover: '#2e2e2e',
  onPrimary: '#ffffff',
  background: '#f4f4f6',
  surface: '#ffffff',
  text: '#2c2c2c',
  muted: '#707070',
  border: '#f7f7f8',
  borderStrong: '#eaeaea',
  secondary: '#e7e8ec',
  hover: '#f1f1f3',
  success: '#007a55',
  successBg: '#ecfdf5',
  warning: '#bb4d00',
  warningBg: '#fffbeb',
  danger: '#c70036',
  dangerBg: '#ffe9ef',
  error: '#e7000b',
  errorBg: '#fef2f2',
  neutral: '#52525c',
  neutralBg: '#f4f4f5',
  overlay: '#18181866',
  transparent: '#ffffff00',
};
export const ui = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  title: { fontFamily: fonts.semibold, color: colors.text, fontSize: 20, lineHeight: 28 },
  sectionTitle: { fontFamily: fonts.semibold, color: colors.text, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.regular, color: colors.text, fontSize: 14, lineHeight: 22 },
  muted: { fontFamily: fonts.regular, color: colors.muted, fontSize: 14, lineHeight: 22 },
  small: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: fonts.medium, color: colors.text, fontSize: 14, lineHeight: 20 },
  separator: { height: 1, backgroundColor: colors.borderStrong },
});

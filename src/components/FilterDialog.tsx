import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../contexts/AppContext';
import { DEFAULT_FILTERS } from '../models/types';
import { colors, ui } from '../theme';
import { Button, Field, Select } from './ui';
import { validatePriceRange } from '../utils/validation';
import { errorKey } from '../i18n/translations';

export function FilterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { filters, setFilters, database, t } = useApp();
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState<string | null>(null);
  const apply = () => {
    const failure = validatePriceRange(draft.minPrice, draft.maxPrice);
    if (failure) {
      setError(failure);
      return;
    }
    setFilters(draft);
    onClose();
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel={t('close')}
        />
        <View style={styles.dialog} accessibilityViewIsModal>
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text accessibilityRole="header" style={ui.sectionTitle}>
              {t('filters')}
            </Text>
            <Button
              icon="close"
              variant="ghost"
              label={t('close')}
              onPress={onClose}
              style={{ width: 40, paddingHorizontal: 0 }}
            />
          </View>
          <ScrollView
            contentContainerStyle={{ gap: 20, paddingBottom: 4 }}
            keyboardShouldPersistTaps="handled"
          >
            <Select
              label={t('category')}
              value={draft.categoryId}
              options={[
                { value: '', label: t('allCategories') },
                ...(database?.categories
                  .filter((c) => !c.deleted)
                  .map((c) => ({ value: c.id, label: c.name })) ?? []),
              ]}
              onChange={(categoryId) => setDraft({ ...draft, categoryId })}
            />
            <Select
              label={t('status')}
              value={draft.availability}
              options={[
                { value: 'all', label: t('allStatuses') },
                { value: 'available', label: t('available') },
                { value: 'unavailable', label: t('unavailable') },
              ]}
              onChange={(availability) =>
                setDraft({ ...draft, availability: availability as typeof draft.availability })
              }
            />
            <View style={{ gap: 12 }}>
              <Text style={ui.label}>{t('priceRange')}</Text>
              <View style={[ui.row, { alignItems: 'flex-start', gap: 12 }]}>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t('minPrice')}
                    value={draft.minPrice}
                    onChangeText={(minPrice) => {
                      setDraft({ ...draft, minPrice });
                      setError(null);
                    }}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t('maxPrice')}
                    value={draft.maxPrice}
                    onChangeText={(maxPrice) => {
                      setDraft({ ...draft, maxPrice });
                      setError(null);
                    }}
                    keyboardType="numeric"
                    placeholder="200000"
                  />
                </View>
              </View>
              {error && (
                <Text accessibilityRole="alert" style={[ui.small, { color: colors.error }]}>
                  {t(errorKey(error))}
                </Text>
              )}
            </View>
          </ScrollView>
          <View
            style={[
              ui.row,
              {
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderColor: colors.borderStrong,
                paddingTop: 16,
              },
            ]}
          >
            <Button
              variant="ghost"
              onPress={() => {
                setDraft({ ...DEFAULT_FILTERS, query: filters.query, sort: filters.sort });
                setError(null);
              }}
            >
              {t('clearFilters')}
            </Button>
            <Button variant="primary" onPress={apply}>
              {t('applyFilters')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 16,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 20,
    gap: 20,
  },
});

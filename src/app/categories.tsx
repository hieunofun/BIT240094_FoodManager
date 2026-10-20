import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useFeedback } from '../components/Feedback';
import { Button, Field, PageHeading } from '../components/ui';
import { colors, ui } from '../theme';
import { errorKey } from '../i18n/translations';
import type { DishCategory } from '../models/types';

export default function Categories() {
  const { database, repository, t, setFilters } = useApp();
  const { toast, confirm } = useFeedback();
  const { width } = useWindowDimensions();
  const [form, setForm] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const categories = database?.categories.filter((c) => !c.deleted) ?? [];
  const remove = async (category: DishCategory) => {
    if (database?.dishes.some((d) => !d.deleted && d.dishCategoryId === category.id)) {
      toast(t('categoryInUse'), true);
      return;
    }
    if (
      !(await confirm({
        title: t('deleteCategoryTitle'),
        message: t('deleteCategoryBody', { name: category.name }),
        danger: true,
      }))
    )
      return;
    try {
      await repository.deleteCategory(category.id);
      setFilters((f) => (f.categoryId === category.id ? { ...f, categoryId: '' } : f));
      toast(t('categoryDeleted'));
    } catch (err) {
      toast(t(errorKey(err)), true);
    }
  };
  const save = async () => {
    if (!form || busy) return;
    if (!form.name.trim()) {
      setError('nameRequired');
      return;
    }
    setBusy(true);
    try {
      await repository.saveCategory({ name: form.name, description: form.description }, form.id);
      setForm(null);
      toast(t('categorySaved'));
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <ScrollView
        contentContainerStyle={{
          width: '100%',
          maxWidth: 1100,
          alignSelf: 'center',
          padding: width < 768 ? 16 : 32,
          gap: 24,
        }}
      >
        <PageHeading
          title={t('categories')}
          subtitle={t('categoryDescription')}
          action={
            <Button
              variant="primary"
              icon="add"
              onPress={() => {
                setError('');
                setForm({ name: '', description: '' });
              }}
            >
              {t('addCategory')}
            </Button>
          }
        />
        <Text style={ui.small}>{t('categoryCount', { count: categories.length })}</Text>
        <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: colors.surface }}>
          {categories.map((category, index) => {
            const count =
              database?.dishes.filter((d) => !d.deleted && d.dishCategoryId === category.id)
                .length ?? 0;
            return (
              <View
                key={category.id}
                style={[
                  styles.row,
                  {
                    borderTopWidth: index ? 1 : 0,
                    flexDirection: width < 600 ? 'column' : 'row',
                    alignItems: width < 600 ? 'stretch' : 'center',
                  },
                ]}
              >
                <View style={[ui.row, { gap: 16, flex: 1, minWidth: 0 }]}>
                  <View style={styles.categoryIcon}>
                    <Ionicons name="grid-outline" size={22} color={colors.muted} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[ui.label, { fontSize: 16, lineHeight: 24 }]}>
                      {category.name}
                    </Text>
                    <Text style={ui.muted}>{category.description || t('noDescription')}</Text>
                    <Text style={ui.small}>{t('dishCount', { count })}</Text>
                  </View>
                </View>
                <View style={[ui.row, { justifyContent: 'flex-end' }]}>
                  <Button
                    onPress={() => {
                      setFilters((f) => ({
                        ...f,
                        categoryId: category.id,
                        query: '',
                        availability: 'all',
                        minPrice: '',
                        maxPrice: '',
                      }));
                      router.replace('/');
                    }}
                  >
                    {t('viewDishes')}
                  </Button>
                  <Button
                    icon="create-outline"
                    label={t('edit')}
                    onPress={() => {
                      setError('');
                      setForm({
                        id: category.id,
                        name: category.name,
                        description: category.description,
                      });
                    }}
                    style={{ width: 44, paddingHorizontal: 0 }}
                  />
                  <Button
                    variant="danger"
                    icon="trash-outline"
                    label={t('delete')}
                    onPress={() => {
                      void remove(category);
                    }}
                    style={{ width: 44, paddingHorizontal: 0 }}
                  />
                </View>
              </View>
            );
          })}
          {!categories.length && (
            <Text style={[ui.muted, { padding: 24 }]}>{t('noCategories')}</Text>
          )}
        </View>
      </ScrollView>
      <Modal
        visible={!!form}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setForm(null);
        }}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel={t('cancel')}
            onPress={() => {
              if (!busy) setForm(null);
            }}
          />
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.sectionTitle}>{t(form?.id ? 'editCategory' : 'addCategory')}</Text>
              <Button
                icon="close"
                variant="ghost"
                label={t('close')}
                onPress={() => setForm(null)}
                disabled={busy}
                style={{ width: 40, paddingHorizontal: 0 }}
              />
            </View>
            <ScrollView contentContainerStyle={{ gap: 20 }} keyboardShouldPersistTaps="handled">
              <Field
                label={t('categoryName')}
                required
                value={form?.name ?? ''}
                onChangeText={(name) => {
                  if (form) setForm({ ...form, name });
                  setError('');
                }}
                placeholder={t('categoryNamePlaceholder')}
                maxLength={120}
              />
              <Field
                label={t('description')}
                multiline
                value={form?.description ?? ''}
                onChangeText={(description) => {
                  if (form) setForm({ ...form, description });
                }}
                placeholder={t('categoryDescriptionPlaceholder')}
                maxLength={1000}
              />
              {error !== '' && (
                <Text accessibilityRole="alert" style={[ui.small, { color: colors.error }]}>
                  {t(errorKey(error))}
                </Text>
              )}
            </ScrollView>
            <View style={[ui.row, { justifyContent: 'flex-end' }]}>
              <Button onPress={() => setForm(null)} disabled={busy}>
                {t('cancel')}
              </Button>
              <Button
                variant="primary"
                busy={busy}
                onPress={() => {
                  void save();
                }}
              >
                {t('save')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  row: { padding: 20, gap: 20, borderColor: colors.borderStrong },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    gap: 24,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { Banner, Badge, Button, FoodImage, PageHeading, Select } from '../components/ui';
import { FilterDialog } from '../components/FilterDialog';
import { ProjectFooter } from '../components/AppShell';
import { DEFAULT_FILTERS, type Dish } from '../models/types';
import { filterDishes } from '../utils/validation';
import { colors, fonts, ui } from '../theme';
import { errorKey } from '../i18n/translations';

export default function DishLibrary() {
  const { database: db, filters, setFilters, t, online, syncError, language } = useApp();
  const { width } = useWindowDimensions();
  const [filterOpen, setFilterOpen] = useState(false);
  if (!db) return null;
  const areaWidth = width - (width >= 1000 ? 232 : 0);
  const padding = areaWidth >= 720 ? 32 : 16;
  const contentWidth = Math.min(1240, areaWidth) - padding * 2;
  const columns = contentWidth >= 960 ? 3 : contentWidth >= 600 ? 2 : 1;
  const cardWidth = (contentWidth - (columns - 1) * 20) / columns;
  const dishes = filterDishes(db, filters);
  const categories = db.categories.filter((c) => !c.deleted);
  const hasFilters = !!(
    filters.query ||
    filters.categoryId ||
    filters.availability !== 'all' ||
    filters.minPrice ||
    filters.maxPrice
  );
  const filterCount =
    Number(filters.availability !== 'all') + Number(!!filters.minPrice || !!filters.maxPrice);
  const money = (amount: number) =>
    `${new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(amount)} đ`;
  const renderDish = ({ item }: { item: Dish }) => {
    const thumbnail = item.dishImage.find((image) => image.isThumbnail) ?? item.dishImage[0];
    const category = categories.find((c) => c.id === item.dishCategoryId);
    const compact = columns === 1;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        onPress={() => router.push(`/dishes/${item.id}`)}
        style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
          styles.dish,
          {
            width: cardWidth,
            flexDirection: compact ? 'row' : 'column',
            borderColor: colors.border,
            backgroundColor: hovered ? colors.hover : colors.surface,
          },
          compact && { padding: 12, gap: 16 },
        ]}
      >
        <FoodImage
          uri={thumbnail?.imageUrl}
          label={item.name}
          style={
            compact
              ? { width: 96, height: 112, borderRadius: 12 }
              : { width: '100%', aspectRatio: 1.6 }
          }
        />
        <View style={[styles.dishContent, compact && { flex: 1, padding: 0, gap: 8 }]}>
          <View style={{ gap: 4 }}>
            <Text style={ui.small}>{category?.name ?? '—'}</Text>
            <Text style={styles.dishTitle} numberOfLines={2}>
              {item.name}
            </Text>
          </View>
          <View
            style={[
              ui.row,
              { justifyContent: 'space-between', flexWrap: compact ? 'wrap' : 'nowrap', gap: 8 },
            ]}
          >
            <Text style={[ui.label, { fontFamily: fonts.semibold }]}>{money(item.price)}</Text>
            <View style={[ui.row, { gap: 4 }]}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={ui.small}>{t('minutes', { count: item.preparationTime })}</Text>
            </View>
          </View>
          {!compact && <View style={ui.separator} />}
          <View style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }]}>
            <Badge tone={item.isAvailable ? 'success' : 'neutral'}>
              {t(item.isAvailable ? 'available' : 'unavailable')}
            </Badge>
            {!compact && (
              <Text style={ui.small}>{t(item.preparationTime <= 15 ? 'quick' : 'regular')}</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  };
  return (
    <>
      <FlatList
        key={columns}
        data={dishes}
        renderItem={renderDish}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={columns > 1 ? { gap: 20 } : undefined}
        ItemSeparatorComponent={() => <View style={{ height: columns > 1 ? 20 : 12 }} />}
        contentContainerStyle={{
          width: '100%',
          maxWidth: 1240,
          alignSelf: 'center',
          paddingHorizontal: padding,
          paddingTop: padding,
          paddingBottom: 12,
        }}
        ListHeaderComponent={
          <View style={{ gap: 24, marginBottom: 20 }}>
            <PageHeading
              title={t('library')}
              subtitle={t('libraryDescription')}
              action={
                <Button variant="primary" icon="add" onPress={() => router.push('/dishes/new')}>
                  {t('addDish')}
                </Button>
              }
            />
            {!online ? (
              <Banner title={t('offline')} description={t('offlineHint')} tone="warning" />
            ) : syncError ? (
              <Banner
                title={t('syncError')}
                description={t(errorKey(syncError))}
                tone="error"
                action={
                  <Button onPress={() => router.push('/settings')}>{t('openSettings')}</Button>
                }
              />
            ) : !db.settings.apiUrl ? (
              <Banner
                title={t('setupNeeded')}
                description={t('setupHint')}
                action={<Button onPress={() => router.push('/settings')}>{t('configure')}</Button>}
              />
            ) : null}
            <View style={[ui.row, { gap: 12, flexWrap: areaWidth < 600 ? 'wrap' : 'nowrap' }]}>
              <View style={[styles.search, { flexBasis: areaWidth < 600 ? '100%' : 'auto' }]}>
                <Ionicons name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  accessibilityLabel={t('searchLabel')}
                  value={filters.query}
                  onChangeText={(query) => setFilters({ ...filters, query })}
                  placeholder={t('searchDishes')}
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                />
                {filters.query !== '' && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('clearFilters')}
                    onPress={() => setFilters({ ...filters, query: '' })}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close" size={18} color={colors.muted} />
                  </Pressable>
                )}
              </View>
              <Button icon="options-outline" onPress={() => setFilterOpen(true)}>
                {t('filters')}
                {filterCount ? ` (${filterCount})` : ''}
              </Button>
              <View
                style={{
                  flex: areaWidth < 600 ? 1 : undefined,
                  width: areaWidth < 600 ? undefined : 210,
                }}
              >
                <Select
                  compact
                  label={t('sortBy')}
                  value={filters.sort}
                  options={(['newest', 'priceAsc', 'priceDesc', 'timeAsc'] as const).map(
                    (sort) => ({ value: sort, label: t(sort) }),
                  )}
                  onChange={(sort) => setFilters({ ...filters, sort: sort as typeof filters.sort })}
                />
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {[{ id: '', name: t('allCategories') }, ...categories].map((category) => (
                <Pressable
                  key={category.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: filters.categoryId === category.id }}
                  onPress={() => setFilters({ ...filters, categoryId: category.id })}
                  style={[
                    styles.categoryTab,
                    filters.categoryId === category.id && {
                      backgroundColor: colors.secondary,
                      borderColor: colors.secondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      ui.label,
                      {
                        fontFamily:
                          filters.categoryId === category.id ? fonts.semibold : fonts.regular,
                      },
                    ]}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={[ui.row, { justifyContent: 'space-between' }]}>
              <Text style={ui.small}>
                {t('results', { count: dishes.length })} ·{' '}
                {t('availableCount', { count: dishes.filter((d) => d.isAvailable).length })}
              </Text>
              {hasFilters && (
                <Pressable
                  onPress={() => setFilters(DEFAULT_FILTERS)}
                  accessibilityRole="button"
                  style={{ paddingVertical: 8, paddingLeft: 8 }}
                >
                  <Text style={[ui.small, { color: colors.text, textDecorationLine: 'underline' }]}>
                    {t('clearFilters')}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={[ui.muted, { paddingVertical: 32, textAlign: 'center' }]}>
            {t(hasFilters ? 'noResults' : 'noDishes')}
          </Text>
        }
        ListFooterComponent={<ProjectFooter />}
      />
      {filterOpen && <FilterDialog open onClose={() => setFilterOpen(false)} />}
    </>
  );
}
const styles = StyleSheet.create({
  search: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 10,
  },
  categoryTab: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  dish: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  dishContent: { padding: 20, gap: 16 },
  dishTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 24, color: colors.text },
});

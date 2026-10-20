import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useApp } from '../../../contexts/AppContext';
import { useFeedback } from '../../../components/Feedback';
import { Badge, Button, FoodImage } from '../../../components/ui';
import { colors, fonts, ui } from '../../../theme';
import { errorKey } from '../../../i18n/translations';

export default function DishDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { database, t, repository, language } = useApp();
  const { toast, confirm } = useFeedback();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dish = database?.dishes.find((d) => d.id === id && !d.deleted);
  if (!dish)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={ui.title}>{t('notFoundTitle')}</Text>
        <Text style={ui.muted}>{t('notFoundDescription')}</Text>
        <Button onPress={() => router.replace('/')}>{t('returnToDishes')}</Button>
      </View>
    );
  const category = database?.categories.find((c) => c.id === dish.dishCategoryId && !c.deleted);
  const activeImage =
    dish.dishImage.find((i) => i.id === selected) ??
    dish.dishImage.find((i) => i.isThumbnail) ??
    dish.dishImage[0];
  const remove = async () => {
    if (
      !(await confirm({
        title: t('deleteDishTitle'),
        message: t('deleteDishBody', { name: dish.name }),
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      await repository.deleteDish(dish.id);
      toast(t('dishDeleted'));
      router.replace('/');
    } catch (error) {
      toast(t(errorKey(error)), true);
    } finally {
      setBusy(false);
    }
  };
  const makeCover = async () => {
    if (!activeImage) return;
    try {
      await repository.saveDish(
        {
          ...dish,
          dishImage: dish.dishImage.map((i) => ({ ...i, isThumbnail: i.id === activeImage.id })),
        },
        dish.id,
      );
      toast(t('saved'));
    } catch (error) {
      toast(t(errorKey(error)), true);
    }
  };
  const horizontal = width >= 1200;
  return (
    <ScrollView
      contentContainerStyle={{
        width: '100%',
        maxWidth: 1160,
        alignSelf: 'center',
        padding: width < 768 ? 16 : 32,
        gap: 24,
        paddingBottom: 40,
      }}
    >
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Button
          variant="ghost"
          icon="arrow-back"
          onPress={() => router.replace('/')}
          style={{ paddingHorizontal: 0 }}
        >
          {t('dishes')}
        </Button>
        <View style={ui.row}>
          <Button icon="create-outline" onPress={() => router.push(`/dishes/${dish.id}/edit`)}>
            {t('edit')}
          </Button>
          <Button
            variant="danger"
            icon="trash-outline"
            label={t('delete')}
            busy={busy}
            onPress={() => {
              void remove();
            }}
            style={{ width: 44, paddingHorizontal: 0 }}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: horizontal ? 'row' : 'column',
          gap: 24,
          alignItems: horizontal ? 'flex-start' : 'stretch',
        }}
      >
        <View style={{ flex: horizontal ? 1.25 : undefined, gap: 16 }}>
          <FoodImage
            uri={activeImage?.imageUrl}
            label={dish.name}
            style={{ width: '100%', aspectRatio: 1.35, borderRadius: 16 }}
          />
          {dish.dishImage.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {dish.dishImage.map((image) => (
                <Pressable
                  key={image.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('photos')} ${dish.dishImage.indexOf(image) + 1}${image.isThumbnail ? ` · ${t('cover')}` : ''}`}
                  accessibilityState={{ selected: image.id === activeImage?.id }}
                  onPress={() => setSelected(image.id)}
                  style={{
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: image.id === activeImage?.id ? colors.primary : colors.transparent,
                    padding: 2,
                  }}
                >
                  <FoodImage
                    uri={image.imageUrl}
                    style={{ width: 88, height: 72, borderRadius: 8 }}
                  />
                </Pressable>
              ))}
            </ScrollView>
          )}
          <View style={[ui.row, { justifyContent: 'space-between' }]}>
            <Text style={ui.small}>{t('photoCount', { count: dish.dishImage.length })}</Text>
            {activeImage &&
              (activeImage.isThumbnail ? (
                <Badge>{t('cover')}</Badge>
              ) : (
                <Button
                  onPress={() => {
                    void makeCover();
                  }}
                >
                  {t('makeCover')}
                </Button>
              ))}
          </View>
        </View>
        <View style={[ui.card, { flex: horizontal ? 1 : undefined, gap: 24 }]}>
          <View style={{ gap: 8 }}>
            <Text style={ui.muted}>{category?.name ?? '—'}</Text>
            <Text accessibilityRole="header" style={ui.sectionTitle}>
              {dish.name}
            </Text>
            <View style={ui.wrap}>
              <Badge tone={dish.isAvailable ? 'success' : 'neutral'}>
                {t(dish.isAvailable ? 'available' : 'unavailable')}
              </Badge>
              {dish.dirty && <Badge>{t('savedLocally')}</Badge>}
            </View>
          </View>
          <Text
            style={{ fontFamily: fonts.semibold, color: colors.text, fontSize: 24, lineHeight: 32 }}
          >
            {new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US').format(dish.price)} đ
          </Text>
          <View style={ui.separator} />
          <View style={[ui.row, { gap: 12 }]}>
            <View
              style={{
                width: 44,
                height: 44,
                backgroundColor: colors.background,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="time-outline" size={22} color={colors.muted} />
            </View>
            <View style={{ gap: 4 }}>
              <Text style={ui.label}>{t('minutes', { count: dish.preparationTime })}</Text>
              <Text style={ui.small}>{t(dish.preparationTime <= 15 ? 'quick' : 'regular')}</Text>
            </View>
          </View>
          <View style={ui.separator} />
          <View style={{ gap: 8 }}>
            <Text style={ui.label}>{t('readMore')}</Text>
            <Text style={ui.muted}>{dish.description || t('noDescription')}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

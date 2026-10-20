import Ionicons from '@expo/vector-icons/Ionicons';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useApp } from '../contexts/AppContext';
import { useFeedback } from './Feedback';
import { Badge, Banner, Button, Field, FoodImage, PageHeading, Select } from './ui';
import { errorKey } from '../i18n/translations';
import type { DishInput } from '../models/types';
import { colors, ui } from '../theme';
import { validImageUrl, validateDish } from '../utils/validation';

export function DishForm({ editingId }: { editingId?: string }) {
  const { database: db, repository, t, online } = useApp();
  const { toast, confirm } = useFeedback();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const existing = db?.dishes.find((d) => d.id === editingId && !d.deleted);
  const [initial] = useState<DishInput>(() =>
    existing
      ? {
          name: existing.name,
          price: existing.price,
          preparationTime: existing.preparationTime,
          isAvailable: existing.isAvailable,
          description: existing.description,
          dishCategoryId: existing.dishCategoryId,
          dishImage: existing.dishImage.map((image) => ({ ...image })),
        }
      : {
          name: '',
          price: 0,
          preparationTime: 0,
          isAvailable: true,
          description: '',
          dishCategoryId: '',
          dishImage: [],
        },
  );
  const [input, setInput] = useState(initial);
  const [price, setPrice] = useState(existing ? String(existing.price) : '');
  const [time, setTime] = useState(existing ? String(existing.preparationTime) : '');
  const [imageUrl, setImageUrl] = useState('');
  const [imageError, setImageError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  if (!db) return null;
  if (editingId && !existing)
    return (
      <View style={{ padding: 24, gap: 16 }}>
        <Text style={ui.title}>{t('notFoundTitle')}</Text>
        <Button onPress={() => router.replace('/')}>{t('returnToDishes')}</Button>
      </View>
    );
  const sideBySide = width >= 1200;
  const patch = (values: Partial<DishInput>) => {
    setInput((previous) => ({ ...previous, ...values }));
    setErrors((previous) =>
      Object.fromEntries(Object.entries(previous).filter(([key]) => !(key in values))),
    );
  };
  const current = () => ({ ...input, price: Number(price), preparationTime: Number(time) });
  const changed = JSON.stringify(initial) !== JSON.stringify(current()) || Boolean(imageUrl.trim());
  const leave = async () => {
    if (
      changed &&
      !(await confirm({
        title: t('unsavedTitle'),
        message: t('unsavedBody'),
        confirmLabel: t('discard'),
        danger: true,
      }))
    )
      return;
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const addImage = () => {
    if (!validImageUrl(imageUrl.trim())) {
      setImageError('imageInvalid');
      return;
    }
    patch({
      dishImage: [
        ...input.dishImage,
        { id: randomUUID(), imageUrl: imageUrl.trim(), isThumbnail: input.dishImage.length === 0 },
      ],
    });
    setImageUrl('');
    setImageError('');
  };
  const save = async () => {
    if (busy) return;
    const values = current();
    const pendingImage = imageUrl.trim();
    if (pendingImage) {
      if (!validImageUrl(pendingImage)) {
        setImageError('imageInvalid');
        return;
      }
      values.dishImage = [
        ...values.dishImage,
        { id: randomUUID(), imageUrl: pendingImage, isThumbnail: values.dishImage.length === 0 },
      ];
    }
    const validation = validateDish(values, db, editingId);
    setErrors(validation);
    if (Object.keys(validation).length) {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setBusy(true);
    try {
      const id = await repository.saveDish(values, editingId);
      toast(!online ? t('offlineSaved') : t(editingId ? 'saved' : 'dishCreated'));
      router.replace(`/dishes/${id}`);
    } catch (error) {
      toast(t(errorKey(error)), true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          width: '100%',
          maxWidth: 1160,
          alignSelf: 'center',
          padding: width < 768 ? 16 : 32,
          gap: 24,
          paddingBottom: 40,
        }}
      >
        <View style={{ alignItems: 'flex-start' }}>
          <Button
            variant="ghost"
            icon="arrow-back"
            onPress={() => {
              void leave();
            }}
            style={{ paddingHorizontal: 0 }}
          >
            {t('back')}
          </Button>
        </View>
        <PageHeading title={t(editingId ? 'editDish' : 'newDish')} subtitle={t('requiredHint')} />
        {!online && <Banner title={t('offline')} description={t('offlineHint')} tone="warning" />}
        <View
          style={{
            flexDirection: sideBySide ? 'row' : 'column',
            gap: 24,
            alignItems: sideBySide ? 'flex-start' : 'stretch',
          }}
        >
          <View style={[ui.card, { flex: sideBySide ? 1 : undefined, gap: 20 }]}>
            <Text style={ui.sectionTitle}>{t('basicInformation')}</Text>
            <Field
              label={t('dishName')}
              required
              value={input.name}
              onChangeText={(name) => patch({ name })}
              error={errors.name && t(errorKey(errors.name))}
              placeholder={t('namePlaceholder')}
              maxLength={160}
            />
            <Select
              label={t('category')}
              required
              value={input.dishCategoryId}
              options={db.categories
                .filter((c) => !c.deleted)
                .map((c) => ({ value: c.id, label: c.name }))}
              onChange={(dishCategoryId) => patch({ dishCategoryId })}
              error={errors.dishCategoryId && t(errorKey(errors.dishCategoryId))}
            />
            {!db.categories.some((c) => !c.deleted) && (
              <Text style={ui.muted}>{t('noCategories')}</Text>
            )}
            <View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 20 }}>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('price')}
                  required
                  value={price}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => {
                    setPrice(value);
                    setErrors((e) => ({ ...e, price: '' }));
                  }}
                  error={errors.price && t(errorKey(errors.price))}
                  placeholder="125000"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label={t('preparationTime')}
                  required
                  value={time}
                  keyboardType="decimal-pad"
                  onChangeText={(value) => {
                    setTime(value);
                    setErrors((e) => ({ ...e, preparationTime: '' }));
                  }}
                  error={errors.preparationTime && t(errorKey(errors.preparationTime))}
                  placeholder="15"
                />
              </View>
            </View>
            {Number(time) > 0 && (
              <View style={ui.row}>
                <Ionicons name="time-outline" size={16} color={colors.muted} />
                <Text style={ui.muted}>{t(Number(time) <= 15 ? 'quick' : 'regular')}</Text>
              </View>
            )}
            <Field
              label={t('description')}
              multiline
              value={input.description}
              onChangeText={(description) => patch({ description })}
              placeholder={t('descriptionPlaceholder')}
              maxLength={2000}
            />
            <View style={ui.separator} />
            <View
              style={[
                ui.row,
                { justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 },
              ]}
            >
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={ui.label}>{t('sellingStatus')}</Text>
                <Text style={ui.muted}>{t('sellingHint')}</Text>
              </View>
              <Switch
                accessibilityLabel={t('sellingStatus')}
                value={input.isAvailable}
                onValueChange={(isAvailable) => patch({ isAvailable })}
                trackColor={{ false: colors.secondary, true: colors.primary }}
                thumbColor={colors.surface}
              />
            </View>
          </View>
          <View style={[ui.card, { flex: sideBySide ? 1 : undefined, gap: 16 }]}>
            <View style={{ gap: 4 }}>
              <Text style={ui.sectionTitle}>{t('photos')}</Text>
              <Text style={ui.muted}>{t('photosHint')}</Text>
            </View>
            <Field
              label={t('imageUrl')}
              value={imageUrl}
              onChangeText={(value) => {
                setImageUrl(value);
                setImageError('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={t('imagePlaceholder')}
              error={imageError && t(errorKey(imageError))}
              onSubmitEditing={addImage}
            />
            <Button icon="add" onPress={addImage}>
              {t('addPhoto')}
            </Button>
            {errors.dishImage && (
              <Text style={[ui.small, { color: colors.error }]}>
                {t(errorKey(errors.dishImage))}
              </Text>
            )}
            {!input.dishImage.length && (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={ui.muted}>{t('noPhoto')}</Text>
              </View>
            )}
            {input.dishImage.map((image) => (
              <View key={image.id} style={[ui.row, { gap: 12, alignItems: 'center' }]}>
                <FoodImage
                  uri={image.imageUrl}
                  style={{ width: 80, height: 80, borderRadius: 12 }}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  <Text numberOfLines={1} style={ui.small}>
                    {image.imageUrl}
                  </Text>
                  {image.isThumbnail ? (
                    <Badge>{t('cover')}</Badge>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() =>
                        patch({
                          dishImage: input.dishImage.map((item) => ({
                            ...item,
                            isThumbnail: item.id === image.id,
                          })),
                        })
                      }
                      style={{ minHeight: 32, justifyContent: 'center' }}
                    >
                      <Text style={[ui.label, { textDecorationLine: 'underline' }]}>
                        {t('makeCover')}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Button
                  variant="danger"
                  icon="trash-outline"
                  label={t('removePhoto')}
                  onPress={() => {
                    const remaining = input.dishImage.filter((item) => item.id !== image.id);
                    if (image.isThumbnail && remaining[0])
                      remaining[0] = { ...remaining[0], isThumbnail: true };
                    patch({ dishImage: remaining });
                  }}
                  style={{ width: 40, paddingHorizontal: 0 }}
                />
              </View>
            ))}
          </View>
        </View>
        <View style={[ui.row, { justifyContent: 'flex-end' }]}>
          <Button
            onPress={() => {
              void leave();
            }}
            disabled={busy}
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            busy={busy}
            onPress={() => {
              void save();
            }}
          >
            {t(editingId ? 'save' : 'createDish')}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

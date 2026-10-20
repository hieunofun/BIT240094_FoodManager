import type { Database, DishInput, Filters } from '../models/types';

export class AppError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'AppError';
  }
}
export const normalizedName = (name: string) =>
  name.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export function validImageUrl(value: string) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}
export function validateDish(
  input: DishInput,
  db: Database,
  editingId?: string,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) errors.name = 'nameRequired';
  if (!Number.isFinite(input.price) || input.price <= 0) errors.price = 'pricePositive';
  if (!Number.isFinite(input.preparationTime) || input.preparationTime <= 0)
    errors.preparationTime = 'timePositive';
  if (!db.categories.some((c) => c.id === input.dishCategoryId && !c.deleted))
    errors.dishCategoryId = 'categoryRequired';
  if (
    db.dishes.some(
      (d) =>
        !d.deleted &&
        d.id !== editingId &&
        d.dishCategoryId === input.dishCategoryId &&
        normalizedName(d.name) === normalizedName(input.name),
    )
  )
    errors.name = 'duplicateDish';
  if (input.dishImage.some((image) => !validImageUrl(image.imageUrl)))
    errors.dishImage = 'imageInvalid';
  if (input.dishImage.filter((image) => image.isThumbnail).length > 1)
    errors.dishImage = 'oneThumbnail';
  return errors;
}
export function validatePriceRange(min: string, max: string): string | null {
  if ([min, max].some((v) => v.trim() !== '' && (!Number.isFinite(Number(v)) || Number(v) < 0)))
    return 'rangeInvalid';
  if (min.trim() !== '' && max.trim() !== '' && Number(min) > Number(max)) return 'rangeOrder';
  return null;
}
export function filterDishes(db: Database, filters: Filters) {
  const query = normalizedName(filters.query);
  const result = db.dishes.filter(
    (dish) =>
      !dish.deleted &&
      (!query || normalizedName(dish.name).includes(query)) &&
      (!filters.categoryId || dish.dishCategoryId === filters.categoryId) &&
      (filters.availability === 'all' ||
        dish.isAvailable === (filters.availability === 'available')) &&
      (!filters.minPrice.trim() || dish.price >= Number(filters.minPrice)) &&
      (!filters.maxPrice.trim() || dish.price <= Number(filters.maxPrice)),
  );
  return result.sort((a, b) => {
    if (filters.sort === 'priceAsc') return a.price - b.price || a.name.localeCompare(b.name);
    if (filters.sort === 'priceDesc') return b.price - a.price || a.name.localeCompare(b.name);
    if (filters.sort === 'timeAsc')
      return a.preparationTime - b.preparationTime || a.name.localeCompare(b.name);
    return b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name);
  });
}
export function normalizeApiUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    const isLocal = ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error();
    if (!isLocal && !url.hostname.endsWith('.mockapi.io')) throw new Error();
    if (/BIT240094_(Dish|DishCategory)\/?$/i.test(url.pathname)) throw new Error();
    return trimmed;
  } catch {
    throw new AppError('apiUrlInvalid');
  }
}

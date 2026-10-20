import { field } from '../config';
import type { Database, Dish, DishCategory } from '../models/types';

// Model names are convenient in memory. ALL JSON fields on disk and the API
// are converted at this boundary, including nested images and sync metadata.
const fields: Record<string, string> = {
  version: 'Version',
  categories: 'DishCategory',
  dishes: 'Dish',
  settings: 'Settings',
  id: 'Id',
  remoteId: 'RemoteId',
  name: 'Name',
  description: 'Description',
  price: 'Price',
  preparationTime: 'PreparationTime',
  isAvailable: 'IsAvailable',
  dishCategoryId: 'DishCategoryId',
  dishImage: 'DishImage',
  imageUrl: 'ImageUrl',
  isThumbnail: 'IsThumbnail',
  updatedAt: 'UpdatedAt',
  revision: 'Revision',
  dirty: 'Dirty',
  deleted: 'IsDeleted',
  language: 'Language',
  apiUrl: 'ApiUrl',
  apiConfigured: 'ApiConfigured',
  lastSyncedAt: 'LastSyncedAt',
};
const reverse = Object.fromEntries(Object.entries(fields).map(([k, v]) => [field(v), k]));
export function encode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(encode);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => {
          if (!fields[k]) throw new Error(`Unmapped storage field: ${k}`);
          return [field(fields[k]), encode(v)];
        }),
    );
  }
  return value;
}
export function decode(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([k]) => reverse[k])
        .map(([k, v]) => [reverse[k], decode(v)]),
    );
  }
  return value;
}
export function serialize(database: Database): string {
  return JSON.stringify(encode(database));
}
export function deserialize(raw: string): Database {
  const db = decode(JSON.parse(raw)) as Database;
  if (
    db.version !== 1 ||
    !Array.isArray(db.categories) ||
    !Array.isArray(db.dishes) ||
    !db.settings ||
    !['en', 'vi'].includes(db.settings.language) ||
    typeof db.settings.apiUrl !== 'string'
  ) {
    throw new Error('storageCorrupt');
  }
  return db;
}
export function remotePayload(entity: DishCategory | Dish): Record<string, unknown> {
  const { remoteId: _remoteId, dirty: _dirty, ...data } = entity;
  return encode(data) as Record<string, unknown>;
}

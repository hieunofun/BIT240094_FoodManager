export type Language = 'en' | 'vi';
export interface Entity {
  id: string;
  remoteId?: string;
  updatedAt: string;
  revision: number;
  dirty: boolean;
  deleted: boolean;
}
export interface DishCategory extends Entity {
  name: string;
  description: string;
}
export interface DishImage {
  id: string;
  imageUrl: string;
  isThumbnail: boolean;
}
export interface Dish extends Entity {
  name: string;
  price: number;
  preparationTime: number;
  isAvailable: boolean;
  description: string;
  dishCategoryId: string;
  dishImage: DishImage[];
}
export type DishInput = Pick<
  Dish,
  | 'name'
  | 'price'
  | 'preparationTime'
  | 'isAvailable'
  | 'description'
  | 'dishCategoryId'
  | 'dishImage'
>;
export type CategoryInput = Pick<DishCategory, 'name' | 'description'>;
export interface Settings {
  language: Language;
  apiUrl: string;
  apiConfigured?: boolean;
  lastSyncedAt: string | null;
}
export interface Database {
  version: 1;
  categories: DishCategory[];
  dishes: Dish[];
  settings: Settings;
}
export type SyncPhase = 'idle' | 'syncing' | 'error';
export interface Snapshot {
  database: Database | null;
  loading: boolean;
  loadError: string | null;
  online: boolean;
  syncPhase: SyncPhase;
  syncError: string | null;
}
export interface Filters {
  query: string;
  categoryId: string;
  availability: 'all' | 'available' | 'unavailable';
  minPrice: string;
  maxPrice: string;
  sort: 'newest' | 'priceAsc' | 'priceDesc' | 'timeAsc';
}
export const DEFAULT_FILTERS: Filters = {
  query: '',
  categoryId: '',
  availability: 'all',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
};

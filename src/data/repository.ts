import { INITIAL_API_URL, STORAGE_KEY } from '../config';
import { deserialize, serialize } from './codec';
import { seedDatabase } from './seed';
import type {
  CategoryInput,
  Database,
  Dish,
  DishCategory,
  DishInput,
  Language,
  Snapshot,
} from '../models/types';
import type { Collection, RemoteApi, Row } from '../services/api';
import { AppError, normalizeApiUrl, normalizedName, validateDish } from '../utils/validation';

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
}
type IdFactory = () => string;
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const codeOf = (error: unknown) => (error instanceof AppError ? error.code : 'storageFailed');

export class FoodRepository {
  private state: Snapshot = {
    database: null,
    loading: true,
    loadError: null,
    online: true,
    syncPhase: 'idle',
    syncError: null,
  };
  private listeners = new Set<() => void>();
  private writes: Promise<unknown> = Promise.resolve();
  private running: Promise<void> | null = null;
  private initializing: Promise<void> | null = null;
  constructor(
    private readonly storage: StorageAdapter,
    private readonly idFactory: IdFactory,
    private readonly createRemote: (url: string) => RemoteApi,
    private readonly now = () => new Date().toISOString(),
    private readonly defaultApiUrl = INITIAL_API_URL,
  ) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private patch(patch: Partial<Snapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  initialize = (): Promise<void> => {
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      try {
        const raw = await this.storage.getItem(STORAGE_KEY);
        const database = raw ? deserialize(raw) : seedDatabase(this.defaultApiUrl);
        let adoptedDefault = false;
        // An installation opened before .env was filled should adopt the first
        // project URL. An explicit user choice (including disconnect) is preserved.
        if (!database.settings.apiUrl && !database.settings.apiConfigured && this.defaultApiUrl) {
          database.settings.apiUrl = normalizeApiUrl(this.defaultApiUrl);
          database.settings.apiConfigured = true;
          adoptedDefault = true;
        }
        if (!raw || adoptedDefault) await this.storage.setItem(STORAGE_KEY, serialize(database));
        this.patch({ database, loading: false, loadError: null });
      } catch {
        this.patch({ loading: false, loadError: 'storageCorrupt' });
        this.initializing = null;
      }
    })();
    return this.initializing;
  };
  private mutate<T>(apply: (db: Database) => T): Promise<T> {
    const operation = this.writes.then(async () => {
      if (!this.state.database) throw new AppError('storageFailed');
      const next = copy(this.state.database);
      const result = apply(next);
      // One durable snapshot stores data AND its outbox flags atomically.
      try {
        await this.storage.setItem(STORAGE_KEY, serialize(next));
      } catch {
        throw new AppError('storageFailed');
      }
      this.patch({ database: next });
      return result;
    });
    this.writes = operation.catch(() => undefined);
    return operation;
  }
  private metadata() {
    return {
      id: this.idFactory(),
      updatedAt: this.now(),
      revision: 1,
      dirty: true,
      deleted: false,
    };
  }
  private touch(row: Row) {
    row.updatedAt = this.now();
    row.revision += 1;
    row.dirty = true;
  }
  private kick() {
    void this.sync();
  }
  async saveDish(input: DishInput, editingId?: string): Promise<string> {
    const id = await this.mutate((db) => {
      if (editingId && !db.dishes.some((d) => d.id === editingId && !d.deleted))
        throw new AppError('dishNotFound');
      const errors = validateDish(input, db, editingId);
      if (Object.keys(errors).length) throw new AppError(Object.values(errors)[0]);
      const values: DishInput = {
        name: input.name.trim(),
        price: input.price,
        preparationTime: input.preparationTime,
        isAvailable: input.isAvailable,
        dishCategoryId: input.dishCategoryId,
        description: input.description.trim(),
        dishImage: input.dishImage.map((image) => ({
          id: image.id,
          isThumbnail: image.isThumbnail,
          imageUrl: image.imageUrl.trim(),
        })),
      };
      if (editingId) {
        const row = db.dishes.find((d) => d.id === editingId)!;
        Object.assign(row, values);
        this.touch(row);
        return row.id;
      }
      const row: Dish = { ...this.metadata(), ...values };
      db.dishes.push(row);
      return row.id;
    });
    this.kick();
    return id;
  }
  async deleteDish(id: string): Promise<void> {
    await this.mutate((db) => {
      const row = db.dishes.find((d) => d.id === id && !d.deleted);
      if (!row) throw new AppError('dishNotFound');
      row.deleted = true;
      this.touch(row);
    });
    this.kick();
  }
  async saveCategory(input: CategoryInput, editingId?: string): Promise<string> {
    const id = await this.mutate((db) => {
      if (!input.name.trim()) throw new AppError('nameRequired');
      if (
        db.categories.some(
          (c) =>
            !c.deleted &&
            c.id !== editingId &&
            normalizedName(c.name) === normalizedName(input.name),
        )
      )
        throw new AppError('duplicateCategory');
      if (editingId) {
        const row = db.categories.find((c) => c.id === editingId && !c.deleted);
        if (!row) throw new AppError('categoryNotFound');
        Object.assign(row, { name: input.name.trim(), description: input.description.trim() });
        this.touch(row);
        return row.id;
      }
      const row: DishCategory = {
        ...this.metadata(),
        name: input.name.trim(),
        description: input.description.trim(),
      };
      db.categories.push(row);
      return row.id;
    });
    this.kick();
    return id;
  }
  async deleteCategory(id: string): Promise<void> {
    await this.mutate((db) => {
      const row = db.categories.find((c) => c.id === id && !c.deleted);
      if (!row) throw new AppError('categoryNotFound');
      if (db.dishes.some((d) => !d.deleted && d.dishCategoryId === id))
        throw new AppError('categoryInUse');
      row.deleted = true;
      this.touch(row);
    });
    this.kick();
  }
  async setLanguage(language: Language) {
    await this.mutate((db) => {
      db.settings.language = language;
    });
  }
  async configureApi(value: string) {
    const apiUrl = normalizeApiUrl(value);
    if (this.running) throw new AppError('syncBusy');
    await this.mutate((db) => {
      if (db.settings.apiUrl !== apiUrl) {
        for (const row of [...db.categories, ...db.dishes]) {
          delete row.remoteId;
          row.dirty = true;
        }
        db.settings.lastSyncedAt = null;
      }
      db.settings.apiUrl = apiUrl;
      db.settings.apiConfigured = true;
    });
    this.patch({ syncError: null });
    this.kick();
  }
  setOnline(online: boolean) {
    this.patch({ online });
    if (online) this.kick();
  }
  pendingCount() {
    const db = this.state.database;
    return db ? [...db.categories, ...db.dishes].filter((row) => row.dirty).length : 0;
  }
  sync = (): Promise<void> => {
    if (this.running) return this.running;
    const db = this.state.database;
    if (!db?.settings.apiUrl || !this.state.online) return Promise.resolve();
    this.patch({ syncPhase: 'syncing', syncError: null });
    this.running = this.performSync(this.createRemote(db.settings.apiUrl))
      .catch((error: unknown) => {
        this.patch({
          syncPhase: 'error',
          syncError: error instanceof AppError ? error.code : 'apiUnreachable',
        });
      })
      .finally(() => {
        this.running = null;
      });
    return this.running;
  };
  private async acknowledge(collection: Collection, sent: Row, remoteId?: string) {
    await this.mutate((db) => {
      const current = (db[collection] as Row[]).find((row) => row.id === sent.id);
      if (!current) return;
      if (remoteId) current.remoteId = remoteId;
      // Editing/deleting while a request is in flight must keep the newer edit queued.
      if (current.revision === sent.revision) current.dirty = false;
    });
  }
  private async performSync(remote: RemoteApi) {
    // Flush coalesced writes in dependency order; deletion uses the reverse order.
    for (let pass = 0; pass < 20; pass += 1) {
      if (!this.state.online) {
        this.patch({ syncPhase: 'idle' });
        return;
      }
      const tasks: { collection: Collection; row: Row }[] = [];
      const current = this.state.database!;
      for (const collection of ['categories', 'dishes'] as const)
        for (const row of current[collection])
          if (row.dirty && !row.deleted) tasks.push({ collection, row: copy(row) });
      for (const collection of ['dishes', 'categories'] as const)
        for (const row of current[collection])
          if (row.dirty && row.deleted) tasks.push({ collection, row: copy(row) });
      if (!tasks.length) break;
      for (const { collection, row } of tasks) {
        if (!this.state.online) {
          this.patch({ syncPhase: 'idle' });
          return;
        }
        const live = (this.state.database![collection] as Row[]).find((item) => item.id === row.id);
        if (!live || live.revision !== row.revision) continue;
        if (row.deleted) {
          await remote.remove(collection, row);
          await this.acknowledge(collection, row);
        } else {
          const remoteId = await remote.upsert(collection, row);
          await this.acknowledge(collection, row, remoteId);
        }
      }
    }
    const [categories, dishes] = await Promise.all([
      remote.list('categories'),
      remote.list('dishes'),
    ]);
    // Never accept a remote orphan, duplicate UUID or duplicate name in a category.
    const activeCategories = new Set(categories.filter((c) => !c.deleted).map((c) => c.id));
    const uniqueIds = (rows: Row[]) => new Set(rows.map((r) => r.id)).size === rows.length;
    const dishNames = (dishes as Dish[])
      .filter((d) => !d.deleted)
      .map((d) => `${d.dishCategoryId}:${normalizedName(d.name)}`);
    if (
      !uniqueIds(categories) ||
      !uniqueIds(dishes) ||
      new Set(dishNames).size !== dishNames.length ||
      (dishes as Dish[]).some((d) => !d.deleted && !activeCategories.has(d.dishCategoryId))
    )
      throw new AppError('apiSchemaInvalid');
    await this.mutate((db) => {
      const merge = <T extends Row>(local: T[], incoming: T[]): T[] => {
        const localMap = new Map(local.map((row) => [row.id, row]));
        const merged = incoming.map((row) => {
          const existing = localMap.get(row.id);
          return existing?.dirty || existing?.deleted ? existing : row;
        });
        const remoteIds = new Set(incoming.map((row) => row.id));
        for (const row of local)
          if (!remoteIds.has(row.id) && (row.dirty || row.deleted)) merged.push(row);
        return merged;
      };
      db.categories = merge(db.categories, categories as DishCategory[]);
      db.dishes = merge(db.dishes, dishes as Dish[]);
      db.settings.lastSyncedAt = this.now();
    });
    this.patch({ syncPhase: 'idle', syncError: null });
    // A write can arrive while the pull is in flight. Do not strand that write.
    if (this.pendingCount() && this.state.online) setTimeout(() => this.kick(), 0);
  }
}
export { codeOf };

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { STORAGE_KEY, STUDENT_ID, field, RESOURCES } from '../src/config';
import { deserialize, remotePayload, serialize } from '../src/data/codec';
import { FoodRepository, type StorageAdapter } from '../src/data/repository';
import { seedDatabase } from '../src/data/seed';
import { MockApi, type Collection, type RemoteApi, type Row } from '../src/services/api';
import { DEFAULT_FILTERS, type DishInput } from '../src/models/types';
import {
  filterDishes,
  normalizeApiUrl,
  validateDish,
  validatePriceRange,
} from '../src/utils/validation';

class MemoryStorage implements StorageAdapter {
  values = new Map<string, string>();
  failWrite = false;
  async getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  async setItem(key: string, value: string) {
    if (this.failWrite) throw new Error('Disk full');
    this.values.set(key, value);
  }
}
class FakeRemote implements RemoteApi {
  data: Record<Collection, Row[]> = { categories: [], dishes: [] };
  fail = false;
  beforeWrite?: (row: Row) => Promise<void>;
  async list(collection: Collection) {
    if (this.fail) throw new Error('offline');
    return structuredClone(this.data[collection]);
  }
  async upsert(collection: Collection, row: Row) {
    if (this.fail) throw new Error('offline');
    await this.beforeWrite?.(row);
    const index = this.data[collection].findIndex((item) => item.id === row.id);
    const remoteId =
      index === -1
        ? String(this.data[collection].length + 1)
        : this.data[collection][index].remoteId!;
    const saved = { ...structuredClone(row), dirty: false, remoteId };
    if (index === -1) this.data[collection].push(saved);
    else this.data[collection][index] = saved;
    return remoteId;
  }
  async remove(collection: Collection, row: Row) {
    this.data[collection] = this.data[collection].filter((item) => item.id !== row.id);
  }
}
let nextId = 0;
const newId = () => `test-${++nextId}`;
async function fixture() {
  const storage = new MemoryStorage();
  const remote = new FakeRemote();
  const repo = new FoodRepository(storage, newId, () => remote);
  await repo.initialize();
  return { storage, remote, repo };
}
function newDish(repo: FoodRepository): DishInput {
  return {
    name: 'Offline special',
    price: 42000,
    preparationTime: 15,
    description: '',
    isAvailable: true,
    dishCategoryId: repo.getSnapshot().database!.categories[0].id,
    dishImage: [],
  };
}

test('seed meets the required models, category relationships and image limits', () => {
  const db = seedDatabase();
  assert.equal(db.categories.length, 3);
  assert.ok(db.dishes.length >= 5);
  for (const dish of db.dishes) {
    assert.ok(db.categories.some((c) => c.id === dish.dishCategoryId));
    assert.deepEqual(validateDish(dish, db, dish.id), {});
  }
  assert.ok(db.dishes.some((d) => d.dishImage.length > 1));
  assert.ok(db.dishes.some((d) => !d.isAvailable));
  assert.ok(db.dishes.some((d) => d.preparationTime === 15));
});
test('ALL persisted fields, including nested images/settings/metadata, have the MSSV prefix', () => {
  const serialized = serialize(seedDatabase());
  const walk = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object')
      for (const [key, child] of Object.entries(value)) {
        assert.ok(key.startsWith(`${STUDENT_ID}_`), key);
        walk(child);
      }
  };
  walk(JSON.parse(serialized));
  assert.deepEqual(deserialize(serialized), seedDatabase());
  assert.throws(() => deserialize('{"name":"wrong format"}'));
});
test('dish validation handles whitespace, duplicate names, category boundaries and edit identity', () => {
  const db = seedDatabase();
  const dish = db.dishes[0];
  assert.equal(validateDish({ ...dish, name: '   ' }, db, dish.id).name, 'nameRequired');
  assert.equal(
    validateDish({ ...dish, price: Number.NaN, preparationTime: 0 }, db, dish.id).price,
    'pricePositive',
  );
  assert.equal(
    validateDish({ ...dish, dishCategoryId: 'missing' }, db, dish.id).dishCategoryId,
    'categoryRequired',
  );
  assert.equal(
    validateDish({ ...dish, name: ` ${dish.name.toUpperCase()} ` }, db).name,
    'duplicateDish',
  );
  assert.equal(validateDish(dish, db, dish.id).name, undefined);
  assert.equal(validateDish({ ...dish, dishCategoryId: db.categories[1].id }, db).name, undefined);
  assert.equal(
    validateDish(
      {
        ...dish,
        dishImage: [
          { id: '1', imageUrl: 'https://example.com/1.jpg', isThumbnail: true },
          { id: '2', imageUrl: 'https://example.com/2.jpg', isThumbnail: true },
        ],
      },
      db,
      dish.id,
    ).dishImage,
    'oneThumbnail',
  );
});
test('composes name, category, availability, price range and sorting', () => {
  const db = seedDatabase();
  const result = filterDishes(db, {
    ...DEFAULT_FILTERS,
    query: 'e',
    categoryId: db.categories[1].id,
    availability: 'available',
    minPrice: '100000',
    maxPrice: '150000',
    sort: 'priceDesc',
  });
  assert.equal(result.length, 2);
  assert.ok(result[0].price > result[1].price);
  assert.ok(filterDishes(db, DEFAULT_FILTERS).some((d) => !d.isAvailable));
  assert.ok(
    filterDishes(db, { ...DEFAULT_FILTERS, availability: 'available' }).every((d) => d.isAvailable),
  );
  assert.equal(validatePriceRange('200', '100'), 'rangeOrder');
  assert.equal(validatePriceRange('-1', ''), 'rangeInvalid');
  assert.equal(validatePriceRange('oops', ''), 'rangeInvalid');
  assert.equal(validatePriceRange('', '0'), null);
});
test('cannot delete a category used only by an unavailable dish', async () => {
  const { repo } = await fixture();
  const categoryId = await repo.saveCategory({ name: 'Temporarily paused', description: '' });
  await repo.saveDish({ ...newDish(repo), dishCategoryId: categoryId, isAvailable: false });
  await assert.rejects(repo.deleteCategory(categoryId), /categoryInUse/);
});
test('offline creates, edits, language and pending outbox survive process restart', async () => {
  const { repo, storage, remote } = await fixture();
  repo.setOnline(false);
  const id = await repo.saveDish(newDish(repo));
  await repo.saveDish({ ...newDish(repo), name: 'Offline changed', price: 51000 }, id);
  await repo.setLanguage('vi');
  const reloaded = new FoodRepository(storage, newId, () => remote);
  reloaded.setOnline(false);
  await reloaded.initialize();
  const dish = reloaded.getSnapshot().database!.dishes.find((d) => d.id === id)!;
  assert.equal(dish.price, 51000);
  assert.equal(dish.dirty, true);
  assert.equal(reloaded.getSnapshot().database!.settings.language, 'vi');
  assert.ok(storage.values.has(STORAGE_KEY));
  assert.equal(remote.data.dishes.length, 0);
});
test('failed local persistence reports an error without showing unsaved data as saved', async () => {
  const { repo, storage } = await fixture();
  const before = repo.getSnapshot().database!.dishes.length;
  storage.failWrite = true;
  await assert.rejects(repo.saveDish(newDish(repo)), /storageFailed/);
  assert.equal(repo.getSnapshot().database!.dishes.length, before);
  storage.failWrite = false;
  await repo.saveDish(newDish(repo));
  assert.equal(repo.getSnapshot().database!.dishes.length, before + 1);
});
test('sync publishes offline edits automatically after reconnection, and repeating it does not duplicate data', async () => {
  const { repo, remote } = await fixture();
  repo.setOnline(false);
  await repo.configureApi('https://example.mockapi.io/api/v1');
  const id = await repo.saveDish(newDish(repo));
  repo.setOnline(true);
  await repo.sync();
  assert.equal(remote.data.categories.length, 3);
  assert.equal(remote.data.dishes.length, 7);
  assert.equal(repo.pendingCount(), 0);
  assert.ok(remote.data.dishes.some((d) => d.id === id));
  await repo.sync();
  assert.equal(remote.data.dishes.length, 7);
  await repo.deleteDish(id);
  await repo.sync();
  assert.equal(remote.data.dishes.length, 6);
});
test('an edit during an in-flight request remains queued and eventually reaches the server', async () => {
  const { repo, remote } = await fixture();
  await repo.configureApi('https://example.mockapi.io/api/v1');
  await repo.sync();
  let release!: () => void;
  let announce!: () => void;
  const sent = new Promise<void>((resolve) => {
    announce = resolve;
  });
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let held = false;
  remote.beforeWrite = async () => {
    if (!held) {
      held = true;
      announce();
      await blocked;
    }
  };
  const id = await repo.saveDish(newDish(repo));
  await sent;
  await repo.saveDish({ ...newDish(repo), name: 'Latest edit', price: 99000 }, id);
  release();
  await repo.sync();
  await repo.sync();
  const saved = remote.data.dishes.find((d) => d.id === id)! as DishInput;
  assert.equal(saved.name, 'Latest edit');
  assert.equal(saved.price, 99000);
  assert.equal(repo.pendingCount(), 0);
});
test('remote changes are pulled and pending local writes survive an API failure', async () => {
  const { repo, remote } = await fixture();
  await repo.configureApi('https://example.mockapi.io/api/v1');
  await repo.sync();
  remote.data.dishes[0].name = 'Changed remotely';
  await repo.sync();
  assert.equal(repo.getSnapshot().database!.dishes[0].name, 'Changed remotely');
  remote.fail = true;
  const id = await repo.saveDish(newDish(repo));
  await repo.sync();
  assert.equal(repo.getSnapshot().syncPhase, 'error');
  assert.ok(repo.pendingCount() > 0);
  remote.fail = false;
  await repo.sync();
  assert.ok(remote.data.dishes.some((d) => d.id === id));
  assert.equal(repo.pendingCount(), 0);
});
test('REST adapter reconciles a successful POST with a lost response before retrying', async () => {
  const rows: Record<string, unknown>[] = [];
  let loseResponse = true;
  const requests: { url: string; method: string }[] = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    requests.push({ url, method });
    if (method === 'GET') return Response.json(rows);
    if (method === 'POST') {
      rows.push({ ...JSON.parse(String(init?.body)), id: 'server-1' });
      if (loseResponse) {
        loseResponse = false;
        throw new TypeError('response lost');
      }
      return Response.json(rows[0]);
    }
    if (method === 'PUT') {
      rows[0] = { ...JSON.parse(String(init?.body)), id: 'server-1' };
      return Response.json(rows[0]);
    }
    return Response.json(null);
  };
  const api = new MockApi('https://example.mockapi.io/api/v1', fakeFetch);
  const category = seedDatabase().categories[0];
  await assert.rejects(api.upsert('categories', category), /apiUnreachable/);
  assert.equal(await api.upsert('categories', category), 'server-1');
  assert.equal(rows.length, 1);
  assert.equal(requests.filter((r) => r.method === 'POST').length, 1);
  assert.ok(requests.every((r) => r.url.includes(RESOURCES.categories)));
  assert.ok(Object.keys(rows[0]).every((key) => key === 'id' || key.startsWith(`${STUDENT_ID}_`)));
  assert.equal(rows[0][field('Name')], category.name);
  assert.equal(remotePayload(category)[field('Dirty')], undefined);
});
test('connection validation accepts a project base URL and rejects resource URLs or credentials', () => {
  assert.equal(
    normalizeApiUrl(' https://abc.mockapi.io/api/v1/ '),
    'https://abc.mockapi.io/api/v1',
  );
  assert.equal(normalizeApiUrl('http://127.0.0.1:4174'), 'http://127.0.0.1:4174');
  assert.throws(() => normalizeApiUrl('https://abc.mockapi.io/api/v1/BIT240094_Dish'));
  assert.throws(() => normalizeApiUrl('https://user:pass@abc.mockapi.io/api/v1'));
  assert.throws(() => normalizeApiUrl('http://abc.mockapi.io'));
  assert.throws(() => normalizeApiUrl('https://other.example/api'));
});

test('an existing local-only installation adopts the configured URL once and preserves explicit disconnect', async () => {
  const storage = new MemoryStorage();
  const remote = new FakeRemote();
  const existing = seedDatabase('');
  delete existing.settings.apiConfigured; // Snapshot produced before connection setup existed.
  existing.dishes[0].name = 'Keep my offline edit';
  await storage.setItem(STORAGE_KEY, serialize(existing));
  const baseUrl = 'https://example.mockapi.io/api/v1';
  const createRepository = () =>
    new FoodRepository(storage, newId, () => remote, undefined, baseUrl);
  const repository = createRepository();
  await repository.initialize();
  assert.equal(repository.getSnapshot().database!.settings.apiUrl, baseUrl);
  assert.equal(repository.getSnapshot().database!.dishes[0].name, 'Keep my offline edit');
  assert.equal(deserialize(storage.values.get(STORAGE_KEY)!).settings.apiConfigured, true);
  await repository.configureApi('');
  const reopened = createRepository();
  await reopened.initialize();
  assert.equal(reopened.getSnapshot().database!.settings.apiUrl, '');
});

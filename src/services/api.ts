import { RESOURCES, field } from '../config';
import { decode, remotePayload } from '../data/codec';
import type { Dish, DishCategory } from '../models/types';
import { AppError } from '../utils/validation';

export type Collection = 'categories' | 'dishes';
export type Row = Dish | DishCategory;
export interface RemoteApi {
  list(collection: Collection): Promise<Row[]>;
  upsert(collection: Collection, row: Row): Promise<string>;
  remove(collection: Collection, row: Row): Promise<void>;
}
export class MockApi implements RemoteApi {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {}
  private async request(
    collection: Collection,
    path = '',
    method = 'GET',
    body?: unknown,
  ): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await this.fetcher(`${this.baseUrl}/${RESOURCES[collection]}${path}`, {
        method,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      if (!response.ok) {
        if (response.status === 404) throw new AppError('apiNotFound');
        if (response.status === 429) throw new AppError('apiRateLimit');
        throw new AppError('apiRequestFailed');
      }
      if (response.status === 204) return null;
      return await response.json();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('apiUnreachable');
    } finally {
      clearTimeout(timeout);
    }
  }
  async list(collection: Collection): Promise<Row[]> {
    const raw = await this.request(collection);
    if (!Array.isArray(raw)) throw new AppError('apiSchemaInvalid');
    return raw.map((record) => {
      const row = decode(record) as Row;
      if (
        !record ||
        typeof record.id !== 'string' ||
        !record[field('Id')] ||
        typeof row.name !== 'string' ||
        typeof row.description !== 'string' ||
        typeof row.updatedAt !== 'string' ||
        !Number.isFinite(row.revision)
      )
        throw new AppError('apiSchemaInvalid');
      if (collection === 'dishes') {
        const dish = row as Dish;
        if (
          !Number.isFinite(dish.price) ||
          dish.price <= 0 ||
          !Number.isFinite(dish.preparationTime) ||
          dish.preparationTime <= 0 ||
          typeof dish.isAvailable !== 'boolean' ||
          !dish.dishCategoryId ||
          !Array.isArray(dish.dishImage) ||
          dish.dishImage.filter((i) => i.isThumbnail).length > 1 ||
          dish.dishImage.some(
            (i) => !i.id || typeof i.imageUrl !== 'string' || typeof i.isThumbnail !== 'boolean',
          )
        )
          throw new AppError('apiSchemaInvalid');
      }
      return { ...row, remoteId: record.id, dirty: false, deleted: Boolean(row.deleted) };
    });
  }
  async upsert(collection: Collection, row: Row): Promise<string> {
    // Reconcile by client UUID before EVERY create. If a POST succeeds but its
    // response is lost, the retry discovers that row rather than POSTing twice.
    const all = await this.list(collection);
    const match = all.find((item) => item.id === row.id);
    const remoteId = match?.remoteId;
    const response = (await this.request(
      collection,
      remoteId ? `/${encodeURIComponent(remoteId)}` : '',
      remoteId ? 'PUT' : 'POST',
      remotePayload(row),
    )) as { id?: string };
    if (!response?.id) throw new AppError('apiSchemaInvalid');
    return String(response.id);
  }
  async remove(collection: Collection, row: Row): Promise<void> {
    const match = (await this.list(collection)).find((item) => item.id === row.id);
    if (!match?.remoteId) return; // Includes a successful DELETE whose response was lost.
    try {
      await this.request(collection, `/${encodeURIComponent(match.remoteId)}`, 'DELETE');
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'apiNotFound') throw error;
    }
  }
}

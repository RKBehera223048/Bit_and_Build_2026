// ============================================================
// In-Memory Store — Fallback when MongoDB is not configured
// ============================================================

import { v4 as uuidv4 } from "uuid";

interface StoredItem {
  _id: string;
  [key: string]: unknown;
}

class InMemoryCollection<T extends Record<string, unknown>> {
  private items: Map<string, T & StoredItem> = new Map();

  async create(data: T): Promise<T & StoredItem & { save: () => Promise<void>; toJSON: () => Record<string, unknown> }> {
    const id = uuidv4();
    const item = { ...data, _id: id } as T & StoredItem;
    this.items.set(id, item);
    const self = this;
    return {
      ...item,
      save: async () => { self.items.set(id, item); },
      toJSON: () => {
        const obj = { ...item, id: item._id } as Record<string, unknown>;
        delete obj._id;
        return obj;
      },
    };
  }

  async find(query: Record<string, unknown> = {}): Promise<Array<T & StoredItem & { toJSON: () => Record<string, unknown> }>> {
    let results = Array.from(this.items.values());

    // Simple query matching
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "object" && value !== null && "$gte" in (value as Record<string, unknown>)) {
        results = results.filter((item) => {
          const itemVal = item[key];
          return typeof itemVal === "string" && itemVal >= ((value as Record<string, unknown>).$gte as string);
        });
      } else {
        results = results.filter((item) => item[key] === value);
      }
    }

    return results.map((item) => ({
      ...item,
      toJSON: () => {
        const obj = { ...item, id: item._id } as Record<string, unknown>;
        delete obj._id;
        return obj;
      },
    }));
  }

  async findById(id: string): Promise<(T & StoredItem & { save: () => Promise<void>; toJSON: () => Record<string, unknown> }) | null> {
    const item = this.items.get(id);
    if (!item) return null;
    const self = this;
    return {
      ...item,
      save: async () => { self.items.set(id, item); },
      toJSON: () => {
        const obj = { ...item, id: item._id } as Record<string, unknown>;
        delete obj._id;
        return obj;
      },
    };
  }

  async findOne(): Promise<(T & StoredItem) | null> {
    const items = Array.from(this.items.values());
    return items.length > 0 ? items[items.length - 1] : null;
  }

  async countDocuments(query: Record<string, unknown> = {}): Promise<number> {
    const results = await this.find(query);
    return results.length;
  }

  async deleteMany(_query: Record<string, unknown> = {}): Promise<void> {
    this.items.clear();
  }
}

// Singleton stores
export const inMemoryReports = new InMemoryCollection();
export const inMemoryIncidents = new InMemoryCollection();
export const inMemoryAuditLogs = new InMemoryCollection();

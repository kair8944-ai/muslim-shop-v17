import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, FIREBASE_CONFIG, FIRESTORE_DB_ID } from '../firebase';
import { Category, Product, StoreConfig } from '../types';

export const PRODUCTS_COLLECTION = 'products';
export const CATEGORIES_COLLECTION = 'categories';
export const SETTINGS_COLLECTION = 'settings';
export const ORDERS_COLLECTION = 'orders';
export const CATALOG_DELTA_DOC_ID = 'catalog_delta';

export const PRODUCTS_CACHE_STORAGE_KEY = 'muslim_shop_products_cache_v3';
const LEGACY_PRODUCTS_CACHE_KEY = 'muslim_shop_products';
const LOCAL_DELTA_STORAGE_KEY = 'muslim_shop_catalog_delta_v5';
const PREV_LOCAL_DELTA_STORAGE_KEY = 'muslim_shop_catalog_delta_v4';
const IDB_NAME = 'muslim_shop_idb_v2';
const IDB_VERSION = 1;
const IDB_STORE_KV = 'kv_store';
const IDB_BASE_CATALOG_KEY = 'base_catalog_v8';
const SNAPSHOT_CACHE_BUSTER = 'v8';

// Cloud Relay (CORS-enabled full-image & metadata sync when Firestore Free Tier daily quota is reached)
const CLOUD_RELAY_APP_KEY = 'hbqgqy42';
const CLOUD_RELAY_CHUNK_PREFIX = 'ms_d7_';
const CLOUD_BLOB_POST_URL = 'https://bytebin.lucko.me/post';
const CLOUD_BLOB_GET_BASE = 'https://bytebin.lucko.me/';
let lastSeenCloudRelayPtr = '';

// Helper to prevent Firebase JS SDK write/read streams from hanging indefinitely when quota (429) is reached
function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs = 2200): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

// Real products restored to catalog-snapshot.json that must not be suppressed by legacy delta deletions
const RESTORED_REAL_PRODUCT_IDS = new Set<string>([
  'prod-1790596858603',
  'prod-1790595926914',
  'prod-1790595342955',
  'prod-1790594951919',
  'prod-1790594314810',
]);

// Known accidental duplicate product IDs so they never appear in any browser cache
const DEFAULT_DELETED_PRODUCT_IDS = new Set<string>([
  'prod-1790267243324', // Duplicate Mahrem Altn Deva (MS-715)
  'prod-1790261400014', // Duplicate Розовая женщина (MS-766)
  'prod-1790236623971', // Duplicate Way Baraka (MS-449)
  'prod-1790242012611', // Duplicate Altn Deva Kids (MS-124)
  'prod-1790515157486', // Duplicate Clinright-CT (MS-57486)
  'prod-1790506560488', // Duplicate Чка Доянь (MS-349)
  'prod-1790594233790', // Duplicate Тибетский Олень (MS-33790)
]);

function hasRealProductImage(prod: any): boolean {
  return Boolean(
    prod &&
      Array.isArray(prod.images) &&
      prod.images.length > 0 &&
      typeof prod.images[0] === 'string' &&
      prod.images[0].length > 10 &&
      !prod.images[0].includes('photo-1584308666744-24d5c474f2ae')
  );
}

// In-memory high-res image map to preserve large base64 images when compacting localStorage
const inMemoryProductImages = new Map<string, string[]>();

/**
 * Normalizes a Firestore product document into a typed Product object
 */
export function normalizeProduct(id: string, data: any): Product {
  return {
    id: data.id || id,
    titleRu: data.titleRu || data.title || '',
    titleKz: data.titleKz || data.titleRu || '',
    price: typeof data.price === 'number' ? data.price : Number(data.price) || 0,
    oldPrice: data.oldPrice ? Number(data.oldPrice) : undefined,
    categoryId: data.categoryId || 'cat-health',
    descriptionRu: data.descriptionRu || data.description || '',
    descriptionKz: data.descriptionKz || data.descriptionRu || '',
    specsRu: data.specsRu || '',
    specsKz: data.specsKz || '',
    benefitsRu: Array.isArray(data.benefitsRu) ? data.benefitsRu : [],
    benefitsKz: Array.isArray(data.benefitsKz) ? data.benefitsKz : [],
    howToUseRu: data.howToUseRu || '',
    howToUseKz: data.howToUseKz || '',
    inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
    sku: data.sku || `MS-${id.replace('prod-', '').slice(-4)}`,
    isHit: Boolean(data.isHit),
    isNew: Boolean(data.isNew),
    isSale: Boolean(data.isSale),
    images:
      Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : [
            'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
          ],
    volumeOrWeight: data.volumeOrWeight || '',
    country: data.country || '',
    createdAt: data.createdAt || new Date().toISOString(),
  };
}

/**
 * Normalizes a Firestore category document into a typed Category object
 */
export function normalizeCategory(id: string, data: any): Category {
  return {
    id: data.id || id,
    nameRu: data.nameRu || 'Категория',
    nameKz: data.nameKz || data.nameRu || 'Санат',
    icon: data.icon || '✨',
    order: typeof data.order === 'number' ? data.order : Number(data.order) || 99,
  };
}

/**
 * Determines whether an error is caused by Firebase Free Tier quota exhaustion or network offline
 */
export function isQuotaOrNetworkError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const code = (err.code || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    code === 'unavailable' ||
    msg.includes('quota') ||
    msg.includes('resource-exhausted') ||
    msg.includes('resource_exhausted') ||
    msg.includes('limit exceeded') ||
    msg.includes('read units') ||
    msg.includes('offline')
  );
}

// ================= INDEXED-DB FAST PERSISTENT CACHE (500MB+ CAPACITY) =================

function openCatalogIdb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE_KV)) {
          database.createObjectStore(IDB_STORE_KV);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const database = await openCatalogIdb();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE_KV, 'readonly');
      const store = tx.objectStore(IDB_STORE_KV);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const database = await openCatalogIdb();
  if (!database) return;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE_KV, 'readwrite');
      const store = tx.objectStore(IDB_STORE_KV);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

// ================= DELTA PERSISTENCE ENGINE (LOCAL + CLOUD) =================
// Stores ONLY added/modified/deleted items so it never overflows localStorage (5MB)
// or Firestore document limits (1MB), and ensures new products NEVER disappear on page refresh!

export interface CatalogDelta {
  upsertedProducts: Record<string, Product>;
  deletedProductIds: string[];
  upsertedCategories: Record<string, Category>;
  deletedCategoryIds: string[];
  settings?: Partial<StoreConfig>;
  updatedAt: string;
}

let inMemoryDelta: CatalogDelta | null = null;

function createEmptyDelta(): CatalogDelta {
  return {
    upsertedProducts: {},
    deletedProductIds: Array.from(DEFAULT_DELETED_PRODUCT_IDS),
    upsertedCategories: {},
    deletedCategoryIds: [],
    updatedAt: new Date(0).toISOString(),
  };
}

export function getLocalCatalogDelta(): CatalogDelta {
  if (inMemoryDelta) return inMemoryDelta;
  try {
    let raw = localStorage.getItem(LOCAL_DELTA_STORAGE_KEY);
    let isMigratingV4 = false;
    if (!raw) {
      raw = localStorage.getItem(PREV_LOCAL_DELTA_STORAGE_KEY);
      isMigratingV4 = Boolean(raw);
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawDeleted: string[] = Array.isArray(parsed.deletedProductIds)
        ? parsed.deletedProductIds
        : [];
      const cleanedDeleted = isMigratingV4
        ? rawDeleted.filter((id) => !RESTORED_REAL_PRODUCT_IDS.has(id))
        : rawDeleted;
      const mergedDeletedIds = Array.from(
        new Set([...Array.from(DEFAULT_DELETED_PRODUCT_IDS), ...cleanedDeleted])
      );
      const upsertedProds: Record<string, Product> = {};
      for (const [id, prod] of Object.entries(parsed.upsertedProducts || {})) {
        if (!DEFAULT_DELETED_PRODUCT_IDS.has(id) && !mergedDeletedIds.includes(id) && hasRealProductImage(prod)) {
          const norm = normalizeProduct(id, prod);
          inMemoryProductImages.set(id, norm.images);
          upsertedProds[id] = norm;
        }
      }
      inMemoryDelta = {
        upsertedProducts: upsertedProds,
        deletedProductIds: mergedDeletedIds,
        upsertedCategories: parsed.upsertedCategories || {},
        deletedCategoryIds: Array.isArray(parsed.deletedCategoryIds) ? parsed.deletedCategoryIds : [],
        settings: parsed.settings || undefined,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
      if (isMigratingV4) {
        saveLocalCatalogDelta(inMemoryDelta);
      }
      return inMemoryDelta;
    }
  } catch {}
  inMemoryDelta = createEmptyDelta();
  return inMemoryDelta;
}

function saveLocalCatalogDelta(delta: CatalogDelta): void {
  inMemoryDelta = delta;
  try {
    localStorage.setItem(LOCAL_DELTA_STORAGE_KEY, JSON.stringify(delta));
  } catch {
    // If localStorage reaches 5MB after dozens of high-res uploads, trim oldest upserted images in localStorage
    // while keeping full data in IndexedDB
    try {
      const keys = Object.keys(delta.upsertedProducts);
      if (keys.length > 20) {
        const trimmedProducts: Record<string, Product> = {};
        keys.slice(-20).forEach((k) => {
          trimmedProducts[k] = delta.upsertedProducts[k];
        });
        localStorage.setItem(
          LOCAL_DELTA_STORAGE_KEY,
          JSON.stringify({ ...delta, upsertedProducts: trimmedProducts })
        );
      }
    } catch {}
  }
  idbSet('catalog_delta_v3', delta).catch(() => {});
}

// Hydrate inMemoryDelta from IndexedDB on boot in case >20 products were added locally
idbGet<CatalogDelta>('catalog_delta_v3')
  .then((idbDelta) => {
    if (idbDelta && idbDelta.upsertedProducts) {
      const current = getLocalCatalogDelta();
      const mergedDeleted = Array.from(
        new Set([
          ...Array.from(DEFAULT_DELETED_PRODUCT_IDS),
          ...(idbDelta.deletedProductIds || []),
          ...(current.deletedProductIds || []),
        ])
      );
      const mergedUpserted: Record<string, Product> = {};
      for (const [id, p] of Object.entries({ ...idbDelta.upsertedProducts, ...current.upsertedProducts })) {
        if (!mergedDeleted.includes(id) && hasRealProductImage(p)) {
          mergedUpserted[id] = p;
        }
      }
      const merged: CatalogDelta = {
        upsertedProducts: mergedUpserted,
        deletedProductIds: mergedDeleted.filter((id) => !RESTORED_REAL_PRODUCT_IDS.has(id)),
        upsertedCategories: { ...idbDelta.upsertedCategories, ...current.upsertedCategories },
        deletedCategoryIds: Array.from(
          new Set([...(idbDelta.deletedCategoryIds || []), ...(current.deletedCategoryIds || [])])
        ),
        settings: { ...(idbDelta.settings || {}), ...(current.settings || {}) },
        updatedAt:
          (idbDelta.updatedAt || '') > (current.updatedAt || '')
            ? idbDelta.updatedAt
            : current.updatedAt,
      };
      inMemoryDelta = merged;
    }
  })
  .catch(() => {});

/**
 * Synchronously records a newly added or edited product in local delta storage
 * so it NEVER disappears on page reload (even if refreshed immediately).
 */
export function recordLocalProductUpsert(product: Product): void {
  const delta = getLocalCatalogDelta();
  const normalized = normalizeProduct(product.id, product);
  if (hasRealProductImage(normalized)) {
    inMemoryProductImages.set(normalized.id, normalized.images);
  } else if (inMemoryProductImages.has(normalized.id)) {
    normalized.images = inMemoryProductImages.get(normalized.id)!;
  }
  delta.upsertedProducts[normalized.id] = normalized;
  delta.deletedProductIds = delta.deletedProductIds.filter((id) => id !== normalized.id);
  delta.updatedAt = new Date().toISOString();
  saveLocalCatalogDelta(delta);
}

/**
 * Synchronously records a deleted product ID in local delta storage
 */
export function recordLocalProductDelete(productId: string): void {
  const delta = getLocalCatalogDelta();
  delete delta.upsertedProducts[productId];
  if (!delta.deletedProductIds.includes(productId)) {
    delta.deletedProductIds.push(productId);
  }
  delta.updatedAt = new Date().toISOString();
  saveLocalCatalogDelta(delta);
}

/**
 * Synchronously records an added or edited category in local delta storage
 */
export function recordLocalCategoryUpsert(category: Category): void {
  const delta = getLocalCatalogDelta();
  const normalized = normalizeCategory(category.id, category);
  delta.upsertedCategories[normalized.id] = normalized;
  delta.deletedCategoryIds = delta.deletedCategoryIds.filter((id) => id !== normalized.id);
  delta.updatedAt = new Date().toISOString();
  saveLocalCatalogDelta(delta);
}

/**
 * Synchronously records a deleted category ID in local delta storage
 */
export function recordLocalCategoryDelete(categoryId: string): void {
  const delta = getLocalCatalogDelta();
  delete delta.upsertedCategories[categoryId];
  if (!delta.deletedCategoryIds.includes(categoryId)) {
    delta.deletedCategoryIds.push(categoryId);
  }
  delta.updatedAt = new Date().toISOString();
  saveLocalCatalogDelta(delta);
}

/**
 * Synchronously records updated store settings in local delta storage
 */
export function recordLocalSettingsUpdate(settings: Partial<StoreConfig>): void {
  const delta = getLocalCatalogDelta();
  delta.settings = { ...(delta.settings || {}), ...settings };
  delta.updatedAt = new Date().toISOString();
  saveLocalCatalogDelta(delta);
}

/**
 * Applies local + cloud delta on top of any base products list
 */
export function applyProductsDelta(baseProducts: Product[], customDelta?: CatalogDelta): Product[] {
  const delta = customDelta || getLocalCatalogDelta();
  const deletedSet = new Set([
    ...Array.from(DEFAULT_DELETED_PRODUCT_IDS),
    ...(delta.deletedProductIds || []),
  ]);
  const map = new Map<string, Product>();

  for (const p of baseProducts) {
    if (p && p.id && !deletedSet.has(p.id)) {
      const normalized = normalizeProduct(p.id, p);
      if (
        normalized.images &&
        normalized.images.length > 0 &&
        normalized.images[0] &&
        !normalized.images[0].includes('photo-1584308666744-24d5c474f2ae')
      ) {
        inMemoryProductImages.set(normalized.id, normalized.images);
      } else if (inMemoryProductImages.has(normalized.id)) {
        normalized.images = inMemoryProductImages.get(normalized.id)!;
      }
      map.set(normalized.id, normalized);
    }
  }

  if (delta.upsertedProducts) {
    for (const [id, prod] of Object.entries(delta.upsertedProducts)) {
      if (prod && !deletedSet.has(id)) {
        const normalized = normalizeProduct(id, prod);
        if (hasRealProductImage(normalized)) {
          inMemoryProductImages.set(normalized.id, normalized.images);
          map.set(id, normalized);
        } else if (inMemoryProductImages.has(normalized.id)) {
          normalized.images = inMemoryProductImages.get(normalized.id)!;
          map.set(id, normalized);
        } else if (map.has(id)) {
          const baseExisting = map.get(id)!;
          map.set(id, { ...normalized, images: baseExisting.images });
        }
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Synchronously reads the cached product list from localStorage and merges any local delta
 * so users see products immediately (0ms) on page load or slow networks.
 */
export function getCachedProductsFromLocalStorage(): Product[] {
  try {
    const raw =
      localStorage.getItem(PRODUCTS_CACHE_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_PRODUCTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed
          .filter((p) => p && p.id && !DEFAULT_DELETED_PRODUCT_IDS.has(p.id))
          .map((p) => {
            const norm = normalizeProduct(p.id, p);
            if (inMemoryProductImages.has(norm.id)) {
              norm.images = inMemoryProductImages.get(norm.id)!;
            }
            return norm;
          })
          .filter((norm) => hasRealProductImage(norm));
        if (normalized.length > 0) {
          return applyProductsDelta(normalized);
        }
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return applyProductsDelta([]);
}

/**
 * Persists the full product list into localStorage cache safely without hitting 5MB QuotaExceededError.
 * Preserves all metadata and compact/external URLs in localStorage while keeping large base64 images in IndexedDB & memory.
 */
export function saveProductsToLocalStorageCache(products: Product[]): void {
  if (!Array.isArray(products) || products.length === 0) return;
  try {
    const delta = getLocalCatalogDelta();
    const compactList = products.map((p) => {
      if (p.images && p.images.length > 0) {
        inMemoryProductImages.set(p.id, p.images);
      }
      const isUpserted = Boolean(delta.upsertedProducts && delta.upsertedProducts[p.id]);
      const safeImages = (p.images || []).map((img) => {
        if (!img || typeof img !== 'string') return img;
        // Keep full image in localStorage for newly added/edited items or URLs/compact images (<35KB)
        if (isUpserted || !img.startsWith('data:') || img.length <= 35000) {
          return img;
        }
        return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80';
      });
      return {
        ...p,
        images: safeImages,
      };
    });

    try {
      localStorage.setItem(PRODUCTS_CACHE_STORAGE_KEY, JSON.stringify(compactList));
    } catch {
      // Fallback: strip all data: URIs if localStorage is near capacity
      const ultraCompact = products.map((p) => ({
        ...p,
        images: (p.images || []).map((img) =>
          img && img.startsWith('data:')
            ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
            : img
        ),
      }));
      localStorage.setItem(PRODUCTS_CACHE_STORAGE_KEY, JSON.stringify(ultraCompact));
    }
  } catch {
    // Ignore storage quota warnings
  }
}

/**
 * Applies local + cloud delta on top of any base categories list
 */
export function applyCategoriesDelta(baseCategories: Category[], customDelta?: CatalogDelta): Category[] {
  const delta = customDelta || getLocalCatalogDelta();
  const deletedSet = new Set(delta.deletedCategoryIds || []);
  const map = new Map<string, Category>();

  for (const c of baseCategories) {
    if (c && c.id && !deletedSet.has(c.id)) {
      map.set(c.id, normalizeCategory(c.id, c));
    }
  }

  if (delta.upsertedCategories) {
    for (const [id, cat] of Object.entries(delta.upsertedCategories)) {
      if (cat && !deletedSet.has(id)) {
        map.set(id, normalizeCategory(id, cat));
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.order - b.order);
}

/**
 * Merges a remote Firestore catalog_delta document into our local delta
 */
function mergeRemoteDeltaIntoLocal(remoteData: any): CatalogDelta {
  const local = getLocalCatalogDelta();
  if (!remoteData || typeof remoteData !== 'object') return local;

  const remoteDeletedProds: string[] = Array.isArray(remoteData.deletedProductIds)
    ? remoteData.deletedProductIds
    : [];
  const remoteDeletedCats: string[] = Array.isArray(remoteData.deletedCategoryIds)
    ? remoteData.deletedCategoryIds
    : [];

  const mergedDeletedProds = Array.from(
    new Set([...(local.deletedProductIds || []), ...remoteDeletedProds])
  );
  const mergedDeletedCats = Array.from(
    new Set([...(local.deletedCategoryIds || []), ...remoteDeletedCats])
  );

  const mergedUpsertedProds: Record<string, Product> = { ...local.upsertedProducts };
  if (remoteData.upsertedProducts && typeof remoteData.upsertedProducts === 'object') {
    for (const [id, prod] of Object.entries(remoteData.upsertedProducts)) {
      if (prod && !mergedDeletedProds.includes(id) && !DEFAULT_DELETED_PRODUCT_IDS.has(id)) {
        const existing = mergedUpsertedProds[id];
        const remoteNorm = normalizeProduct(id, prod);
        // Never allow a placeholder demo image to overwrite or pollute upsertedProducts
        if (!hasRealProductImage(remoteNorm)) {
          continue;
        }
        inMemoryProductImages.set(id, remoteNorm.images);
        if (!existing || (remoteNorm.createdAt || '') >= (existing.createdAt || '')) {
          mergedUpsertedProds[id] = remoteNorm;
        }
      }
    }
  }
  // Remove any upserted product that was later deleted or lacks a real image
  for (const delId of mergedDeletedProds) {
    delete mergedUpsertedProds[delId];
  }

  const mergedUpsertedCats: Record<string, Category> = { ...local.upsertedCategories };
  if (remoteData.upsertedCategories && typeof remoteData.upsertedCategories === 'object') {
    for (const [id, cat] of Object.entries(remoteData.upsertedCategories)) {
      if (cat && !mergedDeletedCats.includes(id)) {
        mergedUpsertedCats[id] = normalizeCategory(id, cat);
      }
    }
  }

  const merged: CatalogDelta = {
    upsertedProducts: mergedUpsertedProds,
    deletedProductIds: mergedDeletedProds,
    upsertedCategories: mergedUpsertedCats,
    deletedCategoryIds: mergedDeletedCats,
    settings: { ...(remoteData.settings || {}), ...(local.settings || {}) },
    updatedAt: new Date().toISOString(),
  };

  saveLocalCatalogDelta(merged);
  return merged;
}

/**
 * Converts a Firestore REST API Value into a plain JS value
 */
function fromFirestoreRestVal(v: any): any {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue?.values || []).map(fromFirestoreRestVal);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue?.fields || {})) {
      out[k] = fromFirestoreRestVal(val);
    }
    return out;
  }
  return undefined;
}

/**
 * Direct HTTPS REST reader for Firestore `settings/catalog_delta` (costs only 1 read unit,
 * bypasses Yandex Browser / Safari WebChannel blocks so new products appear immediately in all browsers!)
 */
async function pullDeltaFromFirestoreRest(): Promise<CatalogDelta | null> {
  try {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIRESTORE_DB_ID}/documents`;
    const res = await fetch(
      `${baseUrl}/${SETTINGS_COLLECTION}/${CATALOG_DELTA_DOC_ID}?key=${FIREBASE_CONFIG.apiKey}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return null;
    const rawDoc = await res.json();
    if (!rawDoc || !rawDoc.fields) return null;

    const remoteData = fromFirestoreRestVal({ mapValue: { fields: rawDoc.fields } });
    const merged = mergeRemoteDeltaIntoLocal(remoteData);

    // Also fetch any newly added product IDs that aren't in our local cache yet
    const remoteIds: string[] = Array.isArray(remoteData.upsertedProductIds)
      ? remoteData.upsertedProductIds
      : [];
    const missingIds = remoteIds.filter(
      (id) => !merged.upsertedProducts[id] && !merged.deletedProductIds.includes(id)
    );

    if (missingIds.length > 0) {
      await Promise.all(
        missingIds.slice(0, 15).map(async (id) => {
          try {
            const pRes = await fetch(
              `${baseUrl}/${PRODUCTS_COLLECTION}/${id}?key=${FIREBASE_CONFIG.apiKey}`,
              { method: 'GET', cache: 'no-store' }
            );
            if (pRes.ok) {
              const pDoc = await pRes.json();
              if (pDoc && pDoc.fields) {
                const pObj = fromFirestoreRestVal({ mapValue: { fields: pDoc.fields } });
                recordLocalProductUpsert(normalizeProduct(id, pObj));
              }
            }
          } catch {}
        })
      );
    }

    return getLocalCatalogDelta();
  } catch {
    return null;
  }
}

/**
 * Pushes full delta (including high-res base64 product images, descriptions, categories, and deletions)
 * to CORS-enabled Cloud Blob + KeyVal Pointer AND compact metadata chunks so all browsers
 * (Chrome, Yandex Browser, Safari, iOS/Android) receive new products immediately even when Firestore is at 429 quota.
 */
async function pushDeltaToCloudRelay(deltaPayload: Record<string, any>): Promise<void> {
  try {
    const allProducts = Object.values((deltaPayload.upsertedProducts || {}) as Record<string, any>)
      .filter(Boolean)
      .sort((a: any, b: any) => (b.createdAt || b.id || '').localeCompare(a.createdAt || a.id || ''))
      .slice(0, 25);

    const fullUpsertedMap: Record<string, any> = {};
    for (const p of allProducts) {
      const memImgs = inMemoryProductImages.get(p.id);
      const resolvedImages =
        memImgs && memImgs.length > 0 && !memImgs[0].includes('photo-1584308666744-24d5c474f2ae')
          ? memImgs
          : p.images;
      fullUpsertedMap[p.id] = {
        ...p,
        images: resolvedImages,
      };
    }

    const fullBlobPayload = {
      upsertedProducts: fullUpsertedMap,
      deletedProductIds: deltaPayload.deletedProductIds || [],
      upsertedCategories: deltaPayload.upsertedCategories || {},
      deletedCategoryIds: deltaPayload.deletedCategoryIds || [],
      settings: deltaPayload.settings || {},
      updatedAt: new Date().toISOString(),
    };

    // 1. Upload full JSON with base64 images to CORS Blob Store & update 10-char pointer key
    const uploadFullBlobPromise = (async () => {
      try {
        const postRes = await fetch(CLOUD_BLOB_POST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullBlobPayload),
        });
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData && postData.key) {
            lastSeenCloudRelayPtr = String(postData.key).trim();
            await fetch(
              `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}ptr/${lastSeenCloudRelayPtr}`,
              { method: 'POST' }
            );
          }
        }
      } catch {
        // Ignore blob upload network warnings
      }
    })();

    // 2. Also push compact metadata chunks as secondary backup
    const uploadCompactChunksPromise = (async () => {
      try {
        const compactItems = allProducts.slice(0, 10).map((p: any) => ({
          i: p.id,
          r: (p.titleRu || '').slice(0, 90),
          p: p.price,
          o: p.oldPrice,
          c: p.categoryId,
          s: p.sku,
          k: p.inStock ? 1 : 0,
          h: p.isHit ? 1 : 0,
          n: p.isNew ? 1 : 0,
          u:
            Array.isArray(p.images) && p.images[0] && !p.images[0].startsWith('data:')
              ? p.images[0]
              : '',
        }));

        const compactStr = JSON.stringify({
          p: compactItems,
          d: (deltaPayload.deletedProductIds || []).slice(-15),
          t: Date.now(),
        });

        const b64 = btoa(unescape(encodeURIComponent(compactStr)))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const chunkSize = 180;
        const chunks: string[] = [];
        for (let i = 0; i < b64.length; i += chunkSize) {
          chunks.push(b64.slice(i, i + chunkSize));
        }

        if (chunks.length > 0 && chunks.length <= 20) {
          await Promise.all(
            chunks.map((chunk, idx) =>
              fetch(
                `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}c${idx}/${chunk}`,
                { method: 'POST' }
              )
            )
          );
          await fetch(
            `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}len/${chunks.length}`,
            { method: 'POST' }
          );
        }
      } catch {}
    })();

    await Promise.all([uploadFullBlobPromise, uploadCompactChunksPromise]);
  } catch {
    // Ignore cloud relay network warnings
  }
}

async function pullDeltaFromCloudRelay(): Promise<CatalogDelta | null> {
  // 1. Primary: Check full-fidelity CORS Blob pointer (contains complete products + base64 photos!)
  try {
    const ptrRes = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}ptr`,
      { method: 'GET', cache: 'no-store' }
    );
    if (ptrRes.ok) {
      const ptrKey = (await ptrRes.text()).replace(/^"|"$/g, '').trim();
      if (ptrKey && ptrKey.length >= 5 && ptrKey.length <= 40) {
        const blobRes = await fetch(`${CLOUD_BLOB_GET_BASE}${ptrKey}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (blobRes.ok) {
          const blobData = await blobRes.json();
          if (blobData && typeof blobData === 'object') {
            lastSeenCloudRelayPtr = ptrKey;
            return mergeRemoteDeltaIntoLocal(blobData);
          }
        }
      }
    }
  } catch {
    // Fall through to compact chunks
  }

  // 2. Secondary fallback: Compact chunks
  try {
    const lenRes = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}len`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!lenRes.ok) return null;
    const lenNum = parseInt((await lenRes.text()).replace(/^"|"$/g, '').trim(), 10);
    if (!lenNum || isNaN(lenNum) || lenNum <= 0 || lenNum > 20) return null;

    const parts = await Promise.all(
      Array.from({ length: lenNum }, (_, idx) =>
        fetch(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}c${idx}`,
          { method: 'GET', cache: 'no-store' }
        ).then(async (r) => (r.ok ? (await r.text()).replace(/^"|"$/g, '').trim() : ''))
      )
    );

    if (parts.some((p) => !p)) return null;
    let b64 = parts.join('').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';

    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.p)) {
      const local = getLocalCatalogDelta();
      const upsertedMap: Record<string, Product> = {};
      for (const item of parsed.p) {
        if (!item || !item.i || DEFAULT_DELETED_PRODUCT_IDS.has(item.i)) continue;
        const existing = local.upsertedProducts[item.i];
        const memImgs = inMemoryProductImages.get(item.i);
        let resolvedImg =
          existing?.images && existing.images.length > 0 && hasRealProductImage(existing)
            ? existing.images[0]
            : memImgs && memImgs.length > 0 && !memImgs[0].includes('photo-1584308666744-24d5c474f2ae')
            ? memImgs[0]
            : item.u && !item.u.includes('photo-1584308666744-24d5c474f2ae')
            ? item.u
            : '';

        if (!resolvedImg) {
          try {
            const pDoc = await withFirestoreTimeout(
              getDoc(doc(db, PRODUCTS_COLLECTION, item.i)),
              1800
            );
            if (pDoc && pDoc.exists()) {
              const fullProd = normalizeProduct(item.i, pDoc.data());
              if (hasRealProductImage(fullProd)) {
                inMemoryProductImages.set(item.i, fullProd.images);
                upsertedMap[item.i] = {
                  ...fullProd,
                  price: typeof item.p === 'number' ? item.p : fullProd.price,
                  oldPrice: typeof item.o === 'number' ? item.o : fullProd.oldPrice,
                  inStock: typeof item.k === 'number' ? Boolean(item.k) : fullProd.inStock,
                  isHit: typeof item.h === 'number' ? Boolean(item.h) : fullProd.isHit,
                  isNew: typeof item.n === 'number' ? Boolean(item.n) : fullProd.isNew,
                };
              }
            }
          } catch {
            // Ignore single-doc fetch error
          }
          continue;
        }

        upsertedMap[item.i] = normalizeProduct(item.i, {
          ...(existing || {}),
          id: item.i,
          titleRu: existing?.titleRu || item.r,
          price: item.p,
          oldPrice: item.o,
          categoryId: item.c || 'cat-health',
          sku: item.s,
          inStock: Boolean(item.k),
          isHit: Boolean(item.h),
          isNew: Boolean(item.n),
          images: [resolvedImg],
        });
      }
      return mergeRemoteDeltaIntoLocal({
        upsertedProducts: upsertedMap,
        deletedProductIds: parsed.d || [],
      });
    }
  } catch {
    // Ignore cloud relay parse errors
  }
  return null;
}

/**
 * Syncs the current delta state (plus any newly added/modified products from currentProducts)
 * to Cloud Relay, Server Cache, and Firestore `settings/catalog_delta` so all browsers/devices
 * receive newly added/updated/deleted products in ~1 second without hanging!
 */
export async function pushDeltaToFirestore(
  currentProducts?: Product[],
  currentCategories?: Category[],
  currentSettings?: Partial<StoreConfig>
): Promise<void> {
  // If Admin passes the live products list (e.g. when clicking "Обновить для всех"),
  // ensure any newly added or modified products are recorded in local delta first
  if (Array.isArray(currentProducts) && currentProducts.length > 0) {
    const baseMap = new Map<string, Product>();
    if (lastResolvedCatalog && Array.isArray(lastResolvedCatalog.products)) {
      for (const bp of lastResolvedCatalog.products) {
        if (bp && bp.id) baseMap.set(bp.id, bp);
      }
    }
    const sortedByNewest = [...currentProducts].sort((a, b) =>
      (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    );
    const newestIds = new Set(sortedByNewest.slice(0, 12).map((p) => p.id));

    for (const p of currentProducts) {
      if (!p || !p.id || DEFAULT_DELETED_PRODUCT_IDS.has(p.id)) continue;
      const baseProd = baseMap.get(p.id);
      const isModified =
        !baseProd ||
        baseProd.price !== p.price ||
        baseProd.oldPrice !== p.oldPrice ||
        baseProd.inStock !== p.inStock ||
        baseProd.isHit !== p.isHit ||
        baseProd.isNew !== p.isNew ||
        baseProd.titleRu !== p.titleRu ||
        baseProd.categoryId !== p.categoryId;

      if (isModified || newestIds.has(p.id)) {
        if (hasRealProductImage(p)) {
          recordLocalProductUpsert(p);
        }
      }
    }
  }

  if (Array.isArray(currentCategories) && currentCategories.length > 0 && lastResolvedCatalog?.categories) {
    const baseCatMap = new Map<string, Category>(
      lastResolvedCatalog.categories.map((c) => [c.id, c])
    );
    for (const c of currentCategories) {
      if (!c || !c.id || c.id === 'cat-all') continue;
      const bc = baseCatMap.get(c.id);
      if (!bc || bc.nameRu !== c.nameRu || bc.nameKz !== c.nameKz || bc.icon !== c.icon) {
        recordLocalCategoryUpsert(c);
      }
    }
  }

  if (currentSettings && typeof currentSettings === 'object') {
    recordLocalSettingsUpdate(currentSettings);
  }

  const delta = getLocalCatalogDelta();
  try {
    const allUpsertedList = Object.values(delta.upsertedProducts).sort((a, b) =>
      (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    );
    const recentInlineProducts: Record<string, any> = {};
    let approxBytes = 0;
    for (const p of allUpsertedList) {
      const memImgs = inMemoryProductImages.get(p.id);
      const prodWithFullImg =
        memImgs && memImgs.length > 0 && !memImgs[0].includes('photo-1584308666744-24d5c474f2ae')
          ? { ...p, images: memImgs }
          : p;
      const cleanProd: Record<string, any> = {};
      for (const [k, v] of Object.entries(prodWithFullImg)) {
        if (v !== undefined) cleanProd[k] = v;
      }
      const size = JSON.stringify(cleanProd).length;
      if (approxBytes + size < 700000) {
        recentInlineProducts[p.id] = cleanProd;
        approxBytes += size;
      }
    }

    const cleanCategories: Record<string, any> = {};
    for (const [cid, cat] of Object.entries(delta.upsertedCategories)) {
      const cObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(cat)) {
        if (v !== undefined) cObj[k] = v;
      }
      cleanCategories[cid] = cObj;
    }

    const payload = {
      upsertedProducts: recentInlineProducts,
      upsertedProductIds: allUpsertedList.map((p) => p.id),
      deletedProductIds: delta.deletedProductIds,
      upsertedCategories: cleanCategories,
      deletedCategoryIds: delta.deletedCategoryIds,
      settings: delta.settings || {},
      updatedAt: new Date().toISOString(),
    };

    const deltaRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    await Promise.all([
      pushDeltaToCloudRelay(payload),
      syncServerCatalog({ action: 'syncDelta', delta: payload }),
      withFirestoreTimeout(setDoc(deltaRef, payload, { merge: true }), 2000),
    ]);
  } catch (err) {
    console.warn('Firestore delta sync notice:', err);
  }
}

// ================= MULTI-SOURCE FAST CATALOG LOADER =================

interface SharedCatalogPayload {
  products: Product[];
  categories: Category[];
  settings: Partial<StoreConfig>;
}

let inFlightCatalogPromise: Promise<SharedCatalogPayload | null> | null = null;
let lastResolvedCatalog: SharedCatalogPayload | null = null;
let lastResolvedAt = 0;

function isStaticGitHubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('github.io') || host.endsWith('muslimshop.kz');
}

/**
 * Fetches fresh catalog payload from server API (/api/catalog) or static snapshot (./catalog-snapshot.json)
 * and updates IndexedDB + localStorage caches.
 */
export async function fetchNetworkCatalog(): Promise<SharedCatalogPayload | null> {
  // Pull any cross-browser Firestore REST delta AND Cloud Relay delta in parallel
  await Promise.all([
    pullDeltaFromFirestoreRest().catch(() => null),
    pullDeltaFromCloudRelay().catch(() => null),
  ]);

  // 1. If not on static GitHub Pages, try Server API (/api/catalog)
  if (!isStaticGitHubPagesHost()) {
    try {
      const res = await fetch('/api/catalog', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            const basePayload: SharedCatalogPayload = {
              products: data.products.map((p: any) => normalizeProduct(p.id, p)),
              categories: Array.isArray(data.categories)
                ? data.categories
                    .map((c: any) => normalizeCategory(c.id, c))
                    .sort((a: Category, b: Category) => a.order - b.order)
                : [],
              settings: data.settings || {},
            };
            lastResolvedCatalog = basePayload;
            lastResolvedAt = Date.now();
            const mergedProducts = applyProductsDelta(basePayload.products);
            saveProductsToLocalStorageCache(mergedProducts);
            idbSet(IDB_BASE_CATALOG_KEY, basePayload).catch(() => {});
            return {
              products: mergedProducts,
              categories: applyCategoriesDelta(basePayload.categories),
              settings: { ...basePayload.settings, ...(getLocalCatalogDelta().settings || {}) },
            };
          }
        }
      }
    } catch {
      // Proceed to static snapshot
    }
  }

  // 2. Load Static Snapshot (./catalog-snapshot.json?v=v4) with cache-buster so all browsers get fresh snapshot
  try {
    const baseUrl =
      typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL
        ? (import.meta as any).env.BASE_URL
        : './';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const snapRes = await fetch(`${cleanBase}catalog-snapshot.json?v=${SNAPSHOT_CACHE_BUSTER}`, {
      method: 'GET',
      cache: 'no-cache',
    });
    if (snapRes.ok) {
      const data = await snapRes.json();
      if (data && Array.isArray(data.products) && data.products.length > 0) {
        const basePayload: SharedCatalogPayload = {
          products: data.products.map((p: any) => normalizeProduct(p.id, p)),
          categories: Array.isArray(data.categories)
            ? data.categories
                .map((c: any) => normalizeCategory(c.id, c))
                .sort((a: Category, b: Category) => a.order - b.order)
            : [],
          settings: data.settings || {},
        };
        lastResolvedCatalog = basePayload;
        lastResolvedAt = Date.now();
        const mergedProducts = applyProductsDelta(basePayload.products);
        saveProductsToLocalStorageCache(mergedProducts);
        idbSet(IDB_BASE_CATALOG_KEY, basePayload).catch(() => {});
        return {
          products: mergedProducts,
          categories: applyCategoriesDelta(basePayload.categories),
          settings: { ...basePayload.settings, ...(getLocalCatalogDelta().settings || {}) },
        };
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * Loads the base catalog at maximum speed:
 * 1. Instant IndexedDB cache (~20ms on repeat visits/refreshes!)
 * 2. Static CDN-cached `./catalog-snapshot.json` (on GitHub Pages / muslimshop.kz) or `/api/catalog` (on server)
 * Always merges local + cloud delta (`applyProductsDelta` / `applyCategoriesDelta`) so new products never vanish!
 */
export async function fetchUniversalCatalog(): Promise<SharedCatalogPayload | null> {
  if (lastResolvedCatalog && Date.now() - lastResolvedAt < 15000) {
    const mergedProducts = applyProductsDelta(lastResolvedCatalog.products);
    saveProductsToLocalStorageCache(mergedProducts);
    return {
      products: mergedProducts,
      categories: applyCategoriesDelta(lastResolvedCatalog.categories),
      settings: { ...lastResolvedCatalog.settings, ...(getLocalCatalogDelta().settings || {}) },
    };
  }
  if (inFlightCatalogPromise) {
    return inFlightCatalogPromise;
  }

  inFlightCatalogPromise = (async (): Promise<SharedCatalogPayload | null> => {
    // 1. Check ultra-fast IndexedDB cache first (~20ms)
    try {
      const cached = await idbGet<SharedCatalogPayload>(IDB_BASE_CATALOG_KEY);
      if (cached && Array.isArray(cached.products) && cached.products.length > 0) {
        lastResolvedCatalog = cached;
        lastResolvedAt = Date.now();
        const mergedProducts = applyProductsDelta(cached.products);
        saveProductsToLocalStorageCache(mergedProducts);
        return {
          products: mergedProducts,
          categories: applyCategoriesDelta(cached.categories || []),
          settings: { ...(cached.settings || {}), ...(getLocalCatalogDelta().settings || {}) },
        };
      }
    } catch {}

    // 2. Fetch from Server API or Static Snapshot
    const netCatalog = await fetchNetworkCatalog();
    if (netCatalog) {
      return netCatalog;
    }

    // 3. Even if offline and only local cache / delta exists, return cached products
    const localCachedProducts = getCachedProductsFromLocalStorage();
    if (localCachedProducts.length > 0) {
      const localDelta = getLocalCatalogDelta();
      return {
        products: localCachedProducts,
        categories: Object.values(localDelta.upsertedCategories),
        settings: localDelta.settings || {},
      };
    }

    return null;
  })();

  try {
    return await inFlightCatalogPromise;
  } finally {
    inFlightCatalogPromise = null;
  }
}

/**
 * Helper to notify backend server cache when Admin modifies catalog
 */
async function syncServerCatalog(body: Record<string, any>): Promise<void> {
  if (lastResolvedCatalog) {
    const mergedProducts = applyProductsDelta(lastResolvedCatalog.products);
    const updatedBase: SharedCatalogPayload = {
      products: mergedProducts,
      categories: applyCategoriesDelta(lastResolvedCatalog.categories),
      settings: { ...lastResolvedCatalog.settings, ...(getLocalCatalogDelta().settings || {}) },
    };
    lastResolvedCatalog = updatedBase;
    saveProductsToLocalStorageCache(mergedProducts);
    idbSet(IDB_BASE_CATALOG_KEY, updatedBase).catch(() => {});
  } else {
    const cached = getCachedProductsFromLocalStorage();
    if (cached.length > 0) {
      saveProductsToLocalStorageCache(cached);
    }
  }
  if (isStaticGitHubPagesHost()) return;
  try {
    await fetch('/api/catalog/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Ignore on static hosting
  }
}

/**
 * Cache-first real-time subscription to products:
 * 1. Immediately returns the cached product list from `localStorage` (0ms synchronous load)
 *    so users see content instantly even on slower networks.
 * 2. Simultaneously hydrates high-res images from IndexedDB / Universal Catalog and revalidates
 *    against the server catalog & Cloud Relay so cross-browser changes (e.g. Chrome -> Yandex Browser / iPhone) sync immediately.
 * 3. Simultaneously listens for real-time Firestore updates (`settings/catalog_delta` and `products` collection) and updates `localStorage`.
 */
export function subscribeToProducts(
  onSuccess: (products: Product[]) => void,
  onError?: (error: Error) => void
) {
  let isUnsubscribed = false;
  let currentBaseProducts: Product[] = [];

  const emitMerged = () => {
    if (isUnsubscribed) return;
    const merged = applyProductsDelta(currentBaseProducts);
    if (merged.length > 0) {
      saveProductsToLocalStorageCache(merged);
      onSuccess(merged);
    }
  };

  // 1. CACHE-FIRST (0ms): Immediately return cached product list from localStorage
  const initialCachedProducts = getCachedProductsFromLocalStorage();
  if (initialCachedProducts.length > 0) {
    currentBaseProducts = initialCachedProducts;
    onSuccess(initialCachedProducts);
  }

  // If this browser already has locally added/edited products in its delta (e.g. Chrome where user added products),
  // proactively push its delta to Firestore & Cloud Relay on startup so Yandex Browser / iPhone immediately receive them!
  const existingDelta = getLocalCatalogDelta();
  if (Object.keys(existingDelta.upsertedProducts || {}).length > 0) {
    pushDeltaToFirestore().catch(() => {});
  }

  // 2. Hydrate from IndexedDB / Snapshot & revalidate from network in background for cross-browser sync
  fetchUniversalCatalog()
    .then(async (catalog) => {
      if (isUnsubscribed) return;
      if (catalog && catalog.products.length > 0) {
        currentBaseProducts = catalog.products;
        emitMerged();
      }
      // Background network + Cloud Relay revalidation ensures another browser (e.g. Yandex Browser / Safari) always receives new items added in Chrome
      const freshNet = await fetchNetworkCatalog();
      if (!isUnsubscribed && freshNet && freshNet.products.length > 0) {
        currentBaseProducts = freshNet.products;
        emitMerged();
      }
    })
    .catch((err) => {
      if (!isUnsubscribed && currentBaseProducts.length === 0 && onError) {
        onError(err);
      }
    });

  // 3. Simultaneously listen to Firestore (`settings/catalog_delta`) AND poll Cloud Relay pointer for real-time cross-browser updates
  const checkCloudRelayLiveUpdates = async () => {
    if (isUnsubscribed) return;
    try {
      const ptrRes = await fetch(
        `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}ptr`,
        { method: 'GET', cache: 'no-store' }
      );
      if (ptrRes.ok) {
        const ptrKey = (await ptrRes.text()).replace(/^"|"$/g, '').trim();
        if (ptrKey && ptrKey.length >= 5 && ptrKey !== lastSeenCloudRelayPtr) {
          await pullDeltaFromCloudRelay();
          emitMerged();
        }
      }
    } catch {}
  };

  const pollInterval =
    typeof window !== 'undefined' ? window.setInterval(checkCloudRelayLiveUpdates, 8000) : null;
  const onFocusOrVisible = () => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      checkCloudRelayLiveUpdates();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);
  }

  try {
    const deltaDocRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    const unsubscribeDelta = onSnapshot(
      deltaDocRef,
      async (docSnap) => {
        if (isUnsubscribed) return;
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          const mergedDelta = mergeRemoteDeltaIntoLocal(remoteData);

          // Fetch any upsertedProductIds in Firestore that aren't in our local delta yet
          const remoteIds: string[] = Array.isArray(remoteData.upsertedProductIds)
            ? remoteData.upsertedProductIds
            : [];
          const missingIds = remoteIds.filter(
            (id) =>
              !mergedDelta.upsertedProducts[id] && !mergedDelta.deletedProductIds.includes(id)
          );

          if (missingIds.length > 0) {
            await Promise.all(
              missingIds.slice(0, 20).map(async (id) => {
                try {
                  const pSnap = await withFirestoreTimeout(
                    getDoc(doc(db, PRODUCTS_COLLECTION, id)),
                    1800
                  );
                  if (pSnap && pSnap.exists()) {
                    recordLocalProductUpsert(normalizeProduct(pSnap.id, pSnap.data()));
                  }
                } catch {}
              })
            );
          }

          emitMerged();
        }
      },
      () => {
        // Keep cached + delta products if Firestore read quota is temporarily reached
        emitMerged();
      }
    );

    return () => {
      isUnsubscribed = true;
      if (pollInterval) clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      }
      unsubscribeDelta();
    };
  } catch {
    return () => {
      isUnsubscribed = true;
      if (pollInterval) clearInterval(pollInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', onFocusOrVisible);
        document.removeEventListener('visibilitychange', onFocusOrVisible);
      }
    };
  }
}

/**
 * Directly fetch a single product by Document ID or SKU.
 * Checks Local Delta first, then Universal Catalog, then Firestore.
 */
export async function getProductById(targetId: string): Promise<Product | null> {
  if (!targetId || typeof targetId !== 'string') return null;
  const cleanId = targetId.trim();
  const lower = cleanId.toLowerCase();

  // 1. Check Local Delta first (instant for newly added products!)
  const delta = getLocalCatalogDelta();
  if (delta.deletedProductIds.includes(cleanId)) return null;
  for (const prod of Object.values(delta.upsertedProducts)) {
    if (
      prod.id === cleanId ||
      prod.id.toLowerCase() === lower ||
      (prod.sku && prod.sku.toLowerCase() === lower)
    ) {
      return prod;
    }
  }

  // 2. Check Universal Catalog (IndexedDB / Snapshot)
  try {
    const catalog = await fetchUniversalCatalog();
    if (catalog && catalog.products.length > 0) {
      const found = catalog.products.find(
        (p) =>
          p.id === cleanId ||
          p.id.toLowerCase() === lower ||
          (p.sku && p.sku.toLowerCase() === lower)
      );
      if (found) return found;
    }
  } catch {}

  // 3. Direct document lookup by Document ID in Firestore
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, cleanId);
    const snap = await withFirestoreTimeout(getDoc(docRef), 1800);
    if (snap && snap.exists()) {
      const prod = normalizeProduct(snap.id, snap.data());
      recordLocalProductUpsert(prod);
      return prod;
    }
  } catch {}

  // 4. Query by 'sku' field in Firestore
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const qSku = query(colRef, where('sku', '==', cleanId));
    const snapSku = await withFirestoreTimeout(getDocs(qSku), 1800);
    if (snapSku && !snapSku.empty) {
      const docSnap = snapSku.docs[0];
      const prod = normalizeProduct(docSnap.id, docSnap.data());
      recordLocalProductUpsert(prod);
      return prod;
    }
  } catch {}

  return null;
}

/**
 * Real-time subscription to categories collection with delta support
 */
export function subscribeToCategories(
  onSuccess: (categories: Category[]) => void,
  onError?: (error: Error) => void
) {
  let isUnsubscribed = false;
  let currentBaseCategories: Category[] = [];

  const emitMerged = () => {
    if (isUnsubscribed) return;
    const merged = applyCategoriesDelta(currentBaseCategories);
    if (merged.length > 0) {
      onSuccess(merged);
    }
  };

  fetchUniversalCatalog()
    .then((catalog) => {
      if (!isUnsubscribed && catalog && catalog.categories.length > 0) {
        currentBaseCategories = catalog.categories;
        emitMerged();
      }
    })
    .catch((err) => {
      if (!isUnsubscribed && onError) onError(err);
    });

  try {
    const deltaDocRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    const unsubscribeDelta = onSnapshot(
      deltaDocRef,
      (docSnap) => {
        if (isUnsubscribed) return;
        if (docSnap.exists()) {
          mergeRemoteDeltaIntoLocal(docSnap.data());
          emitMerged();
        }
      },
      () => {
        emitMerged();
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribeDelta();
    };
  } catch {
    return () => {
      isUnsubscribed = true;
    };
  }
}

/**
 * Real-time subscription to store settings (costs only 1 read unit)
 */
export function subscribeToSettings(
  initialConfig: StoreConfig,
  onSuccess: (config: StoreConfig) => void,
  onError?: (error: Error) => void
) {
  let isUnsubscribed = false;

  fetchUniversalCatalog()
    .then((catalog) => {
      if (
        !isUnsubscribed &&
        catalog &&
        catalog.settings &&
        Object.keys(catalog.settings).length > 0
      ) {
        onSuccess({
          ...initialConfig,
          ...catalog.settings,
          ...(getLocalCatalogDelta().settings || {}),
        });
      }
    })
    .catch(() => {});

  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'general');
    const unsubscribeFirestore = onSnapshot(
      docRef,
      (docSnap) => {
        if (isUnsubscribed) return;
        if (docSnap.exists()) {
          const data = docSnap.data();
          recordLocalSettingsUpdate(data);
          onSuccess({
            ...initialConfig,
            ...data,
          });
        }
      },
      (err) => {
        if (!isUnsubscribed && onError) onError(err);
      }
    );

    return () => {
      isUnsubscribed = true;
      unsubscribeFirestore();
    };
  } catch (err: any) {
    if (onError) onError(err);
    return () => {
      isUnsubscribed = true;
    };
  }
}

/**
 * Create or update product in Local Delta + IndexedDB + Firestore + Server Cache
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  // 1. Synchronously persist in local delta & IndexedDB first so page reload NEVER loses the product!
  recordLocalProductUpsert(product);

  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(product)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }

  // 2. Persist to Firestore `products/{id}` AND `settings/catalog_delta` in parallel (with timeout so UI never hangs)
  await Promise.all([
    (async () => {
      try {
        const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
        await withFirestoreTimeout(setDoc(docRef, cleanData, { merge: true }), 2000);
      } catch (err) {
        console.warn('Firestore saveProduct notice:', err);
      }
    })(),
    pushDeltaToFirestore(),
    syncServerCatalog({ action: 'saveProduct', product: cleanData }),
  ]);
}

/**
 * Bulk save multiple modified products (from Fast Price List / Mass Editor)
 * in a single synchronized operation across Local Delta, IndexedDB, Server Cache, Cloud Relay, and Firestore.
 */
export async function saveProductsBulkToFirestore(productsList: Product[]): Promise<void> {
  if (!Array.isArray(productsList) || productsList.length === 0) return;

  const cleanProducts: Record<string, any>[] = [];
  for (const product of productsList) {
    if (!product || !product.id) continue;
    recordLocalProductUpsert(product);
    const cleanData: Record<string, any> = {};
    for (const [key, val] of Object.entries(product)) {
      if (val !== undefined) {
        cleanData[key] = val;
      }
    }
    cleanProducts.push(cleanData);
  }

  await Promise.all([
    (async () => {
      await Promise.all(
        cleanProducts.map(async (cleanData) => {
          try {
            const docRef = doc(db, PRODUCTS_COLLECTION, cleanData.id);
            await withFirestoreTimeout(setDoc(docRef, cleanData, { merge: true }), 2000);
          } catch {}
        })
      );
    })(),
    pushDeltaToFirestore(),
    syncServerCatalog({ action: 'saveProductsBulk', products: cleanProducts }),
  ]);
}

/**
 * Create or update category in Local Delta + IndexedDB + Firestore + Server Cache
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  recordLocalCategoryUpsert(category);

  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(category)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }

  await Promise.all([
    (async () => {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, category.id);
        await withFirestoreTimeout(setDoc(docRef, cleanData, { merge: true }), 2000);
      } catch (err) {
        console.warn('Firestore saveCategory notice:', err);
      }
    })(),
    pushDeltaToFirestore(),
    syncServerCatalog({ action: 'saveCategory', category: cleanData }),
  ]);
}

/**
 * Delete category from Local Delta + IndexedDB + Firestore + Server Cache
 */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  recordLocalCategoryDelete(categoryId);

  await Promise.all([
    (async () => {
      try {
        const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
        await withFirestoreTimeout(deleteDoc(docRef), 2000);
      } catch (err) {
        console.warn('Firestore deleteCategory notice:', err);
      }
    })(),
    pushDeltaToFirestore(),
    syncServerCatalog({ action: 'deleteCategory', categoryId }),
  ]);
}

/**
 * Delete product from Local Delta + IndexedDB + Firestore + Server Cache
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  recordLocalProductDelete(productId);

  await Promise.all([
    (async () => {
      try {
        const docRef = doc(db, PRODUCTS_COLLECTION, productId);
        await withFirestoreTimeout(deleteDoc(docRef), 2000);
      } catch (err) {
        console.warn('Firestore deleteProduct notice:', err);
      }
    })(),
    pushDeltaToFirestore(),
    syncServerCatalog({ action: 'deleteProduct', productId }),
  ]);
}

/**
 * Save store settings to Local Delta + Firestore + Server Cache
 */
export async function saveSettingsToFirestore(config: StoreConfig): Promise<void> {
  recordLocalSettingsUpdate(config);

  await Promise.all([
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, 'general');
        await withFirestoreTimeout(setDoc(docRef, config, { merge: true }), 2000);
      } catch (err) {
        console.warn('Firestore saveSettings notice:', err);
      }
    })(),
    pushDeltaToFirestore(),
    syncServerCatalog({ action: 'saveSettings', settings: config }),
  ]);
}

/**
 * Record an order in Firestore
 */
export async function createOrderInFirestore(orderData: {
  customerName: string;
  customerPhone: string;
  deliveryMethod: string;
  address?: string;
  items: Array<{
    id: string;
    titleRu: string;
    titleKz: string;
    price: number;
    quantity: number;
  }>;
  totalAmount: number;
  lang: string;
  createdAt: string;
  status: 'new' | 'completed' | 'cancelled';
}): Promise<string> {
  const ordersRef = collection(db, ORDERS_COLLECTION);
  const res = await addDoc(ordersRef, orderData);
  return res.id;
}

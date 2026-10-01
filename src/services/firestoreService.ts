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

export const PRODUCTS_CACHE_STORAGE_KEY = 'muslim_shop_products_cache_v4';
const LEGACY_PRODUCTS_CACHE_KEY = 'muslim_shop_products_cache_v3';
const LOCAL_DELTA_STORAGE_KEY = 'muslim_shop_catalog_delta_v6';
const PREV_LOCAL_DELTA_STORAGE_KEY = 'muslim_shop_catalog_delta_v5';
const IDB_NAME = 'muslim_shop_idb_v2';
const IDB_VERSION = 1;
const IDB_STORE_KV = 'kv_store';
const IDB_BASE_CATALOG_KEY = 'base_catalog_v9';
const SNAPSHOT_CACHE_BUSTER = 'v9';

// Cloud Relay (CORS-enabled full-image & metadata sync when Firestore Free Tier daily quota is reached)
const CLOUD_RELAY_APP_KEY = 'hbqgqy42';
const CLOUD_RELAY_CHUNK_PREFIX = 'ms_d8_';
const LEGACY_CLOUD_RELAY_PREFIX = 'ms_d7_';
const CLOUD_BLOB_POST_URL = 'https://bytebin.lucko.me/post';
const CLOUD_BLOB_GET_BASE = 'https://bytebin.lucko.me/';
let lastSeenCloudRelayPtr = '';
let lastSeenLegacyRelayPtr = '';
const remoteCloudUpsertedIds = new Set<string>();
let initialCloudPullCompleted = false;
const deltaHydrationListeners = new Set<() => void>();

function notifyDeltaListeners(): void {
  deltaHydrationListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

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
  'prod-1790759000350',
  'prod-1790756142798',
  'prod-1790688985190',
  'prod-1790688609740',
  'prod-1790685182489',
  'prod-1790684668736',
  'prod-1790683176351',
  'prod-1790668937494',
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

function isValidProductRecord(prod: any): boolean {
  return Boolean(
    prod &&
      typeof prod === 'object' &&
      typeof prod.id === 'string' &&
      prod.id.trim().length > 0 &&
      (prod.titleRu || prod.titleKz || prod.title)
  );
}

// Tracks the unmodified static/server base catalog so pushDeltaToFirestore always knows
// which products were added or modified compared to the base snapshot
const rawNetworkSnapshotMap = new Map<string, Product>();
const SNAPSHOT_MAX_BUILTIN_ID = 'prod-1790759000350';

export function hasValidDescription(desc?: string): boolean {
  if (!desc || typeof desc !== 'string') return false;
  const trimmed = desc.trim();
  return trimmed.length > 0 && trimmed !== 'Описание товара';
}

/**
 * Merges an incoming/updated Product onto an existing/base Product while guaranteeing
 * that rich fields (descriptionRu, descriptionKz, specsRu, specsKz, howToUseRu, benefits, images)
 * are NEVER wiped out by an empty string or compact delta record.
 */
export function mergeProductPreservingFields(
  baseOrExisting: Product | undefined,
  incoming: Product
): Product {
  if (!baseOrExisting) return incoming;

  const resolvedImages = hasRealProductImage(incoming)
    ? incoming.images
    : hasRealProductImage(baseOrExisting)
    ? baseOrExisting.images
    : incoming.images;

  const resolvedDescRu = hasValidDescription(incoming.descriptionRu)
    ? incoming.descriptionRu
    : hasValidDescription(baseOrExisting.descriptionRu)
    ? baseOrExisting.descriptionRu
    : incoming.descriptionRu || baseOrExisting.descriptionRu || '';

  const resolvedDescKz = hasValidDescription(incoming.descriptionKz)
    ? incoming.descriptionKz
    : hasValidDescription(baseOrExisting.descriptionKz)
    ? baseOrExisting.descriptionKz
    : resolvedDescRu;

  const resolvedSpecsRu =
    incoming.specsRu && incoming.specsRu.trim().length > 0
      ? incoming.specsRu
      : baseOrExisting.specsRu || '';

  const resolvedSpecsKz =
    incoming.specsKz && incoming.specsKz.trim().length > 0
      ? incoming.specsKz
      : baseOrExisting.specsKz || '';

  const resolvedHowToUseRu =
    incoming.howToUseRu && incoming.howToUseRu.trim().length > 0
      ? incoming.howToUseRu
      : baseOrExisting.howToUseRu || '';

  const resolvedHowToUseKz =
    incoming.howToUseKz && incoming.howToUseKz.trim().length > 0
      ? incoming.howToUseKz
      : baseOrExisting.howToUseKz || '';

  const resolvedBenefitsRu =
    Array.isArray(incoming.benefitsRu) && incoming.benefitsRu.length > 0
      ? incoming.benefitsRu
      : Array.isArray(baseOrExisting.benefitsRu) && baseOrExisting.benefitsRu.length > 0
      ? baseOrExisting.benefitsRu
      : [];

  const resolvedBenefitsKz =
    Array.isArray(incoming.benefitsKz) && incoming.benefitsKz.length > 0
      ? incoming.benefitsKz
      : Array.isArray(baseOrExisting.benefitsKz) && baseOrExisting.benefitsKz.length > 0
      ? baseOrExisting.benefitsKz
      : [];

  return {
    ...baseOrExisting,
    ...incoming,
    images: resolvedImages,
    descriptionRu: resolvedDescRu,
    descriptionKz: resolvedDescKz,
    specsRu: resolvedSpecsRu,
    specsKz: resolvedSpecsKz,
    howToUseRu: resolvedHowToUseRu,
    howToUseKz: resolvedHowToUseKz,
    benefitsRu: resolvedBenefitsRu,
    benefitsKz: resolvedBenefitsKz,
    volumeOrWeight: incoming.volumeOrWeight || baseOrExisting.volumeOrWeight || '',
    country: incoming.country || baseOrExisting.country || '',
  };
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
        if (!DEFAULT_DELETED_PRODUCT_IDS.has(id) && !mergedDeletedIds.includes(id) && isValidProductRecord(prod)) {
          const norm = normalizeProduct(id, prod);
          if (hasRealProductImage(norm)) {
            inMemoryProductImages.set(id, norm.images);
          } else if (inMemoryProductImages.has(id)) {
            norm.images = inMemoryProductImages.get(id)!;
          }
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
  // Always save full delta with high-res base64 images to IndexedDB (500MB+ quota)
  idbSet('catalog_delta_v4', delta).catch(() => {});
  try {
    const imgObj: Record<string, string[]> = {};
    inMemoryProductImages.forEach((imgs, id) => {
      if (Array.isArray(imgs) && imgs.length > 0 && !imgs[0].includes('photo-1584308666744-24d5c474f2ae')) {
        imgObj[id] = imgs;
      }
    });
    idbSet('product_images_v1', imgObj).catch(() => {});
  } catch {}

  try {
    localStorage.setItem(LOCAL_DELTA_STORAGE_KEY, JSON.stringify(delta));
  } catch {
    // If localStorage reaches 5MB limit due to large base64 images, NEVER drop any product from delta!
    // Instead, compact large data: image strings in the localStorage copy while keeping 100% of product metadata
    // in localStorage and 100% of full-res images in IndexedDB & inMemoryProductImages.
    try {
      const compactUpserted: Record<string, Product> = {};
      const entries = Object.entries(delta.upsertedProducts || {});
      entries.forEach(([id, p], idx) => {
        if (!p) return;
        if (hasRealProductImage(p)) {
          inMemoryProductImages.set(id, p.images);
        }
        const keepFullImgInLs = idx >= entries.length - 4;
        compactUpserted[id] = {
          ...p,
          images: (p.images || []).map((img) =>
            !keepFullImgInLs && img && img.startsWith('data:') && img.length > 25000
              ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
              : img
          ),
        };
      });
      try {
        localStorage.setItem(
          LOCAL_DELTA_STORAGE_KEY,
          JSON.stringify({ ...delta, upsertedProducts: compactUpserted })
        );
      } catch {
        // Ultra-compact fallback: strip all data: URIs in localStorage copy while preserving every single product
        const ultraCompactUpserted: Record<string, Product> = {};
        for (const [id, p] of entries) {
          if (!p) continue;
          ultraCompactUpserted[id] = {
            ...p,
            images: (p.images || []).map((img) =>
              img && img.startsWith('data:')
                ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
                : img
            ),
          };
        }
        localStorage.setItem(
          LOCAL_DELTA_STORAGE_KEY,
          JSON.stringify({ ...delta, upsertedProducts: ultraCompactUpserted })
        );
      }
    } catch {}
  }
}

let hydrationPromise: Promise<CatalogDelta> | null = null;

/**
 * Hydrates inMemoryDelta and inMemoryProductImages from all local storage layers
 * (IndexedDB `catalog_delta_v4`, `base_catalog_v9`, `product_images_v1`, and localStorage caches)
 * so that NOT A SINGLE PRODUCT added in Chrome can ever be missed or lost!
 */
export function ensureLocalDeltaHydrated(): Promise<CatalogDelta> {
  if (hydrationPromise) return hydrationPromise;
  hydrationPromise = (async () => {
    try {
      const [idbDelta, idbBase, idbImages] = await Promise.all([
        idbGet<CatalogDelta>('catalog_delta_v4'),
        idbGet<SharedCatalogPayload>(IDB_BASE_CATALOG_KEY),
        idbGet<Record<string, string[]>>('product_images_v1'),
      ]);

      if (idbImages && typeof idbImages === 'object') {
        for (const [id, imgs] of Object.entries(idbImages)) {
          if (Array.isArray(imgs) && imgs.length > 0 && !imgs[0].includes('photo-1584308666744-24d5c474f2ae')) {
            inMemoryProductImages.set(id, imgs);
          }
        }
      }

      if (idbBase && Array.isArray(idbBase.products)) {
        for (const bp of idbBase.products) {
          if (bp && bp.id && hasRealProductImage(bp)) {
            inMemoryProductImages.set(bp.id, bp.images);
          }
        }
      }

      const current = getLocalCatalogDelta();
      const mergedDeleted = Array.from(
        new Set([
          ...Array.from(DEFAULT_DELETED_PRODUCT_IDS),
          ...(idbDelta?.deletedProductIds || []),
          ...(current.deletedProductIds || []),
        ])
      ).filter((id) => !RESTORED_REAL_PRODUCT_IDS.has(id));

      const deletedSet = new Set(mergedDeleted);
      const mergedUpserted: Record<string, Product> = {};

      const allIds = new Set([
        ...Object.keys(idbDelta?.upsertedProducts || {}),
        ...Object.keys(current.upsertedProducts || {}),
      ]);

      for (const id of allIds) {
        if (deletedSet.has(id)) continue;
        const fromIdb = idbDelta?.upsertedProducts?.[id];
        const fromCurr = current.upsertedProducts?.[id];
        const baseProd =
          idbBase?.products?.find((bp) => bp.id === id) ||
          lastResolvedCatalog?.products?.find((bp) => bp.id === id);
        const combined =
          fromCurr && fromIdb
            ? mergeProductPreservingFields(fromIdb, fromCurr)
            : fromCurr || fromIdb;
        if (combined && isValidProductRecord(combined)) {
          const mergedProd = mergeProductPreservingFields(baseProd, combined);
          if (hasRealProductImage(mergedProd)) {
            inMemoryProductImages.set(id, mergedProd.images);
          } else if (inMemoryProductImages.has(id)) {
            mergedProd.images = inMemoryProductImages.get(id)!;
          }
          mergedUpserted[id] = mergedProd;
        }
      }

      // Also recover any newly added products (id > SNAPSHOT_MAX_BUILTIN_ID) that were stored in
      // idbBase (`base_catalog_v9`) or `localStorage` (`muslim_shop_products_cache_v4`) when localStorage delta hit 5MB
      const candidatePools: Product[][] = [];
      if (idbBase && Array.isArray(idbBase.products)) {
        candidatePools.push(idbBase.products);
      }
      try {
        const rawCache =
          localStorage.getItem(PRODUCTS_CACHE_STORAGE_KEY) ||
          localStorage.getItem(LEGACY_PRODUCTS_CACHE_KEY);
        if (rawCache) {
          const parsedCache = JSON.parse(rawCache);
          if (Array.isArray(parsedCache)) {
            candidatePools.push(parsedCache);
          }
        }
      } catch {}

      for (const pool of candidatePools) {
        for (const item of pool) {
          if (!item || !item.id || deletedSet.has(item.id) || DEFAULT_DELETED_PRODUCT_IDS.has(item.id)) {
            continue;
          }
          const isPostSnapshotNewItem =
            item.id.startsWith('prod-179') && item.id > SNAPSHOT_MAX_BUILTIN_ID;
          const isMissingFromRawSnapshot =
            rawNetworkSnapshotMap.size > 0 && !rawNetworkSnapshotMap.has(item.id);
          if (isPostSnapshotNewItem || isMissingFromRawSnapshot) {
            const norm = normalizeProduct(item.id, item);
            if (hasRealProductImage(norm)) {
              inMemoryProductImages.set(norm.id, norm.images);
            } else if (inMemoryProductImages.has(norm.id)) {
              norm.images = inMemoryProductImages.get(norm.id)!;
            }
            mergedUpserted[norm.id] = mergeProductPreservingFields(mergedUpserted[norm.id], norm);
          }
        }
      }

      const merged: CatalogDelta = {
        upsertedProducts: mergedUpserted,
        deletedProductIds: mergedDeleted,
        upsertedCategories: {
          ...(idbDelta?.upsertedCategories || {}),
          ...(current.upsertedCategories || {}),
        },
        deletedCategoryIds: Array.from(
          new Set([
            ...(idbDelta?.deletedCategoryIds || []),
            ...(current.deletedCategoryIds || []),
          ])
        ),
        settings: { ...(idbDelta?.settings || {}), ...(current.settings || {}) },
        updatedAt:
          (idbDelta?.updatedAt || '') > (current.updatedAt || '')
            ? idbDelta!.updatedAt
            : current.updatedAt,
      };

      saveLocalCatalogDelta(merged);
      notifyDeltaListeners();
      return merged;
    } catch {
      return getLocalCatalogDelta();
    }
  })();
  return hydrationPromise;
}

// Kick off hydration immediately on module load
ensureLocalDeltaHydrated().catch(() => {});

/**
 * Synchronously records a newly added or edited product in local delta storage
 * so it NEVER disappears on page reload (even if refreshed immediately).
 */
export function recordLocalProductUpsert(product: Product): void {
  const delta = getLocalCatalogDelta();
  const existing = delta.upsertedProducts[product.id];
  const baseProd = lastResolvedCatalog?.products?.find((bp) => bp.id === product.id);
  const rawNormalized = normalizeProduct(product.id, product);
  const normalized = mergeProductPreservingFields(existing || baseProd, rawNormalized);
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
    let repairedAnyEmptyDesc = false;
    for (const [id, prod] of Object.entries(delta.upsertedProducts)) {
      if (prod && !deletedSet.has(id)) {
        const normalized = normalizeProduct(id, prod);
        const baseExisting = map.get(id);
        const mergedProd = mergeProductPreservingFields(baseExisting, normalized);

        if (hasRealProductImage(mergedProd)) {
          inMemoryProductImages.set(mergedProd.id, mergedProd.images);
          map.set(id, mergedProd);
        } else if (inMemoryProductImages.has(mergedProd.id)) {
          mergedProd.images = inMemoryProductImages.get(mergedProd.id)!;
          map.set(id, mergedProd);
        } else if (baseExisting) {
          map.set(id, { ...mergedProd, images: baseExisting.images });
        } else if (isValidProductRecord(mergedProd)) {
          map.set(id, mergedProd);
        }

        // Self-heal delta if it had a missing description that was restored from base catalog
        if (
          !hasValidDescription(normalized.descriptionRu) &&
          hasValidDescription(mergedProd.descriptionRu)
        ) {
          delta.upsertedProducts[id] = mergedProd;
          repairedAnyEmptyDesc = true;
        }
      }
    }
    if (repairedAnyEmptyDesc && !customDelta) {
      saveLocalCatalogDelta(delta);
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
          .filter((p) => isValidProductRecord(p) && !DEFAULT_DELETED_PRODUCT_IDS.has(p.id))
          .map((p) => {
            const norm = normalizeProduct(p.id, p);
            if (hasRealProductImage(norm)) {
              inMemoryProductImages.set(norm.id, norm.images);
            } else if (inMemoryProductImages.has(norm.id)) {
              norm.images = inMemoryProductImages.get(norm.id)!;
            }
            return norm;
          });
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
  const baseCatalogMap = new Map<string, Product>();
  if (lastResolvedCatalog && Array.isArray(lastResolvedCatalog.products)) {
    for (const bp of lastResolvedCatalog.products) {
      if (bp && bp.id) baseCatalogMap.set(bp.id, bp);
    }
  }

  if (remoteData.upsertedProducts && typeof remoteData.upsertedProducts === 'object') {
    for (const [id, prod] of Object.entries(remoteData.upsertedProducts)) {
      if (prod && !mergedDeletedProds.includes(id) && !DEFAULT_DELETED_PRODUCT_IDS.has(id)) {
        remoteCloudUpsertedIds.add(id);
        const existing = mergedUpsertedProds[id];
        const baseFallback = existing || baseCatalogMap.get(id) || rawNetworkSnapshotMap.get(id);
        const rawRemoteNorm = normalizeProduct(id, prod);
        if (!isValidProductRecord(rawRemoteNorm)) {
          continue;
        }
        const remoteNorm = mergeProductPreservingFields(baseFallback, rawRemoteNorm);
        if (hasRealProductImage(remoteNorm)) {
          inMemoryProductImages.set(id, remoteNorm.images);
        } else if (inMemoryProductImages.has(id)) {
          remoteNorm.images = inMemoryProductImages.get(id)!;
        }

        if (!existing) {
          mergedUpsertedProds[id] = remoteNorm;
        } else {
          const isRemoteStrictlyNewer =
            (remoteNorm.createdAt || '') > (existing.createdAt || '');
          const remoteHasDescExistingLacks =
            !hasValidDescription(existing.descriptionRu) &&
            hasValidDescription(remoteNorm.descriptionRu);
          if (isRemoteStrictlyNewer || remoteHasDescExistingLacks) {
            mergedUpsertedProds[id] = mergeProductPreservingFields(existing, remoteNorm);
          } else {
            mergedUpsertedProds[id] = mergeProductPreservingFields(remoteNorm, existing);
          }
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
 * Pushes full delta (including ALL high-res base64 product images, descriptions, categories, and deletions)
 * to CORS-enabled Cloud Blob + Dual KeyVal Pointers (`ms_d8_ptr` and `ms_d7_ptr`) AND compact metadata chunks
 * so all browsers (Chrome, Yandex Browser, Opera, Safari, iOS/Android, MacBook) receive 100% of products immediately!
 */
async function pushDeltaToCloudRelay(deltaPayload: Record<string, any>): Promise<void> {
  try {
    // Do NOT slice to 25 or truncate! Include 100% of all upsertedProducts!
    const allProducts = Object.values((deltaPayload.upsertedProducts || {}) as Record<string, any>)
      .filter(Boolean)
      .sort((a: any, b: any) => (b.createdAt || b.id || '').localeCompare(a.createdAt || a.id || ''));

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
      remoteCloudUpsertedIds.add(p.id);
    }

    const fullBlobPayload = {
      upsertedProducts: fullUpsertedMap,
      deletedProductIds: deltaPayload.deletedProductIds || [],
      upsertedCategories: deltaPayload.upsertedCategories || {},
      deletedCategoryIds: deltaPayload.deletedCategoryIds || [],
      settings: deltaPayload.settings || {},
      updatedAt: new Date().toISOString(),
    };

    // 1. Upload full JSON with base64 images to CORS Blob Store & update BOTH v8 and v7 pointer keys
    const uploadFullBlobPromise = (async () => {
      try {
        const postRes = await fetch(CLOUD_BLOB_POST_URL, {
          method: 'POST',
          body: JSON.stringify(fullBlobPayload),
        });
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData && postData.key) {
            const newPtr = String(postData.key).trim();
            lastSeenCloudRelayPtr = newPtr;
            lastSeenLegacyRelayPtr = newPtr;
            await Promise.all([
              fetch(
                `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}ptr/${newPtr}`,
                { method: 'POST' }
              ).catch(() => {}),
              fetch(
                `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${LEGACY_CLOUD_RELAY_PREFIX}ptr/${newPtr}`,
                { method: 'POST' }
              ).catch(() => {}),
            ]);
          }
        }
      } catch {
        // Ignore blob upload network warnings
      }
    })();

    // 2. Also push compact metadata chunks as secondary backup (supports up to 30 products)
    const uploadCompactChunksPromise = (async () => {
      try {
        const compactItems = allProducts.slice(0, 30).map((p: any) => ({
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
          d: (deltaPayload.deletedProductIds || []).slice(-25),
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

        if (chunks.length > 0 && chunks.length <= 35) {
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
  let mergedAnyBlob = false;
  // 1. Primary: Check BOTH v8 (`ms_d8_ptr`) and v7 (`ms_d7_ptr`) CORS Blob pointers and merge both!
  try {
    const [ptr8Res, ptr7Res] = await Promise.all([
      fetch(
        `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}ptr`,
        { method: 'GET', cache: 'no-store' }
      ).catch(() => null),
      fetch(
        `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${LEGACY_CLOUD_RELAY_PREFIX}ptr`,
        { method: 'GET', cache: 'no-store' }
      ).catch(() => null),
    ]);

    const ptr8 = ptr8Res && ptr8Res.ok ? (await ptr8Res.text()).replace(/^"|"$/g, '').trim() : '';
    const ptr7 = ptr7Res && ptr7Res.ok ? (await ptr7Res.text()).replace(/^"|"$/g, '').trim() : '';

    const uniquePtrs = Array.from(
      new Set([ptr8, ptr7].filter((k) => k && k.length >= 5 && k.length <= 40))
    );

    for (const ptrKey of uniquePtrs) {
      try {
        const blobRes = await fetch(`${CLOUD_BLOB_GET_BASE}${ptrKey}`, {
          method: 'GET',
          cache: 'no-store',
        });
        if (blobRes.ok) {
          const blobData = await blobRes.json();
          if (blobData && typeof blobData === 'object') {
            if (ptrKey === ptr8) lastSeenCloudRelayPtr = ptr8;
            if (ptrKey === ptr7) lastSeenLegacyRelayPtr = ptr7;
            mergeRemoteDeltaIntoLocal(blobData);
            mergedAnyBlob = true;
          }
        }
      } catch {}
    }

    if (mergedAnyBlob) {
      initialCloudPullCompleted = true;
      return getLocalCatalogDelta();
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
    if (!lenRes.ok) {
      initialCloudPullCompleted = true;
      return null;
    }
    const lenNum = parseInt((await lenRes.text()).replace(/^"|"$/g, '').trim(), 10);
    if (!lenNum || isNaN(lenNum) || lenNum <= 0 || lenNum > 35) {
      initialCloudPullCompleted = true;
      return null;
    }

    const parts = await Promise.all(
      Array.from({ length: lenNum }, (_, idx) =>
        fetch(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}c${idx}`,
          { method: 'GET', cache: 'no-store' }
        ).then(async (r) => (r.ok ? (await r.text()).replace(/^"|"$/g, '').trim() : ''))
      )
    );

    if (parts.some((p) => !p)) {
      initialCloudPullCompleted = true;
      return null;
    }
    let b64 = parts.join('').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';

    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.p)) {
      const local = getLocalCatalogDelta();
      const upsertedMap: Record<string, Product> = {};
      for (const item of parsed.p) {
        if (!item || !item.i || DEFAULT_DELETED_PRODUCT_IDS.has(item.i)) continue;
        remoteCloudUpsertedIds.add(item.i);
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
                resolvedImg = fullProd.images[0];
              }
            }
          } catch {}
        }

        const baseProd =
          rawNetworkSnapshotMap.get(item.i) ||
          lastResolvedCatalog?.products?.find((bp) => bp.id === item.i);
        const fallbackProd = existing || baseProd;

        upsertedMap[item.i] = mergeProductPreservingFields(
          fallbackProd,
          normalizeProduct(item.i, {
            ...(fallbackProd || {}),
            id: item.i,
            titleRu: item.r || fallbackProd?.titleRu || 'Товар',
            price: typeof item.p === 'number' ? item.p : fallbackProd?.price || 0,
            oldPrice: typeof item.o === 'number' ? item.o : fallbackProd?.oldPrice,
            categoryId: item.c || fallbackProd?.categoryId || 'cat-health',
            sku: item.s || fallbackProd?.sku,
            inStock: typeof item.k === 'number' ? Boolean(item.k) : fallbackProd?.inStock ?? true,
            isHit: typeof item.h === 'number' ? Boolean(item.h) : fallbackProd?.isHit ?? false,
            isNew: typeof item.n === 'number' ? Boolean(item.n) : fallbackProd?.isNew ?? true,
            images: resolvedImg
              ? [resolvedImg]
              : fallbackProd?.images || [
                  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
                ],
            createdAt: fallbackProd?.createdAt || new Date().toISOString(),
          })
        );
      }
      initialCloudPullCompleted = true;
      return mergeRemoteDeltaIntoLocal({
        upsertedProducts: upsertedMap,
        deletedProductIds: parsed.d || [],
      });
    }
  } catch {
    // Ignore cloud relay parse errors
  }
  initialCloudPullCompleted = true;
  return null;
}

/**
 * Syncs the current delta state (plus ALL newly added/modified products from currentProducts)
 * to Cloud Relay (`bytebin.lucko.me`), Server Cache (`/api/catalog/sync`), and Firestore `settings/catalog_delta`
 * without any 700KB truncation on Cloud Relay or Server Cache!
 */
export async function pushDeltaToFirestore(
  currentProducts?: Product[],
  currentCategories?: Category[],
  currentSettings?: Partial<StoreConfig>
): Promise<void> {
  // 1. Ensure IndexedDB delta & images are hydrated AND pull latest remote delta first (Pull-before-Push)
  // so no browser can ever overwrite Cloud Relay with an incomplete subset!
  await ensureLocalDeltaHydrated().catch(() => {});
  await pullDeltaFromCloudRelay().catch(() => {});

  // 2. If Admin or auto-heal passes live products list, ensure EVERY product not in raw static snapshot
  // or modified compared to raw static snapshot is recorded in local delta
  const effectiveProducts =
    Array.isArray(currentProducts) && currentProducts.length > 0
      ? currentProducts
      : getCachedProductsFromLocalStorage();

  if (effectiveProducts.length > 0) {
    const sortedByNewest = [...effectiveProducts].sort((a, b) =>
      (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    );
    const newestIds = new Set(sortedByNewest.slice(0, 30).map((p) => p.id));

    for (const p of effectiveProducts) {
      if (!p || !p.id || DEFAULT_DELETED_PRODUCT_IDS.has(p.id)) continue;
      const rawBaseProd = rawNetworkSnapshotMap.get(p.id);
      const fallbackBaseProd =
        rawBaseProd || lastResolvedCatalog?.products?.find((bp) => bp.id === p.id);

      const isPostSnapshotNew =
        p.id.startsWith('prod-179') && p.id > SNAPSHOT_MAX_BUILTIN_ID;
      const isMissingFromRawSnapshot =
        rawNetworkSnapshotMap.size > 0 && !rawNetworkSnapshotMap.has(p.id);

      const isModified =
        !rawBaseProd ||
        isPostSnapshotNew ||
        isMissingFromRawSnapshot ||
        rawBaseProd.price !== p.price ||
        rawBaseProd.oldPrice !== p.oldPrice ||
        rawBaseProd.inStock !== p.inStock ||
        rawBaseProd.isHit !== p.isHit ||
        rawBaseProd.isNew !== p.isNew ||
        rawBaseProd.titleRu !== p.titleRu ||
        rawBaseProd.titleKz !== p.titleKz ||
        rawBaseProd.categoryId !== p.categoryId ||
        rawBaseProd.descriptionRu !== p.descriptionRu ||
        rawBaseProd.descriptionKz !== p.descriptionKz ||
        rawBaseProd.specsRu !== p.specsRu ||
        rawBaseProd.howToUseRu !== p.howToUseRu;

      if (isModified || newestIds.has(p.id)) {
        recordLocalProductUpsert(mergeProductPreservingFields(fallbackBaseProd, p));
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

    // Full un-truncated map for Cloud Relay (bytebin.lucko.me) & Server (/api/catalog/sync)
    const fullCloudUpsertedProducts: Record<string, any> = {};
    // 700KB-capped map strictly for Firestore's 1MB document limit
    const firestoreInlineProducts: Record<string, any> = {};
    let approxBytes = 0;

    for (const p of allUpsertedList) {
      const baseProd =
        rawNetworkSnapshotMap.get(p.id) ||
        lastResolvedCatalog?.products?.find((bp) => bp.id === p.id);
      const enrichedProd = mergeProductPreservingFields(baseProd, p);
      const memImgs = inMemoryProductImages.get(enrichedProd.id);
      const prodWithFullImg =
        memImgs && memImgs.length > 0 && !memImgs[0].includes('photo-1584308666744-24d5c474f2ae')
          ? { ...enrichedProd, images: memImgs }
          : enrichedProd;
      const cleanProd: Record<string, any> = {};
      for (const [k, v] of Object.entries(prodWithFullImg)) {
        if (v !== undefined) cleanProd[k] = v;
      }

      // Always add 100% of products to fullCloudUpsertedProducts (no 700KB limit!)
      fullCloudUpsertedProducts[p.id] = cleanProd;

      const size = JSON.stringify(cleanProd).length;
      if (approxBytes + size < 700000) {
        firestoreInlineProducts[p.id] = cleanProd;
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

    const fullCloudPayload = {
      upsertedProducts: fullCloudUpsertedProducts,
      upsertedProductIds: allUpsertedList.map((p) => p.id),
      deletedProductIds: delta.deletedProductIds,
      upsertedCategories: cleanCategories,
      deletedCategoryIds: delta.deletedCategoryIds,
      settings: delta.settings || {},
      updatedAt: new Date().toISOString(),
    };

    const firestorePayload = {
      ...fullCloudPayload,
      upsertedProducts: firestoreInlineProducts,
    };

    const deltaRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    await Promise.all([
      pushDeltaToCloudRelay(fullCloudPayload),
      syncServerCatalog({
        action: 'syncDelta',
        delta: fullCloudPayload,
        fullProducts: effectiveProducts.length > 0 ? effectiveProducts : undefined,
      }),
      withFirestoreTimeout(setDoc(deltaRef, firestorePayload, { merge: true }), 2000),
    ]);
  } catch (err) {
    console.warn('Firestore delta sync notice:', err);
  }
}

let isAutoSyncInFlight = false;

/**
 * Automatically checks if this browser (e.g. Chrome where new products were uploaded) has products
 * that are not yet in the remote Cloud Relay or Server snapshot, and pushes them so all other
 * browsers (Yandex, Opera, Safari, phones) automatically receive the exact same product count!
 */
export async function autoSyncLocalProductsIfNeeded(
  liveProducts: Product[],
  liveCategories?: Category[],
  liveSettings?: Partial<StoreConfig>
): Promise<void> {
  if (isAutoSyncInFlight || !Array.isArray(liveProducts) || liveProducts.length === 0) return;
  isAutoSyncInFlight = true;
  try {
    await ensureLocalDeltaHydrated();
    if (!initialCloudPullCompleted) {
      await pullDeltaFromCloudRelay().catch(() => null);
    }

    const deletedSet = new Set([
      ...Array.from(DEFAULT_DELETED_PRODUCT_IDS),
      ...(getLocalCatalogDelta().deletedProductIds || []),
    ]);

    let hasUnpushedItems = false;
    for (const p of liveProducts) {
      if (!p || !p.id || deletedSet.has(p.id)) continue;
      const isPostSnapshotNew =
        p.id.startsWith('prod-179') && p.id > SNAPSHOT_MAX_BUILTIN_ID;
      const isMissingFromRawSnapshot =
        rawNetworkSnapshotMap.size > 0 && !rawNetworkSnapshotMap.has(p.id);

      if ((isPostSnapshotNew || isMissingFromRawSnapshot) && !remoteCloudUpsertedIds.has(p.id)) {
        hasUnpushedItems = true;
        recordLocalProductUpsert(p);
      }
    }

    const localUpsertedIds = Object.keys(getLocalCatalogDelta().upsertedProducts || {});
    for (const id of localUpsertedIds) {
      if (!deletedSet.has(id) && !remoteCloudUpsertedIds.has(id)) {
        hasUnpushedItems = true;
      }
    }

    if (hasUnpushedItems) {
      await pushDeltaToFirestore(liveProducts, liveCategories, liveSettings);
    }
  } catch {
    // Ignore background auto-sync errors
  } finally {
    isAutoSyncInFlight = false;
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
  // Hydrate local delta from IndexedDB first, then pull cross-browser Firestore REST delta AND Cloud Relay delta
  await ensureLocalDeltaHydrated().catch(() => null);
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
            const rawProds = data.products.map((p: any) => normalizeProduct(p.id, p));
            for (const rp of rawProds) {
              if (rp && rp.id && rp.id <= SNAPSHOT_MAX_BUILTIN_ID) {
                rawNetworkSnapshotMap.set(rp.id, rp);
              }
            }
            const basePayload: SharedCatalogPayload = {
              products: rawProds,
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
            idbSet(IDB_BASE_CATALOG_KEY, {
              ...basePayload,
              products: mergedProducts,
            }).catch(() => {});
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

  // 2. Load Static Snapshot (./catalog-snapshot.json?v=v9) with cache-buster so all browsers get fresh snapshot
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
        const rawProds = data.products.map((p: any) => normalizeProduct(p.id, p));
        for (const rp of rawProds) {
          if (rp && rp.id) {
            rawNetworkSnapshotMap.set(rp.id, rp);
          }
        }
        const basePayload: SharedCatalogPayload = {
          products: rawProds,
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
        idbSet(IDB_BASE_CATALOG_KEY, {
          ...basePayload,
          products: mergedProducts,
        }).catch(() => {});
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

  // Listen for IndexedDB delta & image hydration completion
  const onDeltaHydrated = () => {
    emitMerged();
  };
  deltaHydrationListeners.add(onDeltaHydrated);

  // 2. Hydrate from IndexedDB / Snapshot & revalidate from network in background for cross-browser sync.
  // IMPORTANT: Never push to Cloud Relay before pulling from Cloud Relay (prevents stale browsers from overwriting new products!).
  fetchUniversalCatalog()
    .then(async (catalog) => {
      if (isUnsubscribed) return;
      if (catalog && catalog.products.length > 0) {
        currentBaseProducts = catalog.products;
        emitMerged();
      }
      // Background network + Cloud Relay revalidation ensures another browser (e.g. Yandex Browser / Opera / Safari) always receives new items added in Chrome
      const freshNet = await fetchNetworkCatalog();
      if (!isUnsubscribed && freshNet && freshNet.products.length > 0) {
        currentBaseProducts = freshNet.products;
        emitMerged();
        // After pulling from network & Cloud Relay, if this browser (e.g. Chrome) has local products that aren't in Cloud Relay yet, auto-push them!
        const mergedNow = applyProductsDelta(currentBaseProducts);
        autoSyncLocalProductsIfNeeded(mergedNow, freshNet.categories, freshNet.settings).catch(
          () => {}
        );
      }
    })
    .catch((err) => {
      if (!isUnsubscribed && currentBaseProducts.length === 0 && onError) {
        onError(err);
      }
    });

  // 3. Simultaneously listen to Firestore (`settings/catalog_delta`) AND poll Cloud Relay pointers (`ms_d8_ptr` & `ms_d7_ptr`) for real-time cross-browser updates
  const checkCloudRelayLiveUpdates = async () => {
    if (isUnsubscribed) return;
    try {
      const [ptr8Res, ptr7Res] = await Promise.all([
        fetch(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_CHUNK_PREFIX}ptr`,
          { method: 'GET', cache: 'no-store' }
        ).catch(() => null),
        fetch(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${LEGACY_CLOUD_RELAY_PREFIX}ptr`,
          { method: 'GET', cache: 'no-store' }
        ).catch(() => null),
      ]);
      const ptr8 = ptr8Res && ptr8Res.ok ? (await ptr8Res.text()).replace(/^"|"$/g, '').trim() : '';
      const ptr7 = ptr7Res && ptr7Res.ok ? (await ptr7Res.text()).replace(/^"|"$/g, '').trim() : '';

      const changed8 = ptr8 && ptr8.length >= 5 && ptr8 !== lastSeenCloudRelayPtr;
      const changed7 = ptr7 && ptr7.length >= 5 && ptr7 !== lastSeenLegacyRelayPtr;

      if (changed8 || changed7) {
        await pullDeltaFromCloudRelay();
        emitMerged();
      }
    } catch {}
  };

  const pollInterval =
    typeof window !== 'undefined' ? window.setInterval(checkCloudRelayLiveUpdates, 6000) : null;
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
      deltaHydrationListeners.delete(onDeltaHydrated);
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
      deltaHydrationListeners.delete(onDeltaHydrated);
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

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
import { db } from '../firebase';
import { Category, Product, StoreConfig } from '../types';

export const PRODUCTS_COLLECTION = 'products';
export const CATEGORIES_COLLECTION = 'categories';
export const SETTINGS_COLLECTION = 'settings';
export const ORDERS_COLLECTION = 'orders';
export const CATALOG_DELTA_DOC_ID = 'catalog_delta';

export const PRODUCTS_CACHE_STORAGE_KEY = 'muslim_shop_products_cache';
const LEGACY_PRODUCTS_CACHE_KEY = 'muslim_shop_products';
const LOCAL_DELTA_STORAGE_KEY = 'muslim_shop_catalog_delta_v2';
const IDB_NAME = 'muslim_shop_idb_v2';
const IDB_VERSION = 1;
const IDB_STORE_KV = 'kv_store';
const IDB_BASE_CATALOG_KEY = 'base_catalog_v4';
const SNAPSHOT_CACHE_BUSTER = 'v4';

// Cloud Relay (CORS-enabled fallback when Firestore Free Tier daily read quota is reached)
const CLOUD_RELAY_APP_KEY = 'hbqgqy42';
const CLOUD_RELAY_POINTER_KEY = 'muslim_shop_delta_v4';

// Known accidental duplicate product IDs from earlier imports so they never appear in any browser cache
const DEFAULT_DELETED_PRODUCT_IDS = new Set<string>([
  'prod-1790267243324', // Duplicate Mahrem Altn Deva (MS-715)
  'prod-1790261400014', // Duplicate Розовая женщина (MS-766)
  'prod-1790236623971', // Duplicate Way Baraka (MS-449)
  'prod-1790242012611', // Duplicate Altn Deva Kids (MS-124)
]);

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
    const raw = localStorage.getItem(LOCAL_DELTA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const mergedDeletedIds = Array.from(
        new Set([
          ...Array.from(DEFAULT_DELETED_PRODUCT_IDS),
          ...(Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds : []),
        ])
      );
      const upsertedProds = { ...(parsed.upsertedProducts || {}) };
      for (const delId of DEFAULT_DELETED_PRODUCT_IDS) {
        delete upsertedProds[delId];
      }
      inMemoryDelta = {
        upsertedProducts: upsertedProds,
        deletedProductIds: mergedDeletedIds,
        upsertedCategories: parsed.upsertedCategories || {},
        deletedCategoryIds: Array.isArray(parsed.deletedCategoryIds) ? parsed.deletedCategoryIds : [],
        settings: parsed.settings || undefined,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
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
  idbSet('catalog_delta', delta).catch(() => {});
}

// Hydrate inMemoryDelta from IndexedDB on boot in case >20 products were added locally
idbGet<CatalogDelta>('catalog_delta')
  .then((idbDelta) => {
    if (idbDelta && idbDelta.upsertedProducts) {
      const current = getLocalCatalogDelta();
      const merged: CatalogDelta = {
        upsertedProducts: { ...idbDelta.upsertedProducts, ...current.upsertedProducts },
        deletedProductIds: Array.from(
          new Set([...(idbDelta.deletedProductIds || []), ...(current.deletedProductIds || [])])
        ),
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
        map.set(id, normalized);
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
          .filter((p) => p && p.id)
          .map((p) => {
            const norm = normalizeProduct(p.id, p);
            if (inMemoryProductImages.has(norm.id)) {
              norm.images = inMemoryProductImages.get(norm.id)!;
            }
            return norm;
          });
        return applyProductsDelta(normalized);
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
      if (prod && !mergedDeletedProds.includes(id)) {
        const existing = mergedUpsertedProds[id];
        const remoteNorm = normalizeProduct(id, prod);
        if (!existing || (remoteNorm.createdAt || '') >= (existing.createdAt || '')) {
          mergedUpsertedProds[id] = remoteNorm;
        }
      }
    }
  }
  // Remove any upserted product that was later deleted
  for (const delId of remoteDeletedProds) {
    if (!local.upsertedProducts[delId]) {
      delete mergedUpsertedProds[delId];
    }
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
 * Pushes compact delta metadata to CORS-enabled Cloud Relay so static hosts (muslimshop.kz)
 * and browsers experiencing temporary Firestore read quota limits still sync new products across all browsers/devices.
 */
async function pushDeltaToCloudRelay(deltaPayload: Record<string, any>): Promise<void> {
  try {
    // Strip oversized base64 strings > 80KB for relay URL/body safety while keeping full product data
    const relayProducts: Record<string, any> = {};
    if (deltaPayload.upsertedProducts && typeof deltaPayload.upsertedProducts === 'object') {
      for (const [id, p] of Object.entries(deltaPayload.upsertedProducts as Record<string, any>)) {
        if (!p) continue;
        const safeImgs = Array.isArray(p.images)
          ? p.images.map((img: string) =>
              typeof img === 'string' && img.startsWith('data:') && img.length > 80000
                ? 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'
                : img
            )
          : [];
        relayProducts[id] = { ...p, images: safeImgs };
      }
    }
    const compactPayload = JSON.stringify({
      upsertedProducts: relayProducts,
      deletedProductIds: deltaPayload.deletedProductIds || [],
      upsertedCategories: deltaPayload.upsertedCategories || {},
      deletedCategoryIds: deltaPayload.deletedCategoryIds || [],
      updatedAt: deltaPayload.updatedAt || new Date().toISOString(),
    });
    const encoded = encodeURIComponent(btoa(unescape(encodeURIComponent(compactPayload))));
    if (encoded.length < 28000) {
      await fetch(
        `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_POINTER_KEY}/${encoded}`,
        { method: 'POST' }
      );
    }
  } catch {
    // Ignore cloud relay network warnings
  }
}

async function pullDeltaFromCloudRelay(): Promise<CatalogDelta | null> {
  try {
    const res = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_POINTER_KEY}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return null;
    const text = (await res.text()).replace(/^"|"$/g, '').trim();
    if (!text) return null;
    const jsonStr = decodeURIComponent(escape(atob(decodeURIComponent(text))));
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      return mergeRemoteDeltaIntoLocal(parsed);
    }
  } catch {
    // Ignore cloud relay parse errors
  }
  return null;
}

/**
 * Syncs the current delta state to Firestore `settings/catalog_delta` (1 single document!)
 * and Cloud Relay so all other browsers/devices receive newly added/updated/deleted products!
 */
async function pushDeltaToFirestore(): Promise<void> {
  const delta = getLocalCatalogDelta();
  try {
    // Keep upsertedProducts in Firestore delta document under 750KB (most recent 12 products inline, plus all IDs)
    const allUpsertedList = Object.values(delta.upsertedProducts).sort((a, b) =>
      (b.createdAt || b.id).localeCompare(a.createdAt || a.id)
    );
    const recentInlineProducts: Record<string, any> = {};
    let approxBytes = 0;
    for (const p of allUpsertedList) {
      const cleanProd: Record<string, any> = {};
      for (const [k, v] of Object.entries(p)) {
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
      updatedAt: new Date().toISOString(),
    };

    pushDeltaToCloudRelay(payload).catch(() => {});

    const deltaRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    await setDoc(deltaRef, payload, { merge: true });
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
  // Pull any cross-browser Cloud Relay delta in parallel
  await pullDeltaFromCloudRelay().catch(() => null);

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

  // 3. Simultaneously listen to Firestore (`settings/catalog_delta`) for real-time cross-device updates
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
                  const pSnap = await getDoc(doc(db, PRODUCTS_COLLECTION, id));
                  if (pSnap.exists()) {
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
      unsubscribeDelta();
    };
  } catch {
    return () => {
      isUnsubscribed = true;
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
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const prod = normalizeProduct(snap.id, snap.data());
      recordLocalProductUpsert(prod);
      return prod;
    }
  } catch {}

  // 4. Query by 'sku' field in Firestore
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const qSku = query(colRef, where('sku', '==', cleanId));
    const snapSku = await getDocs(qSku);
    if (!snapSku.empty) {
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

  // 2. Persist to Firestore `products/{id}` AND `settings/catalog_delta` in parallel
  await Promise.all([
    (async () => {
      try {
        const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
        await setDoc(docRef, cleanData, { merge: true });
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
            await setDoc(docRef, cleanData, { merge: true });
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
        await setDoc(docRef, cleanData, { merge: true });
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
        await deleteDoc(docRef);
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
        await deleteDoc(docRef);
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
        await setDoc(docRef, config, { merge: true });
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

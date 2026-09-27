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

const LOCAL_DELTA_STORAGE_KEY = 'muslim_shop_catalog_delta_v2';
const IDB_NAME = 'muslim_shop_idb_v2';
const IDB_VERSION = 1;
const IDB_STORE_KV = 'kv_store';

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
    deletedProductIds: [],
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
      inMemoryDelta = {
        upsertedProducts: parsed.upsertedProducts || {},
        deletedProductIds: Array.isArray(parsed.deletedProductIds) ? parsed.deletedProductIds : [],
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
  const deletedSet = new Set(delta.deletedProductIds || []);
  const map = new Map<string, Product>();

  for (const p of baseProducts) {
    if (p && p.id && !deletedSet.has(p.id)) {
      map.set(p.id, normalizeProduct(p.id, p));
    }
  }

  if (delta.upsertedProducts) {
    for (const [id, prod] of Object.entries(delta.upsertedProducts)) {
      if (prod && !deletedSet.has(id)) {
        map.set(id, normalizeProduct(id, prod));
      }
    }
  }

  return Array.from(map.values());
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
 * Syncs the current delta state to Firestore `settings/catalog_delta` (1 single document!)
 * so all other browsers/devices receive newly added/updated/deleted products using only 1 read unit!
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

    const deltaRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    await setDoc(
      deltaRef,
      {
        upsertedProducts: recentInlineProducts,
        upsertedProductIds: allUpsertedList.map((p) => p.id),
        deletedProductIds: delta.deletedProductIds,
        upsertedCategories: cleanCategories,
        deletedCategoryIds: delta.deletedCategoryIds,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
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
 * Loads the base catalog at maximum speed:
 * 1. Instant IndexedDB cache (~20ms on repeat visits/refreshes!)
 * 2. Static CDN-cached `./catalog-snapshot.json` (on GitHub Pages / muslimshop.kz) or `/api/catalog` (on server)
 * Always merges local + cloud delta (`applyProductsDelta` / `applyCategoriesDelta`) so new products never vanish!
 */
export async function fetchUniversalCatalog(): Promise<SharedCatalogPayload | null> {
  if (lastResolvedCatalog && Date.now() - lastResolvedAt < 15000) {
    return {
      products: applyProductsDelta(lastResolvedCatalog.products),
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
      const cached = await idbGet<SharedCatalogPayload>('base_catalog_v2');
      if (cached && Array.isArray(cached.products) && cached.products.length > 0) {
        lastResolvedCatalog = cached;
        lastResolvedAt = Date.now();
        return {
          products: applyProductsDelta(cached.products),
          categories: applyCategoriesDelta(cached.categories || []),
          settings: { ...(cached.settings || {}), ...(getLocalCatalogDelta().settings || {}) },
        };
      }
    } catch {}

    // 2. If not on static GitHub Pages, try Server API (/api/catalog)
    if (!isStaticGitHubPagesHost()) {
      try {
        const res = await fetch('/api/catalog', {
          method: 'GET',
          headers: { Accept: 'application/json' },
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
              idbSet('base_catalog_v2', basePayload).catch(() => {});
              return {
                products: applyProductsDelta(basePayload.products),
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

    // 3. Load Static Snapshot (./catalog-snapshot.json) with browser/CDN HTTP cache enabled for fast loading
    try {
      const baseUrl =
        typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL
          ? (import.meta as any).env.BASE_URL
          : './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const snapRes = await fetch(`${cleanBase}catalog-snapshot.json`, {
        method: 'GET',
        cache: 'default',
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
          idbSet('base_catalog_v2', basePayload).catch(() => {});
          return {
            products: applyProductsDelta(basePayload.products),
            categories: applyCategoriesDelta(basePayload.categories),
            settings: { ...basePayload.settings, ...(getLocalCatalogDelta().settings || {}) },
          };
        }
      }
    } catch {
      // Ignore
    }

    // 4. Even if offline and only local delta exists, return local delta products
    const localDelta = getLocalCatalogDelta();
    const deltaProducts = Object.values(localDelta.upsertedProducts);
    if (deltaProducts.length > 0) {
      return {
        products: deltaProducts,
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
    const updatedBase: SharedCatalogPayload = {
      products: applyProductsDelta(lastResolvedCatalog.products),
      categories: applyCategoriesDelta(lastResolvedCatalog.categories),
      settings: { ...lastResolvedCatalog.settings, ...(getLocalCatalogDelta().settings || {}) },
    };
    lastResolvedCatalog = updatedBase;
    idbSet('base_catalog_v2', updatedBase).catch(() => {});
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
 * Real-time subscription to products with:
 * - Instant IndexedDB / Snapshot load (~20-300ms)
 * - Guaranteed persistence of newly added/edited/deleted products via Local + Cloud Delta (1 read unit!)
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
      onSuccess(merged);
    }
  };

  // 1. Immediately load base catalog from IndexedDB / Snapshot & merge any local delta
  fetchUniversalCatalog()
    .then((catalog) => {
      if (isUnsubscribed) return;
      if (catalog && catalog.products.length > 0) {
        currentBaseProducts = catalog.products;
        emitMerged();
      }
    })
    .catch((err) => {
      if (!isUnsubscribed && onError) onError(err);
    });

  // 2. Subscribe to the single `settings/catalog_delta` document in Firestore (costs only 1 read unit!)
  // so newly added, edited, or deleted products sync across all browsers without exhausting daily read quota.
  try {
    const deltaDocRef = doc(db, SETTINGS_COLLECTION, CATALOG_DELTA_DOC_ID);
    const unsubscribeDelta = onSnapshot(
      deltaDocRef,
      async (docSnap) => {
        if (isUnsubscribed) return;
        if (docSnap.exists()) {
          const remoteData = docSnap.data();
          const mergedDelta = mergeRemoteDeltaIntoLocal(remoteData);

          // If there are any upsertedProductIds in Firestore that aren't in our local delta yet, fetch only those individual docs
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
        // If Firestore daily read quota is temporarily reached, emitMerged() still has all base + local delta products!
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

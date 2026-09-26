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

// ================= MULTI-SOURCE UNIVERSAL CATALOG LOADER =================

interface SharedCatalogPayload {
  products: Product[];
  categories: Category[];
  settings: Partial<StoreConfig>;
}

let inFlightCatalogPromise: Promise<SharedCatalogPayload | null> | null = null;
let lastResolvedCatalog: SharedCatalogPayload | null = null;
let lastResolvedAt = 0;

/**
 * Parses a Firestore REST Value object into plain JS value
 */
function parseFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    const values = val.arrayValue?.values;
    return Array.isArray(values) ? values.map(parseFirestoreRestValue) : [];
  }
  if ('mapValue' in val) {
    const fields = val.mapValue?.fields || {};
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = parseFirestoreRestValue(v);
    }
    return out;
  }
  return undefined;
}

function parseFirestoreRestDocument(docObj: any): { id: string; data: Record<string, any> } | null {
  if (!docObj || !docObj.name) return null;
  const id = docObj.name.split('/').pop() || '';
  const fields = docObj.fields || {};
  const data: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields)) {
    data[k] = parseFirestoreRestValue(v);
  }
  return { id, data };
}

/**
 * Direct HTTPS REST query to Firestore (:runQuery) — bypasses WebChannel/IndexedDB issues in strict browsers
 */
async function fetchCollectionViaRestApi(collectionId: string): Promise<Array<{ id: string; data: any }>> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIRESTORE_DB_ID}/documents:runQuery?key=${FIREBASE_CONFIG.apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        limit: 500,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`Firestore REST HTTP ${res.status}`);
  }
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  const results: Array<{ id: string; data: any }> = [];
  for (const row of rows) {
    if (row.document) {
      const parsed = parseFirestoreRestDocument(row.document);
      if (parsed) results.push(parsed);
    }
  }
  return results;
}

/**
 * Fetches universal catalog from:
 * 1. /api/catalog (Express server endpoint — works across all browsers/devices/incognito)
 * 2. Direct Firestore REST API (:runQuery) — works on static hosts like GitHub Pages
 * 3. ./catalog-snapshot.json — static fallback bundled in public/
 */
export async function fetchUniversalCatalog(): Promise<SharedCatalogPayload | null> {
  if (lastResolvedCatalog && Date.now() - lastResolvedAt < 10000) {
    return lastResolvedCatalog;
  }
  if (inFlightCatalogPromise) {
    return inFlightCatalogPromise;
  }

  inFlightCatalogPromise = (async (): Promise<SharedCatalogPayload | null> => {
    // 1. Try Server API (/api/catalog)
    try {
      const res = await fetch(`/api/catalog?_t=${Date.now()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data && Array.isArray(data.products) && data.products.length > 0) {
            const payload: SharedCatalogPayload = {
              products: data.products.map((p: any) => normalizeProduct(p.id, p)),
              categories: Array.isArray(data.categories)
                ? data.categories.map((c: any) => normalizeCategory(c.id, c)).sort((a: Category, b: Category) => a.order - b.order)
                : [],
              settings: data.settings || {},
            };
            lastResolvedCatalog = payload;
            lastResolvedAt = Date.now();
            return payload;
          }
        }
      }
    } catch {
      // Server API might not exist on static hosting (e.g. GitHub Pages); proceed to next source
    }

    // 2. Try Direct Firestore REST API (:runQuery)
    try {
      const [prodRows, catRows, settingsRows] = await Promise.all([
        fetchCollectionViaRestApi(PRODUCTS_COLLECTION),
        fetchCollectionViaRestApi(CATEGORIES_COLLECTION),
        fetchCollectionViaRestApi(SETTINGS_COLLECTION),
      ]);
      if (prodRows.length > 0) {
        const generalSetting = settingsRows.find((r) => r.id === 'general')?.data || {};
        const payload: SharedCatalogPayload = {
          products: prodRows.map((r) => normalizeProduct(r.id, r.data)),
          categories: catRows
            .map((r) => normalizeCategory(r.id, r.data))
            .sort((a, b) => a.order - b.order),
          settings: generalSetting,
        };
        lastResolvedCatalog = payload;
        lastResolvedAt = Date.now();
        return payload;
      }
    } catch {
      // Proceed to static snapshot fallback
    }

    // 3. Try Static Snapshot (./catalog-snapshot.json)
    try {
      const baseUrl = typeof import.meta !== 'undefined' && (import.meta as any).env?.BASE_URL
        ? (import.meta as any).env.BASE_URL
        : './';
      const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      const snapRes = await fetch(`${cleanBase}catalog-snapshot.json?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (snapRes.ok) {
        const data = await snapRes.json();
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          const payload: SharedCatalogPayload = {
            products: data.products.map((p: any) => normalizeProduct(p.id, p)),
            categories: Array.isArray(data.categories)
              ? data.categories.map((c: any) => normalizeCategory(c.id, c)).sort((a: Category, b: Category) => a.order - b.order)
              : [],
            settings: data.settings || {},
          };
          lastResolvedCatalog = payload;
          lastResolvedAt = Date.now();
          return payload;
        }
      }
    } catch {
      // Ignore
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
  lastResolvedCatalog = null;
  lastResolvedAt = 0;
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
 * Real-time subscription to products collection with universal multi-browser fallback
 */
export function subscribeToProducts(
  onSuccess: (products: Product[]) => void,
  onError?: (error: Error) => void
) {
  let isUnsubscribed = false;
  let hasDeliveredProducts = false;

  const deliver = (items: Product[]) => {
    if (isUnsubscribed) return;
    if (items.length > 0) {
      hasDeliveredProducts = true;
    }
    onSuccess(items);
  };

  // 1. Immediately load from Universal Catalog API (/api/catalog -> REST -> Snapshot)
  // so every browser (Chrome, Yandex, Safari, Firefox, Edge, iOS, Android, Incognito) gets products fast
  fetchUniversalCatalog()
    .then((catalog) => {
      if (!isUnsubscribed && catalog && catalog.products.length > 0 && !hasDeliveredProducts) {
        deliver(catalog.products);
      }
    })
    .catch(() => {});

  // 2. Also attach real-time Firestore listener for live updates
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        if (isUnsubscribed) return;
        const items: Product[] = [];
        snapshot.forEach((docSnap) => {
          items.push(normalizeProduct(docSnap.id, docSnap.data()));
        });
        if (items.length > 0) {
          deliver(items);
        } else if (!hasDeliveredProducts) {
          // If Firestore returned empty unexpectedly, check universal fallback
          fetchUniversalCatalog().then((catalog) => {
            if (!isUnsubscribed && catalog && catalog.products.length > 0) {
              deliver(catalog.products);
            } else {
              deliver([]);
            }
          });
        }
      },
      async (err) => {
        if (isUnsubscribed) return;
        const fallback = await fetchUniversalCatalog();
        if (fallback && fallback.products.length > 0) {
          deliver(fallback.products);
          return;
        }
        if (onError) onError(err);
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
 * Directly fetch a single product by Document ID or SKU.
 * Works across Server API, Firestore SDK, and Universal Catalog fallback.
 */
export async function getProductById(targetId: string): Promise<Product | null> {
  if (!targetId || typeof targetId !== 'string') return null;
  const cleanId = targetId.trim();

  // 1. Try fast Server API lookup (/api/products/:id)
  try {
    const res = await fetch(`/api/products/${encodeURIComponent(cleanId)}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.product) {
        return normalizeProduct(data.product.id || cleanId, data.product);
      }
    }
  } catch {}

  // 2. Direct document lookup by Document ID in Firestore
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return normalizeProduct(snap.id, snap.data());
    }
  } catch {}

  // 3. Query by 'sku' field in Firestore
  try {
    const colRef = collection(db, PRODUCTS_COLLECTION);
    const qSku = query(colRef, where('sku', '==', cleanId));
    const snapSku = await getDocs(qSku);
    if (!snapSku.empty) {
      const docSnap = snapSku.docs[0];
      return normalizeProduct(docSnap.id, docSnap.data());
    }
  } catch {}

  // 4. Check Universal Catalog fallback
  try {
    const catalog = await fetchUniversalCatalog();
    if (catalog && catalog.products.length > 0) {
      const lower = cleanId.toLowerCase();
      const found = catalog.products.find(
        (p) =>
          p.id === cleanId ||
          p.id.toLowerCase() === lower ||
          (p.sku && p.sku.toLowerCase() === lower)
      );
      if (found) return found;
    }
  } catch {}

  return null;
}

/**
 * Real-time subscription to categories collection with universal multi-browser fallback
 */
export function subscribeToCategories(
  onSuccess: (categories: Category[]) => void,
  onError?: (error: Error) => void
) {
  let isUnsubscribed = false;
  let hasDelivered = false;

  const deliver = (items: Category[]) => {
    if (isUnsubscribed) return;
    if (items.length > 0) {
      hasDelivered = true;
      onSuccess(items);
    }
  };

  fetchUniversalCatalog()
    .then((catalog) => {
      if (!isUnsubscribed && catalog && catalog.categories.length > 0 && !hasDelivered) {
        deliver(catalog.categories);
      }
    })
    .catch(() => {});

  try {
    const colRef = collection(db, CATEGORIES_COLLECTION);
    const unsubscribeFirestore = onSnapshot(
      colRef,
      (snapshot) => {
        if (isUnsubscribed) return;
        const items: Category[] = [];
        snapshot.forEach((docSnap) => {
          items.push(normalizeCategory(docSnap.id, docSnap.data()));
        });
        items.sort((a, b) => a.order - b.order);
        if (items.length > 0) {
          deliver(items);
        }
      },
      async (err) => {
        if (isUnsubscribed) return;
        const fallback = await fetchUniversalCatalog();
        if (fallback && fallback.categories.length > 0) {
          deliver(fallback.categories);
          return;
        }
        if (onError) onError(err);
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
 * Real-time subscription to store settings with universal multi-browser fallback
 */
export function subscribeToSettings(
  initialConfig: StoreConfig,
  onSuccess: (config: StoreConfig) => void,
  onError?: (error: Error) => void
) {
  let isUnsubscribed = false;
  let hasDelivered = false;

  fetchUniversalCatalog()
    .then((catalog) => {
      if (
        !isUnsubscribed &&
        !hasDelivered &&
        catalog &&
        catalog.settings &&
        Object.keys(catalog.settings).length > 0
      ) {
        hasDelivered = true;
        onSuccess({ ...initialConfig, ...catalog.settings });
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
          hasDelivered = true;
          const data = docSnap.data();
          const merged = {
            ...initialConfig,
            ...data,
          };
          onSuccess(merged);
        }
      },
      async (err) => {
        if (isUnsubscribed) return;
        const fallback = await fetchUniversalCatalog();
        if (fallback && fallback.settings && Object.keys(fallback.settings).length > 0) {
          onSuccess({ ...initialConfig, ...fallback.settings });
          return;
        }
        if (onError) onError(err);
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
 * Create or update product in Firestore & sync server catalog cache
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(product)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore saveProduct notice:', err);
  }
  await syncServerCatalog({ action: 'saveProduct', product: cleanData });
}

/**
 * Create or update category in Firestore & sync server catalog cache
 */
export async function saveCategoryToFirestore(category: Category): Promise<void> {
  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(category)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, category.id);
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Firestore saveCategory notice:', err);
  }
  await syncServerCatalog({ action: 'saveCategory', category: cleanData });
}

/**
 * Delete category from Firestore & sync server catalog cache
 */
export async function deleteCategoryFromFirestore(categoryId: string): Promise<void> {
  try {
    const docRef = doc(db, CATEGORIES_COLLECTION, categoryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteCategory notice:', err);
  }
  await syncServerCatalog({ action: 'deleteCategory', categoryId });
}

/**
 * Delete product from Firestore & sync server catalog cache
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  try {
    const docRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore deleteProduct notice:', err);
  }
  await syncServerCatalog({ action: 'deleteProduct', productId });
}

/**
 * Save store settings to Firestore & sync server catalog cache
 */
export async function saveSettingsToFirestore(config: StoreConfig): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, 'general');
    await setDoc(docRef, config, { merge: true });
  } catch (err) {
    console.warn('Firestore saveSettings notice:', err);
  }
  await syncServerCatalog({ action: 'saveSettings', settings: config });
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

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
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
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
    images: Array.isArray(data.images) && data.images.length > 0
      ? data.images
      : ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'],
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
 * Real-time subscription to products collection
 */
export function subscribeToProducts(
  onSuccess: (products: Product[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, PRODUCTS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push(normalizeProduct(docSnap.id, docSnap.data()));
      });
      onSuccess(items);
    },
    (err) => {
      console.error('Firestore subscribeToProducts error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to categories collection
 */
export function subscribeToCategories(
  onSuccess: (categories: Category[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, CATEGORIES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Category[] = [];
      snapshot.forEach((docSnap) => {
        items.push(normalizeCategory(docSnap.id, docSnap.data()));
      });
      // Sort by order
      items.sort((a, b) => a.order - b.order);
      onSuccess(items);
    },
    (err) => {
      console.error('Firestore subscribeToCategories error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Real-time subscription to store settings
 */
export function subscribeToSettings(
  initialConfig: StoreConfig,
  onSuccess: (config: StoreConfig) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, SETTINGS_COLLECTION, 'general');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onSuccess({
          ...initialConfig,
          ...data,
        });
      }
    },
    (err) => {
      console.error('Firestore subscribeToSettings error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Create or update product in Firestore
 */
export async function saveProductToFirestore(product: Product): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, product.id);
  const cleanData: Record<string, any> = {};
  for (const [key, val] of Object.entries(product)) {
    if (val !== undefined) {
      cleanData[key] = val;
    }
  }
  await setDoc(docRef, cleanData, { merge: true });
}

/**
 * Delete product from Firestore
 */
export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const docRef = doc(db, PRODUCTS_COLLECTION, productId);
  await deleteDoc(docRef);
}

/**
 * Save store settings to Firestore
 */
export async function saveSettingsToFirestore(config: StoreConfig): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, 'general');
  await setDoc(docRef, config, { merge: true });
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

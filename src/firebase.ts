import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  memoryLocalCache,
  setLogLevel,
  doc,
  getDocFromServer,
} from 'firebase/firestore';

// Suppress noisy internal WebChannel retry warnings when operating on mobile or restrictive networks
try {
  setLogLevel('silent');
} catch {
  // ignore
}

export const FIREBASE_CONFIG = {
  projectId: 'muslim-shop-55c12',
  appId: '1:716225520823:web:7a82d8b680dd7251489932',
  apiKey: 'AIzaSyCCNwtzhDTBPB8GU_Ls7ogvN5xyUDOez3M',
  authDomain: 'muslim-shop-55c12.firebaseapp.com',
  storageBucket: 'muslim-shop-55c12.firebasestorage.app',
  messagingSenderId: '716225520823',
};

export const FIRESTORE_DB_ID = 'ai-studio-muslimshop-6c5697f5-1412-4eb6-8d95-aa2cc7a70c7b';

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();

/**
 * Initialize Firestore with:
 * 1. Dedicated database ID
 * 2. In-memory cache (memoryLocalCache) so Safari Private/Incognito, Yandex Browser, Firefox,
 *    and mobile WebViews never hang or crash on 14MB IndexedDB transactions or WebLocks
 * 3. Auto-detect long polling (prevents WebChannel/WebSocket disconnects on mobile or restrictive networks)
 */
export const db = initializeFirestore(
  app,
  {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
  },
  FIRESTORE_DB_ID
);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore operating in fallback mode.');
    }
  }
}
testConnection();

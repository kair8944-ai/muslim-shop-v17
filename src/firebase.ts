import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configuration loaded from firebase-applet-config.json
const firebaseConfig = {
  projectId: 'muslim-shop-55c12',
  appId: '1:716225520823:web:7a82d8b680dd7251489932',
  apiKey: 'AIzaSyCCNwtzhDTBPB8GU_Ls7ogvN5xyUDOez3M',
  authDomain: 'muslim-shop-55c12.firebaseapp.com',
  storageBucket: 'muslim-shop-55c12.firebasestorage.app',
  messagingSenderId: '716225520823',
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore (connects to default database where products, categories and settings reside)
export const db = getFirestore(app);

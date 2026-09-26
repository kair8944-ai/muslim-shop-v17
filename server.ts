import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Universal CORS middleware for cross-browser and cross-origin access
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// ================= FIRESTORE SERVER-SIDE CATALOG CACHE =================
const FIREBASE_CONFIG = {
  projectId: 'muslim-shop-55c12',
  appId: '1:716225520823:web:7a82d8b680dd7251489932',
  apiKey: 'AIzaSyCCNwtzhDTBPB8GU_Ls7ogvN5xyUDOez3M',
  authDomain: 'muslim-shop-55c12.firebaseapp.com',
  storageBucket: 'muslim-shop-55c12.firebasestorage.app',
  messagingSenderId: '716225520823',
};
const FIRESTORE_DB_ID = 'ai-studio-muslimshop-6c5697f5-1412-4eb6-8d95-aa2cc7a70c7b';

const firebaseApp = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();
const serverDb = getFirestore(firebaseApp, FIRESTORE_DB_ID);

const SNAPSHOT_FILE_PATH = path.join(process.cwd(), 'public', 'catalog-snapshot.json');

interface CatalogPayload {
  updatedAt: string;
  productsCount: number;
  categoriesCount: number;
  products: any[];
  categories: any[];
  settings: Record<string, any>;
}

let catalogCache: CatalogPayload = {
  updatedAt: new Date(0).toISOString(),
  productsCount: 0,
  categoriesCount: 0,
  products: [],
  categories: [],
  settings: {},
};

let catalogJsonBuffer: Buffer | null = null;
let catalogGzipBuffer: Buffer | null = null;

function rebuildCatalogBuffers(payload: CatalogPayload, saveToDisk: boolean = false) {
  catalogCache = payload;
  const rawJson = JSON.stringify(payload);
  catalogJsonBuffer = Buffer.from(rawJson, 'utf-8');
  try {
    catalogGzipBuffer = zlib.gzipSync(catalogJsonBuffer, { level: 6 });
  } catch {
    catalogGzipBuffer = null;
  }

  if (saveToDisk) {
    try {
      fs.mkdirSync(path.dirname(SNAPSHOT_FILE_PATH), { recursive: true });
      fs.writeFileSync(SNAPSHOT_FILE_PATH, rawJson);
    } catch (e) {
      console.warn('Could not persist catalog snapshot to disk:', e);
    }
  }
}

// 1. Load initial snapshot from disk immediately at boot (0ms startup latency)
try {
  if (fs.existsSync(SNAPSHOT_FILE_PATH)) {
    const raw = fs.readFileSync(SNAPSHOT_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.products)) {
      rebuildCatalogBuffers(
        {
          updatedAt: parsed.updatedAt || new Date().toISOString(),
          productsCount: parsed.products.length,
          categoriesCount: Array.isArray(parsed.categories) ? parsed.categories.length : 0,
          products: parsed.products,
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          settings: parsed.settings || {},
        },
        false
      );
      console.log(`Loaded initial catalog snapshot (${parsed.products.length} products, ${parsed.categories?.length || 0} categories)`);
    }
  }
} catch (err) {
  console.warn('Initial catalog snapshot read notice:', err);
}

// 2. Refresh catalog from live Firestore database
let isRefreshingCatalog = false;
async function refreshCatalogFromFirestore(): Promise<boolean> {
  if (isRefreshingCatalog) return false;
  isRefreshingCatalog = true;
  try {
    const [prodSnap, catSnap, settingsSnap] = await Promise.all([
      getDocs(collection(serverDb, 'products')),
      getDocs(collection(serverDb, 'categories')),
      getDoc(doc(serverDb, 'settings', 'general')),
    ]);

    const products: any[] = [];
    prodSnap.forEach((d) => {
      products.push({ id: d.id, ...d.data() });
    });

    const categories: any[] = [];
    catSnap.forEach((d) => {
      categories.push({ id: d.id, ...d.data() });
    });
    categories.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));

    const settings = settingsSnap.exists() ? settingsSnap.data() : catalogCache.settings;

    if (products.length > 0) {
      rebuildCatalogBuffers(
        {
          updatedAt: new Date().toISOString(),
          productsCount: products.length,
          categoriesCount: categories.length,
          products,
          categories: categories.length > 0 ? categories : catalogCache.categories,
          settings: settings || catalogCache.settings,
        },
        true
      );
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn('Background Firestore sync notice (using warm server cache):', err?.message || err);
    return false;
  } finally {
    isRefreshingCatalog = false;
  }
}

// Trigger initial Firestore sync on server boot and every 3 minutes
refreshCatalogFromFirestore();
setInterval(() => {
  refreshCatalogFromFirestore();
}, 3 * 60 * 1000);

// Lazy Gemini AI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Failed to initialize GoogleGenAI:', e);
    }
  }
  return aiClient;
}

// In-memory server cache for translations
const serverTranslationCache = new Map<string, string>();
let geminiCoolDownUntil = 0;

function isGeminiTemporaryError(err: any): boolean {
  if (!err) return false;
  const msg = (err?.message || typeof err === 'string' ? String(err) : '').toLowerCase();
  const status = err?.status || err?.code;
  return (
    status === 429 ||
    status === 503 ||
    status === 'RESOURCE_EXHAUSTED' ||
    status === 'UNAVAILABLE' ||
    msg.includes('429') ||
    msg.includes('503') ||
    msg.includes('quota') ||
    msg.includes('resource_exhausted') ||
    msg.includes('rate-limits') ||
    msg.includes('high demand')
  );
}

const ISLAMIC_ECOMMERCE_TERM_MAP: [RegExp, string][] = [
  [/\bчерн(ый|ого|ому|ым|ом)\s+тмин(а|у|ом|е)?\b/gi, 'қара зере'],
  [/\bмасл(о|а|ом|е)\s+черного\s+тмина\b/gi, 'қара зере майы'],
  [/\bқара\s+химия(лық)?\s+май(ы)?\b/gi, 'қара зере майы'],
  [/\bқара\s+кәмпит\s+майы\b/gi, 'қара зере майы'],
  [/\bсуық\s+басылған\b/gi, 'суық сығымдалған'],
  [/\bхолодн(ого|ый)\s+отжим(а)?\b/gi, 'суық сығымдалған'],
  [/\bперв(ый|ого)\s+холодн(ый|ого)\s+отжим(а)?\b/gi, 'алғашқы суық сығымдалған'],
  [/\bспособ\s+применения\b/gi, 'Қолдану тәсілі:'],
  [/\bспособы\s+применения\b/gi, 'Қолдану тәсілдері:'],
  [/\bпротивопоказания\b/gi, 'Қолдануға болмайтын жағдайлар:'],
  [/\bсостав\b/gi, 'Құрамы:'],
  [/\bсрок\s+годности\b/gi, 'Жарамдылық мерзімі:'],
  [/\bусловия\s+хранения\b/gi, 'Сақтау шарттары:'],
  [/\bстрана\s+производитель\b/gi, 'Өндіруші ел:'],
  [/\bстрана\s+производства\b/gi, 'Өндіруші ел:'],
  [/\bобъем\b/gi, 'Көлемі:'],
  [/\bвес\b/gi, 'Салмағы:'],
  [/\bукрепляет\s+иммунитет\b/gi, 'иммунитетті нығайтады'],
];

function refineKazakhTranslation(text: string): string {
  if (!text) return '';
  let refined = text;
  for (const [regex, replacement] of ISLAMIC_ECOMMERCE_TERM_MAP) {
    refined = refined.replace(regex, replacement);
  }
  return refined;
}

async function fallbackTranslateText(text: string): Promise<string> {
  if (!text || !text.trim()) return '';

  const cacheKey = `my_tr_${text.trim()}`;
  if (serverTranslationCache.has(cacheKey)) {
    return serverTranslationCache.get(cacheKey)!;
  }

  const lines = text.split('\n');
  const translatedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      translatedLines.push('');
      continue;
    }

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=ru|kk`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data: any = await res.json();
        if (data.responseData?.translatedText && data.responseStatus === 200) {
          translatedLines.push(data.responseData.translatedText);
          continue;
        }
      }
    } catch {
      // ignore network errors per chunk
    }

    translatedLines.push(trimmed);
  }

  const result = refineKazakhTranslation(translatedLines.join('\n'));
  if (result && result !== text) {
    serverTranslationCache.set(cacheKey, result);
    return result;
  }

  return text;
}

async function translateWithAI(text: string, contextHint: string = 'product details'): Promise<string> {
  if (!text || !text.trim()) return '';

  const cacheKey = `ai_tr_${text.trim()}`;
  if (serverTranslationCache.has(cacheKey)) {
    return serverTranslationCache.get(cacheKey)!;
  }

  const ai = getGenAI();
  if (ai && Date.now() >= geminiCoolDownUntil) {
    try {
      const prompt = `You are an expert Kazakh translator for an Islamic & health online shop in Kazakhstan.
Translate the following Russian text into natural, accurate, and fluent Kazakh (қазақ тілі).

Context: ${contextHint}

CRITICAL RULES:
1. Preserve all markdown styling: bold text like **сөз**, bullet points (•, -, *), line breaks, and all emojis (🔥, 🎯, ⚡️, 🏋️, etc.).
2. Keep brand names, trademarks, English model names, and Latin terms unchanged (e.g., "DR'S Secret Men's Bio Honey", "Bio Honey", "Solgar", "Hemani", "SPF-50").
3. Do not add intro/outro greetings, quotes, or markdown code block markers. Return ONLY the translated Kazakh text.

Russian text:
${text}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const translated = response.text ? response.text.trim() : '';
      if (translated && translated !== text) {
        const refined = refineKazakhTranslation(translated);
        serverTranslationCache.set(cacheKey, refined);
        return refined;
      }
    } catch (err: any) {
      if (isGeminiTemporaryError(err)) {
        geminiCoolDownUntil = Date.now() + 45000;
      }
    }
  }

  return await fallbackTranslateText(text);
}

async function translateProductWithAI(product: {
  titleRu?: string;
  descriptionRu?: string;
  specsRu?: string;
  benefitsRu?: string[];
  howToUseRu?: string;
}): Promise<{
  titleKz: string;
  descriptionKz: string;
  specsKz: string;
  benefitsKz?: string[];
  howToUseKz?: string;
}> {
  const titleRu = product.titleRu?.trim() || '';
  const descriptionRu = product.descriptionRu?.trim() || '';
  const specsRu = product.specsRu?.trim() || '';
  const benefitsRu = Array.isArray(product.benefitsRu) ? product.benefitsRu.filter(Boolean) : [];
  const howToUseRu = product.howToUseRu?.trim() || '';

  if (!titleRu && !descriptionRu && !specsRu && benefitsRu.length === 0 && !howToUseRu) {
    return { titleKz: '', descriptionKz: '', specsKz: '', benefitsKz: [], howToUseKz: '' };
  }

  const ai = getGenAI();
  if (ai && Date.now() >= geminiCoolDownUntil) {
    try {
      const prompt = `You are an expert Kazakh translator for an Islamic & health online shop in Kazakhstan.
Translate the following Russian product data into natural, persuasive Kazakh (қазақ тілі).

CRITICAL REQUIREMENTS:
- Translate Russian text to authentic Kazakh using appropriate Kazakh alphabet (ә, і, ң, ғ, ү, ұ, қ, ө, һ).
- Preserve all emojis (🔥, 🚀, 🎯, ⚡️, 🏋️, etc.), line breaks, bullet points (•), and markdown formatting (**bold**).
- Keep English and Latin brand names, trademarks, numbers, and SKUs exactly as-is (e.g., "DR'S Secret Men's Bio Honey", "Hemani", "Solgar").
- Return a strict JSON object with keys:
  "titleKz" (string),
  "descriptionKz" (string),
  "specsKz" (string),
  "benefitsKz" (array of strings),
  "howToUseKz" (string)

Product data to translate:
${JSON.stringify({ titleRu, descriptionRu, specsRu, benefitsRu, howToUseRu }, null, 2)}`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      } catch {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });
      }

      const rawText = response.text?.trim() || '';
      const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanJson);

      const titleKz = refineKazakhTranslation(parsed.titleKz || (titleRu ? await fallbackTranslateText(titleRu) : ''));
      const descriptionKz = refineKazakhTranslation(parsed.descriptionKz || (descriptionRu ? await fallbackTranslateText(descriptionRu) : ''));
      const specsKz = refineKazakhTranslation(parsed.specsKz || (specsRu ? await fallbackTranslateText(specsRu) : ''));
      const howToUseKz = refineKazakhTranslation(parsed.howToUseKz || (howToUseRu ? await fallbackTranslateText(howToUseRu) : ''));
      const benefitsKz = Array.isArray(parsed.benefitsKz)
        ? parsed.benefitsKz.map((b: string) => refineKazakhTranslation(b))
        : benefitsRu;

      return { titleKz, descriptionKz, specsKz, benefitsKz, howToUseKz };
    } catch (e: any) {
      if (isGeminiTemporaryError(e)) {
        geminiCoolDownUntil = Date.now() + 5000;
      }
    }
  }

  const [titleKz, descriptionKz, specsKz, howToUseKz] = await Promise.all([
    titleRu ? fallbackTranslateText(titleRu) : Promise.resolve(''),
    descriptionRu ? fallbackTranslateText(descriptionRu) : Promise.resolve(''),
    specsRu ? fallbackTranslateText(specsRu) : Promise.resolve(''),
    howToUseRu ? fallbackTranslateText(howToUseRu) : Promise.resolve(''),
  ]);

  const benefitsKz = await Promise.all(benefitsRu.map((b) => fallbackTranslateText(b)));

  return {
    titleKz: refineKazakhTranslation(titleKz),
    descriptionKz: refineKazakhTranslation(descriptionKz),
    specsKz: refineKazakhTranslation(specsKz),
    benefitsKz: benefitsKz.map(refineKazakhTranslation),
    howToUseKz: refineKazakhTranslation(howToUseKz),
  };
}

// ================= API ENDPOINTS =================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    productsCount: catalogCache.productsCount,
    categoriesCount: catalogCache.categoriesCount,
  });
});

// Universal Catalog API: delivers products, categories, and settings to ANY browser or device
app.get('/api/catalog', async (req, res) => {
  try {
    if (catalogCache.products.length === 0) {
      await refreshCatalogFromFirestore();
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (catalogGzipBuffer && typeof acceptEncoding === 'string' && acceptEncoding.includes('gzip')) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.send(catalogGzipBuffer);
      return;
    }

    if (catalogJsonBuffer) {
      res.send(catalogJsonBuffer);
      return;
    }

    res.json(catalogCache);
  } catch (err: any) {
    console.error('Error serving /api/catalog:', err);
    res.status(500).json({ error: 'Failed to load catalog' });
  }
});

// Single product lookup by ID or SKU (for direct WhatsApp / Instagram links)
app.get('/api/products/:id', async (req, res) => {
  try {
    const targetId = (req.params.id || '').trim().toLowerCase();
    if (catalogCache.products.length === 0) {
      await refreshCatalogFromFirestore();
    }
    const found = catalogCache.products.find(
      (p) =>
        p.id === req.params.id ||
        (p.id && p.id.toLowerCase() === targetId) ||
        (p.sku && p.sku.toLowerCase() === targetId)
    );
    if (found) {
      res.setHeader('Cache-Control', 'no-store');
      return res.json({ product: found });
    }
    return res.status(404).json({ error: 'Product not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Lookup error' });
  }
});

// Admin mutation sync endpoint: keeps server cache & static snapshot 100% up-to-date immediately
app.post('/api/catalog/sync', async (req, res) => {
  try {
    const { action, product, productId, category, categoryId, settings } = req.body || {};
    let changed = false;

    let nextProducts = [...catalogCache.products];
    let nextCategories = [...catalogCache.categories];
    let nextSettings = { ...catalogCache.settings };

    if (action === 'saveProduct' && product && product.id) {
      const idx = nextProducts.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        nextProducts[idx] = { ...nextProducts[idx], ...product };
      } else {
        nextProducts = [product, ...nextProducts];
      }
      changed = true;
    } else if (action === 'deleteProduct' && productId) {
      nextProducts = nextProducts.filter((p) => p.id !== productId);
      changed = true;
    } else if (action === 'saveCategory' && category && category.id) {
      const idx = nextCategories.findIndex((c) => c.id === category.id);
      if (idx >= 0) {
        nextCategories[idx] = { ...nextCategories[idx], ...category };
      } else {
        nextCategories = [...nextCategories, category];
      }
      nextCategories.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
      changed = true;
    } else if (action === 'deleteCategory' && categoryId) {
      nextCategories = nextCategories.filter((c) => c.id !== categoryId);
      changed = true;
    } else if (action === 'saveSettings' && settings && typeof settings === 'object') {
      nextSettings = { ...nextSettings, ...settings };
      changed = true;
    }

    if (changed) {
      rebuildCatalogBuffers(
        {
          updatedAt: new Date().toISOString(),
          productsCount: nextProducts.length,
          categoriesCount: nextCategories.length,
          products: nextProducts,
          categories: nextCategories,
          settings: nextSettings,
        },
        true
      );
    } else {
      await refreshCatalogFromFirestore();
    }

    res.json({
      success: true,
      productsCount: catalogCache.productsCount,
      categoriesCount: catalogCache.categoriesCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Sync error' });
  }
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, product, context } = req.body;

    if (product && typeof product === 'object') {
      const translated = await translateProductWithAI(product);
      return res.json({ success: true, ...translated });
    }

    if (text && typeof text === 'string') {
      const translatedText = await translateWithAI(text, context || 'general e-commerce');
      return res.json({ success: true, translatedText });
    }

    return res.status(400).json({ error: 'Missing text or product in request body' });
  } catch (err: any) {
    console.error('Translation endpoint error:', err);
    res.status(500).json({ error: err.message || 'Translation failed' });
  }
});

// ================= VITE / STATIC SERVING =================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Muslim Shop server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

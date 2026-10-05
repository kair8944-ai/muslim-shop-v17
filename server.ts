import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

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

async function fetchCollectionViaRest(collectionId: string): Promise<any[]> {
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
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    throw new Error(`Firestore REST HTTP ${res.status}`);
  }
  const rows: any = await res.json();
  if (!Array.isArray(rows)) return [];
  const docs: any[] = [];
  for (const row of rows) {
    const docObj = row?.document;
    if (docObj && docObj.name) {
      const id = docObj.name.split('/').pop() || '';
      const fields = docObj.fields || {};
      const data: Record<string, any> = { id };
      for (const [k, v] of Object.entries(fields)) {
        data[k] = parseFirestoreRestValue(v);
      }
      docs.push(data);
    }
  }
  return docs;
}

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

  // Fast level 1 gzip in background without blocking event loop
  zlib.gzip(catalogJsonBuffer, { level: 1 }, (err, result) => {
    if (!err && result) {
      catalogGzipBuffer = result;
    }
  });

  if (saveToDisk) {
    fs.promises.writeFile(SNAPSHOT_FILE_PATH, rawJson).catch((e) => {
      console.warn('Could not persist catalog snapshot to disk:', e);
    });
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

// 2. Refresh catalog from live Firestore database via stateless REST API (no idle gRPC streams)
let isRefreshingCatalog = false;
async function refreshCatalogFromFirestore(): Promise<boolean> {
  if (isRefreshingCatalog) return false;
  isRefreshingCatalog = true;
  try {
    const [products, categories, settingsList] = await Promise.all([
      fetchCollectionViaRest('products'),
      fetchCollectionViaRest('categories'),
      fetchCollectionViaRest('settings'),
    ]);

    categories.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
    const generalSettings = settingsList.find((s) => s.id === 'general') || catalogCache.settings;

    if (products.length > 0) {
      rebuildCatalogBuffers(
        {
          updatedAt: new Date().toISOString(),
          productsCount: products.length,
          categoriesCount: categories.length,
          products,
          categories: categories.length > 0 ? categories : catalogCache.categories,
          settings: generalSettings || catalogCache.settings,
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

// Only refresh from Firestore if initial snapshot was empty (prevents exhausting daily free read quota)
if (catalogCache.products.length === 0) {
  refreshCatalogFromFirestore();
}

let lastCloudRelayCheckAt = 0;
let lastServerSeenRelayPtr = '';

async function syncServerCacheWithCloudRelay(): Promise<void> {
  if (Date.now() - lastCloudRelayCheckAt < 6000) return;
  lastCloudRelayCheckAt = Date.now();
  try {
    for (const ptrKeyName of ['ms_d8_ptr', 'ms_d7_ptr']) {
      const ptrRes = await fetch(
        `https://keyvalue.immanuel.co/api/KeyVal/GetValue/hbqgqy42/${ptrKeyName}`,
        { signal: AbortSignal.timeout(3500) }
      );
      if (!ptrRes.ok) continue;
      const ptr = (await ptrRes.text()).replace(/^"|"$/g, '').trim();
      if (!ptr || ptr.length < 5 || ptr.length > 40) continue;
      if (ptr === lastServerSeenRelayPtr) return;

      const blobRes = await fetch(`https://bytebin.lucko.me/${ptr}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!blobRes.ok) continue;
      const delta = await blobRes.json();
      if (!delta || typeof delta !== 'object') continue;

      lastServerSeenRelayPtr = ptr;
      let nextProducts = [...catalogCache.products];
      let nextCategories = [...catalogCache.categories];
      let nextSettings = { ...catalogCache.settings };
      let changed = false;

      const delProdSet = new Set<string>(
        Array.isArray(delta.deletedProductIds) ? delta.deletedProductIds : []
      );
      if (delProdSet.size > 0) {
        const beforeLen = nextProducts.length;
        nextProducts = nextProducts.filter((p) => p && !delProdSet.has(p.id));
        if (nextProducts.length !== beforeLen) changed = true;
      }

      if (delta.upsertedProducts && typeof delta.upsertedProducts === 'object') {
        for (const item of Object.values(delta.upsertedProducts) as any[]) {
          if (!item || !item.id || delProdSet.has(item.id)) continue;
          const idx = nextProducts.findIndex((p) => p.id === item.id);
          if (idx >= 0) {
            nextProducts[idx] = { ...nextProducts[idx], ...item };
          } else {
            nextProducts = [item, ...nextProducts];
          }
          changed = true;
        }
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
      }
      return;
    }
  } catch {
    // Ignore transient relay timeouts
  }
}
syncServerCacheWithCloudRelay();

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
    await syncServerCacheWithCloudRelay();
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
    const { action, product, products, productId, category, categoryId, settings } = req.body || {};
    let changed = false;

    let nextProducts = [...catalogCache.products];
    let nextCategories = [...catalogCache.categories];
    let nextSettings = { ...catalogCache.settings };

    const mergeServerProduct = (existing: any, incoming: any) => {
      if (!existing) return incoming;
      const isValidText = (val: unknown) => {
        if (typeof val !== 'string') return false;
        const t = val.trim();
        return t.length > 0 && t !== 'Описание товара' && t !== 'Тауар сипаттамасы';
      };
      const isRealImg = (imgs: any) =>
        Array.isArray(imgs) &&
        imgs.length > 0 &&
        typeof imgs[0] === 'string' &&
        imgs[0].length > 10 &&
        !imgs[0].includes('photo-1584308666744-24d5c474f2ae');

      const merged = { ...existing, ...incoming };
      if (!isRealImg(incoming.images) && isRealImg(existing.images)) {
        merged.images = existing.images;
      }
      if (!isValidText(incoming.descriptionRu) && isValidText(existing.descriptionRu)) {
        merged.descriptionRu = existing.descriptionRu;
      }
      if (!isValidText(incoming.descriptionKz) && isValidText(existing.descriptionKz)) {
        merged.descriptionKz = existing.descriptionKz;
      }
      if (!isValidText(incoming.specsRu) && isValidText(existing.specsRu)) {
        merged.specsRu = existing.specsRu;
      }
      if (!isValidText(incoming.specsKz) && isValidText(existing.specsKz)) {
        merged.specsKz = existing.specsKz;
      }
      if (!isValidText(incoming.howToUseRu) && isValidText(existing.howToUseRu)) {
        merged.howToUseRu = existing.howToUseRu;
      }
      if (!isValidText(incoming.howToUseKz) && isValidText(existing.howToUseKz)) {
        merged.howToUseKz = existing.howToUseKz;
      }
      if ((!Array.isArray(incoming.benefitsRu) || incoming.benefitsRu.length === 0) && Array.isArray(existing.benefitsRu) && existing.benefitsRu.length > 0) {
        merged.benefitsRu = existing.benefitsRu;
      }
      if ((!Array.isArray(incoming.benefitsKz) || incoming.benefitsKz.length === 0) && Array.isArray(existing.benefitsKz) && existing.benefitsKz.length > 0) {
        merged.benefitsKz = existing.benefitsKz;
      }
      if ((!incoming.volumeOrWeight || !String(incoming.volumeOrWeight).trim()) && existing.volumeOrWeight) {
        merged.volumeOrWeight = existing.volumeOrWeight;
      }
      if ((!incoming.country || !String(incoming.country).trim()) && existing.country) {
        merged.country = existing.country;
      }
      return merged;
    };

    if (action === 'saveProduct' && product && product.id) {
      const idx = nextProducts.findIndex((p) => p.id === product.id);
      if (idx >= 0) {
        nextProducts[idx] = mergeServerProduct(nextProducts[idx], product);
      } else {
        nextProducts = [product, ...nextProducts];
      }
      changed = true;
    } else if (action === 'saveProductsBulk' && Array.isArray(products) && products.length > 0) {
      for (const item of products) {
        if (!item || !item.id) continue;
        const idx = nextProducts.findIndex((p) => p.id === item.id);
        if (idx >= 0) {
          nextProducts[idx] = mergeServerProduct(nextProducts[idx], item);
        } else {
          nextProducts = [item, ...nextProducts];
        }
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
    } else if (action === 'syncDelta' && req.body?.delta && typeof req.body.delta === 'object') {
      const delta = req.body.delta;
      const delProdSet = new Set<string>(Array.isArray(delta.deletedProductIds) ? delta.deletedProductIds : []);
      if (delProdSet.size > 0) {
        nextProducts = nextProducts.filter((p) => p && !delProdSet.has(p.id));
        changed = true;
      }
      if (delta.upsertedProducts && typeof delta.upsertedProducts === 'object') {
        for (const item of Object.values(delta.upsertedProducts) as any[]) {
          if (!item || !item.id || delProdSet.has(item.id)) continue;
          const idx = nextProducts.findIndex((p) => p.id === item.id);
          if (idx >= 0) {
            nextProducts[idx] = mergeServerProduct(nextProducts[idx], item);
          } else {
            nextProducts = [item, ...nextProducts];
          }
          changed = true;
        }
      }
      if (Array.isArray(req.body.fullProducts) && req.body.fullProducts.length > 0) {
        for (const item of req.body.fullProducts) {
          if (!item || !item.id || delProdSet.has(item.id)) continue;
          const idx = nextProducts.findIndex((p) => p.id === item.id);
          if (idx >= 0) {
            nextProducts[idx] = mergeServerProduct(nextProducts[idx], item);
          } else {
            nextProducts = [item, ...nextProducts];
          }
          changed = true;
        }
      }
      const delCatSet = new Set<string>(Array.isArray(delta.deletedCategoryIds) ? delta.deletedCategoryIds : []);
      if (delCatSet.size > 0) {
        nextCategories = nextCategories.filter((c) => c && !delCatSet.has(c.id));
        changed = true;
      }
      if (delta.upsertedCategories && typeof delta.upsertedCategories === 'object') {
        for (const cat of Object.values(delta.upsertedCategories) as any[]) {
          if (!cat || !cat.id || delCatSet.has(cat.id)) continue;
          const idx = nextCategories.findIndex((c) => c.id === cat.id);
          if (idx >= 0) {
            nextCategories[idx] = { ...nextCategories[idx], ...cat };
          } else {
            nextCategories = [...nextCategories, cat];
          }
          changed = true;
        }
        nextCategories.sort((a, b) => (Number(a.order) || 99) - (Number(b.order) || 99));
      }
      if (delta.settings && typeof delta.settings === 'object') {
        nextSettings = { ...nextSettings, ...delta.settings };
        changed = true;
      }
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

// Server-side Analytics Cache (fallback & cross-browser sync alongside Cloud Relay & Firestore)
const ANALYTICS_SNAPSHOT_PATH = path.join(process.cwd(), 'public', 'analytics-snapshot.json');

let serverAnalyticsState: Record<string, any> = {
  overview: { totalVisits: 0, uniqueVisitors: 0, pageViews: 0 },
  days: {},
  recentVisits: [],
  updatedAt: new Date().toISOString(),
};

function saveAnalyticsSnapshotToDisk() {
  try {
    fs.mkdirSync(path.dirname(ANALYTICS_SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(ANALYTICS_SNAPSHOT_PATH, JSON.stringify(serverAnalyticsState));
  } catch (e) {
    console.warn('Could not persist analytics snapshot to disk:', e);
  }
}

try {
  if (fs.existsSync(ANALYTICS_SNAPSHOT_PATH)) {
    const raw = fs.readFileSync(ANALYTICS_SNAPSHOT_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      serverAnalyticsState = {
        overview: parsed.overview || { totalVisits: 0, uniqueVisitors: 0, pageViews: 0 },
        days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
        recentVisits: Array.isArray(parsed.recentVisits) ? parsed.recentVisits : [],
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    }
  }
} catch {}

function toLocalDayKey(isoStr?: string): string {
  if (!isoStr) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return isoStr;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return String(isoStr).slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

app.get('/api/analytics', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok', analytics: serverAnalyticsState });
});

app.post('/api/analytics/event', (req, res) => {
  try {
    const {
      type,
      date,
      visitItem,
      visitorId,
      isNewVisitor,
      isNewSession,
      device,
      lang,
      productId,
      productTitle,
    } = req.body || {};

    const nowIso = new Date().toISOString();
    const dKey = date || toLocalDayKey(nowIso);
    const days = { ...(serverAnalyticsState.days || {}) };
    const prevDay = days[dKey] || {
      date: dKey,
      totalVisits: 0,
      uniqueVisitors: 0,
      pageViews: 0,
      mobileVisits: 0,
      desktopVisits: 0,
      ruVisits: 0,
      kzVisits: 0,
      productViews: {},
      visitIds: [],
      visitorIds: [],
      updatedAt: nowIso,
      resetToken: 0,
    };

    if (type === 'visit' && visitItem && visitItem.id) {
      const visitSet = new Set<string>(Array.isArray(prevDay.visitIds) ? prevDay.visitIds : []);
      const visitorSet = new Set<string>(Array.isArray(prevDay.visitorIds) ? prevDay.visitorIds : []);
      const shortVid = String(visitorId || visitItem.visitorId || '').slice(-6);

      const isBrandNewVisitId = !visitSet.has(visitItem.id);
      const isBrandNewVisitorId = shortVid ? !visitorSet.has(shortVid) : Boolean(isNewVisitor);

      visitSet.add(visitItem.id);
      if (shortVid) visitorSet.add(shortVid);

      const nextVisitIds = Array.from(visitSet).slice(-250);
      const nextVisitorIds = Array.from(visitorSet).slice(-250);

      const addVisit = isBrandNewVisitId || isNewSession ? 1 : 0;
      const addUnique = isBrandNewVisitorId ? 1 : 0;

      const nextTotalVisits = Math.max((Number(prevDay.totalVisits) || 0) + addVisit, nextVisitIds.length);
      const nextUniqueVisitors = Math.min(
        nextTotalVisits,
        Math.max((Number(prevDay.uniqueVisitors) || 0) + addUnique, nextVisitorIds.length)
      );

      days[dKey] = {
        ...prevDay,
        date: dKey,
        totalVisits: nextTotalVisits,
        uniqueVisitors: nextUniqueVisitors,
        pageViews: Math.max((Number(prevDay.pageViews) || 0) + 1, nextTotalVisits),
        mobileVisits: (Number(prevDay.mobileVisits) || 0) + (device === 'mobile' ? addVisit : 0),
        desktopVisits: (Number(prevDay.desktopVisits) || 0) + (device !== 'mobile' ? addVisit : 0),
        ruVisits: (Number(prevDay.ruVisits) || 0) + (lang === 'kz' ? 0 : addVisit),
        kzVisits: (Number(prevDay.kzVisits) || 0) + (lang === 'kz' ? addVisit : 0),
        visitIds: nextVisitIds,
        visitorIds: nextVisitorIds,
        updatedAt: nowIso,
      };

      const visitMap = new Map<string, any>();
      for (const v of [visitItem, ...(serverAnalyticsState.recentVisits || [])]) {
        if (v && v.id) visitMap.set(v.id, v);
      }
      const recentVisits = Array.from(visitMap.values())
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 35);

      const sumVisits = Object.values(days).reduce((acc: number, d: any) => acc + (Number(d.totalVisits) || 0), 0);
      const sumUniques = Object.values(days).reduce((acc: number, d: any) => acc + (Number(d.uniqueVisitors) || 0), 0);
      const sumViews = Object.values(days).reduce((acc: number, d: any) => acc + (Number(d.pageViews) || 0), 0);

      serverAnalyticsState = {
        overview: {
          totalVisits: Math.max((Number(serverAnalyticsState.overview?.totalVisits) || 0) + addVisit, sumVisits),
          uniqueVisitors: Math.max((Number(serverAnalyticsState.overview?.uniqueVisitors) || 0) + addUnique, sumUniques),
          pageViews: Math.max((Number(serverAnalyticsState.overview?.pageViews) || 0) + 1, sumViews),
          lastVisitAt: nowIso,
        },
        days,
        recentVisits,
        updatedAt: nowIso,
      };
      saveAnalyticsSnapshotToDisk();
    } else if (type === 'productView' && productId) {
      const prodViews = { ...(prevDay.productViews || {}) };
      const existingProd = prodViews[productId] || { title: productTitle || 'Товар', count: 0 };
      prodViews[productId] = {
        title: productTitle || existingProd.title || 'Товар',
        count: (Number(existingProd.count) || 0) + 1,
      };
      days[dKey] = {
        ...prevDay,
        date: dKey,
        pageViews: (Number(prevDay.pageViews) || 0) + 1,
        productViews: prodViews,
        updatedAt: nowIso,
      };
      serverAnalyticsState = {
        ...serverAnalyticsState,
        overview: {
          ...serverAnalyticsState.overview,
          pageViews: (Number(serverAnalyticsState.overview?.pageViews) || 0) + 1,
          lastVisitAt: nowIso,
        },
        days,
        updatedAt: nowIso,
      };
      saveAnalyticsSnapshotToDisk();
    }

    res.json({ status: 'ok', analytics: serverAnalyticsState });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Analytics event error' });
  }
});

app.post('/api/analytics', (req, res) => {
  try {
    const incoming = req.body?.analytics;
    if (incoming && typeof incoming === 'object') {
      const mergedDays: Record<string, any> = { ...(serverAnalyticsState.days || {}) };
      const allIncomingVisits = Array.isArray(incoming.recentVisits) ? incoming.recentVisits : [];
      const allLocalVisits = Array.isArray(serverAnalyticsState.recentVisits) ? serverAnalyticsState.recentVisits : [];

      if (incoming.days && typeof incoming.days === 'object') {
        for (const [dKey, rDay] of Object.entries(incoming.days as Record<string, any>)) {
          if (!rDay) continue;
          const lDay = mergedDays[dKey];
          const lReset = Number(lDay?.resetToken) || 0;
          const rReset = Number(rDay?.resetToken) || 0;

          if (!lDay || (rReset > lReset && Number(rDay.totalVisits) === 0)) {
            mergedDays[dKey] = {
              ...rDay,
              visitIds: Array.isArray(rDay.visitIds) ? rDay.visitIds : [],
              visitorIds: Array.isArray(rDay.visitorIds) ? rDay.visitorIds : [],
              resetToken: Math.max(lReset, rReset),
            };
          } else {
            const effectiveReset = Math.max(lReset, rReset);
            const rUpdatedMs = rDay.updatedAt ? new Date(rDay.updatedAt).getTime() : 0;

            // If local was reset more recently AND incoming state is older than the reset, keep local
            if (lReset > rReset && rUpdatedMs > 0 && rUpdatedMs < lReset) {
              mergedDays[dKey] = lDay;
              continue;
            }

            const localDayVisits = allLocalVisits.filter((v: any) => {
              if (!v || toLocalDayKey(v.timestamp) !== dKey) return false;
              const vMs = v.timestamp ? new Date(v.timestamp).getTime() : 0;
              return !effectiveReset || vMs >= effectiveReset;
            });
            const remoteDayVisits = allIncomingVisits.filter((v: any) => {
              if (!v || toLocalDayKey(v.timestamp) !== dKey) return false;
              const vMs = v.timestamp ? new Date(v.timestamp).getTime() : 0;
              return !effectiveReset || vMs >= effectiveReset;
            });

            const knownLocalVisitSet = new Set<string>([
              ...(Array.isArray(lDay.visitIds) ? lDay.visitIds : []),
              ...localDayVisits.map((v: any) => v.id).filter(Boolean),
            ]);
            const incomingRemoteVisitSet = new Set<string>([
              ...(Array.isArray(rDay.visitIds) ? rDay.visitIds : []),
              ...remoteDayVisits.map((v: any) => v.id).filter(Boolean),
            ]);

            let newVisitsDelta = 0;
            for (const vid of incomingRemoteVisitSet) {
              if (vid && !knownLocalVisitSet.has(vid)) newVisitsDelta++;
            }

            const knownLocalVisitorSet = new Set<string>([
              ...(Array.isArray(lDay.visitorIds) ? lDay.visitorIds : []),
              ...localDayVisits.map((v: any) => v.visitorId).filter(Boolean),
            ]);
            const incomingRemoteVisitorSet = new Set<string>([
              ...(Array.isArray(rDay.visitorIds) ? rDay.visitorIds : []),
              ...remoteDayVisits.map((v: any) => v.visitorId).filter(Boolean),
            ]);

            let newUniquesDelta = 0;
            for (const uid of incomingRemoteVisitorSet) {
              if (uid && !knownLocalVisitorSet.has(uid)) newUniquesDelta++;
            }

            const mergedVisitIds = Array.from(
              new Set([...Array.from(knownLocalVisitSet), ...Array.from(incomingRemoteVisitSet)])
            ).slice(-250);
            const mergedVisitorIds = Array.from(
              new Set([...Array.from(knownLocalVisitorSet), ...Array.from(incomingRemoteVisitorSet)])
            ).slice(-250);

            const mergedProdViews: Record<string, { title: string; count: number }> = {
              ...(lDay.productViews || {}),
            };
            if (rDay.productViews && typeof rDay.productViews === 'object') {
              for (const [pid, pInfo] of Object.entries(rDay.productViews as Record<string, any>)) {
                if (!pInfo) continue;
                const existing = mergedProdViews[pid];
                mergedProdViews[pid] = {
                  title: pInfo.title || existing?.title || 'Товар',
                  count: Math.max(Number(existing?.count) || 0, Number(pInfo.count) || 0),
                };
              }
            }

            const nextTotalVisits = Math.max(
              (Number(lDay.totalVisits) || 0) + newVisitsDelta,
              Number(rDay.totalVisits) || 0,
              mergedVisitIds.length
            );
            const nextUniqueVisitors = Math.min(
              nextTotalVisits,
              Math.max(
                (Number(lDay.uniqueVisitors) || 0) + newUniquesDelta,
                Number(rDay.uniqueVisitors) || 0,
                mergedVisitorIds.length
              )
            );

            mergedDays[dKey] = {
              ...lDay,
              ...rDay,
              date: dKey,
              totalVisits: nextTotalVisits,
              uniqueVisitors: nextUniqueVisitors,
              pageViews: Math.max(
                (Number(lDay.pageViews) || 0) + newVisitsDelta,
                Number(rDay.pageViews) || 0,
                nextTotalVisits
              ),
              mobileVisits: Math.max(Number(lDay.mobileVisits) || 0, Number(rDay.mobileVisits) || 0),
              desktopVisits: Math.max(Number(lDay.desktopVisits) || 0, Number(rDay.desktopVisits) || 0),
              ruVisits: Math.max(Number(lDay.ruVisits) || 0, Number(rDay.ruVisits) || 0),
              kzVisits: Math.max(Number(lDay.kzVisits) || 0, Number(rDay.kzVisits) || 0),
              productViews: mergedProdViews,
              visitIds: mergedVisitIds,
              visitorIds: mergedVisitorIds,
              resetToken: effectiveReset,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }

      const visitMap = new Map<string, any>();
      for (const v of [...allLocalVisits, ...allIncomingVisits]) {
        if (!v || !v.id) continue;
        const vDate = toLocalDayKey(v.timestamp);
        const dayObj = mergedDays[vDate];
        if (dayObj?.resetToken && v.timestamp) {
          const visitMs = new Date(v.timestamp).getTime();
          if (!isNaN(visitMs) && visitMs < dayObj.resetToken) continue;
        }
        visitMap.set(v.id, v);
      }
      const recentVisits = Array.from(visitMap.values())
        .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        .slice(0, 35);

      const sumVisits = Object.values(mergedDays).reduce((acc: number, d: any) => acc + (Number(d.totalVisits) || 0), 0);
      const sumUniques = Object.values(mergedDays).reduce((acc: number, d: any) => acc + (Number(d.uniqueVisitors) || 0), 0);
      const sumViews = Object.values(mergedDays).reduce((acc: number, d: any) => acc + (Number(d.pageViews) || 0), 0);

      serverAnalyticsState = {
        overview: {
          totalVisits: Math.max(Number(serverAnalyticsState.overview?.totalVisits) || 0, Number(incoming.overview?.totalVisits) || 0, sumVisits),
          uniqueVisitors: Math.max(Number(serverAnalyticsState.overview?.uniqueVisitors) || 0, Number(incoming.overview?.uniqueVisitors) || 0, sumUniques),
          pageViews: Math.max(Number(serverAnalyticsState.overview?.pageViews) || 0, Number(incoming.overview?.pageViews) || 0, sumViews),
          lastVisitAt: incoming.overview?.lastVisitAt || serverAnalyticsState.overview?.lastVisitAt || new Date().toISOString(),
        },
        days: mergedDays,
        recentVisits,
        updatedAt: new Date().toISOString(),
      };
      saveAnalyticsSnapshotToDisk();
    }
    res.json({ status: 'ok', analytics: serverAnalyticsState });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Analytics sync error' });
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

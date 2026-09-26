import { Product } from '../types';

export interface TranslatedProductData {
  titleKz: string;
  descriptionKz: string;
  specsKz: string;
  benefitsKz?: string[];
  howToUseKz?: string;
}

const memoryCache = new Map<string, TranslatedProductData>();

/**
 * Checks if a string contains Kazakh letters or characteristic words
 */
export function isActuallyKazakhText(text?: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;

  // 1. Check for specific Kazakh Cyrillic letters (ә, і, ң, ғ, ү, ұ, қ, ө, һ)
  if (/[әіңғүұқөһӘІҢҒҮҰҚӨҺ]/.test(trimmed)) {
    return true;
  }

  // 2. Check for common Kazakh words and endings
  const kzWordsRegex = /\b(үшін|және|мен|бен|пен|арналған|өнім|көлемі|қабылдау|тәсілі|дайындалған|ерлер|әйелдер|дәрумен|табиғи|бутик|бағасы|дәрілері|дәрі|құрамы|пайдасы|сақтау|әсері|нәтижесі|күн|рет|ішу|жақсы|пайдалы)\b/i;
  return kzWordsRegex.test(trimmed);
}

export const isGenuinelyKazakh = isActuallyKazakhText;

/**
 * Checks if a product has an existing explicit, authentic Kazakh translation stored in DB
 */
export function hasExplicitKazakhTranslation(product: Product): boolean {
  if (!product) return false;
  const descKz = product.descriptionKz?.trim() || '';
  const descRu = product.descriptionRu?.trim() || '';

  // Must have a non-empty description that is distinct from Russian AND is actually Kazakh
  if (descKz && descKz !== descRu && isActuallyKazakhText(descKz)) {
    return true;
  }

  return false;
}

/**
 * Client-side fallback translation via MyMemory API
 */
async function clientFallbackTranslate(text: string): Promise<string> {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed.slice(0, 500))}&langpair=ru|kk`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText && data.responseStatus === 200) {
        return data.responseData.translatedText;
      }
    }
  } catch {}
  return '';
}

/**
 * Retrieves cached translation or fetches high-quality Kazakh translation
 */
export async function getProductKazakhTranslation(
  product: Product,
  forceRefresh: boolean = false
): Promise<TranslatedProductData> {
  const cacheKey = `tr_prod_${product.id}`;

  // If product already has an authentic Kazakh description in Firestore, use it directly
  if (!forceRefresh && hasExplicitKazakhTranslation(product)) {
    return {
      titleKz: product.titleKz || product.titleRu,
      descriptionKz: product.descriptionKz!,
      specsKz: product.specsKz || product.specsRu || '',
      benefitsKz: product.benefitsKz && product.benefitsKz.length > 0 ? product.benefitsKz : product.benefitsRu,
      howToUseKz: product.howToUseKz || product.howToUseRu || '',
    };
  }

  // 1. Check in-memory cache if not forced
  if (!forceRefresh && memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey)!;
    if (cached.descriptionKz && cached.descriptionKz.trim() !== product.descriptionRu?.trim()) {
      return cached;
    } else {
      memoryCache.delete(cacheKey);
    }
  }

  // 2. Check localStorage cache if not forced
  if (!forceRefresh) {
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        const parsed: TranslatedProductData = JSON.parse(saved);
        if (parsed.descriptionKz && parsed.descriptionKz.trim() !== product.descriptionRu?.trim()) {
          memoryCache.set(cacheKey, parsed);
          return parsed;
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch {}
  }

  // Source texts in Russian
  const sourceTitle = product.titleRu || product.titleKz || '';
  const sourceDesc = product.descriptionRu || product.descriptionKz || '';
  const sourceSpecs = product.specsRu || product.specsKz || '';
  const sourceBenefits =
    product.benefitsRu && product.benefitsRu.length > 0 ? product.benefitsRu : product.benefitsKz || [];
  const sourceHowToUse = product.howToUseRu || product.howToUseKz || '';

  // 3. Request AI translation from server API (/api/translate)
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product: {
          titleRu: sourceTitle,
          descriptionRu: sourceDesc,
          specsRu: sourceSpecs,
          benefitsRu: sourceBenefits,
          howToUseRu: sourceHowToUse,
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && (data.descriptionKz || data.titleKz)) {
        const translatedDesc = (data.descriptionKz || '').trim();
        const translatedTitle = (data.titleKz || '').trim();

        // If server provided a translation, use it!
        if (translatedDesc && translatedDesc !== sourceDesc) {
          const result: TranslatedProductData = {
            titleKz: translatedTitle || sourceTitle,
            descriptionKz: translatedDesc,
            specsKz: data.specsKz || sourceSpecs,
            benefitsKz:
              Array.isArray(data.benefitsKz) && data.benefitsKz.length > 0
                ? data.benefitsKz
                : sourceBenefits,
            howToUseKz: data.howToUseKz || sourceHowToUse,
          };

          memoryCache.set(cacheKey, result);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(result));
          } catch {}

          return result;
        }
      }
    }
  } catch (err) {
    console.warn('Translation API error, attempting direct client fallback:', err);
  }

  // 4. Client-side fallback if server was unavailable or failed
  try {
    const [fbTitle, fbDesc] = await Promise.all([
      clientFallbackTranslate(sourceTitle),
      clientFallbackTranslate(sourceDesc),
    ]);

    if (fbDesc && fbDesc !== sourceDesc) {
      const result: TranslatedProductData = {
        titleKz: fbTitle || sourceTitle,
        descriptionKz: fbDesc,
        specsKz: sourceSpecs,
        benefitsKz: sourceBenefits,
        howToUseKz: sourceHowToUse,
      };
      memoryCache.set(cacheKey, result);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {}
      return result;
    }
  } catch {}

  // 5. If everything failed, return original with title fallback
  return {
    titleKz: isActuallyKazakhText(product.titleKz) ? product.titleKz! : sourceTitle,
    descriptionKz: isActuallyKazakhText(product.descriptionKz) ? product.descriptionKz! : sourceDesc,
    specsKz: sourceSpecs,
    benefitsKz: sourceBenefits,
    howToUseKz: sourceHowToUse,
  };
}

import { Language, Product, StoreConfig } from '../types';
import { formatPrice, getProductDirectUrl } from './formatters';

const DEFAULT_TITLE_RU =
  'MUSLIM SHOP — Купить халяль товары и витамины iHerb в Атырау | Бутик №24';
const DEFAULT_TITLE_KZ =
  'MUSLIM SHOP — Атырауда халал өнімдер мен iHerb дәрумендерін сатып алу | №24 Бутик';

const DEFAULT_DESCRIPTION_RU =
  'Оригинальные халяль-витамины, БАДы, мед и товары для здоровья в Атырау. Бутик №24. Быстрая доставка по Казахстану. Ежедневно с 10:00 до 19:00.';
const DEFAULT_DESCRIPTION_KZ =
  'Атыраудағы түпнұсқа халал дәрумендер, БАД-тар, табиғи бал және денсаулық өнімдері. №24 Бутик. Қазақстан бойынша жылдам жеткізу. Күн сайын 10:00-ден 19:00-ге дейін.';

const DEFAULT_KEYWORDS =
  'купить халяль витамины в Атырау, iHerb Атырау, БАДы Атырау, MUSLIM SHOP, Бутик №24, халяль товары Атырау, натуральный мед Атырау, мужское и женское здоровье, доставка по Казахстану';

const DEFAULT_CANONICAL_URL = 'https://muslimshop.kz/';
const DEFAULT_OG_IMAGE = 'https://muslimshop.kz/og-banner.svg';
const DEFAULT_OG_IMAGE_ALT =
  'MUSLIM SHOP — Халяль товары, витамины iHerb и БАДы в Атырау, Бутик №24';
const DYNAMIC_JSONLD_SCRIPT_ID = 'dynamic-product-jsonld';

function setMetaByName(name: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setMetaByProperty(property: string, content: string): void {
  if (typeof document === 'undefined') return;
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function removeMetaByProperty(property: string): void {
  if (typeof document === 'undefined') return;
  const el = document.head.querySelector(`meta[property="${property}"]`);
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function setCanonicalLink(url: string): void {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function cleanTextForMeta(raw?: string, maxLength = 155): string {
  if (!raw || typeof raw !== 'string') return '';
  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/[•▪▸►]/g, '')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  const sliced = cleaned.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return (lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).replace(/[.,;:\-–—]+$/, '') + '…';
}

function stripLeadingEmojis(title: string): string {
  if (!title) return '';
  return title
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\s]+/u, '')
    .trim() || title.trim();
}

/**
 * Dynamically updates document `<title>`, `<meta name="description">`, `<meta name="keywords">`,
 * `<link rel="canonical">`, OpenGraph (`og:*`, `product:*`), Twitter Card tags,
 * and injects a `Schema.org/Product` JSON-LD structured data block for search engines.
 */
export function applyProductSeoMeta(
  product: Product,
  config?: StoreConfig,
  lang: Language = 'ru',
  resolvedTitle?: string,
  resolvedDescription?: string
): void {
  if (typeof document === 'undefined' || !product) return;

  try {
    const storeName = config?.storeName || 'MUSLIM SHOP';
    const isKz = lang === 'kz';

    const rawTitle =
      resolvedTitle || (isKz && product.titleKz?.trim() ? product.titleKz : product.titleRu) || '';
    const cleanTitle = stripLeadingEmojis(rawTitle);
    const priceStr = formatPrice(product.price);

    // 1. SEO Page Title (includes product name, price in KZT, city Atyrau & store name)
    const seoTitle = isKz
      ? `${cleanTitle} — ${priceStr} | Атырауда сатып алу | ${storeName} (№24 Бутик)`
      : `${cleanTitle} — Купить за ${priceStr} в Атырау | ${storeName} (Бутик №24)`;

    document.title = seoTitle;

    // 2. SEO Meta Description (120–160 chars with product summary, price, stock & delivery CTA)
    const rawDesc =
      resolvedDescription ||
      (isKz && product.descriptionKz?.trim() ? product.descriptionKz : product.descriptionRu) ||
      '';
    const summarySnippet = cleanTextForMeta(rawDesc, 105);
    const stockTextRu = product.inStock ? 'В наличии в Бутике №24 (Атырау).' : 'Под заказ в Бутике №24 (Атырау).';
    const stockTextKz = product.inStock ? 'Атыраудағы №24 Бутикте бар.' : 'Атыраудағы №24 Бутикте тапсырыспен.';

    const seoDescription = isKz
      ? `${cleanTitle} (${priceStr}). ${summarySnippet ? `${summarySnippet} ` : ''}${stockTextKz} Қазақстан бойынша жеткізу.`
      : `${cleanTitle} по цене ${priceStr}. ${summarySnippet ? `${summarySnippet} ` : ''}${stockTextRu} Доставка по Казахстану.`;

    // 3. SEO Keywords for the specific product
    const extraKeywords = [
      cleanTitle,
      product.sku ? `артикул ${product.sku}` : '',
      product.volumeOrWeight || '',
      product.country || '',
      isKz ? `${cleanTitle} Атырау сатып алу` : `купить ${cleanTitle} в Атырау`,
      DEFAULT_KEYWORDS,
    ]
      .filter(Boolean)
      .join(', ');

    // 4. Canonical & Direct URL
    const canonicalProductUrl = `https://muslimshop.kz/?p=${encodeURIComponent(product.id)}`;
    const runtimeDirectUrl = getProductDirectUrl(product.id) || canonicalProductUrl;

    // 5. Image URL for OpenGraph / Schema.org (prefer HTTP/HTTPS URL; fallback to store OG banner for meta tags if data URI)
    const firstImg = Array.isArray(product.images) && product.images[0] ? product.images[0] : '';
    const ogImageUrl =
      firstImg && (firstImg.startsWith('http://') || firstImg.startsWith('https://'))
        ? firstImg
        : DEFAULT_OG_IMAGE;

    setMetaByName('description', seoDescription);
    setMetaByName('keywords', extraKeywords);
    setCanonicalLink(canonicalProductUrl);

    // OpenGraph tags
    setMetaByProperty('og:type', 'product');
    setMetaByProperty('og:title', seoTitle);
    setMetaByProperty('og:description', seoDescription);
    setMetaByProperty('og:url', canonicalProductUrl);
    setMetaByProperty('og:image', ogImageUrl);
    setMetaByProperty('og:image:alt', `${cleanTitle} — ${priceStr} | ${storeName}`);
    setMetaByProperty('product:price:amount', String(product.price));
    setMetaByProperty('product:price:currency', 'KZT');
    setMetaByProperty('product:availability', product.inStock ? 'in stock' : 'out of stock');

    // Twitter Card tags
    setMetaByName('twitter:title', seoTitle);
    setMetaByName('twitter:description', seoDescription);
    setMetaByName('twitter:image', ogImageUrl);

    // 6. Schema.org Product JSON-LD structured data for rich search snippets
    const productJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: cleanTitle,
      description: cleanTextForMeta(rawDesc, 320) || seoDescription,
      sku: product.sku || product.id,
      mpn: product.sku || product.id,
      image: [ogImageUrl],
      brand: {
        '@type': 'Brand',
        name: product.country ? `${storeName} (${product.country})` : storeName,
      },
      offers: {
        '@type': 'Offer',
        url: runtimeDirectUrl,
        priceCurrency: 'KZT',
        price: product.price,
        availability: product.inStock
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: `${storeName} — Бутик №24, Атырау`,
        },
      },
    };

    let scriptEl = document.getElementById(DYNAMIC_JSONLD_SCRIPT_ID) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = DYNAMIC_JSONLD_SCRIPT_ID;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(productJsonLd);
  } catch {
    // Never fail UI rendering if DOM head manipulation is restricted
  }
}

/**
 * Restores the default store-level SEO meta tags and removes the product-specific JSON-LD script
 * when the product detail modal is closed.
 */
export function resetStoreSeoMeta(config?: StoreConfig, lang: Language = 'ru'): void {
  if (typeof document === 'undefined') return;

  try {
    const isKz = lang === 'kz';
    const defaultTitle = isKz ? DEFAULT_TITLE_KZ : DEFAULT_TITLE_RU;
    const defaultDesc = isKz ? DEFAULT_DESCRIPTION_KZ : DEFAULT_DESCRIPTION_RU;

    document.title = defaultTitle;
    setMetaByName('description', defaultDesc);
    setMetaByName('keywords', DEFAULT_KEYWORDS);
    setCanonicalLink(DEFAULT_CANONICAL_URL);

    setMetaByProperty('og:type', 'website');
    setMetaByProperty('og:title', defaultTitle);
    setMetaByProperty('og:description', defaultDesc);
    setMetaByProperty('og:url', DEFAULT_CANONICAL_URL);
    setMetaByProperty('og:image', DEFAULT_OG_IMAGE);
    setMetaByProperty('og:image:alt', DEFAULT_OG_IMAGE_ALT);

    removeMetaByProperty('product:price:amount');
    removeMetaByProperty('product:price:currency');
    removeMetaByProperty('product:availability');

    setMetaByName('twitter:title', defaultTitle);
    setMetaByName('twitter:description', defaultDesc);
    setMetaByName('twitter:image', DEFAULT_OG_IMAGE);

    const scriptEl = document.getElementById(DYNAMIC_JSONLD_SCRIPT_ID);
    if (scriptEl && scriptEl.parentNode) {
      scriptEl.parentNode.removeChild(scriptEl);
    }
  } catch {
    // Ignore DOM cleanup errors
  }
}

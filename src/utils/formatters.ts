import { CartItem, DeliveryMethod, Language, Product, StoreConfig } from '../types';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₸';
}

export function parseWorkingHours(hoursStr?: string): {
  openMinutes: number;
  closeMinutes: number;
  openStr: string;
  closeStr: string;
} {
  const defaultOpen = '10:00';
  const defaultClose = '19:00';

  if (!hoursStr || typeof hoursStr !== 'string') {
    return {
      openMinutes: 10 * 60,
      closeMinutes: 19 * 60,
      openStr: defaultOpen,
      closeStr: defaultClose,
    };
  }

  // Regex to match times like 10:00, 19:00, 10.00, 19.00, 9:00, 21:00
  const timeRegex = /(\d{1,2})[:.](\d{2})/g;
  const matches = [...hoursStr.matchAll(timeRegex)];

  if (matches.length >= 2) {
    const openH = parseInt(matches[0][1], 10);
    const openM = parseInt(matches[0][2], 10);
    const closeH = parseInt(matches[1][1], 10);
    const closeM = parseInt(matches[1][2], 10);

    const openStr = `${openH.toString().padStart(2, '0')}:${openM.toString().padStart(2, '0')}`;
    const closeStr = `${closeH.toString().padStart(2, '0')}:${closeM.toString().padStart(2, '0')}`;

    return {
      openMinutes: openH * 60 + openM,
      closeMinutes: closeH * 60 + closeM,
      openStr,
      closeStr,
    };
  } else if (matches.length === 1) {
    const h = parseInt(matches[0][1], 10);
    const m = parseInt(matches[0][2], 10);
    const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    
    // If it mentions "до", assume it's closing time
    if (hoursStr.toLowerCase().includes('до')) {
      return {
        openMinutes: 10 * 60,
        closeMinutes: h * 60 + m,
        openStr: defaultOpen,
        closeStr: timeStr,
      };
    }
  }

  return {
    openMinutes: 10 * 60,
    closeMinutes: 19 * 60,
    openStr: defaultOpen,
    closeStr: defaultClose,
  };
}

export function isStoreOpen(config?: StoreConfig): {
  isOpen: boolean;
  textRu: string;
  textKz: string;
  openStr: string;
  closeStr: string;
} {
  const { openMinutes, closeMinutes, openStr, closeStr } = parseWorkingHours(
    config?.workingHoursRu || config?.workingHoursKz
  );

  // Atyrau / Kazakhstan unified timezone is UTC+5
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const atyrauDate = new Date(utc + 3600000 * 5);
  const currentMinutes = atyrauDate.getHours() * 60 + atyrauDate.getMinutes();

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  if (isOpen) {
    return {
      isOpen: true,
      textRu: `Открыто до ${closeStr}`,
      textKz: `${closeStr}-ге дейін ашық`,
      openStr,
      closeStr,
    };
  } else {
    return {
      isOpen: false,
      textRu: `Откроется в ${openStr}`,
      textKz: `${openStr}-де ашылады`,
      openStr,
      closeStr,
    };
  }
}

export function generateWhatsAppOrderUrl(
  config: StoreConfig,
  items: CartItem[],
  customer: {
    name: string;
    phone: string;
    address: string;
    deliveryMethod: DeliveryMethod;
    notes?: string;
  },
  lang: Language
): string {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const deliveryLabelsRu = {
    delivery: 'Курьерская доставка по г. Атырау',
    pickup: 'Самовывоз из Бутика №24 (пр. Султана Бейбарыса, 45а/5)',
    post: 'Доставка по Казахстану (Казпочта / СДЭК)',
  };

  const deliveryLabelsKz = {
    delivery: 'Атырау қаласы бойынша курьерлік жеткізу',
    pickup: '№24 Бутиктен алып кету (Сұлтан Бейбарыс даңғылы, 45а/5)',
    post: 'Қазақстан бойынша жеткізу (Қазпошта / СДЭК)',
  };

  let message = '';
  if (lang === 'kz') {
    message += `Сәлеметсіз бе, ${config.storeName}! Мен сайттан тапсырыс бергім келеді:\n\n`;
    items.forEach((item, index) => {
      const p = item.product;
      message += `${index + 1}. ${p.titleKz} (арт: ${p.sku}) — ${item.quantity} дана × ${formatPrice(p.price)} = ${formatPrice(p.price * item.quantity)}\n`;
    });
    message += `\nБарлығы: ${formatPrice(total)}\n`;
    message += `Тапсырыс беруші: ${customer.name}\n`;
    message += `Телефон: ${customer.phone}\n`;
    message += `Жеткізу түрі: ${deliveryLabelsKz[customer.deliveryMethod]}\n`;
    if (customer.address) {
      message += `Мекенжай: ${customer.address}\n`;
    }
    if (customer.notes) {
      message += `Ескертпе: ${customer.notes}\n`;
    }
    message += `\nТөлемді Kaspi арқылы жасауға болады ма? Рахмет!`;
  } else {
    message += `Здравствуйте, ${config.storeName}! Хочу оформить заказ с сайта:\n\n`;
    items.forEach((item, index) => {
      const p = item.product;
      message += `${index + 1}. ${p.titleRu} (арт: ${p.sku}) — ${item.quantity} шт × ${formatPrice(p.price)} = ${formatPrice(p.price * item.quantity)}\n`;
    });
    message += `\nИтого к оплате: ${formatPrice(total)}\n`;
    message += `Покупатель: ${customer.name}\n`;
    message += `Телефон: ${customer.phone}\n`;
    message += `Способ получения: ${deliveryLabelsRu[customer.deliveryMethod]}\n`;
    if (customer.address) {
      message += `Адрес: ${customer.address}\n`;
    }
    if (customer.notes) {
      message += `Комментарий: ${customer.notes}\n`;
    }
    message += `\nПодскажите реквизиты Kaspi для оплаты и время доставки. Спасибо!`;
  }

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${config.whatsappNumber}?text=${encoded}`;
}

export function generateQuickOrderUrl(
  config: StoreConfig,
  productTitle: string,
  sku: string,
  price: number,
  customerName: string,
  customerPhone: string,
  lang: Language,
  inStock: boolean = true
): string {
  let message = '';
  if (!inStock) {
    if (lang === 'kz') {
      message = `Сәлеметсіз бе, ${config.storeName}! Мына өнім қашан сатылымға шығады? Жақында келуін күтіп, алдын ала жазылғым келеді:\n\n` +
        `📦 Өнім: ${productTitle}\n` +
        `Артикул: ${sku}\n` +
        `Бағасы: ${formatPrice(price)}\n\n` +
        `Менің атым: ${customerName}\n` +
        `Телефон: ${customerPhone}\n\n` +
        `Бутик №24-ке тауар түскенде маған хабарласыңызшы!`;
    } else {
      message = `Здравствуйте, ${config.storeName}! Подскажите, когда появится в наличии этот товар? Хочу оформить предзаказ / узнать о поступлении:\n\n` +
        `📦 Товар: ${productTitle}\n` +
        `Артикул: ${sku}\n` +
        `Цена: ${formatPrice(price)}\n\n` +
        `Покупатель: ${customerName}\n` +
        `Телефон: ${customerPhone}\n\n` +
        `Сообщите мне, пожалуйста, как товар поступит в Бутик №24!`;
    }
  } else {
    if (lang === 'kz') {
      message = `Сәлеметсіз бе, ${config.storeName}! Мен мына өнімді 1 басу арқылы сатып алғым келеді:\n\n` +
        `📦 Өнім: ${productTitle}\n` +
        `Артикул: ${sku}\n` +
        `Бағасы: ${formatPrice(price)}\n\n` +
        `Менің атым: ${customerName}\n` +
        `Телефон: ${customerPhone}\n\n` +
        `Тапсырысты растауыңызды күтемін!`;
    } else {
      message = `Здравствуйте, ${config.storeName}! Хочу быстро заказать товар:\n\n` +
        `📦 Товар: ${productTitle}\n` +
        `Артикул: ${sku}\n` +
        `Цена: ${formatPrice(price)}\n\n` +
        `Покупатель: ${customerName}\n` +
        `Телефон: ${customerPhone}\n\n` +
        `Свяжитесь со мной для уточнения доставки и оплаты через Kaspi!`;
    }
  }

  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Generates a clean, publicly accessible direct URL for a specific product.
 * If running inside Google AI Studio preview (ais-dev-*), converts to the public
 * preview URL (ais-pre-*) so that recipients on Instagram or WhatsApp can open it
 * without encountering private development authentication walls.
 */
export function getProductDirectUrl(productId: string): string {
  if (!productId) return '';
  const cleanId = encodeURIComponent(productId.toString().trim());

  if (typeof window === 'undefined') return `?p=${cleanId}`;

  let origin = window.location.origin || '';

  // CRITICAL FIX: If running inside AI Studio preview/dev environment (ais-dev-*.run.app),
  // replace 'ais-dev-' with 'ais-pre-' so that external users (clients on WhatsApp/Instagram)
  // can actually access the site without hitting private development auth blocks!
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }

  let pathname = window.location.pathname || '/';
  if (pathname.endsWith('/index.html')) {
    pathname = pathname.substring(0, pathname.length - 10);
  }
  if (!pathname.endsWith('/')) {
    pathname = `${pathname}/`;
  }

  return `${origin}${pathname}?p=${cleanId}`;
}

/**
 * Robust extractor of product ID or SKU from current URL or a custom URL string.
 * Handles:
 * - Query params: ?p=ID, ?product=ID, ?prod=ID, ?id=ID, ?sku=SKU, ?item=ID
 * - Hash routes: #ID, #p=ID, #product=ID, #/product/ID, #/p/ID
 * - Path routes: /product/ID, /p/ID
 * - Trailing slashes added by Instagram/social media crawlers (e.g. ?p=prod-123/)
 * - URL encoded characters
 */
export function extractProductIdFromUrl(urlStr?: string): string | null {
  try {
    let search = '';
    let hash = '';
    let pathname = '';

    if (urlStr) {
      const parsed = new URL(urlStr, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
      search = parsed.search;
      hash = parsed.hash;
      pathname = parsed.pathname;
    } else if (typeof window !== 'undefined') {
      search = window.location.search;
      hash = window.location.hash;
      pathname = window.location.pathname;
    } else {
      return null;
    }

    const searchParams = new URLSearchParams(search);

    // 1. Query parameters
    let rawId =
      searchParams.get('p') ||
      searchParams.get('product') ||
      searchParams.get('prod') ||
      searchParams.get('id') ||
      searchParams.get('sku') ||
      searchParams.get('item');

    // 2. Hash variants (e.g. #prod-123, #p=prod-123, #/product/prod-123)
    if (!rawId && hash) {
      const cleanHash = hash.replace(/^#\/?/, '').trim();
      if (cleanHash.startsWith('p=')) {
        rawId = cleanHash.replace(/^p=/, '');
      } else if (cleanHash.startsWith('product=')) {
        rawId = cleanHash.replace(/^product=/, '');
      } else if (cleanHash.startsWith('product/')) {
        rawId = cleanHash.replace(/^product\//, '');
      } else if (cleanHash.startsWith('p/')) {
        rawId = cleanHash.replace(/^p\//, '');
      } else if (cleanHash.includes('?')) {
        const hashParams = new URLSearchParams(cleanHash.substring(cleanHash.indexOf('?')));
        rawId = hashParams.get('p') || hashParams.get('product') || hashParams.get('id');
      } else if (!cleanHash.includes('/') && cleanHash.length > 2) {
        rawId = cleanHash;
      }
    }

    // 3. Path routes (e.g. /product/prod-123 or /p/prod-123)
    if (!rawId && pathname) {
      const match = pathname.match(/\/(?:product|p)\/([^/?#]+)/i);
      if (match && match[1]) {
        rawId = match[1];
      }
    }

    if (!rawId) return null;

    // Decode and remove any trailing slash appended by Instagram or other apps
    let cleaned = decodeURIComponent(rawId).trim();
    cleaned = cleaned.replace(/\/+$/, '');

    return cleaned.length > 0 ? cleaned : null;
  } catch (e) {
    return null;
  }
}

/**
 * Mobile-first sharing helper: uses navigator.share on iOS/Android (Instagram Stories, WhatsApp, Telegram, etc.)
 * with seamless fallback to clipboard copying.
 */
export async function shareOrCopyProduct(
  product: { id: string; titleRu: string; titleKz?: string; price: number; sku?: string },
  lang: 'ru' | 'kz' = 'ru'
): Promise<{ success: boolean; method: 'shared' | 'copied' | 'failed' }> {
  const url = getProductDirectUrl(product.id);
  const title = (lang === 'kz' && product.titleKz?.trim()) ? product.titleKz : product.titleRu;
  const shareText = `${title}\n${formatPrice(product.price)}${product.sku ? ` (Арт: ${product.sku})` : ''}\nБутик №24, Атырау`;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: shareText,
        url,
      });
      return { success: true, method: 'shared' };
    } catch (err: any) {
      // If user cancelled the share menu (AbortError), don't treat as error or force copy
      if (err?.name === 'AbortError') {
        return { success: false, method: 'failed' };
      }
    }
  }

  // Fallback to clipboard copying
  const ok = await copyTextToClipboard(url);
  return { success: ok, method: ok ? 'copied' : 'failed' };
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback to execCommand below
    }
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}

/**
 * Deduplicates products array by unique ID and identical SKU/Title to prevent duplicate listings
 */
export function deduplicateProducts(products: Product[]): Product[] {
  if (!Array.isArray(products)) return [];
  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const result: Product[] = [];

  for (const p of products) {
    if (!p || !p.id) continue;
    // 1. Strict ID deduplication
    if (seenIds.has(p.id)) continue;

    // 2. Fuzzy duplicate signature check (same SKU or same Title + Price)
    const normalizedSku = (p.sku || '').trim().toUpperCase();
    const normalizedTitle = (p.titleRu || '').trim().toLowerCase();
    
    // If SKU is present and valid, match on SKU
    if (normalizedSku && normalizedSku !== 'MS-') {
      const skuKey = `sku:${normalizedSku}`;
      if (seenSignatures.has(skuKey)) {
        continue;
      }
      seenSignatures.add(skuKey);
    } else if (normalizedTitle) {
      const titleKey = `title:${normalizedTitle}_${p.price}`;
      if (seenSignatures.has(titleKey)) {
        continue;
      }
      seenSignatures.add(titleKey);
    }

    seenIds.add(p.id);
    result.push(p);
  }

  return result;
}

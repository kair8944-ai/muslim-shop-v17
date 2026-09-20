import { CartItem, DeliveryMethod, Language, StoreConfig } from '../types';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU').format(price) + ' ₸';
}

export function isStoreOpen(): { isOpen: boolean; textRu: string; textKz: string } {
  // Atyrau is UTC+5
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const atyrauDate = new Date(utc + 3600000 * 5);
  const hour = atyrauDate.getHours();

  const isOpen = hour >= 10 && hour < 21;
  if (isOpen) {
    return {
      isOpen: true,
      textRu: 'Открыто до 21:00',
      textKz: '21:00-ге дейін ашық',
    };
  } else {
    return {
      isOpen: false,
      textRu: 'Откроется в 10:00',
      textKz: '10:00-де ашылады',
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
  lang: Language
): string {
  let message = '';
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

  return `https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function getProductDirectUrl(productId: string): string {
  if (typeof window === 'undefined') return `?p=${encodeURIComponent(productId)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?p=${encodeURIComponent(productId)}`;
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

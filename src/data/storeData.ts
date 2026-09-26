import { Category, Product, StoreConfig } from '../types';

export const INITIAL_CONFIG: StoreConfig = {
  storeName: 'MUSLIM SHOP',
  taglineRu: 'Красота, здоровье и халяль-товары в Атырау',
  taglineKz: 'Атыраудағы сұлулық, денсаулық және халал өнімдер',
  subtitleRu: 'Витамины iHerb, БАДы, товары для мужского и женского здоровья, мед, хиджама и мусульманские ароматы.',
  subtitleKz: 'iHerb дәрумендері, ББҚ, ерлер мен әйелдер денсаулығына арналған өнімдер, бал, хиджама және мұсылман хош иістері.',
  city: 'Атырау',
  boutiqueNumber: 'Бутик №24',
  address: 'г. Атырау, ТД «Дина Байзар», бутик №24',
  whatsappNumber: '77781754241',
  instagram: 'musliim_shop06',
  gis2Url: 'https://2gis.kz/atyrau/geo/70000001094546376',
  workingHoursRu: 'Ежедневно с 10:00 до 19:00',
  workingHoursKz: 'Күн сайын сағат 10:00-ден 19:00-ге дейін',
  deliveryInfoRu: 'Быстрая доставка курьером по городу Атырау в день заказа. Доставка по Казахстану через Казпочту / СДЭК.',
  deliveryInfoKz: 'Атырау қаласы бойынша тапсырыс берілген күні жылдам жеткізу. Қазақстан бойынша Қазпошта / СДЭК арқылы жеткізу.',
  pickupInfoRu: 'г. Атырау, Бутик №24. Выдача заказов ежедневно с 10:00 до 20:30.',
  pickupInfoKz: 'Атырау қ., №24 бутик. Тапсырыстарды күн сайын 10:00-ден 20:30-ға дейін алып кетуге болады.',
  currency: '₸',
  adminPin: '505534',
};

export const CATEGORIES: Category[] = [
  { id: 'cat-all', nameRu: 'Все товары', nameKz: 'Барлық өнімдер', icon: '✨', order: 0 },
  { id: 'cat-iherb', nameRu: 'Витамины iHerb', nameKz: 'iHerb Витаминдер', icon: '💊', order: 1 },
  { id: 'cat-health', nameRu: 'БАДы и Здоровье', nameKz: 'ББҚ және Денсаулық', icon: '🌿', order: 2 },
  { id: 'cat-men', nameRu: 'Мужское здоровье', nameKz: 'Ерлер денсаулығы', icon: '💪', order: 3 },
  { id: 'cat-women', nameRu: 'Женское здоровье', nameKz: 'Әйелдер денсаулығы', icon: '🌸', order: 4 },
  { id: 'cat-honey', nameRu: 'Натуральный мед', nameKz: 'Табиғи бал', icon: '🍯', order: 5 },
  { id: 'cat-hijama', nameRu: 'Хиджама', nameKz: 'Хиджама', icon: '🩸', order: 6 },
  { id: 'cat-muslim', nameRu: 'Мусульманские ароматы', nameKz: 'Мұсылман хош иістері', icon: '🕌', order: 7 },
  { id: 'cat-beauty', nameRu: 'Красота и уход', nameKz: 'Сұлулық және күтім', icon: '✨', order: 8 },
  { id: 'cat-diet', nameRu: 'Похудение и детокс', nameKz: 'Арықтау және детокс', icon: '⚖️', order: 9 },
  { id: 'cat-hits', nameRu: 'Хиты продаж', nameKz: 'Танымал хиттер', icon: '🔥', order: 10 },
  { id: 'cat-new', nameRu: 'Новинки', nameKz: 'Жаңа өнімдер', icon: '🌟', order: 11 },
  { id: 'cat-misc', nameRu: 'Разное', nameKz: 'Басқа', icon: '📦', order: 12 },
];

// Demo products removed; all real products are loaded directly from Firestore
export const INITIAL_PRODUCTS: Product[] = [];

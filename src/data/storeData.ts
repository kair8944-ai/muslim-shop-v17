import { Category, Product, StoreConfig } from '../types';

export const INITIAL_CONFIG: StoreConfig = {
  storeName: 'MUSLIM SHOP',
  taglineRu: 'Красота. Здоровье. Вера.',
  taglineKz: 'Сұлулық. Денсаулық. Сенім.',
  subtitleRu: 'Премиальные товары для здоровья, красоты и повседневной жизни в Атырау.',
  subtitleKz: 'Атыраудағы денсаулық, сұлулық және күнделікті өмірге арналған премиум өнімдер.',
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
  { id: 'cat-hits', nameRu: 'Хиты', nameKz: 'Хиттер', icon: '🔥', order: 1 },
  { id: 'cat-health', nameRu: 'Здоровье', nameKz: 'Денсаулық', icon: '❤️', order: 2 },
  { id: 'cat-iherb', nameRu: 'iHerb Витамины', nameKz: 'iHerb Витаминдер', icon: '💊', order: 3 },
  { id: 'cat-beauty', nameRu: 'Красота', nameKz: 'Сұлулық', icon: '✨', order: 4 },
  { id: 'cat-men', nameRu: 'Мужское здоровье', nameKz: 'Ерлер денсаулығы', icon: '💪', order: 5 },
  { id: 'cat-women', nameRu: 'Женское здоровье', nameKz: 'Әйелдер денсаулығы', icon: '🌸', order: 6 },
  { id: 'cat-diet', nameRu: 'Похудение', nameKz: 'Арықтау', icon: '⚖️', order: 7 },
  { id: 'cat-muslim', nameRu: 'Для мусульман', nameKz: 'Мұсылмандарға', icon: '🕌', order: 8 },
  { id: 'cat-natural', nameRu: 'Натуральные продукты', nameKz: 'Табиғи өнімдер', icon: '🌿', order: 9 },
  { id: 'cat-new', nameRu: 'Новинки', nameKz: 'Жаңалықтар', icon: '🌟', order: 10 },
  { id: 'cat-misc', nameRu: 'Разное', nameKz: 'Басқа', icon: '📦', order: 11 },
];

// Demo products removed; all real products are loaded directly from Firestore
export const INITIAL_PRODUCTS: Product[] = [];

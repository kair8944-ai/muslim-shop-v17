import { Product } from '../types';

export interface SymptomGoal {
  id: string;
  titleRu: string;
  titleKz: string;
  subtitleRu: string;
  subtitleKz: string;
  badgeRu: string;
  badgeKz: string;
  categoryIds: string[];
  keywords: string[];
  accentColor: string;
}

export const SYMPTOM_GOALS: SymptomGoal[] = [
  {
    id: 'immunity',
    titleRu: 'Иммунитет и простуда',
    titleKz: 'Иммунитет және суық тию',
    subtitleRu: 'Витамин C, D3, Цинк, Чёрный тмин, Кыст и защита организма',
    subtitleKz: 'С, D3 дәрумендері, Мырыш, Қара зере және ағза қорғанысы',
    badgeRu: 'Защита организма',
    badgeKz: 'Ағза қорғанысы',
    categoryIds: ['cat-iherb', 'cat-health', 'cat-honey'],
    keywords: [
      'иммун',
      'простуд',
      'вирус',
      'витамин c',
      'витамин с',
      'vitamin c',
      'd3',
      'д3',
      'цинк',
      'zinc',
      'тмин',
      'қара зере',
      'кыст',
      'прополис',
      'бузин',
      'elderberry',
      'эхинаце',
      'чеснок',
      'омега',
      'omega',
      'кашель',
      'горл',
    ],
    accentColor: 'from-emerald-600 to-teal-700',
  },
  {
    id: 'energy',
    titleRu: 'Усталость, стресс и сон',
    titleKz: 'Шаршау, күйзеліс және ұйқы',
    subtitleRu: 'Магний, группа B, Ашваганда, 5-HTP, Железо и крепкие нервы',
    subtitleKz: 'Магний, В тобы, Ашваганда, Темір және жүйке жүйесі',
    badgeRu: 'Энергия и нервы',
    badgeKz: 'Қуат пен ұйқы',
    categoryIds: ['cat-iherb', 'cat-health'],
    keywords: [
      'магний',
      'magnesium',
      'стресс',
      'нерв',
      'сон',
      'ұйқы',
      'усталост',
      'шаршау',
      'энерг',
      'қуат',
      'ашваганд',
      'ashwagandha',
      'мелатонин',
      'melatonin',
      'b-complex',
      'группы b',
      'группы в',
      'b12',
      'в12',
      'глицин',
      'теанин',
      '5-htp',
      'коэнзим',
      'q10',
      'железо',
      'iron',
      'память',
      'мозг',
    ],
    accentColor: 'from-amber-500 to-orange-600',
  },
  {
    id: 'joints',
    titleRu: 'Суставы, кости и спина',
    titleKz: 'Буындар, сүйек және арқа',
    subtitleRu: 'Коллаген, Кальций, Глюкозамин, Хондроитин, МСМ и мази',
    subtitleKz: 'Коллаген, Кальций, Глюкозамин, Хондроитин және жақпа майлар',
    categoryIds: ['cat-health', 'cat-iherb', 'cat-hijama'],
    badgeRu: 'Свобода движений',
    badgeKz: 'Буын саулығы',
    keywords: [
      'сустав',
      'буын',
      'кост',
      'сүйек',
      'коллаген',
      'collagen',
      'кальций',
      'calcium',
      'глюкозамин',
      'glucosamine',
      'хондроитин',
      'chondroitin',
      'мсм',
      'msm',
      'спин',
      'колен',
      'хрящ',
      'связк',
      'мазь',
      'крем для тела',
      'гиалурон',
      'k2',
      'к2',
    ],
    accentColor: 'from-teal-600 to-emerald-800',
  },
  {
    id: 'beauty',
    titleRu: 'Волосы, кожа и ногти',
    titleKz: 'Шаш, тері және тырнақ',
    subtitleRu: 'Биотин, Коллаген, Гиалуроновая кислота, масла и уход',
    subtitleKz: 'Биотин, Коллаген, Гиалурон қышқылы және табиғи күтім',
    badgeRu: 'Сияние и уход',
    badgeKz: 'Сұлулық күтімі',
    categoryIds: ['cat-beauty', 'cat-women', 'cat-iherb'],
    keywords: [
      'волос',
      'шаш',
      'кож',
      'тері',
      'ногт',
      'тырнақ',
      'биотин',
      'biotin',
      'коллаген',
      'collagen',
      'гиалурон',
      'hyaluronic',
      'красот',
      'сұлулық',
      'шампунь',
      'крем',
      'сыворотк',
      'морщин',
      'выпаден',
      'витамин е',
      'vitamin e',
      'масло для',
      'мыло',
      'уход',
    ],
    accentColor: 'from-rose-500 to-pink-700',
  },
  {
    id: 'men',
    titleRu: 'Мужская сила и тонус',
    titleKz: 'Ерлер қуаты мен денсаулығы',
    subtitleRu: 'Эпимедиумные пасты, Мака, Трибулус, Цинк и мужские комплексы',
    subtitleKz: 'Эпимедиум пастасы, Мака, Трибулус, Мырыш және ерлер кешені',
    badgeRu: 'Мужское здоровье',
    badgeKz: 'Ерлерге арналған',
    categoryIds: ['cat-men', 'cat-honey'],
    keywords: [
      'мужск',
      'ерлер',
      'эпимедиум',
      'epimedium',
      'паста',
      'мака',
      'maca',
      'трибулус',
      'tribulus',
      'простат',
      'потенц',
      'тестостерон',
      'выносливост',
      'женьшень',
      'ginseng',
      'тонгкат',
      'со пальметто',
      'saw palmetto',
      'мед для мужчин',
      'королевск',
    ],
    accentColor: 'from-stone-800 to-emerald-950',
  },
  {
    id: 'women',
    titleRu: 'Женское здоровье',
    titleKz: 'Әйелдер денсаулығы',
    subtitleRu: 'Железо, Фолиевая кислота, Инозитол, Примула и женский баланс',
    subtitleKz: 'Темір, Фолий қышқылы, Инозитол және әйелдер гормоны',
    badgeRu: 'Женский баланс',
    badgeKz: 'Әйелдерге арналған',
    categoryIds: ['cat-women', 'cat-beauty'],
    keywords: [
      'женск',
      'әйел',
      'фолиев',
      'folic',
      'фолат',
      'folate',
      'железо',
      'iron',
      'ферритин',
      'примул',
      'evening primrose',
      'инозитол',
      'inositol',
      'гормон',
      'цикл',
      'беремен',
      'кормящ',
      'пренатал',
      'prenatal',
      'клюкв',
      'cranberry',
      'хильба',
      'хельба',
    ],
    accentColor: 'from-pink-600 to-rose-800',
  },
  {
    id: 'digestion',
    titleRu: 'ЖКТ, печень и стройность',
    titleKz: 'Асқазан, бауыр және детокс',
    subtitleRu: 'Хлорофилл, Пробиотики, Спирулина, Лецитин, Очищение и Детокс',
    subtitleKz: 'Хлорофилл, Пробиотиктер, Спирулина, Лецитин және тазарту',
    badgeRu: 'Детокс и ЖКТ',
    badgeKz: 'Тазарту мен асқазан',
    categoryIds: ['cat-diet', 'cat-health', 'cat-honey'],
    keywords: [
      'жкт',
      'желудок',
      'асқазан',
      'кишечник',
      'ішек',
      'печен',
      'бауыр',
      'детокс',
      'detox',
      'похуд',
      'арықтау',
      'стройност',
      'вес',
      'хлорофилл',
      'chlorophyll',
      'пробиотик',
      'probiotic',
      'спирулин',
      'spirulina',
      'хлорелл',
      'лецитин',
      'lecithin',
      'расторопш',
      'milk thistle',
      'клетчатк',
      'псилиум',
      'фермент',
      'энзим',
      'очищен',
      'паразит',
      'желч',
    ],
    accentColor: 'from-emerald-700 to-green-900',
  },
  {
    id: 'kids',
    titleRu: 'Детям: иммунитет и рост',
    titleKz: 'Балаларға: иммунитет пен өсу',
    subtitleRu: 'Детская Омега-3, D3, Кальций, Мультивитамины без сахара',
    subtitleKz: 'Балаларға арналған Омега-3, D3, Кальций және дәрумендер',
    badgeRu: 'Для детей',
    badgeKz: 'Балаларға',
    categoryIds: [],
    keywords: [
      'детск',
      'детей',
      'детям',
      'ребенк',
      'ребёнк',
      'балалар',
      'балаға',
      'kids',
      'child',
      'childlife',
      'baby',
      'бейби',
      'малыш',
      'школьник',
      'мармелад',
      'gummies',
      'жидкий кальций',
    ],
    accentColor: 'from-amber-400 to-amber-600',
  },
];

/**
 * Checks if a product matches a specific symptom/health goal.
 */
export function doesProductMatchSymptom(product: Product, symptomId: string): boolean {
  if (!symptomId || symptomId === 'all') return true;
  const goal = SYMPTOM_GOALS.find((g) => g.id === symptomId);
  if (!goal) return true;

  // Build searchable text corpus for the product
  const searchable = [
    product.titleRu || '',
    product.titleKz || '',
    product.descriptionRu || '',
    product.descriptionKz || '',
    product.specsRu || '',
    product.specsKz || '',
    ...(product.benefitsRu || []),
    ...(product.benefitsKz || []),
  ]
    .join(' ')
    .toLowerCase();

  // Check keyword match first (high precision)
  const hasKeywordMatch = goal.keywords.some((kw) => searchable.includes(kw.toLowerCase()));
  if (hasKeywordMatch) return true;

  // For specific dedicated categories (men, women, beauty, diet), also match by categoryId
  if (
    (symptomId === 'men' && product.categoryId === 'cat-men') ||
    (symptomId === 'women' && product.categoryId === 'cat-women') ||
    (symptomId === 'beauty' && product.categoryId === 'cat-beauty') ||
    (symptomId === 'digestion' && product.categoryId === 'cat-diet')
  ) {
    return true;
  }

  return false;
}

/**
 * Complementary category matrix for "Frequently Bought Together"
 */
const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  'cat-iherb': ['cat-health', 'cat-honey', 'cat-iherb'],
  'cat-health': ['cat-iherb', 'cat-honey', 'cat-hijama'],
  'cat-men': ['cat-honey', 'cat-iherb', 'cat-men', 'cat-muslim'],
  'cat-women': ['cat-beauty', 'cat-iherb', 'cat-women', 'cat-honey'],
  'cat-honey': ['cat-health', 'cat-men', 'cat-iherb', 'cat-muslim'],
  'cat-hijama': ['cat-health', 'cat-honey', 'cat-muslim'],
  'cat-muslim': ['cat-honey', 'cat-beauty', 'cat-health'],
  'cat-beauty': ['cat-women', 'cat-iherb', 'cat-muslim'],
  'cat-diet': ['cat-iherb', 'cat-health', 'cat-beauty'],
};

/**
 * Returns smart "Frequently Bought Together" recommendations for a specific product.
 */
export function getFrequentlyBoughtTogether(
  currentProduct: Product,
  allProducts: Product[],
  excludeIds: string[] = [],
  limit: number = 4
): Product[] {
  const excluded = new Set<string>([currentProduct.id, ...excludeIds]);
  const available = allProducts.filter((p) => p.inStock && !excluded.has(p.id));
  if (available.length === 0) {
    return allProducts.filter((p) => !excluded.has(p.id)).slice(0, limit);
  }

  const currentText = `${currentProduct.titleRu} ${currentProduct.descriptionRu || ''}`.toLowerCase();
  const preferredCats = COMPLEMENTARY_CATEGORIES[currentProduct.categoryId] || [
    currentProduct.categoryId,
    'cat-iherb',
    'cat-health',
  ];

  // Score each candidate product
  const scored = available.map((candidate) => {
    let score = 0;
    const candText = `${candidate.titleRu} ${candidate.descriptionRu || ''}`.toLowerCase();

    // 1. Synergistic pair bonuses (D3 + Magnesium/Omega, Collagen + Vitamin C, Honey + Black Seed, etc.)
    if (
      (currentText.includes('d3') || currentText.includes('д3')) &&
      (candText.includes('магний') || candText.includes('омега') || candText.includes('кальций'))
    ) {
      score += 35;
    }
    if (
      candText.includes('d3') &&
      (currentText.includes('магний') || currentText.includes('омега') || currentText.includes('кальций'))
    ) {
      score += 35;
    }
    if (
      currentText.includes('коллаген') &&
      (candText.includes('витамин c') || candText.includes('витамин с') || candText.includes('биотин') || candText.includes('гиалурон'))
    ) {
      score += 35;
    }
    if (
      currentText.includes('железо') &&
      (candText.includes('витамин c') || candText.includes('витамин с') || candText.includes('фолиев'))
    ) {
      score += 35;
    }
    if (
      (currentText.includes('тмин') || currentText.includes('кыст')) &&
      (candText.includes('мед') || candText.includes('мёд') || candText.includes('прополис') || candText.includes('витамин'))
    ) {
      score += 30;
    }

    // 2. Same category or complementary category bonus
    if (candidate.categoryId === currentProduct.categoryId) {
      score += 18;
    } else {
      const catIdx = preferredCats.indexOf(candidate.categoryId);
      if (catIdx !== -1) {
        score += 24 - catIdx * 4;
      }
    }

    // 3. Bestseller / Hit bonus
    if (candidate.isHit) score += 15;
    if (candidate.isNew) score += 6;

    // Deterministic tie-breaker based on ID characters so recommendations stay stable
    const hash =
      (candidate.id.charCodeAt(candidate.id.length - 1) || 0) +
      (currentProduct.id.charCodeAt(currentProduct.id.length - 1) || 0);
    score += (hash % 7);

    return { product: candidate, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((item) => item.product);
}

/**
 * Returns smart recommendations for the Cart Drawer based on all items currently in the cart.
 */
export function getCartRecommendations(
  cartProducts: Product[],
  allProducts: Product[],
  limit: number = 3
): Product[] {
  const cartIds = cartProducts.map((p) => p.id);
  if (cartProducts.length === 0) {
    return allProducts
      .filter((p) => p.inStock && p.isHit)
      .slice(0, limit);
  }

  // Gather recommendations anchored on the first (most recent/primary) cart item
  const anchor = cartProducts[cartProducts.length - 1] || cartProducts[0];
  return getFrequentlyBoughtTogether(anchor, allProducts, cartIds, limit);
}

import { Category, Language, Product } from '../types';
import { SYMPTOM_GOALS, SymptomGoal, doesProductMatchSymptom } from './recommendations';

export interface KeywordSuggestion {
  termRu: string;
  termKz: string;
  categoryHintId?: string;
  symptomHintId?: string;
  keywords: string[];
}

export const POPULAR_SEARCH_KEYWORDS: KeywordSuggestion[] = [
  {
    termRu: 'Омега-3 (Omega-3)',
    termKz: 'Омега-3 (Балық майы)',
    categoryHintId: 'cat-iherb',
    keywords: ['омега', 'omega', 'рыбий жир', 'балық майы', 'fish oil'],
  },
  {
    termRu: 'Витамин D3',
    termKz: 'D3 дәрумені',
    categoryHintId: 'cat-iherb',
    keywords: ['d3', 'д3', 'витамин д', 'витамин d', 'холекальциферол'],
  },
  {
    termRu: 'Чёрный тмин',
    termKz: 'Қара зере майы',
    categoryHintId: 'cat-health',
    keywords: ['тмин', 'черный тмин', 'чёрный тмин', 'қара зере', 'black seed'],
  },
  {
    termRu: 'Магний (Антистресс)',
    termKz: 'Магний (Жүйке мен ұйқы)',
    categoryHintId: 'cat-iherb',
    symptomHintId: 'energy',
    keywords: ['магний', 'magnesium', 'стресс', 'сон', 'нервы', 'b6'],
  },
  {
    termRu: 'Коллаген',
    termKz: 'Коллаген',
    categoryHintId: 'cat-beauty',
    symptomHintId: 'joints',
    keywords: ['коллаген', 'collagen', 'суставы', 'кожа', 'гиалурон'],
  },
  {
    termRu: 'Эпимедиумная паста',
    termKz: 'Эпимедиум пастасы',
    categoryHintId: 'cat-men',
    symptomHintId: 'men',
    keywords: ['эпимедиум', 'паста', 'themra', 'мужское', 'тонус', 'мака'],
  },
  {
    termRu: 'Кыст аль-Хинди',
    termKz: 'Қыст әл-Хинди',
    categoryHintId: 'cat-health',
    symptomHintId: 'immunity',
    keywords: ['кыст', 'қыст', 'хинди', 'иммунитет', 'простуда'],
  },
  {
    termRu: 'Детские витамины',
    termKz: 'Балалар дәрумендері',
    symptomHintId: 'kids',
    keywords: ['детск', 'детям', 'ребенк', 'балалар', 'kids', 'childlife'],
  },
  {
    termRu: 'Миск и парфюм',
    termKz: 'Миск және хош иістер',
    categoryHintId: 'cat-muslim',
    keywords: ['миск', 'мускус', 'аромат', 'духи', 'парфюм', 'масляные', 'хош иіс'],
  },
  {
    termRu: 'Натуральный мёд',
    termKz: 'Табиғи бал',
    categoryHintId: 'cat-honey',
    keywords: ['мед', 'мёд', 'бал', 'прополис', 'пыльца'],
  },
  {
    termRu: 'Железо (Ферритин)',
    termKz: 'Темір (Ферритин)',
    categoryHintId: 'cat-women',
    symptomHintId: 'women',
    keywords: ['железо', 'iron', 'ферритин', 'гемоглобин', 'анемия', 'темір'],
  },
  {
    termRu: 'Хлорофилл и Детокс',
    termKz: 'Хлорофилл және Детокс',
    categoryHintId: 'cat-diet',
    symptomHintId: 'digestion',
    keywords: ['хлорофилл', 'детокс', 'спирулина', 'пробиотик', 'очищение', 'похудение'],
  },
];

/**
 * Synonym groups so that searching in Russian, Kazakh, or English/translit
 * matches equivalent concepts seamlessly.
 */
const SYNONYM_GROUPS: string[][] = [
  ['d3', 'д3', 'витамин д', 'витамин d', 'д-3', 'd-3'],
  ['омега', 'omega', 'рыбий жир', 'балық майы', 'fish oil'],
  ['тмин', 'черный тмин', 'чёрный тмин', 'қара зере', 'black seed', 'nigella'],
  ['магний', 'magnesium', 'магнезиум', 'цитрат магния', 'глицинат'],
  ['коллаген', 'collagen', 'колаген'],
  ['кыст', 'қыст', 'кост аль хинди', 'кыст аль-хинди'],
  ['мед', 'мёд', 'бал', 'honey'],
  ['миск', 'мускус', 'духи', 'парфюм', 'аромат', 'аттар', 'хош иіс'],
  ['детск', 'детей', 'детям', 'ребенк', 'балалар', 'балаға', 'kids', 'child', 'childlife'],
  ['мужск', 'мужчин', 'ерлер', 'паста', 'эпимедиум', 'мака', 'трибулус'],
  ['женск', 'женщин', 'әйел', 'фолиевая', 'примула', 'инозитол'],
  ['железо', 'iron', 'ферритин', 'гемоглобин', 'темір'],
  ['цинк', 'zinc', 'мырыш'],
  ['кальций', 'calcium', 'сүйек'],
  ['биотин', 'biotin', 'волос', 'шаш'],
  ['хиджама', 'банки', 'ланцет', 'кровопускание'],
  ['похуден', 'детокс', 'стройност', 'арықтау', 'хлорофилл', 'спирулина'],
  ['сустав', 'буын', 'глюкозамин', 'хондроитин', 'мсм', 'msm'],
  ['иммун', 'простуд', 'вирус', 'витамин с', 'витамин c', 'прополис'],
];

/**
 * Expands a raw search query into normalized tokens + synonym variations.
 */
export function expandSearchQuery(rawQuery: string): {
  cleanQuery: string;
  tokens: string[];
  expandedTerms: string[];
} {
  const cleanQuery = rawQuery.toLowerCase().trim().replace(/ё/g, 'е');
  if (!cleanQuery) {
    return { cleanQuery: '', tokens: [], expandedTerms: [] };
  }

  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  const expandedSet = new Set<string>([cleanQuery, ...tokens]);

  for (const group of SYNONYM_GROUPS) {
    const normalizedGroup = group.map((g) => g.toLowerCase().replace(/ё/g, 'е'));
    const matchesGroup = normalizedGroup.some(
      (syn) =>
        cleanQuery.includes(syn) ||
        tokens.some((t) => t.length >= 2 && (syn.includes(t) || t.includes(syn)))
    );
    if (matchesGroup) {
      normalizedGroup.forEach((syn) => expandedSet.add(syn));
    }
  }

  return {
    cleanQuery,
    tokens,
    expandedTerms: Array.from(expandedSet),
  };
}

/**
 * Scores and checks if a product matches the user's search query across:
 * - Product title (RU/KZ)
 * - Category name (RU/KZ)
 * - SKU
 * - Benefits & Keywords (RU/KZ)
 * - Specifications & Description (RU/KZ)
 * - Symptom / Health Goal match
 */
export function scoreProductSearchMatch(
  product: Product,
  rawQuery: string,
  categoriesMap: Map<string, Category>
): number {
  const { cleanQuery, tokens, expandedTerms } = expandSearchQuery(rawQuery);
  if (!cleanQuery) return 1;

  const titleRu = (product.titleRu || '').toLowerCase().replace(/ё/g, 'е');
  const titleKz = (product.titleKz || '').toLowerCase().replace(/ё/g, 'е');
  const descRu = (product.descriptionRu || '').toLowerCase().replace(/ё/g, 'е');
  const descKz = (product.descriptionKz || '').toLowerCase().replace(/ё/g, 'е');
  const specsRu = (product.specsRu || '').toLowerCase().replace(/ё/g, 'е');
  const specsKz = (product.specsKz || '').toLowerCase().replace(/ё/g, 'е');
  const benefitsText = [...(product.benefitsRu || []), ...(product.benefitsKz || [])]
    .join(' ')
    .toLowerCase()
    .replace(/ё/g, 'е');
  const sku = (product.sku || '').toLowerCase();

  const category = categoriesMap.get(product.categoryId);
  const catNameRu = (category?.nameRu || '').toLowerCase().replace(/ё/g, 'е');
  const catNameKz = (category?.nameKz || '').toLowerCase().replace(/ё/g, 'е');

  let score = 0;

  // 1. Direct full query match in Title or SKU (Highest priority)
  if (titleRu.includes(cleanQuery) || titleKz.includes(cleanQuery)) {
    score += titleRu.startsWith(cleanQuery) || titleKz.startsWith(cleanQuery) ? 120 : 90;
  }
  if (sku && sku.includes(cleanQuery)) {
    score += 100;
  }

  // 2. Direct match in Category Name (searching by category!)
  if (catNameRu.includes(cleanQuery) || catNameKz.includes(cleanQuery)) {
    score += 65;
  }

  // 3. Direct match in Benefits or Specs
  if (benefitsText.includes(cleanQuery) || specsRu.includes(cleanQuery) || specsKz.includes(cleanQuery)) {
    score += 50;
  }

  // 4. Direct match in Description
  if (descRu.includes(cleanQuery) || descKz.includes(cleanQuery)) {
    score += 35;
  }

  // 5. Multi-token check: if user typed multiple words (e.g. "детский омега"), check if all tokens match somewhere
  if (tokens.length > 1) {
    const fullCorpus = `${titleRu} ${titleKz} ${catNameRu} ${catNameKz} ${benefitsText} ${specsRu} ${descRu} ${sku}`;
    const allTokensMatch = tokens.every((t) => fullCorpus.includes(t));
    if (allTokensMatch) {
      score += 75;
    }
  }

  // 6. Expanded synonym & keyword matching
  if (score === 0) {
    for (const syn of expandedTerms) {
      if (syn.length < 2) continue;
      if (titleRu.includes(syn) || titleKz.includes(syn)) {
        score += 55;
        break;
      }
      if (catNameRu.includes(syn) || catNameKz.includes(syn)) {
        score += 40;
        break;
      }
      if (benefitsText.includes(syn) || specsRu.includes(syn)) {
        score += 30;
        break;
      }
      if (descRu.includes(syn) || descKz.includes(syn)) {
        score += 20;
        break;
      }
    }
  }

  if (score > 0 && product.isHit) {
    score += 5;
  }
  if (score > 0 && product.inStock) {
    score += 3;
  }

  return score;
}

/**
 * Returns categories that match the typed search query.
 */
export function getMatchingCategories(
  rawQuery: string,
  categories: Category[]
): Category[] {
  const { cleanQuery, expandedTerms } = expandSearchQuery(rawQuery);
  if (!cleanQuery) return [];

  return categories.filter((cat) => {
    if (cat.id === 'cat-all') return false;
    const nameRu = (cat.nameRu || '').toLowerCase().replace(/ё/g, 'е');
    const nameKz = (cat.nameKz || '').toLowerCase().replace(/ё/g, 'е');
    if (nameRu.includes(cleanQuery) || nameKz.includes(cleanQuery)) return true;
    return expandedTerms.some(
      (term) => term.length >= 3 && (nameRu.includes(term) || nameKz.includes(term))
    );
  });
}

/**
 * Returns symptom/health goals that match the typed search query.
 */
export function getMatchingSymptoms(rawQuery: string): SymptomGoal[] {
  const { cleanQuery, expandedTerms } = expandSearchQuery(rawQuery);
  if (!cleanQuery || cleanQuery.length < 2) return [];

  return SYMPTOM_GOALS.filter((goal) => {
    const text = `${goal.titleRu} ${goal.titleKz} ${goal.subtitleRu} ${goal.subtitleKz} ${goal.keywords.join(' ')}`
      .toLowerCase()
      .replace(/ё/g, 'е');
    if (text.includes(cleanQuery)) return true;
    return expandedTerms.some((term) => term.length >= 3 && text.includes(term));
  }).slice(0, 3);
}

/**
 * Returns keyword autocomplete suggestions matching the current input.
 */
export function getMatchingKeywordSuggestions(
  rawQuery: string,
  products: Product[],
  lang: Language,
  limit: number = 5
): string[] {
  const { cleanQuery } = expandSearchQuery(rawQuery);
  const isKz = lang === 'kz';

  if (!cleanQuery) {
    return POPULAR_SEARCH_KEYWORDS.slice(0, 8).map((k) => (isKz ? k.termKz : k.termRu));
  }

  const results = new Set<string>();

  // 1. Match from curated popular keywords
  for (const item of POPULAR_SEARCH_KEYWORDS) {
    const label = isKz ? item.termKz : item.termRu;
    const allText = `${item.termRu} ${item.termKz} ${item.keywords.join(' ')}`
      .toLowerCase()
      .replace(/ё/g, 'е');
    if (allText.includes(cleanQuery)) {
      results.add(label);
    }
    if (results.size >= limit) break;
  }

  // 2. Extract matching short product names / brands from catalog
  if (results.size < limit) {
    for (const p of products) {
      const title = (isKz && p.titleKz?.trim() ? p.titleKz : p.titleRu).trim();
      const norm = title.toLowerCase().replace(/ё/g, 'е');
      if (norm.includes(cleanQuery)) {
        // Take concise first part of title (up to comma or 38 chars)
        const shortTitle = title.split(/[—•|]/)[0].trim();
        if (shortTitle.length <= 45) {
          results.add(shortTitle);
        }
      }
      if (results.size >= limit) break;
    }
  }

  return Array.from(results).slice(0, limit);
}

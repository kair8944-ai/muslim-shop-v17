import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  TrendingUp,
  Layers,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Plus,
  Check,
} from 'lucide-react';
import { Category, Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';
import { scoreProductSearchMatch } from '../utils/searchEngine';
import { SYMPTOM_GOALS, doesProductMatchSymptom } from '../utils/recommendations';

interface SmartSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  products: Product[];
  categories: Category[];
  productCounts: Record<string, number>;
  lang: Language;
  onSelectCategory?: (categoryId: string) => void;
  onSelectSymptom?: (symptomId: string) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onAfterSelect?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputId?: string;
}

const POPULAR_SEARCH_KEYWORDS = [
  { termRu: 'Омега-3', termKz: 'Омега-3' },
  { termRu: 'Коллаген', termKz: 'Коллаген' },
  { termRu: 'Витамин Д3', termKz: 'Д3 дәрумені' },
  { termRu: 'Магний B6', termKz: 'Магний B6' },
  { termRu: 'Черный тмин', termKz: 'Қара зере' },
  { termRu: 'Эпимедиумная паста', termKz: 'Эпимедиум пастасы' },
  { termRu: 'Цинк', termKz: 'Мырыш' },
  { termRu: 'Железо', termKz: 'Темір' },
  { termRu: 'Хиджама', termKz: 'Хиджама' },
  { termRu: 'Натуральный мед', termKz: 'Табиғи бал' },
];

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  products,
  categories,
  productCounts,
  lang,
  onSelectCategory,
  onSelectSymptom,
  onOpenProduct,
  onAddToCart,
  onAfterSelect,
  placeholder,
  autoFocus = false,
  inputId = 'smart-search-input',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isKz = lang === 'kz';

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();

  // Categories Map
  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Dynamic Keyword Autocomplete Suggestions
  const keywordSuggestions = useMemo(() => {
    if (!cleanQuery) return [];
    const set = new Set<string>();

    POPULAR_SEARCH_KEYWORDS.forEach((k) => {
      const term = isKz ? k.termKz : k.termRu;
      if (term.toLowerCase().includes(cleanQuery)) {
        set.add(term);
      }
    });

    categories.forEach((cat) => {
      const name = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;
      if (name.toLowerCase().includes(cleanQuery)) {
        set.add(name);
      }
    });

    products.forEach((p) => {
      const title = isKz && p.titleKz?.trim() ? p.titleKz : p.titleRu;
      if (title.toLowerCase().includes(cleanQuery)) {
        const words = title.split(/\s+/).slice(0, 4).join(' ');
        set.add(words);
      }
    });

    return Array.from(set).slice(0, 5);
  }, [cleanQuery, isKz, categories, products]);

  // Matching Categories
  const matchedCategories = useMemo(() => {
    if (!cleanQuery) return [];
    return categories
      .filter((c) => c.id !== 'cat-all')
      .filter((c) => {
        const nameRu = c.nameRu.toLowerCase();
        const nameKz = (c.nameKz || '').toLowerCase();
        return nameRu.includes(cleanQuery) || nameKz.includes(cleanQuery);
      })
      .slice(0, 4);
  }, [cleanQuery, categories]);

  // Matching Symptoms / Health Goals
  const matchedSymptoms = useMemo(() => {
    if (!cleanQuery) return [];
    return SYMPTOM_GOALS.filter((g) => {
      if (g.id === 'all') return false;
      const titleRu = g.titleRu.toLowerCase();
      const titleKz = g.titleKz.toLowerCase();
      const subRu = (g.subtitleRu || '').toLowerCase();
      const kw = g.keywords.some((k) => cleanQuery.includes(k.toLowerCase()) || k.toLowerCase().includes(cleanQuery));
      return titleRu.includes(cleanQuery) || titleKz.includes(cleanQuery) || subRu.includes(cleanQuery) || kw;
    }).slice(0, 3);
  }, [cleanQuery]);

  // Scored Product Matches
  const scoredProducts = useMemo(() => {
    if (!cleanQuery) return [];
    const list: { product: Product; score: number }[] = [];

    products.forEach((prod) => {
      const score = scoreProductSearchMatch(prod, cleanQuery, categoriesMap);
      if (score > 0) {
        list.push({ product: prod, score });
      }
    });

    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.product.inStock !== a.product.inStock) return b.product.inStock ? 1 : -1;
      return 0;
    });

    return list.map((item) => item.product);
  }, [cleanQuery, products]);

  const topProducts = useMemo(() => scoredProducts.slice(0, 6), [scoredProducts]);
  const totalMatchedCount = scoredProducts.length;

  const scrollToCatalogSection = () => {
    const el = document.getElementById('catalog-products-section') || document.getElementById('products-grid');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePickKeyword = (kw: string) => {
    onSearchChange(kw);
    setIsOpen(false);
    scrollToCatalogSection();
    if (onAfterSelect) onAfterSelect();
  };

  const handlePickCategory = (catId: string) => {
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
    setIsOpen(false);
    scrollToCatalogSection();
    if (onAfterSelect) onAfterSelect();
  };

  const handlePickSymptom = (symptomId: string) => {
    if (onSelectSymptom) {
      onSelectSymptom(symptomId);
    }
    setIsOpen(false);
    scrollToCatalogSection();
    if (onAfterSelect) onAfterSelect();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setIsOpen(false);
      scrollToCatalogSection();
      if (onAfterSelect) onAfterSelect();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="text-[#B38F48] font-black underline decoration-[#C5A059]/40">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Modern Flip.kz style search bar: integrated flex container, crisp borders, no overlapping absolute hacks */}
      <div className="relative w-full flex items-center bg-white rounded-xl sm:rounded-2xl border-2 border-slate-300 focus-within:border-slate-900 focus-within:ring-4 focus-within:ring-slate-900/10 shadow-xs transition-all overflow-hidden h-12 sm:h-13">
        <Search className="w-5 h-5 text-slate-400 ml-3.5 sm:ml-4 shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={searchQuery}
          autoFocus={autoFocus}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onSearchChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            placeholder ||
            (isKz
              ? 'Тауарларды, дәрумендерді іздеу...'
              : 'Поиск товаров по названию или категории...')
          }
          autoComplete="off"
          className="w-full h-full px-3 text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:truncate bg-transparent focus:outline-none"
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            className="p-1.5 mr-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer shrink-0"
            title={isKz ? 'Тазалау' : 'Очистить поиск'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 'Найти' button integrated into search bar */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            scrollToCatalogSection();
            if (onAfterSelect) onAfterSelect();
          }}
          className="h-full px-4 sm:px-6 bg-slate-900 hover:bg-black active:bg-slate-950 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer select-none border-l border-slate-200"
        >
          <Search className="w-4 h-4 text-[#C5A059]" />
          <span className="hidden xs:inline">{isKz ? 'Табу' : 'Найти'}</span>
        </button>
      </div>

      {/* Autocomplete & Smart Suggestions Dropdown */}
      {isOpen && (
        <div
          id={`${inputId}-dropdown`}
          className="absolute left-0 right-0 top-full mt-2 z-[120] bg-white rounded-2xl border-2 border-slate-200 shadow-2xl overflow-hidden max-h-[75vh] overflow-y-auto divide-y divide-slate-100 text-slate-800"
        >
          {!cleanQuery ? (
            /* STATE 1: Empty Input -> Popular Keywords & Categories */
            <div className="p-4 sm:p-5 space-y-4">
              {/* Popular Search Terms */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isKz ? 'Жиі ізделетін сұраныстар:' : 'Популярные запросы:'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCH_KEYWORDS.slice(0, 10).map((item, idx) => {
                    const label = isKz ? item.termKz : item.termRu;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePickKeyword(label)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-amber-50 hover:border-amber-300 text-slate-800 hover:text-black border border-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Category Search */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>
                    {isKz ? 'Санаттар бойынша жылдам өту:' : 'Популярные категории:'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {categories
                    .filter((c) => c.id !== 'cat-all')
                    .slice(0, 9)
                    .map((cat) => {
                      const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;
                      const count = productCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handlePickCategory(cat.id)}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#C5A059] hover:bg-amber-50/40 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat.icon || '✨'}</span>
                            <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                              {catName}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-slate-600 font-bold shrink-0">
                            {count}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          ) : (
            /* STATE 2: Active Query -> Keyword Autocomplete, Categories, Symptoms & Instant Products */
            <div className="divide-y divide-slate-100">
              {/* A. Keyword Autocomplete Pills */}
              {keywordSuggestions.length > 0 && (
                <div className="p-3 sm:px-4 bg-slate-50">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{isKz ? 'Автоматты ұсыныстар:' : 'Подсказки:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {keywordSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePickKeyword(sug)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-900 hover:text-white text-slate-800 border border-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Search className="w-3.5 h-3.5 text-slate-400" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* B. Matching Categories & Health Goals */}
              {(matchedCategories.length > 0 || matchedSymptoms.length > 0) && (
                <div className="p-3 sm:px-4 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>
                      {isKz
                        ? 'Сәйкес санаттар:'
                        : 'Подходящие категории:'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {matchedCategories.map((cat) => {
                      const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;
                      const count = productCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handlePickCategory(cat.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 text-slate-800 hover:text-white border border-slate-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{cat.icon || '✨'}</span>
                          <span>{catName}</span>
                          <span className="text-xs font-mono tabular-nums opacity-75">
                            ({count})
                          </span>
                        </button>
                      );
                    })}

                    {matchedSymptoms.map((sym) => (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => handlePickSymptom(sym.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-200 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{isKz ? sym.titleKz : sym.titleRu}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Instant Product Matches (Generous Row with clear title, price, button) */}
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  <span>
                    {isKz
                      ? `Табылған тауарлар (${totalMatchedCount}):`
                      : `Найденные товары (${totalMatchedCount}):`}
                  </span>
                  {totalMatchedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        scrollToCatalogSection();
                        if (onAfterSelect) onAfterSelect();
                      }}
                      className="text-[#B38F48] hover:text-black font-extrabold flex items-center gap-1 cursor-pointer text-xs"
                    >
                      <span>{isKz ? 'Барлығын көру' : 'Смотреть все'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {topProducts.length === 0 ? (
                  <div className="py-6 text-center text-sm text-slate-500 space-y-1.5">
                    <p className="font-bold text-slate-800">
                      {isKz
                        ? `«${cleanQuery}» бойынша тікелей сәйкестік табылмады`
                        : `По запросу «${cleanQuery}» точных совпадений не найдено`}
                    </p>
                    <p className="text-xs text-slate-400">
                      {isKz
                        ? 'Жоғарыдағы танымал сөздерді немесе санатты таңдап көріңіз'
                        : 'Попробуйте выбрать категорию или одно из ключевых слов выше'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topProducts.map((prod) => {
                      const title = isKz && prod.titleKz?.trim() ? prod.titleKz : prod.titleRu;
                      const cat = categoriesMap.get(prod.categoryId);
                      const catName = cat ? (isKz && cat.nameKz ? cat.nameKz : cat.nameRu) : '';

                      return (
                        <div
                          key={prod.id}
                          className="group p-2.5 sm:p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/30 border border-slate-200/90 flex items-center justify-between gap-3 transition-all"
                        >
                          <div
                            onClick={() => {
                              setIsOpen(false);
                              onOpenProduct(prod);
                              if (onAfterSelect) onAfterSelect();
                            }}
                            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <img
                              src={prod.images[0]}
                              alt={title}
                              referrerPolicy="no-referrer"
                              className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#B38F48] transition-colors">
                                {highlightText(title, cleanQuery)}
                              </h4>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 truncate">
                                {catName && <span className="font-semibold text-slate-700">{catName}</span>}
                                {catName && <span>•</span>}
                                <span className="font-mono">Арт: {prod.sku}</span>
                              </div>
                              <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-base sm:text-lg font-black text-slate-900 font-sans tracking-tight">
                                  {formatPrice(prod.price)}
                                </span>
                                {prod.oldPrice && prod.oldPrice > prod.price && (
                                  <span className="text-xs text-slate-400 line-through">
                                    {formatPrice(prod.oldPrice)}
                                  </span>
                                )}
                                {!prod.inStock && (
                                  <span className="text-xs text-rose-600 font-bold ml-1">
                                    {isKz ? 'Жақында' : 'Под заказ'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {prod.inStock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddToCart(prod);
                                setRecentlyAddedId(prod.id);
                                setTimeout(() => setRecentlyAddedId(null), 1800);
                              }}
                              className={`h-10 px-3.5 rounded-xl text-xs sm:text-sm font-extrabold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-xs ${
                                recentlyAddedId === prod.id
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-900 hover:bg-black text-white'
                              }`}
                              title={isKz ? 'Себетке қосу' : 'Добавить в корзину'}
                            >
                              {recentlyAddedId === prod.id ? (
                                <>
                                  <Check className="w-4 h-4 text-emerald-200 stroke-[3]" />
                                  <span>{isKz ? 'Қосылды!' : 'Добавлено!'}</span>
                                </>
                              ) : (
                                <>
                                  <ShoppingBag className="w-4 h-4 text-[#C5A059]" />
                                  <span className="hidden min-[420px]:inline">
                                    {isKz ? 'Себетке' : 'В корзину'}
                                  </span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* D. Footer of dropdown */}
              <div className="p-3 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <span>{isKz ? 'Enter басып іздеңіз' : 'Нажмите Enter для поиска'}</span>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  {isKz ? 'Жабу' : 'Закрыть'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

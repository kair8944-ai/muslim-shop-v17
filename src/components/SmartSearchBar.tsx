import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  Sparkles,
  Layers,
  ShoppingBag,
  ArrowRight,
  Plus,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';
import { Category, Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';
import {
  POPULAR_SEARCH_KEYWORDS,
  scoreProductSearchMatch,
  getMatchingCategories,
  getMatchingSymptoms,
  getMatchingKeywordSuggestions,
} from '../utils/searchEngine';

interface SmartSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  products: Product[];
  categories: Category[];
  productCounts: Record<string, number>;
  lang: Language;
  onSelectCategory: (categoryId: string) => void;
  onSelectSymptom?: (symptomId: string) => void;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  placeholder?: string;
  inputId?: string;
  autoFocus?: boolean;
  onAfterSelect?: () => void;
}

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
  placeholder,
  inputId = 'smart-search-input',
  autoFocus = false,
  onAfterSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isKz = lang === 'kz';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const cleanQuery = searchQuery.trim();

  // 1. Keyword suggestions
  const keywordSuggestions = useMemo(
    () => getMatchingKeywordSuggestions(cleanQuery, products, lang, 5),
    [cleanQuery, products, lang]
  );

  // 2. Matching categories
  const matchedCategories = useMemo(
    () => getMatchingCategories(cleanQuery, categories),
    [cleanQuery, categories]
  );

  // 3. Matching health goals / symptoms
  const matchedSymptoms = useMemo(
    () => getMatchingSymptoms(cleanQuery),
    [cleanQuery]
  );

  // 4. Matching products ranked by relevance
  const { topProducts, totalMatchedCount } = useMemo(() => {
    if (!cleanQuery) {
      return { topProducts: [], totalMatchedCount: 0 };
    }
    const scored: { product: Product; score: number }[] = [];
    for (const p of products) {
      const s = scoreProductSearchMatch(p, cleanQuery, categoriesMap);
      if (s > 0) {
        scored.push({ product: p, score: s });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    return {
      topProducts: scored.slice(0, 5).map((item) => item.product),
      totalMatchedCount: scored.length,
    };
  }, [cleanQuery, products, categoriesMap]);

  const scrollToCatalogSection = () => {
    setTimeout(() => {
      const el = document.getElementById('catalog-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'Enter') {
      setIsOpen(false);
      scrollToCatalogSection();
      if (onAfterSelect) onAfterSelect();
    }
  };

  const handlePickKeyword = (kw: string) => {
    // Extract clean search word if it has parentheses
    const mainTerm = kw.split('(')[0].trim();
    onSearchChange(mainTerm);
    setIsOpen(false);
    scrollToCatalogSection();
    if (onAfterSelect) onAfterSelect();
  };

  const handlePickCategory = (catId: string) => {
    onSelectCategory(catId);
    onSearchChange('');
    setIsOpen(false);
    scrollToCatalogSection();
    if (onAfterSelect) onAfterSelect();
  };

  const handlePickSymptom = (symId: string) => {
    if (onSelectSymptom) {
      onSelectSymptom(symId);
    }
    onSearchChange('');
    setIsOpen(false);
    scrollToCatalogSection();
    if (onAfterSelect) onAfterSelect();
  };

  // Highlight matching substring in product title
  const highlightText = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-amber-200/80 text-stone-950 font-extrabold rounded px-0.5"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Box */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-emerald-800 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              ? 'Өнімді, санатты немесе симптомды іздеу (мысалы: омега, қара зере, буын)...'
              : 'Поиск по товарам, категориям и симптомам (омега, тмин, иммунитет, миск)...')
          }
          autoComplete="off"
          className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl border border-stone-300 bg-stone-50/90 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800/25 focus:border-emerald-800 focus:bg-white transition-all shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            title={isKz ? 'Тазалау' : 'Очистить поиск'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete & Smart Suggestions Dropdown */}
      {isOpen && (
        <div
          id={`${inputId}-dropdown`}
          className="absolute left-0 right-0 top-full mt-2 z-[120] bg-white rounded-3xl border border-stone-200/95 shadow-[0_20px_50px_rgba(0,0,0,0.18)] overflow-hidden max-h-[78vh] overflow-y-auto divide-y divide-stone-100"
        >
          {!cleanQuery ? (
            /* STATE 1: Empty Input -> Popular Keywords & Categories */
            <div className="p-4 space-y-4">
              {/* Popular Search Terms */}
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 mb-2.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isKz ? 'Жиі ізделетін сұраныстар:' : 'Популярные ключевые слова:'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SEARCH_KEYWORDS.slice(0, 10).map((item, idx) => {
                    const label = isKz ? item.termKz : item.termRu;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePickKeyword(label)}
                        className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-emerald-950 text-stone-800 hover:text-amber-300 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Search className="w-3 h-3 opacity-60" />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Category Search */}
              <div className="pt-3 border-t border-stone-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 mb-2.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {isKz ? 'Санаттар бойынша жылдам өту:' : 'Быстрый поиск по категориям:'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
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
                          className="p-2 rounded-xl border border-stone-200/80 hover:border-emerald-700/50 hover:bg-emerald-50/40 text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{cat.icon || '✨'}</span>
                            <span className="text-xs font-bold text-stone-800 truncate">
                              {catName}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono tabular-nums text-stone-400 font-bold shrink-0">
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
            <div className="divide-y divide-stone-100">
              {/* A. Keyword Autocomplete Pills */}
              {keywordSuggestions.length > 0 && (
                <div className="p-3 sm:px-4 bg-stone-50/70">
                  <div className="text-[11px] font-bold text-stone-500 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{isKz ? 'Автоматты ұсыныстар:' : 'Автоподсказки по запросу:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {keywordSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePickKeyword(sug)}
                        className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-950 text-stone-800 hover:text-amber-300 border border-stone-200/90 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Search className="w-3 h-3 text-emerald-700" />
                        <span>{sug}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* B. Matching Categories & Health Goals */}
              {(matchedCategories.length > 0 || matchedSymptoms.length > 0) && (
                <div className="p-3 sm:px-4 space-y-2">
                  <div className="text-[11px] font-bold text-stone-500 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-700" />
                    <span>
                      {isKz
                        ? 'Сәйкес санаттар мен бағыттар:'
                        : 'Подходящие категории и задачи:'}
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
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-900 text-emerald-950 hover:text-white border border-emerald-200 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <span>{cat.icon || '✨'}</span>
                          <span>{catName}</span>
                          <span className="text-[10px] font-mono tabular-nums opacity-75">
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
                        className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-400 text-amber-950 hover:text-stone-950 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5 text-amber-700" />
                        <span>{isKz ? sym.titleKz : sym.titleRu}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Instant Product Matches */}
              <div className="p-3 sm:px-4">
                <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-2.5">
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
                      className="text-emerald-800 hover:text-emerald-950 font-extrabold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isKz ? 'Барлығын көру' : 'Смотреть все'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {topProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-500 space-y-2">
                    <p className="font-semibold text-stone-700">
                      {isKz
                        ? `«${cleanQuery}» бойынша тікелей сәйкестік табылмады`
                        : `По запросу «${cleanQuery}» точных совпадений не найдено`}
                    </p>
                    <p className="text-[11px] text-stone-400">
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
                          className="group p-2 rounded-2xl border border-stone-200/70 hover:border-emerald-700/40 hover:bg-stone-50/80 flex items-center justify-between gap-2.5 transition-all"
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
                              className="w-11 h-14 rounded-xl object-cover border border-stone-200 bg-stone-100 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate group-hover:text-emerald-950">
                                {highlightText(title, cleanQuery)}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mt-0.5 truncate">
                                {catName && <span>{catName}</span>}
                                {catName && <span aria-hidden="true">·</span>}
                                <span className="font-mono tabular-nums">Арт: {prod.sku}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs sm:text-sm font-extrabold text-emerald-950 font-mono tabular-nums">
                                  {formatPrice(prod.price)}
                                </span>
                                {!prod.inStock && (
                                  <span className="text-[10px] text-rose-700 font-bold">
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
                              }}
                              className="px-2.5 py-2 rounded-xl bg-emerald-950 hover:bg-amber-400 text-white hover:text-stone-950 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              title={isKz ? 'Себетке қосу' : 'Добавить в корзину'}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* D. Footer CTA: Show all results in catalog */}
              {totalMatchedCount > 0 && (
                <div className="p-3 bg-stone-50">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      scrollToCatalogSection();
                      if (onAfterSelect) onAfterSelect();
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                  >
                    <span>
                      {isKz
                        ? `Каталогтан барлық нәтижені көрсету (${totalMatchedCount})`
                        : `Показать все найденные товары в каталоге (${totalMatchedCount})`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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
          className="bg-amber-400 text-stone-950 font-extrabold rounded px-1"
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
      {/* Input Box — Professional e-commerce style with 'Найти' button */}
      <div className="relative w-full flex items-center">
        <Search className="w-5 h-5 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
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
              ? 'Тауарларды іздеу...'
              : 'Поиск товаров...')
          }
          autoComplete="off"
          className={`w-full pl-10 sm:pl-11 ${
            searchQuery ? 'pr-28 sm:pr-32' : 'pr-20 sm:pr-24'
          } h-11 sm:h-12 text-sm sm:text-base font-medium rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 placeholder:truncate focus:outline-none focus:ring-2 focus:ring-[#C5A059]/40 focus:border-[#C5A059] transition-all shadow-xs`}
        />

        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              inputRef.current?.focus();
            }}
            className="absolute right-[76px] sm:right-[88px] top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title={isKz ? 'Тазалау' : 'Очистить поиск'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* 'Найти' button inside search bar */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            scrollToCatalogSection();
            if (onAfterSelect) onAfterSelect();
          }}
          className="absolute right-1 top-1 bottom-1 px-3.5 sm:px-5 rounded-lg bg-[#C5A059] hover:bg-[#b38f48] active:bg-[#a07e38] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center transition-colors cursor-pointer shadow-xs select-none"
        >
          {isKz ? 'Табу' : 'Найти'}
        </button>
      </div>

      {/* Autocomplete & Smart Suggestions Dropdown */}
      {isOpen && (
        <div
          id={`${inputId}-dropdown`}
          className="absolute left-0 right-0 top-full mt-2 z-[120] bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden max-h-[75vh] overflow-y-auto divide-y divide-slate-100 text-slate-800"
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
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {POPULAR_SEARCH_KEYWORDS.slice(0, 10).map((item, idx) => {
                    const label = isKz ? item.termKz : item.termRu;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handlePickKeyword(label)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Search className="w-3 h-3 text-slate-400" />
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
                          className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-emerald-500/50 hover:bg-emerald-50/50 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{cat.icon || '✨'}</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate">
                              {catName}
                            </span>
                          </div>
                          <span className="text-xs font-mono tabular-nums text-emerald-700 font-bold shrink-0">
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
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isKz ? 'Автоматты ұсыныстар:' : 'Подсказки:'}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {keywordSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handlePickKeyword(sug)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-600 hover:text-white text-slate-700 border border-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Search className="w-3 h-3 text-slate-400 group-hover:text-white" />
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
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      {isKz
                        ? 'Сәйкес санаттар:'
                        : 'Подходящие категории:'}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {matchedCategories.map((cat) => {
                      const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;
                      const count = productCounts[cat.id] || 0;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handlePickCategory(cat.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>{cat.icon || '✨'}</span>
                          <span>{catName}</span>
                          <span className="text-[11px] font-mono tabular-nums opacity-75">
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
                        className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-500 text-amber-900 hover:text-white border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        <span>{isKz ? sym.titleKz : sym.titleRu}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Instant Product Matches */}
              <div className="p-3 sm:px-4">
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
                      className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer text-xs"
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
                          className="group p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-emerald-500/50 hover:bg-emerald-50/50 flex items-center justify-between gap-3 transition-all"
                        >
                          <div
                            onClick={() => {
                              setIsOpen(false);
                              onOpenProduct(prod);
                              if (onAfterSelect) onAfterSelect();
                            }}
                            className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 cursor-pointer"
                          >
                            <img
                              src={prod.images[0]}
                              alt={title}
                              referrerPolicy="no-referrer"
                              className="w-11 h-14 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-emerald-700">
                                {highlightText(title, cleanQuery)}
                              </h4>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                                {catName && <span>{catName}</span>}
                                {catName && <span aria-hidden="true">·</span>}
                                <span className="font-mono tabular-nums">Арт: {prod.sku}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs sm:text-sm font-black text-slate-950 font-sans tracking-tight">
                                  {formatPrice(prod.price)}
                                </span>
                                {!prod.inStock && (
                                  <span className="text-[11px] text-rose-600 font-bold">
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
                              className="px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-xs"
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
                <div className="p-3.5 bg-[#061611]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      scrollToCatalogSection();
                      if (onAfterSelect) onAfterSelect();
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
                  >
                    <span>
                      {isKz
                        ? `Каталогтан барлық нәтижені көрсету (${totalMatchedCount})`
                        : `Показать все найденные товары в каталоге (${totalMatchedCount})`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-stone-950" />
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

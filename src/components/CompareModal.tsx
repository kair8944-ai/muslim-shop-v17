import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  ArrowLeftRight,
  ShoppingBag,
  Trash2,
  CheckCircle2,
  Eye,
  Sparkles,
  Clock,
  Plus,
} from 'lucide-react';
import { AccessibilitySettings, Category, Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';

interface CompareBarProps {
  compareList: Product[];
  lang: Language;
  onOpenCompareModal: () => void;
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
}

/**
 * Compact, unobtrusive floating circle-counter in the corner of the screen (.CompareBar)
 * that opens the mobile-optimized CompareModal on tap.
 */
export const CompareBar: React.FC<CompareBarProps> = ({
  compareList,
  lang,
  onOpenCompareModal,
  onClearCompare,
}) => {
  if (compareList.length === 0) return null;
  const isKz = lang === 'kz';

  return createPortal(
    <motion.div
      id="floating-compare-bar"
      initial={{ opacity: 0, scale: 0.8, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="CompareBar fixed bottom-20 right-3.5 sm:bottom-24 sm:right-22 z-40 flex items-center gap-1.5"
    >
      {/* Main Floating Circle / Compact Pill Counter Button */}
      <button
        type="button"
        id="open-compare-modal-btn"
        onClick={onOpenCompareModal}
        aria-label={
          isKz
            ? `Тауарларды салыстыру (${compareList.length})`
            : `Сравнить товары (${compareList.length})`
        }
        title={
          isKz
            ? `Салыстыру терезесін ашу (${compareList.length}/3)`
            : `Открыть сравнение товаров (${compareList.length} из 3)`
        }
        className="relative w-13 h-13 sm:w-auto sm:h-12 sm:px-4 rounded-full bg-emerald-950 hover:bg-emerald-900 text-white border-2 border-amber-400 shadow-[0_10px_28px_rgba(0,0,0,0.45)] flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
      >
        <ArrowLeftRight className="w-5 h-5 text-amber-300 shrink-0" />
        <span className="hidden sm:inline text-xs font-extrabold tracking-tight whitespace-nowrap">
          {isKz ? 'Салыстыру' : 'Сравнение'}
        </span>

        {/* Floating Counter Circle Badge */}
        <span className="absolute -top-1.5 -right-1.5 min-w-6 h-6 px-1.5 rounded-full bg-amber-400 text-stone-950 font-mono font-extrabold text-xs tabular-nums flex items-center justify-center border-2 border-emerald-950 shadow-xs">
          {compareList.length}
        </span>
      </button>

      {/* Subtle Clear Button on Desktop */}
      <button
        type="button"
        onClick={onClearCompare}
        title={isKz ? 'Салыстыруды тазалау' : 'Очистить список сравнения'}
        className="hidden sm:flex w-8 h-8 rounded-full bg-stone-900/90 hover:bg-rose-600 text-stone-300 hover:text-white border border-stone-700 items-center justify-center shadow-md transition-colors cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>,
    document.body
  );
};

interface CompareModalProps {
  isOpen: boolean;
  products: Product[];
  allProducts?: Product[];
  categories: Category[];
  lang: Language;
  accessibility: AccessibilitySettings;
  onAddProductToCompare?: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
  onClearAll: () => void;
  onAddToCart: (product: Product) => void;
  onOpenDetail: (product: Product) => void;
  onClose: () => void;
}

/**
 * Mobile-first CompareModal:
 * - Uses horizontal scroll (`overflow-x-auto`) for product columns
 * - Pins characteristic headers on the left (`sticky left-0 z-20`) so the user never loses context while scrolling
 * - Uses `flex-wrap` for selected product chips and quick actions so nothing overflows the viewport frame
 */
export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  products,
  allProducts = [],
  categories,
  lang,
  accessibility,
  onAddProductToCompare,
  onRemoveProduct,
  onClearAll,
  onAddToCart,
  onOpenDetail,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  const isKz = lang === 'kz';

  // Ensure at least 2 products are shown side-by-side by auto-pairing with a similar product from the same category if only 1 was selected
  const { effectiveProducts, autoSuggestedIds, candidatePool } = useMemo(() => {
    if (products.length === 0) {
      return {
        effectiveProducts: [] as Product[],
        autoSuggestedIds: new Set<string>(),
        candidatePool: [] as Product[],
      };
    }

    const selectedIds = new Set(products.map((p) => p.id));
    const anchor = products[0];

    const similar = allProducts
      .filter((p) => !selectedIds.has(p.id) && p.inStock)
      .sort((a, b) => {
        const aSameCat = a.categoryId === anchor.categoryId ? 1 : 0;
        const bSameCat = b.categoryId === anchor.categoryId ? 1 : 0;
        if (aSameCat !== bSameCat) return bSameCat - aSameCat;
        const aHit = a.isHit ? 1 : 0;
        const bHit = b.isHit ? 1 : 0;
        return bHit - aHit;
      });

    const autoSet = new Set<string>();
    const combined = [...products];
    if (combined.length === 1 && similar.length > 0) {
      combined.push(similar[0]);
      autoSet.add(similar[0].id);
    }

    const remainingCandidates = similar.filter((p) => !autoSet.has(p.id)).slice(0, 6);

    return {
      effectiveProducts: combined.slice(0, 3),
      autoSuggestedIds: autoSet,
      candidatePool: remainingCandidates,
    };
  }, [products, allProducts]);

  if (!isOpen || effectiveProducts.length === 0) return null;

  const lowestPrice =
    effectiveProducts.length > 1
      ? Math.min(...effectiveProducts.map((p) => p.price))
      : null;

  const getCategoryName = (catId: string) => {
    const found = categories.find((c) => c.id === catId);
    if (!found) return '—';
    return isKz && found.nameKz ? found.nameKz : found.nameRu;
  };

  // Sticky left column classes so characteristic labels remain pinned during horizontal scroll
  const stickyLeftHeaderClass =
    'sticky left-0 z-20 w-[110px] min-w-[110px] max-w-[110px] sm:w-[165px] sm:min-w-[165px] sm:max-w-[165px] bg-[#F3EFE6] border-r border-stone-200/90 p-2.5 sm:p-3.5 text-[11px] sm:text-xs font-extrabold text-emerald-950 align-top shadow-[3px_0_8px_rgba(0,0,0,0.05)]';

  const productColClass =
    'w-[178px] min-w-[178px] max-w-[178px] sm:w-[240px] sm:min-w-[240px] sm:max-w-[240px] p-2.5 sm:p-3.5 align-top border-r border-stone-100 last:border-r-0';

  return createPortal(
    <motion.div
      id="compare-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="CompareModal fixed inset-0 z-[120] bg-stone-950/85 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
    >
      <motion.div
        id="compare-modal-container"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-full max-h-[92vh] sm:max-h-[90vh] sm:max-w-4xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col ${
          accessibility.highContrast
            ? 'bg-white text-black border-2 border-black'
            : 'bg-[#FAF8F5] text-stone-900 border border-amber-900/20'
        }`}
      >
        {/* Top Modal Header */}
        <div className="bg-emerald-950 text-white px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2 border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-serif font-extrabold text-sm sm:text-lg text-white truncate">
                {isKz ? 'Тауарларды салыстыру' : 'Сравнение характеристик'}
              </h2>
              <p className="text-[11px] text-emerald-200 truncate">
                {isKz
                  ? 'Сипаттамалар сол жақта бекітілген • Оңға сырғытыңыз →'
                  : 'Заголовки слева закреплены • Листайте таблицу вбок →'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                onClearAll();
                onClose();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-900 hover:bg-rose-700 text-emerald-200 hover:text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title={isKz ? 'Тізімді тазалау' : 'Очистить сравнение'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isKz ? 'Тазалау' : 'Очистить'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white transition-colors cursor-pointer"
              title={isKz ? 'Жабу' : 'Закрыть'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 space-y-3">
          {/* Selected Items Flex-Wrap Summary & Quick Add Bar */}
          <div className="p-2.5 sm:p-3 rounded-2xl bg-white border border-stone-200/90 space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-950">
                {isKz
                  ? `Таңдалған тауарлар (${products.length}/3):`
                  : `Выбрано для сравнения (${products.length} из 3):`}
              </span>

              <button
                type="button"
                onClick={onClose}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
              >
                {isKz ? '+ Каталогтан тағы таңдау' : '+ Выбрать ещё в каталоге'}
              </button>
            </div>

            {/* Flex-wrap chips of currently selected products */}
            <div className="flex flex-wrap items-center gap-1.5">
              {effectiveProducts.map((prod) => {
                const title = isKz && prod.titleKz?.trim() ? prod.titleKz : prod.titleRu;
                const isAuto = autoSuggestedIds.has(prod.id);
                return (
                  <div
                    key={prod.id}
                    className={`inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl text-[11px] font-semibold border max-w-full ${
                      isAuto
                        ? 'bg-amber-50/90 text-amber-950 border-amber-300/80'
                        : 'bg-stone-100 text-stone-800 border-stone-200'
                    }`}
                  >
                    <img
                      src={prod.images[0]}
                      alt={title}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-md object-cover shrink-0"
                    />
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">
                      {isAuto ? `${isKz ? 'Аналог: ' : 'Аналог: '}${title}` : title}
                    </span>
                    {!isAuto && products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(prod.id)}
                        className="ml-0.5 text-stone-400 hover:text-rose-600 font-bold cursor-pointer shrink-0"
                        title={isKz ? 'Өшіру' : 'Убрать'}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Horizontal quick-add strip if < 3 products selected */}
            {products.length < 3 && candidatePool.length > 0 && onAddProductToCompare && (
              <div className="pt-2 border-t border-stone-100 space-y-1.5">
                <div className="text-[11px] font-semibold text-stone-500">
                  {isKz
                    ? 'Осы санаттағы ұқсас тауарды салыстыруға қосу:'
                    : 'Быстро добавить к сравнению похожий товар:'}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
                  {candidatePool.map((cand) => {
                    const candTitle =
                      isKz && cand.titleKz?.trim() ? cand.titleKz : cand.titleRu;
                    return (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => onAddProductToCompare(cand)}
                        className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-xl bg-stone-50 hover:bg-emerald-950 text-stone-800 hover:text-white border border-stone-200/90 shrink-0 transition-colors cursor-pointer max-w-[195px]"
                      >
                        <img
                          src={cand.images[0]}
                          alt={candTitle}
                          referrerPolicy="no-referrer"
                          className="w-7 h-8 rounded-lg object-cover bg-white shrink-0"
                        />
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-[11px] font-bold truncate">{candTitle}</div>
                          <div className="text-[10px] font-mono font-bold text-emerald-700">
                            {formatPrice(cand.price)}
                          </div>
                        </div>
                        <Plus className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* HORIZONTALLY SCROLLABLE TABLE WITH STICKY LEFT HEADER COLUMN */}
          <div
            id="compare-scroll-table-wrapper"
            className="w-full overflow-x-auto overscroll-x-contain rounded-2xl border border-stone-200/90 bg-white shadow-2xs"
          >
            <table className="w-max min-w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-stone-200">
                  {/* Top-Left Sticky Corner Cell */}
                  <th className="sticky left-0 z-30 w-[110px] min-w-[110px] max-w-[110px] sm:w-[165px] sm:min-w-[165px] sm:max-w-[165px] bg-emerald-950 text-white p-2.5 sm:p-3.5 align-middle border-r border-emerald-900 shadow-[3px_0_8px_rgba(0,0,0,0.12)]">
                    <div className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-amber-300">
                      {isKz ? 'Параметрлер' : 'Параметры'}
                    </div>
                    <div className="text-[10px] text-emerald-200 font-normal mt-1 leading-snug">
                      {isKz
                        ? 'Тауарларды оңға-солға сырғытыңыз ↔'
                        : 'Листайте товары вправо-влево ↔'}
                    </div>
                  </th>

                  {/* Product Header Columns */}
                  {effectiveProducts.map((prod) => {
                    const title =
                      isKz && prod.titleKz?.trim() ? prod.titleKz : prod.titleRu;
                    const isAutoSuggested = autoSuggestedIds.has(prod.id);

                    return (
                      <th
                        key={prod.id}
                        className={`${productColClass} bg-stone-50/70 font-normal`}
                      >
                        <div className="flex flex-col justify-between h-full space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono font-bold text-stone-500 truncate">
                              {isAutoSuggested
                                ? isKz
                                  ? 'Ұқсас аналог'
                                  : 'Похожий аналог'
                                : `Арт: ${prod.sku}`}
                            </span>

                            {!isAutoSuggested && products.length > 1 && (
                              <button
                                type="button"
                                onClick={() => onRemoveProduct(prod.id)}
                                className="p-1 rounded-lg bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 border border-stone-200 transition-colors cursor-pointer shrink-0"
                                title={isKz ? 'Салыстырудан өшіру' : 'Убрать из сравнения'}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div
                            onClick={() => {
                              onClose();
                              onOpenDetail(prod);
                            }}
                            className="cursor-pointer group flex items-center gap-2.5"
                          >
                            <img
                              src={prod.images[0]}
                              alt={title}
                              referrerPolicy="no-referrer"
                              className="w-14 h-18 sm:w-16 sm:h-20 rounded-xl object-cover bg-white border border-stone-200 shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-stone-900 group-hover:text-emerald-900 line-clamp-3 leading-snug break-words">
                                {title}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1">
                            {prod.inStock ? (
                              <button
                                type="button"
                                onClick={() => onAddToCart(prod)}
                                className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-950 hover:bg-amber-400 text-white hover:text-stone-950 font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <ShoppingBag className="w-3 h-3 text-amber-300 shrink-0" />
                                <span>{isKz ? 'Себетке' : 'В корзину'}</span>
                              </button>
                            ) : (
                              <span className="flex-1 py-1.5 px-2 rounded-xl bg-rose-50 text-rose-700 font-bold text-[10px] flex items-center justify-center gap-1 whitespace-nowrap">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{isKz ? 'Жақында' : 'Под заказ'}</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenDetail(prod);
                              }}
                              className="p-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition-colors cursor-pointer shrink-0"
                              title={isKz ? 'Толық ашу' : 'Открыть карточку'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-stone-200/80 text-xs">
                {/* ROW 1: PRICE */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    {isKz ? 'Бағасы' : 'Цена'}
                  </th>
                  {effectiveProducts.map((prod) => {
                    const isBestPrice = lowestPrice !== null && prod.price === lowestPrice;
                    return (
                      <td key={prod.id} className={productColClass}>
                        <div className="font-mono font-extrabold text-sm sm:text-base text-emerald-950 tabular-nums">
                          {formatPrice(prod.price)}
                        </div>
                        {prod.oldPrice && prod.oldPrice > prod.price && (
                          <div className="text-[11px] text-stone-400 line-through font-mono tabular-nums">
                            {formatPrice(prod.oldPrice)}
                          </div>
                        )}
                        {isBestPrice && (
                          <div className="mt-1 inline-block text-[10px] font-bold text-emerald-700">
                            ✓ {isKz ? 'Ең тиімді баға' : 'Выгодная цена'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ROW 2: AVAILABILITY */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    {isKz ? 'Қолжетімділігі' : 'Наличие'}
                  </th>
                  {effectiveProducts.map((prod) => (
                    <td key={prod.id} className={productColClass}>
                      {prod.inStock ? (
                        <span className="text-emerald-700 font-bold text-[11px] sm:text-xs">
                          ● {isKz ? 'Қолда бар (Бутик №24)' : 'В наличии (Бутик №24)'}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px] sm:text-xs">
                          ○ {isKz ? 'Жақында түседі' : 'Скоро в наличии'}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* ROW 3: CATEGORY */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    {isKz ? 'Санат' : 'Категория'}
                  </th>
                  {effectiveProducts.map((prod) => (
                    <td
                      key={prod.id}
                      className={`${productColClass} font-semibold text-stone-800 break-words`}
                    >
                      {getCategoryName(prod.categoryId)}
                    </td>
                  ))}
                </tr>

                {/* ROW 4: VOLUME & COUNTRY */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    {isKz ? 'Көлемі / Ел' : 'Фасовка и страна'}
                  </th>
                  {effectiveProducts.map((prod) => (
                    <td key={prod.id} className={`${productColClass} space-y-1 break-words`}>
                      <div className="text-stone-800 font-medium">
                        {prod.volumeOrWeight ||
                          (isKz ? 'Стандартты қаптама' : 'Оригинальная упаковка')}
                      </div>
                      <div className="text-[11px] text-emerald-800 font-semibold">
                        {prod.country || 'Халяль • Бутик №24'}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* ROW 5: KEY BENEFITS */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{isKz ? 'Пайдасы' : 'Полезные свойства'}</span>
                    </div>
                  </th>
                  {effectiveProducts.map((prod) => {
                    const benefits =
                      isKz && prod.benefitsKz && prod.benefitsKz.length > 0
                        ? prod.benefitsKz
                        : prod.benefitsRu || [];
                    const desc =
                      isKz && prod.descriptionKz?.trim()
                        ? prod.descriptionKz
                        : prod.descriptionRu;

                    return (
                      <td key={prod.id} className={`${productColClass} break-words`}>
                        {benefits.length > 0 ? (
                          <ul className="space-y-1.5">
                            {benefits.slice(0, 4).map((b, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-[11px] sm:text-xs text-stone-800 leading-snug"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                                <span className="break-words">{b}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] sm:text-xs text-stone-700 leading-relaxed line-clamp-6 break-words">
                            {desc || '—'}
                          </p>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* ROW 6: COMPOSITION & SPECS */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    {isKz ? 'Құрамы мен сипаттамасы' : 'Состав и описание'}
                  </th>
                  {effectiveProducts.map((prod) => {
                    const specs =
                      isKz && prod.specsKz?.trim()
                        ? prod.specsKz
                        : prod.specsRu ||
                          (isKz && prod.descriptionKz?.trim()
                            ? prod.descriptionKz
                            : prod.descriptionRu) ||
                          '—';
                    return (
                      <td
                        key={prod.id}
                        className={`${productColClass} text-[11px] sm:text-xs text-stone-700 leading-relaxed whitespace-pre-line break-words`}
                      >
                        <div className="line-clamp-6">{specs}</div>
                      </td>
                    );
                  })}
                </tr>

                {/* ROW 7: HOW TO USE */}
                <tr>
                  <th className={stickyLeftHeaderClass}>
                    {isKz ? 'Қолдану тәсілі' : 'Как принимать'}
                  </th>
                  {effectiveProducts.map((prod) => {
                    const howToUse =
                      isKz && prod.howToUseKz?.trim()
                        ? prod.howToUseKz
                        : prod.howToUseRu ||
                          (isKz
                            ? 'Қаптамадағы нұсқаулық бойынша'
                            : 'По инструкции на упаковке');
                    return (
                      <td
                        key={prod.id}
                        className={`${productColClass} text-[11px] sm:text-xs text-stone-700 leading-relaxed whitespace-pre-line break-words`}
                      >
                        <div className="line-clamp-4">{howToUse}</div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

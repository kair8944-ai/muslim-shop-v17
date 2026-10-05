import React from 'react';
import { Clock, ShoppingBag, Check, Trash2, Eye } from 'lucide-react';
import { Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';

interface RecentlyViewedSectionProps {
  items: Product[];
  cartProductIds: Set<string>;
  lang: Language;
  onOpenProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onRemoveItem: (productId: string) => void;
  onClearAll: () => void;
}

export const RecentlyViewedSection: React.FC<RecentlyViewedSectionProps> = ({
  items,
  cartProductIds,
  lang,
  onOpenProduct,
  onAddToCart,
  onRemoveItem,
  onClearAll,
}) => {
  const isKz = lang === 'kz';

  if (!items || items.length === 0) return null;

  return (
    <section
      id="recently-viewed-section"
      aria-label={isKz ? 'Жақында қаралған тауарлар' : 'Вы недавно смотрели'}
      className="w-full bg-slate-100/90 border-t border-slate-200 py-6 sm:py-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Row with Clear History Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Clock className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-base sm:text-xl text-slate-900 leading-tight flex items-center gap-2">
                <span>{isKz ? 'Сіз жақында қарадыңыз' : 'Вы недавно смотрели'}</span>
                <span className="text-xs sm:text-sm font-mono tabular-nums text-emerald-700 font-bold">
                  ({items.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isKz
                  ? 'Қаралған тауарларға 1 басу арқылы тез оралыңыз'
                  : 'Быстрый возврат к просмотренным товарам'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="clear-recently-viewed-btn"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0 shadow-xs"
            title={isKz ? 'Қарау тарихын тазалау' : 'Очистить список просмотренных товаров'}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isKz ? 'Тарихты тазалау' : 'Очистить'}</span>
          </button>
        </div>

        {/* Horizontal Scrollable / Responsive Cards Strip */}
        <div className="flex items-stretch gap-3 sm:gap-3.5 overflow-x-auto no-scrollbar pb-2">
          {items.map((product) => {
            const title =
              isKz && product.titleKz?.trim() ? product.titleKz : product.titleRu;
            const isInCart = cartProductIds.has(product.id);

            return (
              <div
                key={product.id}
                className="w-[200px] sm:w-[220px] shrink-0 rounded-xl bg-white border border-slate-200/90 p-3 flex flex-col justify-between gap-2.5 shadow-xs hover:shadow-md transition-shadow relative group"
              >
                {/* Remove single item from history button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(product.id);
                  }}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-md bg-white/90 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
                  title={isKz ? 'Тізімнен өшіру' : 'Убрать из просмотренных'}
                  aria-label={isKz ? 'Тізімнен өшіру' : 'Убрать из просмотренных'}
                >
                  <Trash2 className="w-3 h-3" />
                </button>

                {/* Top Image & Info */}
                <div
                  onClick={() => onOpenProduct(product)}
                  className="cursor-pointer space-y-2"
                >
                  <div className="w-full h-28 rounded-lg overflow-hidden bg-white border border-slate-100 flex items-center justify-center p-1.5 relative">
                    <img
                      src={product.images?.[0]}
                      alt={title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                      Арт: {product.sku}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 line-clamp-2 leading-snug mt-0.5 transition-colors">
                      {title}
                    </h3>
                  </div>
                </div>

                {/* Bottom Price & Action */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm sm:text-base font-black text-slate-950 font-sans tracking-tight">
                      {formatPrice(product.price)}
                    </span>
                    {product.oldPrice && product.oldPrice > product.price && (
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 line-through">
                        {formatPrice(product.oldPrice)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenProduct(product)}
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer shrink-0"
                      title={isKz ? 'Толығырақ' : 'Открыть карточку товара'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddToCart(product)}
                      disabled={!product.inStock}
                      className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        !product.inStock
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                          : isInCart
                          ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {isInCart ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                          <span>{isKz ? 'Себетте' : 'В корзине'}</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                          <span>{isKz ? 'Себетке' : 'В корзину'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

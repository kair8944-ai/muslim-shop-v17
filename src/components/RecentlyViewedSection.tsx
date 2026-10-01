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
      className="w-full bg-[#051510] border-t border-amber-500/20 py-7 sm:py-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header Row with Clear History Button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B241B] border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-extrabold text-xl sm:text-2xl text-white leading-tight flex items-center gap-2">
                <span>{isKz ? 'Сіз жақында қарадыңыз' : 'Вы недавно смотрели'}</span>
                <span className="text-xs sm:text-sm font-mono tabular-nums text-amber-300 font-bold">
                  ({items.length})
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/75 mt-0.5">
                {isKz
                  ? 'Қаралған тауарларға 1 басу арқылы тез оралыңыз'
                  : 'Быстрый возврат к товарам, которые вы открывали'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="clear-recently-viewed-btn"
            onClick={onClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-700 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-extrabold transition-colors cursor-pointer shrink-0"
            title={isKz ? 'Қарау тарихын тазалау' : 'Очистить список просмотренных товаров'}
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>{isKz ? 'Тарихты тазалау' : 'Очистить историю'}</span>
          </button>
        </div>

        {/* Horizontal Scrollable / Responsive Cards Strip */}
        <div className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar pb-2">
          {items.map((product) => {
            const title =
              isKz && product.titleKz?.trim() ? product.titleKz : product.titleRu;
            const isInCart = cartProductIds.has(product.id);

            return (
              <div
                key={product.id}
                className="w-[210px] sm:w-[235px] shrink-0 rounded-2xl bg-[#0A221A] border border-amber-500/25 p-3 flex flex-col justify-between gap-2.5 shadow-lg relative group"
              >
                {/* Remove single item from history button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(product.id);
                  }}
                  className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-stone-950/85 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/35 flex items-center justify-center transition-colors cursor-pointer"
                  title={isKz ? 'Тізімнен өшіру' : 'Убрать из просмотренных'}
                  aria-label={isKz ? 'Тізімнен өшіру' : 'Убрать из просмотренных'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Top Image & Info */}
                <div
                  onClick={() => onOpenProduct(product)}
                  className="cursor-pointer space-y-2"
                >
                  <div className="w-full h-32 rounded-xl overflow-hidden bg-stone-900 border border-amber-500/20 relative">
                    <img
                      src={product.images?.[0]}
                      alt={title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div>
                    <div className="text-[11px] text-emerald-300/80 font-mono tabular-nums">
                      Арт: {product.sku}
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-amber-300 line-clamp-2 leading-snug mt-0.5 transition-colors">
                      {title}
                    </h3>
                  </div>
                </div>

                {/* Bottom Price & Action */}
                <div className="pt-2 border-t border-amber-500/15 space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm sm:text-base font-mono tabular-nums font-extrabold text-amber-300">
                      {formatPrice(product.price)}
                    </span>
                    {product.oldPrice && product.oldPrice > product.price && (
                      <span className="text-[11px] font-mono tabular-nums text-stone-400 line-through">
                        {formatPrice(product.oldPrice)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenProduct(product)}
                      className="p-2 rounded-xl bg-[#061510] hover:bg-[#103326] text-amber-300 border border-amber-500/25 cursor-pointer shrink-0"
                      title={isKz ? 'Толығырақ' : 'Открыть карточку товара'}
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onAddToCart(product)}
                      disabled={!product.inStock}
                      className={`flex-1 py-2 px-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        !product.inStock
                          ? 'bg-stone-800 text-stone-400 cursor-not-allowed'
                          : isInCart
                          ? 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-400/30'
                          : 'bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-sm'
                      }`}
                    >
                      {isInCart ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                          <span>{isKz ? 'Себетте (+1)' : 'В корзине (+1)'}</span>
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

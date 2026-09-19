import React from 'react';
import { ShoppingBag, Heart, ZoomIn, Check, Zap } from 'lucide-react';
import { AccessibilitySettings, Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  lang: Language;
  accessibility: AccessibilitySettings;
  isFavorite: boolean;
  isInCart: boolean;
  onToggleFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenDetail: (product: Product) => void;
  onQuickOrder: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  lang,
  accessibility,
  isFavorite,
  isInCart,
  onToggleFavorite,
  onAddToCart,
  onOpenDetail,
  onQuickOrder,
}) => {
  const title = (lang === 'kz' && product.titleKz?.trim()) ? product.titleKz : product.titleRu;
  const description = (lang === 'kz' && product.descriptionKz?.trim()) ? product.descriptionKz : product.descriptionRu;

  // Font size multiplier based on accessibility
  const titleClass =
    accessibility.scale === 'extra'
      ? 'text-lg sm:text-xl'
      : accessibility.scale === 'large'
      ? 'text-base sm:text-lg'
      : 'text-sm sm:text-base';

  const priceClass =
    accessibility.scale === 'extra'
      ? 'text-xl sm:text-2xl'
      : accessibility.scale === 'large'
      ? 'text-lg sm:text-xl'
      : 'text-base sm:text-lg';

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  return (
    <div
      id={`product-card-${product.id}`}
      className="group bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-amber-400/50 transition-all flex flex-col justify-between"
    >
      {/* Image & Badges Container (9:16 vertical ratio) */}
      <div
        className="relative aspect-[9/16] bg-stone-100 overflow-hidden cursor-pointer"
        onClick={() => onOpenDetail(product)}
      >
        <img
          id={`product-img-${product.id}`}
          src={product.images[0]}
          alt={title}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Safe fallback image
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.isHit && (
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-amber-500 text-stone-950 uppercase tracking-wider shadow-xs">
              {lang === 'kz' ? 'Хит' : 'Хит'}
            </span>
          )}
          {discountPercent && (
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-rose-600 text-white shadow-xs">
              -{discountPercent}%
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold bg-emerald-700 text-white shadow-xs">
              {lang === 'kz' ? 'Жаңа' : 'Новинка'}
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          id={`favorite-btn-${product.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(product);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-xl backdrop-blur-xs transition-colors shadow-xs ${
            isFavorite
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-white/85 text-stone-600 hover:text-rose-600 hover:bg-white'
          }`}
          title={lang === 'kz' ? 'Таңдаулыға қосу' : 'Добавить в избранное'}
        >
          <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFavorite ? 'fill-rose-600' : ''}`} />
        </button>

        {/* Overlay Magnifier Cue */}
        <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-stone-950/80 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-xs shadow-md">
            <ZoomIn className="w-3.5 h-3.5 text-amber-300" />
            <span>{lang === 'kz' ? 'Толық қарау' : 'Подробнее'}</span>
          </div>
        </div>

        {product.country && (
          <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium">
            {product.country}
          </div>
        )}
      </div>

      {/* Content Container */}
      <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* SKU & Stock */}
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-stone-500 mb-1">
            <span>Арт: {product.sku}</span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              {lang === 'kz' ? 'Қолда бар' : 'В наличии'}
            </span>
          </div>

          {/* Title */}
          <h3
            id={`product-title-${product.id}`}
            onClick={() => onOpenDetail(product)}
            className={`font-bold text-stone-900 leading-snug cursor-pointer hover:text-emerald-800 transition-colors line-clamp-2 ${titleClass}`}
          >
            {title}
          </h3>

          {/* Short description preview */}
          {description && (
            <p className="text-[11px] sm:text-xs text-stone-500 line-clamp-2 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Price & Action Footer */}
        <div className="mt-3 pt-2.5 border-t border-stone-100">
          <div className="flex items-baseline gap-2 mb-2.5">
            <span className={`font-extrabold text-emerald-950 ${priceClass}`}>
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && (
              <span className="text-[11px] sm:text-xs text-stone-400 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick 1-Click Order */}
            <button
              id={`quick-order-btn-${product.id}`}
              onClick={() => onQuickOrder(product)}
              className="flex-1 py-2 px-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="Купить в 1 клик через WhatsApp"
            >
              <Zap className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>{lang === 'kz' ? '1 басу' : '1 клик'}</span>
            </button>

            {/* Add to Cart */}
            <button
              id={`add-cart-btn-${product.id}`}
              onClick={() => onAddToCart(product)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                isInCart
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-900 hover:bg-emerald-950 text-white'
              }`}
              title={lang === 'kz' ? 'Себетке қосу' : 'Добавить в корзину'}
            >
              {isInCart ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                  <span className="hidden md:inline">{lang === 'kz' ? 'Қосылды' : 'В корзине'}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
                  <span className="hidden md:inline">{lang === 'kz' ? 'Себетке' : 'В корзину'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

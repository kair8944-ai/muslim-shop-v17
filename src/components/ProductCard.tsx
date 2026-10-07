import React from 'react';
import {
  Heart,
  ShoppingBag,
  Clock,
  Share2,
  Check,
  CheckCircle2,
  MessageCircle,
  Truck,
  Star,
} from 'lucide-react';
import { AccessibilitySettings, Language, Product } from '../types';
import { formatPrice, shareOrCopyProduct } from '../utils/formatters';

interface ProductCardProps {
  product: Product;
  lang: Language;
  accessibility: AccessibilitySettings;
  isFavorite: boolean;
  isInCart?: boolean;
  isInCompare?: boolean;
  isLargeView?: boolean;
  onToggleFavorite: (product: Product) => void;
  onToggleCompare?: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onRemoveFromCart?: (productId: string) => void;
  onOpenDetail: (product: Product) => void;
  onQuickOrder: (product: Product) => void;
  onShareFeedback?: (message: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  lang,
  isFavorite,
  isInCart = false,
  isLargeView = false,
  onToggleFavorite,
  onAddToCart,
  onOpenDetail,
  onQuickOrder,
  onShareFeedback,
}) => {
  const [isCopied, setIsCopied] = React.useState(false);
  const [isJustAdded, setIsJustAdded] = React.useState(false);
  const isKz = lang === 'kz';

  const title = isKz && product.titleKz?.trim() ? product.titleKz : product.titleRu;
  const description =
    isKz && product.descriptionKz?.trim() ? product.descriptionKz : product.descriptionRu;

  const discountPercent =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100)
      : null;

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await shareOrCopyProduct(product, lang);
    if (res.success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      if (onShareFeedback) {
        onShareFeedback(
          isKz ? 'Өнім сілтемесі көшірілді!' : 'Прямая ссылка на товар скопирована!'
        );
      }
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
    setIsJustAdded(true);
    setTimeout(() => setIsJustAdded(false), 1600);
  };

  return (
    <article
      id={`product-card-${product.id}`}
      className="group relative rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between bg-white border-2 border-slate-200/90 hover:border-slate-400 shadow-xs hover:shadow-lg transition-all w-full"
    >
      <div>
        {/* Flip.kz / iHerb Style Photo Container — Tall portrait aspect ratio so bottles & vitamins are HUGE */}
        <div
          onClick={() => onOpenDetail(product)}
          className={`relative w-full bg-white overflow-hidden cursor-pointer flex items-center justify-center border-b border-slate-100 ${
            isLargeView
              ? 'h-64 sm:h-72 md:h-80 p-3 sm:p-5'
              : 'aspect-[4/5] sm:aspect-square p-2.5 sm:p-4'
          }`}
        >
          <img
            src={product.images?.[0] || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80'}
            alt={`${title} — MUSLIM SHOP`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full max-h-[300px] sm:max-h-[340px] object-contain object-center drop-shadow-xs group-hover:scale-105 transition-transform duration-200"
          />

          {/* Badges: Hit, New, Discount (Flip.kz style) */}
          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
            {discountPercent && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black bg-rose-600 text-white shadow-xs">
                -{discountPercent}%
              </span>
            )}
            {product.isHit && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider bg-slate-900 text-[#C5A059] border border-[#C5A059]/40 shadow-xs">
                ХИТ
              </span>
            )}
            {product.isNew && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider bg-emerald-700 text-white shadow-xs">
                {isKz ? 'ЖАҢА' : 'НОВИНКА'}
              </span>
            )}
          </div>

          {/* Top-Right Favorite & Direct Link Share Button */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              id={`fav-btn-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(product);
              }}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors shadow-xs cursor-pointer border ${
                isFavorite
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : 'bg-white/95 hover:bg-white text-slate-400 hover:text-rose-600 border-slate-200'
              }`}
              title={isKz ? 'Таңдаулыға қосу' : 'В избранное'}
            >
              <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${isFavorite ? 'fill-rose-600 text-rose-600' : ''}`} />
            </button>

            <button
              type="button"
              id={`share-btn-${product.id}`}
              onClick={handleShareClick}
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors shadow-xs cursor-pointer border ${
                isCopied
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white/95 hover:bg-white text-slate-400 hover:text-slate-800 border-slate-200'
              }`}
              title={isKz ? 'Сілтемені көшіру' : 'Скопировать прямую ссылку на товар'}
            >
              {isCopied ? <Check className="w-5 h-5 sm:w-6 sm:h-6" /> : <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>

          {/* Flip.kz Signature Yellow Floating Cart Button on Image */}
          {product.inStock && (
            <button
              type="button"
              id={`floating-cart-btn-${product.id}`}
              onClick={handleQuickAdd}
              className={`absolute bottom-3 right-3 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all active:scale-90 z-10 ${
                isJustAdded
                  ? 'bg-emerald-600 text-white'
                  : isInCart
                  ? 'bg-[#e5aa00] text-slate-950'
                  : 'bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 hover:scale-105'
              }`}
              title={isKz ? 'Себетке қосу' : 'Быстро добавить в корзину'}
            >
              {isJustAdded ? (
                <Check className="w-6 h-6 sm:w-7 sm:h-7 stroke-[3]" />
              ) : (
                <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
              )}
            </button>
          )}
        </div>

        {/* Product Info (Flip.kz hierarchy: Huge Price -> Title -> Rating -> Delivery) */}
        <div className="p-4 sm:p-5 pb-2">
          {/* Flip.kz Style Huge Clear Price */}
          <div className="flex items-baseline gap-2.5 mb-2 flex-wrap">
            <span className="font-black text-slate-950 font-sans text-2xl sm:text-3xl lg:text-4xl tracking-tight">
              {formatPrice(product.price)}
            </span>
            {product.oldPrice && product.oldPrice > product.price && (
              <span className="text-sm sm:text-base text-slate-400 line-through font-bold">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discountPercent && (
              <span className="text-xs sm:text-sm font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                -{discountPercent}%
              </span>
            )}
          </div>

          {/* Large Legible Title */}
          <h3
            onClick={() => onOpenDetail(product)}
            className="font-black text-slate-900 hover:text-[#B38F48] transition-colors cursor-pointer line-clamp-2 leading-snug text-base sm:text-lg lg:text-xl"
          >
            {title}
          </h3>

          {/* Short description for context */}
          {description && (
            <p className="mt-1.5 text-slate-600 line-clamp-2 text-xs sm:text-sm leading-relaxed">
              {description}
            </p>
          )}

          {/* Rating stars & Boutique 24 badge (Flip.kz signature) */}
          <div className="flex items-center gap-2 mt-2.5 text-xs sm:text-sm">
            <span className="font-extrabold text-amber-600">5.0</span>
            <div className="flex text-amber-400 text-xs sm:text-sm">
              {'★★★★★'}
            </div>
            <span className="text-slate-500 font-semibold">
              • {isKz ? 'Түпнұсқа' : 'Оригинал'}
            </span>
          </div>

          {/* Delivery Info Badge (Flip.kz signature) */}
          <div className="mt-2 flex items-center gap-2 text-xs sm:text-sm text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-slate-800 truncate">
              {product.inStock
                ? isKz
                  ? 'Атырау бойынша бүгін жеткізу'
                  : 'Доставим сегодня по Атырау'
                : isKz
                ? 'Тапсырыспен келеді'
                : 'Под заказ из Бутика №24'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons Stack (Large Touch-Friendly Flip.kz style) */}
      <div className="p-4 sm:p-5 pt-3 border-t border-slate-100 space-y-2.5">
        {product.inStock ? (
          <button
            type="button"
            id={`add-to-cart-${product.id}`}
            onClick={handleQuickAdd}
            className={`w-full h-12 sm:h-14 px-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-xs active:scale-98 ${
              isJustAdded
                ? 'bg-emerald-600 text-white'
                : isInCart
                ? 'bg-slate-800 hover:bg-slate-900 text-white'
                : 'bg-slate-950 hover:bg-black text-white'
            }`}
          >
            {isJustAdded ? (
              <>
                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-300 stroke-[2.5]" />
                <span>{isKz ? 'Қосылды!' : 'Добавлено!'}</span>
              </>
            ) : isInCart ? (
              <>
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#C5A059]" />
                <span>{isKz ? 'Себетте бар (+1)' : 'В корзине (+1)'}</span>
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-[#C5A059]" />
                <span>{isKz ? 'Себетке салу' : 'В корзину'}</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            id={`preorder-btn-${product.id}`}
            onClick={() => onQuickOrder(product)}
            className="w-full h-12 sm:h-14 px-4 rounded-xl sm:rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          >
            <Clock className="w-5 h-5 text-slate-500" />
            <span>{isKz ? 'Тапсырыс беру' : 'Под заказ'}</span>
          </button>
        )}

        {/* WhatsApp & Details Buttons Row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => onOpenDetail(product)}
            className="h-10 sm:h-11 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-900"
          >
            <span>{isKz ? 'Сипаттама' : 'Подробнее'}</span>
          </button>

          <button
            type="button"
            onClick={() => onQuickOrder(product)}
            className="h-10 sm:h-11 px-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
            title="Заказ через WhatsApp"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp</span>
          </button>
        </div>
      </div>
    </article>
  );
};

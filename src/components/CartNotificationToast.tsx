import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ShoppingBag, ArrowRight, X, Trash2 } from 'lucide-react';
import { Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';

interface CartNotificationToastProps {
  product: Product | null;
  cartCount: number;
  cartTotal: number;
  lang: Language;
  onOpenCart: () => void;
  onRemoveFromCart?: (productId: string) => void;
  onClose: () => void;
}

export const CartNotificationToast: React.FC<CartNotificationToastProps> = ({
  product,
  cartCount,
  cartTotal,
  lang,
  onOpenCart,
  onRemoveFromCart,
  onClose,
}) => {
  if (!product) return null;

  const isKz = lang === 'kz';
  const title = isKz && product.titleKz?.trim() ? product.titleKz : product.titleRu;

  return createPortal(
    <div
      id="rich-cart-notification"
      role="status"
      aria-live="polite"
      className="fixed bottom-20 sm:bottom-6 right-3 left-3 sm:left-auto sm:right-6 z-[150] max-w-md mx-auto sm:mx-0 sm:w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="relative overflow-hidden rounded-3xl bg-[#041E16] text-white border-2 border-amber-400/80 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4">
        {/* Subtle top gold accent bar */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-amber-400 to-emerald-400" />

        {/* Header Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-stone-950 flex items-center justify-center shadow-xs shrink-0">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold text-amber-300 tracking-tight">
              {isKz ? 'Өнім себетке қосылды!' : 'Товар добавлен в корзину!'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onRemoveFromCart && (
              <button
                type="button"
                onClick={() => {
                  onRemoveFromCart(product.id);
                  onClose();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-950/90 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-extrabold transition-colors cursor-pointer"
                title={isKz ? 'Себеттен өшіру' : 'Удалить из корзины'}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                <span>{isKz ? 'Өшіру' : 'Удалить'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Закрыть уведомление"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Preview Row */}
        <div className="flex items-center gap-3.5 bg-white/8 rounded-2xl p-2.5 border border-white/10">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={title}
              referrerPolicy="no-referrer"
              className="w-13 h-16 rounded-xl object-cover border border-amber-400/40 shrink-0 bg-stone-900"
            />
          ) : (
            <div className="w-13 h-16 rounded-xl bg-emerald-900 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-sm sm:text-base text-white line-clamp-2 leading-snug">
              {title}
            </h4>
            <div className="flex items-center justify-between gap-2 mt-1.5">
              <span className="text-sm sm:text-base font-extrabold text-amber-300 font-mono tabular-nums">
                {formatPrice(product.price)}
              </span>
              <span className="text-xs text-emerald-200 font-mono tabular-nums">
                {isKz
                  ? `Себетте: ${cartCount} дана (${formatPrice(cartTotal)})`
                  : `В корзине: ${cartCount} шт. (${formatPrice(cartTotal)})`}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2.5 mt-3.5">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer whitespace-nowrap"
          >
            {isKz ? 'Таңдауды жалғастыру' : 'Продолжить выбор'}
          </button>

          <button
            type="button"
            id="toast-open-cart-btn"
            onClick={() => {
              onClose();
              onOpenCart();
            }}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4 text-stone-950 shrink-0" />
            <span>{isKz ? 'Себетке өту' : 'Оформить заказ'}</span>
            <ArrowRight className="w-4 h-4 text-stone-950 shrink-0" />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  Truck,
  Building2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { CartItem, Language, Product, StoreConfig } from '../types';
import { formatPrice, generateWhatsAppCartUrl } from '../utils/formatters';
import { trackOrder } from '../services/analyticsService';

interface CartDrawerProps {
  items: CartItem[];
  allProducts?: Product[];
  recentlyViewed?: Product[];
  config: StoreConfig;
  lang: Language;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onAddToCart?: (product: Product) => void;
  onOpenDetail?: (product: Product) => void;
  onClearCart: () => void;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  allProducts = [],
  recentlyViewed = [],
  config,
  lang,
  onUpdateQuantity,
  onRemoveItem,
  onAddToCart,
  onOpenDetail,
  onClearCart,
  onClose,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup' | 'post'>('delivery');

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);

  // Complex bundle discount: -10% if 3+ items in cart
  const hasBundleDiscount = totalQty >= 3;
  const discountAmount = hasBundleDiscount ? Math.round(total * 0.1) : 0;
  const finalTotal = total - discountAmount;

  // Cart recommendations (products not yet in cart)
  const cartProductIds = new Set(items.map((i) => i.product.id));
  const cartRecommendations = allProducts
    .filter((p) => !cartProductIds.has(p.id) && p.inStock)
    .slice(0, 3);

  const handleWhatsAppCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    trackOrder('whatsapp', finalTotal);

    const url = generateWhatsAppCartUrl(
      config,
      items,
      customerName.trim() || (lang === 'kz' ? 'Тұтынушы' : 'Покупатель'),
      customerPhone.trim() || '',
      customerAddress.trim() || '',
      deliveryMethod,
      lang,
      hasBundleDiscount ? discountAmount : 0
    );

    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return createPortal(
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex justify-end overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="cart-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white text-slate-800 border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Flip.kz Signature Deep Blue Header */}
        <div
          id="cart-header"
          className="px-4 py-3 sm:py-3.5 bg-[#0567BA] text-white flex items-center justify-between gap-2 border-b border-[#045294] shrink-0"
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
            title={lang === 'kz' ? 'Артқа' : 'Назад в каталог'}
          >
            <ArrowLeft className="w-4 h-4 text-white shrink-0" />
            <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
          </button>

          <div className="flex items-center justify-center gap-2 min-w-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#ffbd00] shrink-0" />
            <h2 className="font-black text-base sm:text-lg font-sans whitespace-nowrap">
              {lang === 'kz' ? 'Себет' : 'Корзина'}
            </h2>
            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-black whitespace-nowrap shrink-0">
              {totalQty} {lang === 'kz' ? 'дана' : 'шт.'}
            </span>
          </div>

          <button
            type="button"
            id="cart-close-btn"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white bg-white/15 hover:bg-white/25 font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
            title={lang === 'kz' ? 'Жабу' : 'Закрыть корзину'}
          >
            <X className="w-4 h-4 text-white shrink-0" />
            <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div id="cart-empty-state" className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-[#f8fafc]">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0567BA] mb-4 shrink-0 shadow-xs">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {lang === 'kz' ? 'Себет әзірге бос' : 'Ваша корзина пуста'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mt-1.5 mb-6 leading-relaxed">
              {lang === 'kz'
                ? 'Каталогтан өнімдерді таңдап, себетке қосыңыз'
                : 'Выберите полезные товары из каталога Flip.kz и добавьте их в корзину'}
            </p>
            <button
              id="cart-empty-continue-btn"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 text-xs sm:text-sm font-black transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
            >
              {lang === 'kz' ? 'Каталогқа оралу' : 'Перейти к покупкам'}
            </button>

            {recentlyViewed.length > 0 && onAddToCart && (
              <div className="w-full text-left mt-8 pt-6 border-t border-slate-200 space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700">
                  <Clock className="w-4 h-4 text-[#0567BA] shrink-0" />
                  <span>{lang === 'kz' ? 'Сіз жақында қарадыңыз:' : 'Вы недавно смотрели:'}</span>
                </div>
                <div className="space-y-2">
                  {recentlyViewed.slice(0, 3).map((rv) => {
                    const rvTitle = lang === 'kz' && rv.titleKz?.trim() ? rv.titleKz : rv.titleRu;
                    return (
                      <div
                        key={rv.id}
                        className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2.5 shadow-2xs hover:border-[#0567BA]/50 transition-colors"
                      >
                        <div
                          onClick={() => {
                            if (onOpenDetail) {
                              onClose();
                              onOpenDetail(rv);
                            }
                          }}
                          className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                        >
                          <img
                            src={rv.images?.[0]}
                            alt={rvTitle}
                            referrerPolicy="no-referrer"
                            className="w-12 h-14 rounded-lg object-contain border border-slate-200 bg-white shrink-0 p-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 line-clamp-1 hover:text-[#0567BA]">{rvTitle}</p>
                            <p className="text-xs font-black text-[#0567BA] font-sans mt-0.5">
                              {formatPrice(rv.price)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddToCart(rv)}
                          className="px-3 py-1.5 rounded-lg bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{lang === 'kz' ? 'Қосу' : 'В корзину'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div id="cart-scroll-body" className="flex-1 overflow-y-auto overscroll-contain bg-[#f8fafc]">
            {/* Top Bar inside Cart: Items Count & Clear All Cart Button */}
            <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-200 bg-white">
              <span className="text-xs sm:text-sm font-bold text-slate-700">
                {lang === 'kz' ? 'Таңдалған тауарлар:' : 'Ваши товары в корзине:'}
              </span>
              <button
                type="button"
                id="clear-cart-btn"
                onClick={onClearCart}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'kz' ? 'Себетті тазалау' : 'Очистить корзину'}</span>
              </button>
            </div>

            {/* Complex Discount Progress / Active Banner */}
            <div className="mx-4 mt-3 p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
              {hasBundleDiscount ? (
                <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {lang === 'kz'
                        ? 'Кешенді жеңілдік -10% іске қосылды!'
                        : 'Скидка -10% за комплексный набор активна!'}
                    </span>
                  </span>
                  <span className="font-sans font-black text-emerald-700 shrink-0">
                    -{formatPrice(discountAmount)}
                  </span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 font-medium">
                      {lang === 'kz'
                        ? `Тағы ${3 - totalQty} тауар қосып, жиынтыққа -10% жеңілдік алыңыз`
                        : `Добавьте ещё ${3 - totalQty} ${3 - totalQty === 1 ? 'товар' : 'товара'} для скидки -10% на комплекс`}
                    </span>
                    <span className="font-bold text-[#0567BA] shrink-0 font-sans">
                      {totalQty}/3
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-[#0567BA] transition-all duration-300 rounded-full"
                      style={{ width: `${Math.min(100, (totalQty / 3) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* List of items */}
            <div id="cart-items-list" className="p-4 space-y-3">
              {items.map((item) => {
                const title = lang === 'kz' && item.product.titleKz?.trim() ? item.product.titleKz : item.product.titleRu;
                return (
                  <div
                    key={item.product.id}
                    className="rounded-2xl bg-white p-3.5 border border-slate-200 shadow-xs"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={title}
                        className="w-16 h-20 rounded-xl object-contain border border-slate-200 shrink-0 bg-white p-1"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {title}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                            title={lang === 'kz' ? 'Тауарды өшіру' : 'Удалить'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {!item.product.inStock && (
                          <span className="inline-block mt-1 text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            {lang === 'kz' ? 'Жақында' : 'Скоро в наличии'}
                          </span>
                        )}

                        <p className="text-xs text-slate-600 mt-1 font-sans">
                          {formatPrice(item.product.price)} × {item.quantity} ={' '}
                          <strong className="text-slate-900 font-black text-sm">
                            {formatPrice(item.product.price * item.quantity)}
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* Quantity Counter & Delete Button */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs font-bold"
                          title={lang === 'kz' ? 'Азайту' : 'Уменьшить'}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs sm:text-sm font-black text-slate-900 px-2.5 font-sans">
                          {item.quantity} {lang === 'kz' ? 'дана' : 'шт.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs font-bold"
                          title={lang === 'kz' ? 'Көбейту' : 'Увеличить'}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        id={`remove-cart-item-${item.product.id}`}
                        onClick={() => onRemoveItem(item.product.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                        title={lang === 'kz' ? 'Тауарды өшіру' : 'Удалить'}
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{lang === 'kz' ? 'Өшіру' : 'Удалить'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Frequently Bought Together */}
              {cartRecommendations.length > 0 && onAddToCart && (
                <div id="cart-recommendations-box" className="pt-3 mt-4 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Sparkles className="w-4 h-4 text-[#ffbd00] shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                      {lang === 'kz'
                        ? 'Осы тауармен бірге жиі алады:'
                        : 'С этим товаром часто берут:'}
                    </h4>
                  </div>

                  <div className="space-y-2">
                    {cartRecommendations.map((rec) => {
                      const recTitle = lang === 'kz' && rec.titleKz?.trim() ? rec.titleKz : rec.titleRu;
                      return (
                        <div
                          key={rec.id}
                          className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2.5 shadow-2xs hover:border-[#0567BA]/40 transition-colors"
                        >
                          <div
                            onClick={() => {
                              if (onOpenDetail) {
                                onClose();
                                onOpenDetail(rec);
                              }
                            }}
                            className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                          >
                            <img
                              src={rec.images[0]}
                              alt={recTitle}
                              referrerPolicy="no-referrer"
                              className="w-11 h-13 rounded-lg object-contain border border-slate-200 bg-white shrink-0 p-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 line-clamp-1 hover:text-[#0567BA]">
                                {recTitle}
                              </p>
                              <p className="text-xs font-black text-[#0567BA] font-sans mt-0.5">
                                {formatPrice(rec.price)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onAddToCart(rec)}
                            className="px-3 py-1.5 rounded-lg bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{lang === 'kz' ? 'Қосу' : 'В корзину'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Form & Order Summary */}
            <form onSubmit={handleWhatsAppCheckout} className="p-4 sm:p-5 bg-white border-t border-slate-200 space-y-3.5 shadow-inner">
              {/* Delivery method selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {lang === 'kz' ? 'Жеткізу тәсілі:' : 'Способ получения:'}
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      deliveryMethod === 'delivery'
                        ? 'bg-[#0567BA] text-white border-[#0567BA] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'kz' ? 'Атырау курьер' : 'Курьер Атырау'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      deliveryMethod === 'pickup'
                        ? 'bg-[#0567BA] text-white border-[#0567BA] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'kz' ? '№24 Бутик' : 'Самовывоз №24'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('post')}
                    className={`py-2 px-1 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      deliveryMethod === 'post'
                        ? 'bg-[#0567BA] text-white border-[#0567BA] shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {lang === 'kz' ? 'Қазпошта/СДЭК' : 'По Казахстану'}
                  </button>
                </div>
              </div>

              {/* Name & Phone inputs */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={lang === 'kz' ? 'Атыңыз' : 'Ваше имя'}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0567BA]/30 focus:border-[#0567BA]"
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={lang === 'kz' ? '+7 (___) ___-__-__' : '+7 (___) ___-__-__'}
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0567BA]/30 focus:border-[#0567BA]"
                    required
                  />
                </div>
              </div>

              {deliveryMethod !== 'pickup' && (
                <div>
                  <input
                    type="text"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder={
                      lang === 'kz'
                        ? 'Мекенжай: көше, үй, пәтер'
                        : 'Адрес доставки в г. Атырау / город'
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0567BA]/30 focus:border-[#0567BA]"
                  />
                </div>
              )}

              {/* Total calculation */}
              <div className="pt-2.5 border-t border-slate-200 space-y-1">
                {hasBundleDiscount && (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                    <span>
                      {lang === 'kz'
                        ? 'Кешенді жеңілдік (-10%):'
                        : 'Скидка за комплекс (-10%):'}
                    </span>
                    <span className="font-sans">
                      -{formatPrice(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs sm:text-sm font-bold text-slate-700">
                    {lang === 'kz' ? 'Барлық сома:' : 'Итого к оплате:'}
                  </span>
                  <div className="flex items-baseline gap-2">
                    {hasBundleDiscount && (
                      <span className="text-xs sm:text-sm font-sans text-slate-400 line-through">
                        {formatPrice(total)}
                      </span>
                    )}
                    <span className="text-xl sm:text-2xl font-black text-[#0567BA] font-sans">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 text-center">
                💳 {lang === 'kz' ? 'Kaspi Gold / Kaspi QR арқылы төлем' : 'Оплата Kaspi Gold / Kaspi QR при получении'}
              </p>

              {/* WhatsApp Checkout Button */}
              <button
                id="cart-submit-whatsapp-btn"
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1caa52] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer uppercase tracking-wider select-none"
              >
                <MessageCircle className="w-5 h-5 text-white" />
                <span>{lang === 'kz' ? 'WhatsApp арқылы рәсімдеу' : 'Оформить через WhatsApp'}</span>
              </button>

              {/* Bottom Back / Close Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{lang === 'kz' ? 'Саудаға оралу' : 'Назад к покупкам'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{lang === 'kz' ? 'Себетті жабу' : 'Закрыть корзину'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

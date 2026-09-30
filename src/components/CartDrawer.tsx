import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, MessageCircle, MapPin, Truck, Check, Sparkles, ArrowLeft } from 'lucide-react';
import { CartItem, DeliveryMethod, Language, Product, StoreConfig } from '../types';
import { formatPrice, generateWhatsAppOrderUrl } from '../utils/formatters';
import { getCartRecommendations } from '../utils/recommendations';

interface CartDrawerProps {
  items: CartItem[];
  allProducts?: Product[];
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
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [orderNotes, setOrderNotes] = useState('');

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

  const cartRecommendations = useMemo(
    () =>
      getCartRecommendations(
        items.map((i) => i.product),
        allProducts,
        3
      ),
    [items, allProducts]
  );

  const handleWhatsAppCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const url = generateWhatsAppOrderUrl(
      config,
      items,
      {
        name: customerName.trim() || (lang === 'kz' ? 'Тұтынушы' : 'Покупатель'),
        phone: customerPhone.trim() || '',
        address: customerAddress.trim(),
        deliveryMethod,
        notes: orderNotes.trim(),
      },
      lang
    );

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return createPortal(
    <div
      id="cart-drawer-backdrop"
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end overflow-hidden"
      onClick={onClose}
    >
      <div
        id="cart-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#051611] text-stone-100 border-l border-amber-500/25 h-full flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header — Guaranteed full visibility of Корзина without truncation */}
        <div
          id="cart-header"
          className="px-3.5 py-3 sm:p-5 bg-[#030D0A] text-white flex items-center justify-between gap-2 border-b border-amber-500/25 shrink-0"
        >
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 font-extrabold text-[12px] sm:text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title={lang === 'kz' ? 'Артқа' : 'Назад в каталог'}
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
            <h2 className="font-extrabold text-[clamp(15px,4.3vw,20px)] sm:text-xl font-serif whitespace-nowrap">
              {lang === 'kz' ? 'Себет' : 'Корзина'}
            </h2>
            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 font-extrabold whitespace-nowrap shrink-0">
              {items.reduce((s, i) => s + i.quantity, 0)} {lang === 'kz' ? 'дана' : 'шт.'}
            </span>
          </div>

          <button
            type="button"
            id="cart-close-btn"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-stone-100 hover:text-white bg-[#0B241B] hover:bg-rose-700 border border-amber-500/25 font-extrabold text-[12px] sm:text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title={lang === 'kz' ? 'Жабу' : 'Закрыть корзину'}
          >
            <X className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div id="cart-empty-state" className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#092018] border border-amber-500/25 flex items-center justify-center text-amber-300 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-serif font-extrabold text-white">
              {lang === 'kz' ? 'Себет әзірге бос' : 'Ваша корзина пуста'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/75 max-w-xs mt-1.5 mb-6 leading-relaxed">
              {lang === 'kz'
                ? 'Каталогтан өнімдерді таңдап, себетке қосыңыз'
                : 'Выберите полезные товары из каталога и добавьте их в корзину'}
            </p>
            <button
              id="cart-empty-continue-btn"
              onClick={onClose}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 text-xs sm:text-sm font-extrabold hover:from-amber-300 hover:to-amber-400 transition-colors shadow-md cursor-pointer"
            >
              {lang === 'kz' ? 'Каталогқа оралу' : 'Перейти к покупкам'}
            </button>
          </div>
        ) : (
          <div id="cart-scroll-body" className="flex-1 overflow-y-auto overscroll-contain">
            {/* Top Bar inside Cart: Items Count & Clear All Cart Button */}
            <div className="px-4 pt-3.5 pb-2 flex items-center justify-between gap-2 border-b border-amber-500/15 bg-[#071C15]">
              <span className="text-xs sm:text-sm font-bold text-amber-300">
                {lang === 'kz' ? 'Таңдалған тауарлар:' : 'Ваши товары в корзине:'}
              </span>
              <button
                type="button"
                id="clear-cart-btn"
                onClick={onClearCart}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-700 text-rose-200 hover:text-white border border-rose-500/40 text-xs font-extrabold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{lang === 'kz' ? 'Себетті тазалау' : 'Очистить корзину'}</span>
              </button>
            </div>

            {/* List of items with clear quantity & labeled Delete button */}
            <div id="cart-items-list" className="p-4 sm:p-5 divide-y divide-amber-500/15 space-y-4">
              {items.map((item) => {
                const title = lang === 'kz' && item.product.titleKz?.trim() ? item.product.titleKz : item.product.titleRu;
                return (
                  <div
                    key={item.product.id}
                    className="pt-4 first:pt-0 rounded-2xl bg-[#081E16] p-3.5 border border-amber-500/20 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={item.product.images[0]}
                        alt={`${title} — MUSLIM SHOP Атырау, Бутик №24`}
                        className="w-16 h-20 rounded-xl object-cover border border-amber-500/25 shrink-0 bg-stone-900"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm sm:text-base font-bold text-white leading-snug break-words">
                            {title}
                          </h4>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.product.id)}
                            className="p-2 rounded-xl bg-rose-950/90 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 transition-colors cursor-pointer shrink-0 shadow-2xs"
                            title={lang === 'kz' ? 'Тауарды себеттен өшіру' : 'Удалить товар из корзины'}
                            aria-label={lang === 'kz' ? 'Тауарды себеттен өшіру' : 'Удалить товар из корзины'}
                          >
                            <Trash2 className="w-4 h-4 text-rose-300" />
                          </button>
                        </div>

                        {!item.product.inStock && (
                          <span className="inline-block mt-1 text-[11px] text-rose-300 font-bold bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-500/30">
                            {lang === 'kz' ? 'Жақында' : 'Скоро в наличии'}
                          </span>
                        )}

                        <p className="text-xs sm:text-sm text-emerald-200/90 mt-1.5">
                          {formatPrice(item.product.price)} × {item.quantity} ={' '}
                          <strong className="text-amber-300 font-extrabold font-mono text-sm sm:text-base">
                            {formatPrice(item.product.price * item.quantity)}
                          </strong>
                        </p>
                      </div>
                    </div>

                    {/* Quantity Counter & Prominent Labeled Delete Button */}
                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-amber-500/15">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-9 h-9 rounded-xl bg-[#0B241B] hover:bg-[#123629] text-amber-300 border border-amber-500/30 flex items-center justify-center transition-colors cursor-pointer"
                          title={lang === 'kz' ? 'Азайту' : 'Уменьшить количество'}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-sm sm:text-base font-extrabold text-white px-2 font-mono">
                          {item.quantity} {lang === 'kz' ? 'дана' : 'шт.'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-9 h-9 rounded-xl bg-[#0B241B] hover:bg-[#123629] text-amber-300 border border-amber-500/30 flex items-center justify-center transition-colors cursor-pointer"
                          title={lang === 'kz' ? 'Көбейту' : 'Увеличить количество'}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <button
                        type="button"
                        id={`remove-cart-item-${item.product.id}`}
                        onClick={() => onRemoveItem(item.product.id)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 font-extrabold text-xs sm:text-sm transition-colors cursor-pointer shadow-xs shrink-0"
                        title={lang === 'kz' ? 'Тауарды өшіру' : 'Удалить товар из корзины'}
                      >
                        <Trash2 className="w-4 h-4 text-rose-300 shrink-0" />
                        <span>{lang === 'kz' ? 'Өшіру' : 'Удалить'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Frequently Bought Together inside Cart Drawer */}
              {cartRecommendations.length > 0 && onAddToCart && (
                <div
                  id="cart-recommendations-box"
                  className="pt-4 mt-4 border-t border-amber-500/20"
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <h4 className="text-xs sm:text-sm font-bold text-amber-300">
                      {lang === 'kz'
                        ? 'Осы тауармен бірге жиі алады:'
                        : 'С этим товаром часто берут:'}
                    </h4>
                  </div>

                  <div className="space-y-2.5">
                    {cartRecommendations.map((rec) => {
                      const recTitle =
                        lang === 'kz' && rec.titleKz?.trim() ? rec.titleKz : rec.titleRu;
                      return (
                        <div
                          key={rec.id}
                          className="p-3 rounded-2xl bg-[#092018] border border-amber-500/25 flex items-center justify-between gap-2.5 hover:bg-[#0E2E23] transition-colors"
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
                              className="w-11 h-14 rounded-xl object-cover border border-amber-500/25 bg-stone-900 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-bold text-white line-clamp-2">
                                {recTitle}
                              </p>
                              <p className="text-xs sm:text-sm font-extrabold text-amber-300 font-mono tabular-nums mt-0.5">
                                {formatPrice(rec.price)}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onAddToCart(rec)}
                            className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-extrabold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
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

            {/* Checkout Form & Order Summary (inside scroll container so items are never squished) */}
            <form onSubmit={handleWhatsAppCheckout} className="p-4 sm:p-5 bg-[#030F0B] border-t border-amber-500/25 space-y-3.5">
              {/* Delivery method selector */}
              <div>
                <label className="block text-xs sm:text-sm font-bold text-amber-300 mb-2">
                  {lang === 'kz' ? 'Жеткізу тәсілі:' : 'Способ получения:'}
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs sm:text-sm">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-colors cursor-pointer ${
                      deliveryMethod === 'delivery'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-300 shadow-sm'
                        : 'bg-[#092018] text-stone-200 border-amber-500/25 hover:bg-[#0F3124]'
                    }`}
                  >
                    {lang === 'kz' ? 'Атырау курьер' : 'Курьер Атырау'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-colors cursor-pointer ${
                      deliveryMethod === 'pickup'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-300 shadow-sm'
                        : 'bg-[#092018] text-stone-200 border-amber-500/25 hover:bg-[#0F3124]'
                    }`}
                  >
                    {lang === 'kz' ? '№24 Бутик' : 'Самовывоз №24'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('post')}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-colors cursor-pointer ${
                      deliveryMethod === 'post'
                        ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 border-amber-300 shadow-sm'
                        : 'bg-[#092018] text-stone-200 border-amber-500/25 hover:bg-[#0F3124]'
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
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-amber-500/30 bg-[#092018] text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={lang === 'kz' ? '+7 (___) ___-__-__' : '+7 (___) ___-__-__'}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-amber-500/30 bg-[#092018] text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
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
                        : 'Адрес доставки в Атырау / город'
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-amber-500/30 bg-[#092018] text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              )}

              {/* Total calculation */}
              <div className="pt-2.5 border-t border-amber-500/20 flex items-baseline justify-between">
                <span className="text-xs sm:text-sm font-semibold text-emerald-200/85">
                  {lang === 'kz' ? 'Барлық сома:' : 'Итого к оплате:'}
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-300 font-serif">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Kaspi note */}
              <p className="text-xs text-emerald-200/75 text-center">
                💳 {lang === 'kz' ? 'Kaspi Gold арқылы қауіпсіз төлем' : 'Оплата переводом на Kaspi Gold / Kaspi QR при получении'}
              </p>

              {/* WhatsApp Checkout Button */}
              <button
                id="cart-submit-whatsapp-btn"
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 text-stone-950" />
                <span>{lang === 'kz' ? 'WhatsApp арқылы рәсімдеу' : 'Оформить через WhatsApp'}</span>
              </button>

              {/* Bottom Back / Close Button */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl bg-[#0B241B] hover:bg-[#113628] text-amber-300 border border-amber-500/25 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{lang === 'kz' ? 'Саудаға оралу' : 'Назад к покупкам'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-2.5 px-3 rounded-xl bg-[#0B241B] hover:bg-rose-800/80 text-stone-200 hover:text-white border border-amber-500/25 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-amber-300 shrink-0" />
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

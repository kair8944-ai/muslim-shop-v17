import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, MessageCircle, MapPin, Truck, Check } from 'lucide-react';
import { CartItem, DeliveryMethod, Language, StoreConfig } from '../types';
import { formatPrice, generateWhatsAppOrderUrl } from '../utils/formatters';

interface CartDrawerProps {
  items: CartItem[];
  config: StoreConfig;
  lang: Language;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  items,
  config,
  lang,
  onUpdateQuantity,
  onRemoveItem,
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
      className="fixed inset-0 z-[100] bg-stone-950/70 backdrop-blur-xs flex justify-end overflow-hidden"
      onClick={onClose}
    >
      <div
        id="cart-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div id="cart-header" className="p-4 sm:p-5 bg-emerald-950 text-white flex items-center justify-between border-b border-emerald-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-lg font-serif">
              {lang === 'kz' ? 'Тапсырыс себеті' : 'Корзина заказа'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900 text-amber-300 font-semibold">
              {items.reduce((s, i) => s + i.quantity, 0)} {lang === 'kz' ? 'дана' : 'шт.'}
            </span>
          </div>
          <button
            id="cart-close-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div id="cart-empty-state" className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800">
              {lang === 'kz' ? 'Себет әзірге бос' : 'Ваша корзина пуста'}
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mt-1 mb-6">
              {lang === 'kz'
                ? 'Каталогтан өнімдерді таңдап, себетке қосыңыз'
                : 'Выберите полезные товары из каталога и добавьте их в корзину'}
            </p>
            <button
              id="cart-empty-continue-btn"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-900 text-white text-xs font-bold hover:bg-emerald-950 transition-colors"
            >
              {lang === 'kz' ? 'Каталогқа оралу' : 'Перейти к покупкам'}
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Scrollable list of items */}
            <div id="cart-items-list" className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-stone-100 space-y-4">
              {items.map((item) => {
                const title = lang === 'kz' ? item.product.titleKz : item.product.titleRu;
                return (
                  <div key={item.product.id} className="pt-4 first:pt-0 flex items-center gap-3">
                    <img
                      src={item.product.images[0]}
                      alt={title}
                      className="w-14 h-20 rounded-xl object-cover border border-stone-200 shrink-0 bg-stone-100"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                          {title}
                        </h4>
                        {!item.product.inStock && (
                          <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {lang === 'kz' ? 'Жақында' : 'Скоро в наличии'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {formatPrice(item.product.price)} × {item.quantity} ={' '}
                        <strong className="text-emerald-950 font-bold">
                          {formatPrice(item.product.price * item.quantity)}
                        </strong>
                      </p>

                      {/* Counter */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold px-1.5">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.product.id, 1)}
                          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                      title="Удалить товар"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Checkout Form & Order Summary */}
            <form onSubmit={handleWhatsAppCheckout} className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 space-y-3.5 shrink-0">
              {/* Delivery method selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  {lang === 'kz' ? 'Жеткізу тәсілі:' : 'Способ получения:'}
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('delivery')}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      deliveryMethod === 'delivery'
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {lang === 'kz' ? 'Атырау курьер' : 'Курьер Атырау'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('pickup')}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      deliveryMethod === 'pickup'
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {lang === 'kz' ? '№24 Бутик' : 'Самовывоз №24'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('post')}
                    className={`p-2 rounded-lg border text-center font-medium transition-colors ${
                      deliveryMethod === 'post'
                        ? 'bg-emerald-900 text-white border-emerald-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {lang === 'kz' ? 'Қазпошта/СДЭК' : 'По Казахстану'}
                  </button>
                </div>
              </div>

              {/* Name & Phone inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={lang === 'kz' ? 'Атыңыз' : 'Ваше имя'}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    required
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder={lang === 'kz' ? '+7 (___) ___-__-__' : '+7 (___) ___-__-__'}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
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
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>
              )}

              {/* Total calculation */}
              <div className="pt-2 border-t border-stone-200 flex items-baseline justify-between">
                <span className="text-xs font-medium text-stone-600">
                  {lang === 'kz' ? 'Барлық сома:' : 'Итого к оплате:'}
                </span>
                <span className="text-xl font-extrabold text-emerald-950 font-serif">
                  {formatPrice(total)}
                </span>
              </div>

              {/* Kaspi note */}
              <p className="text-[11px] text-stone-500 text-center">
                💳 {lang === 'kz' ? 'Kaspi Gold арқылы қауіпсіз төлем' : 'Оплата переводом на Kaspi Gold / Kaspi QR при получении'}
              </p>

              {/* WhatsApp Checkout Button */}
              <button
                id="cart-submit-whatsapp-btn"
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{lang === 'kz' ? 'WhatsApp арқылы рәсімдеу' : 'Оформить через WhatsApp'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

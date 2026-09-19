import React, { useState } from 'react';
import { X, MessageCircle, Zap, ShieldCheck } from 'lucide-react';
import { Language, Product, StoreConfig } from '../types';
import { formatPrice, generateQuickOrderUrl } from '../utils/formatters';

interface QuickOrderModalProps {
  product: Product;
  config: StoreConfig;
  lang: Language;
  onClose: () => void;
}

export const QuickOrderModal: React.FC<QuickOrderModalProps> = ({
  product,
  config,
  lang,
  onClose,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const title = lang === 'kz' ? product.titleKz : product.titleRu;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = generateQuickOrderUrl(
      config,
      title,
      product.sku,
      product.price,
      name.trim() || (lang === 'kz' ? 'Тұтынушы' : 'Покупатель'),
      phone.trim() || '',
      lang
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div
      id="quick-order-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="quick-order-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-stone-200"
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-emerald-950">
            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h3 className="font-bold text-base font-serif">
              {lang === 'kz' ? '1 басу арқылы жылдам сатып алу' : 'Быстрый заказ в 1 клик'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Product info */}
        <div className="my-4 p-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center gap-3">
          <img
            src={product.images[0]}
            alt={title}
            className="w-14 h-14 rounded-xl object-cover border border-stone-200 bg-white"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-stone-900 line-clamp-1">{title}</p>
            <p className="text-[11px] text-stone-500">Артикул: {product.sku}</p>
            <p className="text-sm font-extrabold text-emerald-950 mt-0.5">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {lang === 'kz' ? 'Сіздің атыңыз' : 'Ваше имя'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'kz' ? 'Мысалы: Айгүл / Данияр' : 'Например: Алина или Арман'}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              {lang === 'kz' ? 'Телефон нөміріңіз' : 'Номер телефона'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (___) ___-__-__"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
              required
            />
          </div>

          <div className="pt-2">
            <button
              id="submit-quick-order-btn"
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{lang === 'kz' ? 'WhatsApp арқылы растау' : 'Подтвердить в WhatsApp'}</span>
            </button>
          </div>

          <p className="text-[11px] text-stone-500 text-center flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'kz' ? 'Менеджер 5 минут ішінде жауап береді' : 'Менеджер Бутика №24 сразу ответит вам'}</span>
          </p>
        </form>
      </div>
    </div>
  );
};

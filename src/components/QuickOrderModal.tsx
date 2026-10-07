import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Language, Product, StoreConfig } from '../types';
import { formatPrice, generateQuickOrderUrl } from '../utils/formatters';
import { trackOrder } from '../services/analyticsService';

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

  const title = lang === 'kz' ? product.titleKz : product.titleRu;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackOrder('quick_order', product.price);
    const url = generateQuickOrderUrl(
      config,
      title,
      product.sku,
      product.price,
      name.trim() || (lang === 'kz' ? 'Тұтынушы' : 'Покупатель'),
      phone.trim() || '',
      lang,
      product.inStock
    );
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return createPortal(
    <div
      id="quick-order-backdrop"
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="quick-order-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white text-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 my-auto"
      >
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2 text-slate-900 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer shrink-0"
              title={lang === 'kz' ? 'Артқа' : 'Назад'}
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
            </button>
            <h3 className="font-black text-sm sm:text-base font-sans truncate">
              {product.inStock
                ? (lang === 'kz' ? '1 басу арқылы сатып алу' : 'Быстрый заказ в 1 клик')
                : (lang === 'kz' ? 'Алдын ала жазылу' : 'Предзаказ товара')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            title={lang === 'kz' ? 'Жабу' : 'Закрыть'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Product info */}
        <div className="my-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          <img
            src={product.images[0]}
            alt={title}
            className="w-14 h-16 rounded-xl object-contain border border-slate-200 bg-white p-0.5 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
              {title}
            </h4>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-sm sm:text-base font-black text-[#0567BA] font-sans">
                {formatPrice(product.price)}
              </span>
              {product.inStock ? (
                <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {lang === 'kz' ? 'Қолда бар' : 'В наличии'}
                </span>
              ) : (
                <span className="text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  {lang === 'kz' ? 'Жақында' : 'Скоро'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'kz' ? 'Атыңыз:' : 'Ваше имя:'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'kz' ? 'Мысалы: Айгүл' : 'Например: Алина'}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0567BA]/30 focus:border-[#0567BA]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {lang === 'kz' ? 'Телефон нөміріңіз:' : 'Номер телефона (WhatsApp):'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (___) ___-__-__"
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0567BA]/30 focus:border-[#0567BA]"
              required
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-[#0567BA]">
              <CheckCircle2 className="w-4 h-4 text-[#0567BA] shrink-0" />
              <span>{config.city}, {config.boutiqueNumber}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {lang === 'kz'
                ? 'Менеджер 5 минут ішінде WhatsApp арқылы хабарласады.'
                : 'Менеджер свяжется с вами в течение 5 минут для подтверждения заказа.'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] active:bg-[#1caa52] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer uppercase tracking-wider"
          >
            <MessageCircle className="w-5 h-5 text-white" />
            <span>
              {product.inStock
                ? (lang === 'kz' ? 'Тапсырысты WhatsApp арқылы растау' : 'Подтвердить в WhatsApp')
                : (lang === 'kz' ? 'Алдын ала тапсырыс жіберу' : 'Оставить предзаказ')}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

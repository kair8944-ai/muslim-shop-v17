import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, Zap, ShieldCheck, Clock, ArrowLeft } from 'lucide-react';
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
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        id="quick-order-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#051611] text-stone-100 rounded-3xl p-6 shadow-2xl border border-amber-500/30 my-auto"
      >
        <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-amber-500/20">
          <div className="flex items-center gap-2 text-white min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 font-extrabold text-xs transition-colors cursor-pointer shrink-0"
              title={lang === 'kz' ? 'Артқа' : 'Назад'}
            >
              <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
            </button>
            <h3 className="font-extrabold text-sm sm:text-base font-serif truncate">
              {product.inStock
                ? (lang === 'kz' ? '1 басу арқылы сатып алу' : 'Быстрый заказ в 1 клик')
                : (lang === 'kz' ? 'Алдын ала жазылу' : 'Предзаказ товара')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B241B] hover:bg-rose-700 text-stone-100 hover:text-white border border-amber-500/25 font-extrabold text-xs cursor-pointer shrink-0"
            title={lang === 'kz' ? 'Жабу' : 'Закрыть'}
          >
            <X className="w-4 h-4 text-amber-300" />
            <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>

        {/* Selected Product info */}
        <div className="my-4 p-3.5 rounded-2xl bg-[#092018] border border-amber-500/25 flex items-center gap-3.5">
          <img
            src={product.images[0]}
            alt={title}
            className="w-15 h-15 rounded-xl object-cover border border-amber-500/25 bg-stone-900 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white line-clamp-1">{title}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-emerald-200/75 font-mono">Арт: {product.sku}</span>
              {product.inStock ? (
                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {lang === 'kz' ? 'Қолда бар' : 'В наличии'}
                </span>
              ) : (
                <span className="text-xs font-bold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-md border border-rose-500/30">
                  {lang === 'kz' ? 'Қолда жоқ • Жақында' : 'Нет в наличии • Скоро'}
                </span>
              )}
            </div>
            <p className="text-base font-extrabold text-amber-300 font-serif mt-1">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-amber-300 mb-1.5">
              {lang === 'kz' ? 'Сіздің атыңыз' : 'Ваше имя'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'kz' ? 'Мысалы: Айгүл / Данияр' : 'Например: Алина или Арман'}
              className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-amber-500/30 bg-[#092018] text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-amber-300 mb-1.5">
              {lang === 'kz' ? 'Телефон нөміріңіз' : 'Номер телефона'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (___) ___-__-__"
              className="w-full px-4 py-3 text-sm sm:text-base rounded-xl border border-amber-500/30 bg-[#092018] text-white placeholder:text-emerald-200/50 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              required
            />
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              id="submit-quick-order-btn"
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 hover:from-amber-300 hover:to-amber-400 text-stone-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-stone-950" />
              <span>
                {product.inStock
                  ? (lang === 'kz' ? 'WhatsApp арқылы растау' : 'Подтвердить в WhatsApp')
                  : (lang === 'kz' ? 'WhatsApp арқылы өтінім жіберу' : 'Отправить заявку в WhatsApp')}
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-[#0B241B] hover:bg-[#113628] text-amber-300 border border-amber-500/25 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-3 rounded-xl bg-[#0B241B] hover:bg-rose-800/80 text-stone-200 hover:text-white border border-amber-500/25 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-amber-300 shrink-0" />
                <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-emerald-200/75 text-center flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {product.inStock
                ? (lang === 'kz' ? 'Менеджер 5 минут ішінде жауап береді' : 'Менеджер Бутика №24 сразу ответит вам')
                : (lang === 'kz' ? 'Тауар түскенде Бутик №24 сізге бірден хабарлайды!' : 'Бутик №24 сразу сообщит вам, когда товар поступит!')}
            </span>
          </p>
        </form>
      </div>
    </div>,
    document.body
  );
};

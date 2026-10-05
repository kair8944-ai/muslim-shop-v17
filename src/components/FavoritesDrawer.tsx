import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Trash2,
  Heart,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';

interface FavoritesDrawerProps {
  favorites: Product[];
  lang: Language;
  onRemoveFavorite: (product: Product) => void;
  onClearFavorites?: () => void;
  onAddToCart?: (product: Product) => void;
  onOpenDetail?: (product: Product) => void;
  onClose: () => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  favorites,
  lang,
  onRemoveFavorite,
  onClearFavorites,
  onAddToCart,
  onOpenDetail,
  onClose,
}) => {
  const isKz = lang === 'kz';

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

  return createPortal(
    <div
      id="favorites-drawer-backdrop"
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex justify-end overflow-hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="favorites-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white text-slate-800 border-l border-slate-200 h-full flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Flip.kz Signature Deep Blue Header */}
        <div className="px-4 py-3 sm:py-3.5 bg-[#0567BA] text-white flex items-center justify-between gap-2 border-b border-[#045294] shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
            title={isKz ? 'Артқа' : 'Назад'}
          >
            <ArrowLeft className="w-4 h-4 text-white shrink-0" />
            <span>{isKz ? 'Артқа' : 'Назад'}</span>
          </button>

          <div className="flex items-center justify-center gap-2 min-w-0">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 fill-rose-400 shrink-0" />
            <h2 className="font-black text-base sm:text-lg font-sans whitespace-nowrap">
              {isKz ? 'Таңдаулы' : 'Избранное'}
            </h2>
            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-black shrink-0">
              {favorites.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
            title={isKz ? 'Жабу' : 'Закрыть'}
          >
            <X className="w-4 h-4 text-white shrink-0" />
            <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>

        {/* Content */}
        {favorites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f8fafc]">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-500 mb-4 shadow-xs">
              <Heart className="w-8 h-8 fill-rose-100" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              {isKz ? 'Таңдаулылар тізімі бос' : 'В избранном пока ничего нет'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xs mt-1.5 mb-6 leading-relaxed">
              {isKz
                ? 'Өнім карточкасындағы жүрекшені басу арқылы өнімді осында сақтаңыз'
                : 'Нажимайте на сердечко в карточках товаров Flip.kz, чтобы сохранить их здесь'}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 text-xs sm:text-sm font-black transition-colors shadow-xs cursor-pointer uppercase tracking-wider"
            >
              {isKz ? 'Каталогқа оралу' : 'Перейти в каталог'}
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto overscroll-contain bg-[#f8fafc]">
            {onClearFavorites && (
              <div className="px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-200 bg-white">
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {isKz ? 'Сақталған тауарлар:' : 'Сохранённые товары:'}
                </span>
                <button
                  type="button"
                  onClick={onClearFavorites}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{isKz ? 'Бәрін өшіру' : 'Очистить всё'}</span>
                </button>
              </div>
            )}

            <div className="p-4 space-y-3">
              {favorites.map((product) => {
                const title = isKz && product.titleKz?.trim() ? product.titleKz : product.titleRu;
                return (
                  <div
                    key={product.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3 justify-between"
                  >
                    <div
                      onClick={() => {
                        if (onOpenDetail) {
                          onClose();
                          onOpenDetail(product);
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                    >
                      <img
                        src={product.images[0]}
                        alt={title}
                        className="w-14 h-16 rounded-xl object-contain border border-slate-200 bg-white p-0.5 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 hover:text-[#0567BA]">
                          {title}
                        </h4>
                        <p className="text-xs sm:text-sm font-black text-[#0567BA] font-sans mt-0.5">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onAddToCart && (
                        <button
                          type="button"
                          onClick={() => onAddToCart(product)}
                          className="p-2 rounded-xl bg-[#ffbd00] hover:bg-[#febd01] text-slate-950 transition-colors cursor-pointer shadow-2xs"
                          title={isKz ? 'Себетке қосу' : 'Добавить в корзину'}
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onRemoveFavorite(product)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={isKz ? 'Өшіру' : 'Удалить из избранного'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{isKz ? 'Саудаға оралу' : 'Назад к покупкам'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{isKz ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

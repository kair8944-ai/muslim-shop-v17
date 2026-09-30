import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, ShoppingBag, Trash2, ArrowLeft } from 'lucide-react';
import { Language, Product } from '../types';
import { formatPrice } from '../utils/formatters';

interface FavoritesDrawerProps {
  favorites: Product[];
  lang: Language;
  onRemoveFavorite: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenDetail: (product: Product) => void;
  onClose: () => void;
}

export const FavoritesDrawer: React.FC<FavoritesDrawerProps> = ({
  favorites,
  lang,
  onRemoveFavorite,
  onAddToCart,
  onOpenDetail,
  onClose,
}) => {
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
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end overflow-hidden"
      onClick={onClose}
    >
      <div
        id="favorites-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#051611] text-stone-100 border-l border-amber-500/25 h-full flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="px-3.5 py-3 sm:p-5 bg-[#030D0A] text-white flex items-center justify-between gap-2 border-b border-amber-500/25 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/40 font-extrabold text-[12px] sm:text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title={lang === 'kz' ? 'Артқа' : 'Назад'}
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'kz' ? 'Артқа' : 'Назад'}</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 min-w-0">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 fill-rose-400 shrink-0" />
            <h2 className="font-extrabold text-[clamp(15px,4.3vw,20px)] sm:text-xl font-serif whitespace-nowrap">
              {lang === 'kz' ? 'Таңдаулы' : 'Избранное'}
            </h2>
            <span className="text-[11px] sm:text-xs px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 font-extrabold shrink-0">
              {favorites.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0B241B] hover:bg-rose-700 text-stone-100 hover:text-white border border-amber-500/25 font-extrabold text-[12px] sm:text-sm transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title={lang === 'kz' ? 'Жабу' : 'Закрыть'}
          >
            <X className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>

        {favorites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#092018] border border-amber-500/25 flex items-center justify-center text-rose-400 mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-serif font-extrabold text-white">
              {lang === 'kz' ? 'Таңдаулылар тізімі бос' : 'В избранном пока ничего нет'}
            </h3>
            <p className="text-xs sm:text-sm text-emerald-200/75 max-w-xs mt-1.5 mb-6 leading-relaxed">
              {lang === 'kz'
                ? 'Өнім карточкасындағы жүрекшені басу арқылы өнімді осында сақтаңыз'
                : 'Нажимайте на сердечко в карточках товаров, чтобы сохранить их здесь'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-amber-500/15 space-y-3.5">
            {favorites.map((product) => {
              const title = lang === 'kz' && product.titleKz?.trim() ? product.titleKz : product.titleRu;
              return (
                <div
                  key={product.id}
                  className="pt-3.5 first:pt-0 rounded-2xl bg-[#081E16] p-3.5 border border-amber-500/20 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={product.images[0]}
                      alt={`${title} — Витамины iHerb и БАДы в Атырау, Бутик №24`}
                      onClick={() => {
                        onOpenDetail(product);
                        onClose();
                      }}
                      className="w-16 h-20 rounded-xl object-cover border border-amber-500/25 shrink-0 cursor-pointer bg-stone-900"
                    />
                    <div className="flex-1 min-w-0">
                      <h4
                        onClick={() => {
                          onOpenDetail(product);
                          onClose();
                        }}
                        className="text-sm sm:text-base font-bold text-white leading-snug break-words cursor-pointer hover:text-amber-300"
                      >
                        {title}
                      </h4>
                      <p className="text-base sm:text-lg font-extrabold text-amber-300 font-serif mt-1">
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-amber-500/15">
                    <button
                      type="button"
                      onClick={() => onAddToCart(product)}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                    >
                      <ShoppingBag className="w-4 h-4 text-stone-950 shrink-0" />
                      <span>{lang === 'kz' ? 'Себетке қосу' : 'В корзину'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveFavorite(product)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 font-extrabold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
                      title={lang === 'kz' ? 'Таңдаулыдан өшіру' : 'Удалить из избранного'}
                    >
                      <Trash2 className="w-4 h-4 text-rose-300 shrink-0" />
                      <span>{lang === 'kz' ? 'Өшіру' : 'Удалить'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Back & Close Footer */}
        <div className="p-4 bg-[#030D0A] border-t border-amber-500/25 flex items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B241B] hover:bg-[#113628] text-amber-300 border border-amber-500/30 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'kz' ? 'Каталогқа оралу' : 'Назад в каталог'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-[#0B241B] hover:bg-rose-800/80 text-stone-100 hover:text-white border border-amber-500/30 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{lang === 'kz' ? 'Жабу' : 'Закрыть'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

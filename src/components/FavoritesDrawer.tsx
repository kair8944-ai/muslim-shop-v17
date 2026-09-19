import React from 'react';
import { X, Heart, ShoppingBag, Trash2 } from 'lucide-react';
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
  return (
    <div
      id="favorites-drawer-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        id="favorites-drawer-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
            <h2 className="font-bold text-lg font-serif">
              {lang === 'kz' ? 'Таңдаулы өнімдер' : 'Избранные товары'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-stone-800 text-amber-300 font-semibold">
              {favorites.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {favorites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-4">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-stone-800">
              {lang === 'kz' ? 'Таңдаулылар тізімі бос' : 'В избранном пока ничего нет'}
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mt-1 mb-6">
              {lang === 'kz'
                ? 'Өнім карточкасындағы жүрекшені басу арқылы өнімді осында сақтаңыз'
                : 'Нажимайте на сердечко в карточках товаров, чтобы сохранить их здесь'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100 space-y-3">
            {favorites.map((product) => {
              const title = lang === 'kz' ? product.titleKz : product.titleRu;
              return (
                <div key={product.id} className="pt-3 first:pt-0 flex items-center gap-3">
                  <img
                    src={product.images[0]}
                    alt={title}
                    onClick={() => {
                      onOpenDetail(product);
                      onClose();
                    }}
                    className="w-14 h-20 rounded-xl object-cover border border-stone-200 shrink-0 cursor-pointer bg-stone-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h4
                      onClick={() => {
                        onOpenDetail(product);
                        onClose();
                      }}
                      className="text-xs sm:text-sm font-bold text-stone-900 truncate cursor-pointer hover:text-emerald-800"
                    >
                      {title}
                    </h4>
                    <p className="text-sm font-extrabold text-emerald-950 mt-0.5">
                      {formatPrice(product.price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => onAddToCart(product)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-300" />
                        <span>{lang === 'kz' ? 'Себетке' : 'В корзину'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemoveFavorite(product)}
                    className="p-2 text-stone-400 hover:text-rose-600 transition-colors"
                    title="Удалить из избранного"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

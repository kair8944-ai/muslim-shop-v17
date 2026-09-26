import React from 'react';
import { Sparkles, Layers, RotateCcw, Settings2 } from 'lucide-react';
import { Category, Language } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  lang: Language;
  productCounts: Record<string, number>;
  onOpenAdminCategories?: () => void;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  lang,
  productCounts,
  onOpenAdminCategories,
}) => {
  const isKz = lang === 'kz';

  return (
    <section
      id="category-nav-bar"
      aria-label={isKz ? 'Санаттар каталогы' : 'Каталог категорий'}
      className="w-full max-w-full overflow-x-hidden bg-[#FAF8F5] border-b border-stone-200/90 py-5 sm:py-6"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header toolbar for Categories */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-900 text-amber-300 flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-emerald-950 flex items-center gap-2">
                <span>{isKz ? 'Каталог бөлімдері' : 'Каталоги товаров'}</span>
                <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/60">
                  {categories.length} {isKz ? 'санат' : 'направлений'}
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500">
                {isKz
                  ? 'Барлық бөлімдер алдыңызда — кез келгенін таңдап өнімдерді көріңіз'
                  : 'Все категории наглядно перед вами — нажмите на нужную для быстрого выбора'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategoryId !== 'cat-all' && (
              <button
                type="button"
                id="reset-category-filter-btn"
                onClick={() => onSelectCategory('cat-all')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-200/90 hover:bg-stone-300 text-stone-700 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isKz ? 'Барлығын көрсету' : 'Сбросить фильтр'}</span>
              </button>
            )}

            {onOpenAdminCategories && (
              <button
                type="button"
                id="manage-categories-btn"
                onClick={onOpenAdminCategories}
                title={isKz ? 'Каталогтарды баптау' : 'Управление каталогами'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-700/30 transition-colors cursor-pointer shadow-2xs"
              >
                <Settings2 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">
                  {isKz ? 'Каталогтарды өзгерту' : 'Настроить каталоги'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ALL CATEGORIES LAID OUT SIDE-BY-SIDE (NO HORIZONTAL SCROLL) */}
        <div
          id="category-grid-chips"
          className="flex flex-wrap items-center gap-2 sm:gap-2.5"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = productCounts[cat.id] ?? 0;
            const catName = isKz && cat.nameKz ? cat.nameKz : cat.nameRu;

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                className={`group inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer select-none active:scale-97 ${
                  isSelected
                    ? 'bg-emerald-900 text-white shadow-md shadow-emerald-950/20 ring-2 ring-amber-400 ring-offset-1 border-transparent'
                    : 'bg-white hover:bg-emerald-50/70 text-stone-800 border border-stone-200/90 shadow-2xs hover:border-emerald-500/40'
                }`}
              >
                <span className="text-base sm:text-lg leading-none transition-transform group-hover:scale-110">
                  {cat.icon || '✨'}
                </span>

                <span
                  className={`tracking-tight ${
                    isSelected ? 'text-amber-200 font-bold' : 'text-stone-800'
                  }`}
                >
                  {catName}
                </span>

                {count > 0 && (
                  <span
                    className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-stone-950 shadow-xs'
                        : 'bg-stone-100 text-stone-600 group-hover:bg-emerald-100 group-hover:text-emerald-900'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import { Layers, RotateCcw, Settings2 } from 'lucide-react';
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
      className="w-full max-w-full overflow-x-hidden bg-[#051510] border-b border-amber-500/15 py-6 sm:py-7"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header toolbar for Categories */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-sm shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-serif font-extrabold text-white flex items-center gap-2.5 flex-wrap">
                <span>{isKz ? 'Каталог бөлімдері' : 'Каталоги товаров'}</span>
                <span className="text-xs font-sans font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/40">
                  {categories.length} {isKz ? 'санат' : 'направлений'}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/75 mt-1 leading-relaxed">
                {isKz
                  ? 'Барлық бөлімдер алдыңызда — кез келгенін таңдап өнімдерді көріңіз'
                  : 'Все категории наглядно перед вами — нажмите на нужную для быстрого выбора'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedCategoryId !== 'cat-all' && (
              <button
                type="button"
                id="reset-category-filter-btn"
                onClick={() => onSelectCategory('cat-all')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0E2C21] hover:bg-[#153D2E] text-amber-300 border border-amber-500/30 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isKz ? 'Барлығын көрсету' : 'Сбросить фильтр'}</span>
              </button>
            )}

            {onOpenAdminCategories && (
              <button
                type="button"
                id="manage-categories-btn"
                onClick={onOpenAdminCategories}
                title={isKz ? 'Каталогтарды баптау' : 'Управление каталогами'}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#0B221A] hover:bg-[#113126] text-emerald-200 hover:text-amber-300 border border-amber-500/25 transition-colors cursor-pointer"
              >
                <Settings2 className="w-4 h-4 text-amber-400" />
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
          className="flex flex-wrap items-center gap-2 sm:gap-3"
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
                className={`group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl text-sm sm:text-base font-bold transition-all cursor-pointer select-none active:scale-97 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-stone-950 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300 border-transparent'
                    : 'bg-[#0B221A] hover:bg-[#113126] text-stone-100 border border-amber-500/20 hover:border-amber-400/50 shadow-sm'
                }`}
              >
                <span className="text-lg sm:text-xl leading-none transition-transform group-hover:scale-110">
                  {cat.icon || '✨'}
                </span>

                <span
                  className={`tracking-tight ${
                    isSelected ? 'text-stone-950 font-extrabold' : 'text-stone-100 group-hover:text-white'
                  }`}
                >
                  {catName}
                </span>

                {count > 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-extrabold transition-colors tabular-nums ${
                      isSelected
                        ? 'bg-stone-950 text-amber-300 shadow-xs'
                        : 'bg-[#061510] text-amber-300/90 border border-amber-500/25 group-hover:border-amber-400/50'
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

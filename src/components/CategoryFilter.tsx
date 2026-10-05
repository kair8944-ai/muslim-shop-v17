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
      className="w-full bg-slate-50 border-b border-slate-200 py-6 sm:py-8"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header toolbar for Categories */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-[#C5A059] flex items-center justify-center shrink-0 shadow-xs">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 flex items-center gap-2 flex-wrap">
                <span>{isKz ? 'Каталог бөлімдері' : 'Категории товаров'}</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-800">
                  {categories.length}
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                {isKz
                  ? 'Өзіңізге қажетті бөлімді таңдаңыз'
                  : 'Выберите категорию для быстрого перехода к нужным товарам'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCategoryId !== 'cat-all' && (
              <button
                type="button"
                id="reset-category-filter-btn"
                onClick={() => onSelectCategory('cat-all')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isKz ? 'Барлық тауарлар' : 'Все товары'}</span>
              </button>
            )}

            {onOpenAdminCategories && (
              <button
                type="button"
                id="manage-categories-btn"
                onClick={onOpenAdminCategories}
                title={isKz ? 'Каталогтарды баптау' : 'Управление каталогами'}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
              >
                <Settings2 className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">
                  {isKz ? 'Баптау' : 'Управление'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Categories Chips Grid */}
        <div
          id="category-grid-chips"
          className="flex flex-wrap items-center gap-2.5 sm:gap-3"
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
                className={`group inline-flex items-center gap-2.5 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-extrabold transition-all cursor-pointer select-none active:scale-97 shadow-xs min-h-[48px] sm:min-h-[52px] ${
                  isSelected
                    ? 'bg-slate-900 text-white border-2 border-[#C5A059] shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-200'
                }`}
              >
                <span className="text-xl sm:text-2xl leading-none shrink-0">
                  {cat.icon || '✨'}
                </span>

                <span className="tracking-tight">
                  {catName}
                </span>

                {count > 0 && (
                  <span
                    className={`text-xs sm:text-sm font-mono px-2 py-0.5 rounded-md font-bold tabular-nums ${
                      isSelected
                        ? 'bg-slate-800 text-[#C5A059]'
                        : 'bg-slate-100 text-slate-700'
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

import React from 'react';
import { Category, Language } from '../types';

interface CategoryFilterProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (id: string) => void;
  lang: Language;
  productCounts: Record<string, number>;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  lang,
  productCounts,
}) => {
  return (
    <div id="category-nav-bar" className="w-full bg-white border-b border-stone-200 py-3 sticky top-[108px] sm:top-[116px] z-30 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4">
        <div
          id="category-scroll-list"
          className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 scroll-smooth"
        >
          {categories.map((cat) => {
            const isSelected = selectedCategoryId === cat.id;
            const count = productCounts[cat.id] ?? 0;

            return (
              <button
                key={cat.id}
                id={`cat-btn-${cat.id}`}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-900 text-amber-300 shadow-sm border border-amber-500/40'
                    : 'bg-stone-100/80 hover:bg-stone-200/70 text-stone-700 border border-stone-200/80'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{(lang === 'kz' && cat.nameKz) ? cat.nameKz : cat.nameRu}</span>
                {count > 0 && (
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-amber-400 text-emerald-950'
                        : 'bg-stone-200 text-stone-600'
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
    </div>
  );
};

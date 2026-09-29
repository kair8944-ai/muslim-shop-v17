import React, { useMemo } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  Sparkles,
  Flame,
  Heart,
  Leaf,
  Smile,
  RotateCcw,
  Stethoscope,
} from 'lucide-react';
import { AccessibilitySettings, Language, Product } from '../types';
import { SYMPTOM_GOALS, doesProductMatchSymptom } from '../utils/recommendations';

interface SymptomSelectorProps {
  products: Product[];
  selectedSymptom: string;
  onSelectSymptom: (symptomId: string) => void;
  lang: Language;
  accessibility: AccessibilitySettings;
}

export const SymptomSelector: React.FC<SymptomSelectorProps> = ({
  products,
  selectedSymptom,
  onSelectSymptom,
  lang,
  accessibility,
}) => {
  const isKz = lang === 'kz';

  // Calculate how many products match each symptom goal
  const symptomCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SYMPTOM_GOALS.forEach((goal) => {
      counts[goal.id] = products.filter((p) => doesProductMatchSymptom(p, goal.id)).length;
    });
    return counts;
  }, [products]);

  const getIcon = (id: string, isActive: boolean) => {
    const cls = `w-5 h-5 shrink-0 transition-transform duration-200 ${
      isActive ? 'text-amber-300 scale-110' : 'text-emerald-800 group-hover:text-emerald-950'
    }`;
    switch (id) {
      case 'immunity':
        return <ShieldCheck className={cls} />;
      case 'energy':
        return <Zap className={cls} />;
      case 'joints':
        return <Activity className={cls} />;
      case 'beauty':
        return <Sparkles className={cls} />;
      case 'men':
        return <Flame className={cls} />;
      case 'women':
        return <Heart className={cls} />;
      case 'digestion':
        return <Leaf className={cls} />;
      case 'kids':
        return <Smile className={cls} />;
      default:
        return <ShieldCheck className={cls} />;
    }
  };

  const activeGoal = SYMPTOM_GOALS.find((g) => g.id === selectedSymptom);

  return (
    <section
      id="symptom-selector-section"
      aria-label={isKz ? 'Мақсат бойынша таңдау' : 'Подбор товаров по задаче и симптомам'}
      className={`w-full border-b transition-colors ${
        accessibility.highContrast
          ? 'bg-white border-black'
          : 'bg-[#F4EFE6]/70 border-stone-200/80'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-5 sm:py-6">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-extrabold text-base sm:text-xl text-emerald-950 leading-tight">
                {isKz
                  ? 'Сізді не мазалайды? Мақсат бойынша жылдам таңдау'
                  : 'Что вас беспокоит? Умный подбор по задаче'}
              </h2>
              <p className="text-xs text-stone-600 mt-0.5">
                {isKz
                  ? 'Дәрумен атын білмесеңіз, қажетті бағытты басыңыз — лайықты өнімдер бірден шығады'
                  : 'Не знаете точное название витамина? Выберите свою задачу — мы покажем подходящие средства'}
              </p>
            </div>
          </div>

          {selectedSymptom !== 'all' && (
            <button
              type="button"
              id="reset-symptom-btn"
              onClick={() => onSelectSymptom('all')}
              className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isKz ? 'Таңдауды тазалау' : 'Показать все товары'}</span>
            </button>
          )}
        </div>

        {/* Interactive Goal Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
          {SYMPTOM_GOALS.map((goal) => {
            const isActive = selectedSymptom === goal.id;
            const count = symptomCounts[goal.id] || 0;
            return (
              <button
                key={goal.id}
                id={`symptom-btn-${goal.id}`}
                type="button"
                onClick={() => {
                  const next = isActive ? 'all' : goal.id;
                  onSelectSymptom(next);
                  if (next !== 'all') {
                    const el = document.getElementById('catalog-section');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className={`group text-left p-3 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-emerald-950 text-white border-amber-400 shadow-md ring-2 ring-amber-400/40 -translate-y-0.5'
                    : accessibility.highContrast
                    ? 'bg-white text-black border-2 border-black hover:bg-stone-100'
                    : 'bg-white hover:bg-emerald-50/50 text-stone-900 border-stone-200/90 hover:border-emerald-700/40 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 w-full">
                  {getIcon(goal.id, isActive)}
                  <span
                    className={`text-[11px] font-mono tabular-nums font-bold ${
                      isActive ? 'text-amber-300' : 'text-stone-400 group-hover:text-emerald-800'
                    }`}
                  >
                    {count}
                  </span>
                </div>

                <div>
                  <div
                    className={`font-bold text-xs leading-snug line-clamp-2 ${
                      isActive ? 'text-white' : 'text-stone-900 group-hover:text-emerald-950'
                    }`}
                  >
                    {isKz ? goal.titleKz : goal.titleRu}
                  </div>
                  <p
                    className={`text-[10px] mt-0.5 line-clamp-1 ${
                      isActive ? 'text-emerald-200' : 'text-stone-500'
                    }`}
                  >
                    {isKz ? goal.badgeKz : goal.badgeRu}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Goal Explanation Bar */}
        {activeGoal && (
          <div className="mt-3 p-3 sm:px-4 rounded-2xl bg-emerald-950 text-white border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div>
                <span className="font-bold text-amber-300">
                  {isKz ? activeGoal.titleKz : activeGoal.titleRu}:
                </span>{' '}
                <span className="text-emerald-100">
                  {isKz ? activeGoal.subtitleKz : activeGoal.subtitleRu}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono tabular-nums text-amber-300 font-bold shrink-0">
              {isKz
                ? `Табылды: ${symptomCounts[activeGoal.id] || 0} өнім`
                : `Подходит товаров: ${symptomCounts[activeGoal.id] || 0}`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

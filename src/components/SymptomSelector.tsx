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
    const cls = `w-5 h-5 sm:w-6 sm:h-6 shrink-0 transition-transform duration-200 ${
      isActive ? 'text-stone-950 scale-110' : 'text-amber-400 group-hover:text-amber-300'
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
      className="w-full bg-[#071A14] border-b border-amber-500/15 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-7">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-sm shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-extrabold text-lg sm:text-2xl text-white leading-tight">
                {isKz
                  ? 'Сізді не мазалайды? Мақсат бойынша жылдам таңдау'
                  : 'Что вас беспокоит? Умный подбор по задаче'}
              </h2>
              <p className="text-xs sm:text-sm text-emerald-200/75 mt-1 leading-relaxed">
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
              className="self-start sm:self-auto px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs sm:text-sm flex items-center gap-1.5 shadow-md transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isKz ? 'Таңдауды тазалау' : 'Показать все товары'}</span>
            </button>
          )}
        </div>

        {/* Interactive Goal Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
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
                className={`group text-left p-3.5 rounded-2xl border transition-all duration-150 flex flex-col justify-between gap-2.5 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-stone-950 border-amber-200 shadow-lg shadow-amber-500/20 ring-2 ring-amber-300/60 -translate-y-0.5'
                    : 'bg-[#0C261D] hover:bg-[#113327] text-stone-100 border-amber-500/20 hover:border-amber-400/50 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 w-full">
                  {getIcon(goal.id, isActive)}
                  <span
                    className={`text-xs font-mono tabular-nums font-extrabold px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? 'bg-stone-950 text-amber-300'
                        : 'bg-[#061510] text-amber-300/90 group-hover:text-amber-300'
                    }`}
                  >
                    {count}
                  </span>
                </div>

                <div>
                  <div
                    className={`font-extrabold text-sm leading-snug line-clamp-2 ${
                      isActive ? 'text-stone-950' : 'text-white group-hover:text-amber-200'
                    }`}
                  >
                    {isKz ? goal.titleKz : goal.titleRu}
                  </div>
                  <p
                    className={`text-xs mt-1 line-clamp-1 font-medium ${
                      isActive ? 'text-stone-900' : 'text-emerald-200/75'
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
          <div className="mt-4 p-3.5 sm:px-5 rounded-2xl bg-[#0D2C21] text-white border border-amber-400/45 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
            <div className="flex items-center gap-2.5 text-sm sm:text-base leading-relaxed">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div>
                <span className="font-extrabold text-amber-300">
                  {isKz ? activeGoal.titleKz : activeGoal.titleRu}:
                </span>{' '}
                <span className="text-emerald-100">
                  {isKz ? activeGoal.subtitleKz : activeGoal.subtitleRu}
                </span>
              </div>
            </div>
            <span className="text-xs sm:text-sm font-mono tabular-nums text-amber-300 font-extrabold shrink-0">
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

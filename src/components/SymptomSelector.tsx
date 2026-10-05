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
      className="w-full bg-white border-b border-slate-200/80 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs shrink-0">
              <Stethoscope className="w-4.5 h-4.5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="font-sans font-bold text-sm sm:text-base text-slate-900 leading-tight">
                {isKz
                  ? 'Сізді не мазалайды? Мақсат бойынша жылдам таңдау'
                  : 'Что вас беспокоит? Умный подбор по задаче'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                {isKz
                  ? 'Дәрумен атын білмесеңіз, қажетті бағытты басыңыз — лайықты өнімдер бірден шығады'
                  : 'Выберите направление — мы покажем подходящие сертифицированные комплексы'}
              </p>
            </div>
          </div>

          {selectedSymptom !== 'all' && (
            <button
              type="button"
              id="reset-symptom-btn"
              onClick={() => onSelectSymptom('all')}
              className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isKz ? 'Барлық өнімдер' : 'Показать все товары'}</span>
            </button>
          )}
        </div>

        {/* Interactive Goal Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
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
                className={`group text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-150 flex flex-col justify-between gap-1.5 cursor-pointer shadow-xs ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm ring-2 ring-emerald-400'
                    : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-800 border-slate-200/90 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 shadow-xs'}`}>
                    {getIcon(goal.id, isActive)}
                  </div>
                  {count > 0 && (
                    <span
                      className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded font-bold ${
                        isActive
                          ? 'bg-emerald-800 text-white'
                          : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </div>
                <div>
                  <div
                    className={`font-bold text-xs leading-tight ${
                      isActive ? 'text-white' : 'text-slate-900 group-hover:text-emerald-700'
                    }`}
                  >
                    {isKz ? goal.titleKz : goal.titleRu}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Goal Explanation Bar */}
        {activeGoal && (
          <div className="mt-3.5 p-3 sm:px-4 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-emerald-900">
                  {isKz ? activeGoal.titleKz : activeGoal.titleRu}:
                </span>{' '}
                <span className="text-emerald-800">
                  {isKz ? activeGoal.subtitleKz : activeGoal.subtitleRu}
                </span>
              </div>
            </div>
            <span className="text-xs font-mono tabular-nums text-emerald-700 font-bold shrink-0">
              {isKz
                ? `Табылды: ${symptomCounts[activeGoal.id] || 0} өнім`
                : `Подходит: ${symptomCounts[activeGoal.id] || 0} товаров`}
            </span>
          </div>
        )}
      </div>
    </section>
  );
};

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X, Check, RotateCcw, Sparkles } from 'lucide-react';
import { AccessibilitySettings, Language, TextScale } from '../types';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessibility: AccessibilitySettings;
  onAccessibilityChange: (settings: AccessibilitySettings) => void;
  lang: Language;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  accessibility,
  onAccessibilityChange,
  lang,
}) => {
  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isKz = lang === 'kz';

  const handleScaleSelect = (scale: TextScale) => {
    onAccessibilityChange({
      ...accessibility,
      scale,
    });
  };

  const handleToggleContrast = () => {
    onAccessibilityChange({
      ...accessibility,
      highContrast: !accessibility.highContrast,
    });
  };

  const handleReset = () => {
    onAccessibilityChange({
      scale: 'normal',
      highContrast: false,
    });
  };

  return createPortal(
    <div
      id="accessibility-modal-backdrop"
      className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      onClick={onClose}
    >
      <div
        id="accessibility-modal-dialog"
        className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border-2 border-emerald-800/30 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-modal-title"
      >
        {/* Header */}
        <div className="bg-emerald-950 text-white px-5 sm:px-6 py-4.5 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <h2
                id="accessibility-modal-title"
                className="font-serif font-bold text-lg sm:text-xl text-amber-200 leading-tight"
              >
                {isKz
                  ? 'Нашар көретіндер мен қарт кісілерге'
                  : 'Для слабовидящих и пожилых'}
              </h2>
              <p className="text-xs text-emerald-300/90 mt-0.5">
                {isKz
                  ? 'Көзілдіріксіз ыңғайлы оқу үшін шрифт пен контрастты баптаңыз'
                  : 'Настройка крупного шрифта и контрастности для лёгкого чтения'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-900/80 transition-colors cursor-pointer"
            aria-label="Закрыть окно"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Font Size */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm sm:text-base font-bold text-stone-900">
                {isKz ? '1. Мәтін өлшемі (Шрифт):' : '1. Размер шрифта текста:'}
              </label>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                {accessibility.scale === 'normal'
                  ? '100% Стандарт'
                  : accessibility.scale === 'large'
                  ? '125% Крупный'
                  : '150% Максимальный'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Normal */}
              <button
                type="button"
                onClick={() => handleScaleSelect('normal')}
                className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  accessibility.scale === 'normal'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold font-serif">A</span>
                  {accessibility.scale === 'normal' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm">
                    {isKz ? 'Орташа' : 'Обычный'}
                  </div>
                  <div className="text-xs text-stone-700 mt-0.5">100%</div>
                </div>
              </button>

              {/* Large - Recommended */}
              <button
                type="button"
                onClick={() => handleScaleSelect('large')}
                className={`relative p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  accessibility.scale === 'large'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-amber-300 hover:border-amber-400 bg-amber-50/30 text-stone-800'
                }`}
              >
                <span className="absolute -top-2.5 left-3 bg-amber-400 text-stone-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  {isKz ? 'Ұсынылады' : 'Рекомендуется'}
                </span>
                <div className="flex items-center justify-between mb-2 mt-1">
                  <span className="text-2xl font-black font-serif text-emerald-900">A+</span>
                  {accessibility.scale === 'large' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base">
                    {isKz ? 'Үлкен' : 'Крупный'}
                  </div>
                  <div className="text-xs text-emerald-800 font-medium mt-0.5">125% (+25%)</div>
                </div>
              </button>

              {/* Extra Large */}
              <button
                type="button"
                onClick={() => handleScaleSelect('extra')}
                className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  accessibility.scale === 'extra'
                    ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600/30'
                    : 'border-stone-200 hover:border-stone-300 bg-white text-stone-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-black font-serif text-emerald-950">A++</span>
                  {accessibility.scale === 'extra' && (
                    <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base">
                    {isKz ? 'Ең үлкен' : 'Огромный'}
                  </div>
                  <div className="text-xs text-stone-700 mt-0.5">150% (+50%)</div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: High Contrast Toggle */}
          <div>
            <label className="block text-sm sm:text-base font-bold text-stone-900 mb-3">
              {isKz ? '2. Контрастность экраны:' : '2. Режим повышенной контрастности:'}
            </label>

            <div
              onClick={handleToggleContrast}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                accessibility.highContrast
                  ? 'border-stone-900 bg-stone-950 text-white shadow-md'
                  : 'border-stone-200 hover:border-stone-300 bg-stone-50 text-stone-900'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm sm:text-base">
                    {accessibility.highContrast
                      ? (isKz ? '✓ Жоғары контраст қосулы' : '✓ Высокий контраст ВКЛЮЧЁН')
                      : (isKz ? 'Стандартты түстер (Контраст өшірулі)' : 'Стандартные мягкие цвета')}
                  </span>
                </div>
                <p
                  className={`text-xs ${
                    accessibility.highContrast ? 'text-amber-300' : 'text-stone-700'
                  }`}
                >
                  {isKz
                    ? 'Терең қара мәтін, қалың сызықтар және айқын батырмалар'
                    : 'Глубокий чёрный цвет букв, чёткие границы карточек и яркие кнопки'}
                </p>
              </div>

              {/* Big Switch Button */}
              <div
                className={`relative w-16 h-9 rounded-full transition-colors p-1 shrink-0 ${
                  accessibility.highContrast ? 'bg-amber-400' : 'bg-stone-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full bg-white shadow-md transform transition-transform ${
                    accessibility.highContrast ? 'translate-x-7 bg-stone-950' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Live Preview */}
          <div className="rounded-2xl p-4 border border-stone-200 bg-stone-50 space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-700 font-semibold uppercase tracking-wider">
              <span>{isKz ? 'Тікелей үлгі' : 'Живой образец текста'}</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            </div>

            <div
              className={`p-4 rounded-xl transition-all ${
                accessibility.highContrast
                  ? 'bg-white text-black border-2 border-black font-semibold'
                  : 'bg-white text-stone-800 border border-stone-200'
              }`}
            >
              <div
                className={`font-serif font-bold text-emerald-950 mb-1 ${
                  accessibility.scale === 'extra'
                    ? 'text-xl'
                    : accessibility.scale === 'large'
                    ? 'text-lg'
                    : 'text-base'
                }`}
              >
                {isKz ? 'Масло черного тмина • Саудия' : 'Масло черного тмина • Саудия'}
              </div>
              <p
                className={`leading-relaxed ${
                  accessibility.scale === 'extra'
                    ? 'text-base'
                    : accessibility.scale === 'large'
                    ? 'text-sm'
                    : 'text-xs'
                }`}
              >
                {isKz
                  ? 'Бутик №24 — Атырау қаласындағы табиғи халал өнімдер дүкені.'
                  : 'Бутик №24 — натуральная халяль продукция и арабские масляные духи в Атырау.'}
              </p>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-stone-100">
                <span
                  className={`font-extrabold text-emerald-900 ${
                    accessibility.scale === 'extra' ? 'text-lg' : 'text-base'
                  }`}
                >
                  6 500 ₸
                </span>
                <span className="px-3 py-1 bg-emerald-900 text-white rounded-lg text-xs font-bold">
                  {isKz ? 'Себетке' : 'В корзину'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-stone-50 px-5 sm:px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-semibold text-xs transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isKz ? 'Қалпына келтіру (100%)' : 'Сбросить к исходным (100%)'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-sm transition-all shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4 text-amber-300" />
            <span>{isKz ? 'Қолдану және жабу' : 'Применить и закрыть'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

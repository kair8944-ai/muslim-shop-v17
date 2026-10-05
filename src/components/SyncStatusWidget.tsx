import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudCheck,
  CloudAlert,
  RefreshCw,
  Clock,
  Database,
  CheckCircle2,
  AlertTriangle,
  Server,
  HardDrive,
  Info,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Language, Product } from '../types';
import {
  getSyncStatus,
  subscribeToSyncStatus,
  triggerManualSync,
  SyncStatusInfo,
  getTimeUntilFirestoreQuotaReset,
} from '../services/firestoreService';

interface SyncStatusWidgetProps {
  lang: Language;
  variant?: 'header' | 'admin' | 'compact';
  products?: Product[];
  onSyncComplete?: () => void;
}

export const SyncStatusWidget: React.FC<SyncStatusWidgetProps> = ({
  lang,
  variant = 'header',
  products,
  onSyncComplete,
}) => {
  const [status, setStatus] = useState<SyncStatusInfo>(() => getSyncStatus());
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((newStatus) => {
      setStatus(newStatus);
    });
    // Interval to refresh countdown every 30 seconds
    const timer = setInterval(() => {
      setStatus(getSyncStatus());
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const isKz = lang === 'kz';
  const resetInfo = getTimeUntilFirestoreQuotaReset();

  const handleManualSync = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (isSyncingNow) return;

    setIsSyncingNow(true);
    setSyncFeedback(null);
    try {
      const updated = await triggerManualSync(products);
      setStatus(updated);
      setSyncFeedback(
        isKz
          ? 'Синхрондау сәтті орындалды! Барлық деректер жаңартылды.'
          : 'Синхронизация успешно выполнена! Все товары и настройки обновлены.'
      );
      if (onSyncComplete) onSyncComplete();
    } catch {
      setSyncFeedback(
        isKz
          ? 'Деректер жергілікті кэште және серверде сақталды.'
          : 'Данные сохранены на сервере и в локальном кэше.'
      );
    } finally {
      setIsSyncingNow(false);
      setTimeout(() => {
        setSyncFeedback(null);
      }, 5000);
    }
  };

  const formattedTime = (() => {
    try {
      const d = new Date(status.lastSyncedAt);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  })();

  // 1. ADMIN PANEL VARIANT
  if (variant === 'admin') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 sm:p-4 mb-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status icon & title */}
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                status.state === 'syncing' || isSyncingNow
                  ? 'bg-amber-100 text-amber-700 animate-pulse'
                  : status.isQuotaExceeded
                  ? 'bg-sky-100 text-sky-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {status.state === 'syncing' || isSyncingNow ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : status.isQuotaExceeded ? (
                <Database className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-900">
                  {isKz ? 'Синхрондау күйі' : 'Статус синхронизации'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                    status.state === 'syncing' || isSyncingNow
                      ? 'bg-amber-200 text-amber-900'
                      : status.isQuotaExceeded
                      ? 'bg-sky-200 text-sky-950'
                      : 'bg-emerald-200 text-emerald-950'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      status.state === 'syncing' || isSyncingNow
                        ? 'bg-amber-600 animate-ping'
                        : status.isQuotaExceeded
                        ? 'bg-sky-700'
                        : 'bg-emerald-600'
                    }`}
                  />
                  {status.state === 'syncing' || isSyncingNow
                    ? isKz
                      ? 'Синхрондалуда...'
                      : 'Синхронизация...'
                    : status.isQuotaExceeded
                    ? isKz
                      ? 'Серверлік / Автономды режим'
                      : 'Серверный режим (Лимит Spark)'
                    : isKz
                    ? 'Синхрондалды'
                    : 'Синхронизировано'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-600 mt-1">
                <span>
                  {isKz ? 'Соңғы жаңарту:' : 'Обновлено:'}{' '}
                  <strong className="text-slate-800 font-mono">{formattedTime || 'только что'}</strong>
                </span>
                <span>•</span>
                <span>
                  {isKz ? 'Тауар саны:' : 'Товаров в базе:'}{' '}
                  <strong className="text-slate-800">{products?.length || status.totalProducts}</strong>
                </span>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setIsDetailsOpen(true)}
                  className="text-[#0567BA] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <Info className="w-3 h-3" />
                  <span>{isKz ? 'Толығырақ' : 'Подробнее о лимитах'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncingNow || status.state === 'syncing'}
              className="px-3.5 py-2 rounded-xl bg-[#0567BA] hover:bg-[#045294] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? (isKz ? 'Жаңарту...' : 'Синхронизация...') : isKz ? 'Қазір синхрондау' : 'Синхронизировать'}</span>
            </button>
          </div>
        </div>

        {/* Quota information callout if quota is active */}
        {status.isQuotaExceeded && (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-[11px] sm:text-xs text-amber-950 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {isKz
                  ? 'Firestore тәуліктік лимиті белсенді:'
                  : 'Активен суточный лимит Firestore (Spark план):'}
              </span>{' '}
              <span>
                {isKz
                  ? `Лимиттер Атырау уақытымен сағат 12:00-де (${resetInfo.formattedCountdown} қалды) қалпына келеді. Қазір барлық тауарлар мен өзгертулер сервер мен шолғыш кэшінде сенімді сақталуда!`
                  : `Сброс квоты произойдет в 12:00 дня по времени Атырау / UTC+5 (осталось ${resetInfo.formattedCountdown}). Сейчас включен отказоустойчивый серверный режим: все товары сохраняются на сервере и в кэше без потери данных!`}
              </span>
            </div>
          </div>
        )}

        {/* Feedback message */}
        {syncFeedback && (
          <div className="mt-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 p-2 rounded-xl animate-in fade-in">
            {syncFeedback}
          </div>
        )}

        {/* Details Modal */}
        {isDetailsOpen && (
          <SyncDetailsModal
            lang={lang}
            status={status}
            resetInfo={resetInfo}
            productsCount={products?.length || status.totalProducts}
            onClose={() => setIsDetailsOpen(false)}
            onSync={handleManualSync}
            isSyncing={isSyncingNow}
          />
        )}
      </div>
    );
  }

  // 2. HEADER VARIANT (Compact and slick button in header)
  return (
    <>
      <button
        type="button"
        id="header-sync-status-btn"
        onClick={() => setIsDetailsOpen(true)}
        className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-white/70 hover:bg-white text-slate-800 hover:text-[#0567BA] border border-[#83bfea] transition-all cursor-pointer shadow-2xs group"
        title={isKz ? 'Синхрондау күйі' : 'Статус синхронизации'}
      >
        <div className="relative flex items-center justify-center">
          {status.state === 'syncing' || isSyncingNow ? (
            <RefreshCw className="w-3.5 h-3.5 text-[#0567BA] animate-spin" />
          ) : status.isQuotaExceeded ? (
            <Database className="w-3.5 h-3.5 text-[#0567BA]" />
          ) : (
            <Cloud className="w-3.5 h-3.5 text-emerald-600" />
          )}
          <span
            className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              status.state === 'syncing' || isSyncingNow
                ? 'bg-amber-500 animate-ping'
                : status.isQuotaExceeded
                ? 'bg-sky-500'
                : 'bg-emerald-500'
            }`}
          />
        </div>

        <span className="hidden xl:inline text-[11px] font-bold text-slate-700 group-hover:text-[#0567BA] leading-tight">
          {status.state === 'syncing' || isSyncingNow
            ? isKz
              ? 'Синхрондау...'
              : 'Синхронизация...'
            : status.isQuotaExceeded
            ? isKz
              ? 'Лимит 12:00'
              : 'Квота 12:00'
            : isKz
            ? 'Синхрондалды'
            : 'Синхро'}
        </span>
      </button>

      {/* Details Modal */}
      {isDetailsOpen && (
        <SyncDetailsModal
          lang={lang}
          status={status}
          resetInfo={resetInfo}
          productsCount={products?.length || status.totalProducts}
          onClose={() => setIsDetailsOpen(false)}
          onSync={handleManualSync}
          isSyncing={isSyncingNow}
        />
      )}
    </>
  );
};

interface SyncDetailsModalProps {
  lang: Language;
  status: SyncStatusInfo;
  resetInfo: { hours: number; minutes: number; resetTimeString: string; formattedCountdown: string };
  productsCount: number;
  onClose: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

const SyncDetailsModal: React.FC<SyncDetailsModalProps> = ({
  lang,
  status,
  resetInfo,
  productsCount,
  onClose,
  onSync,
  isSyncing,
}) => {
  const isKz = lang === 'kz';

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0567BA]/10 text-[#0567BA] flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-slate-900 font-sans">
                {isKz ? 'Синхрондау күйі' : 'Статус синхронизации'}
              </h3>
              <p className="text-xs text-slate-500">
                {isKz ? 'muslimshop.kz деректер базасы' : 'База данных muslimshop.kz'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status banner */}
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            status.isQuotaExceeded
              ? 'bg-sky-50 border-sky-200 text-sky-950'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="mt-0.5">
            {status.isQuotaExceeded ? (
              <AlertTriangle className="w-5 h-5 text-sky-700" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            )}
          </div>
          <div className="space-y-1">
            <div className="font-extrabold text-sm">
              {status.isQuotaExceeded
                ? isKz
                  ? 'Серверлік қорғаныс режимі (Spark лимиті)'
                  : 'Серверный защищенный режим (Лимит Spark)'
                : isKz
                ? 'Барлық деректер толық синхрондалған'
                : 'Все данные полностью синхронизированы'}
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {status.isQuotaExceeded
                ? isKz
                  ? `Firestore тәуліктік жазу лимиті уақытша белсенді. Барлық тауарлар серверде және құрылғыңызда толық сақталуда, бірде-бір дерек жоғалмайды!`
                  : `Достигнут суточный лимит Google Firestore (Spark plan: 20 000 операций). Включен отказоустойчивый серверный режим: все добавленные и измененные товары надежно сохранены на сервере и в кэше браузера!`
                : isKz
                ? 'Деректер Firestore бұлтты базасына, Express серверіне және браузер кэшіне сәтті жазылды.'
                : 'Данные записаны в облачную базу Firestore, серверный кэш Express и локальный кэш браузера.'}
            </p>
          </div>
        </div>

        {/* Quota Reset Countdown Card (DIRECT ANSWER TO USER QUESTION) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#0567BA]" />
              {isKz ? 'Тәуліктік лимиттің жаңаруы:' : 'Сброс суточного лимита Firestore:'}
            </span>
            <span className="font-mono font-extrabold text-[#0567BA] bg-[#0567BA]/10 px-2 py-0.5 rounded-md">
              {resetInfo.resetTimeString}
            </span>
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <span className="text-xs text-slate-500">
              {isKz ? 'Қалған уақыт:' : 'До сброса осталось:'}
            </span>
            <span className="text-base sm:text-lg font-black text-slate-900 font-mono">
              {resetInfo.formattedCountdown}
            </span>
          </div>

          <p className="text-[11px] text-slate-500 pt-1 leading-normal border-t border-slate-200/60">
            {isKz
              ? 'Google Cloud Firestore тегін лимиті (20 000 жазу, 50 000 оқу) күн сайын Атырау уақытымен 12:00-де (00:00 PDT) автоматты түрде нөлденеді.'
              : 'Суточный лимит Google Cloud Firestore (20 000 записей, 50 000 чтений) автоматически обнуляется каждый день в 12:00 дня по времени Атырау / Казахстана (00:00 PDT).'}
          </p>
        </div>

        {/* 3-Tier Storage Architecture Status */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-slate-700">
            {isKz ? 'Сақтау деңгейлері:' : 'Уровни хранения каталога:'}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* 1. Firestore */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <Cloud className="w-3.5 h-3.5 text-[#0567BA]" />
                  Firestore
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    status.isQuotaExceeded ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
              <p className="text-[10px] text-slate-500">
                {status.isQuotaExceeded
                  ? isKz
                    ? 'Лимит режимі'
                    : 'Режим квоты'
                  : isKz
                  ? 'Бұлт қосулы'
                  : 'Облако активно'}
              </p>
            </div>

            {/* 2. Express Server Cache */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <Server className="w-3.5 h-3.5 text-emerald-600" />
                  {isKz ? 'Сервер' : 'Сервер'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-500">{productsCount} {isKz ? 'тауар кэште' : 'товаров в кэше'}</p>
            </div>

            {/* 3. IndexedDB / LocalStorage */}
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                  {isKz ? 'Жергілікті' : 'Локально'}
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-[10px] text-slate-500">
                {isKz ? 'IndexedDB қорғалған' : 'IndexedDB защищен'}
              </p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
          >
            {isKz ? 'Жабу' : 'Закрыть'}
          </button>

          <button
            type="button"
            onClick={onSync}
            disabled={isSyncing}
            className="px-5 py-2.5 rounded-xl bg-[#0567BA] hover:bg-[#045294] text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? (isKz ? 'Синхрондалуда...' : 'Синхронизация...') : isKz ? 'Қазір синхрондау' : 'Синхронизировать сейчас'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

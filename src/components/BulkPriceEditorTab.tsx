import React, { useState, useMemo } from 'react';
import {
  Search,
  Save,
  RotateCcw,
  Check,
  Flame,
  Sparkles,
  Download,
  Percent,
  CheckSquare,
  Square,
  Camera,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Category, Product } from '../types';
import { saveProductsBulkToFirestore } from '../services/firestoreService';

interface BulkPriceEditorTabProps {
  products: Product[];
  categories: Category[];
  currency: string;
  onUpdateProduct: (product: Product) => void;
  onBulkUpdateProducts?: (updatedProducts: Product[]) => void;
  onDeleteProduct?: (product: Product) => void;
  onOpenStoriesForProduct?: (product: Product) => void;
}

interface DraftRow {
  price: number;
  oldPrice?: number;
  inStock: boolean;
  isHit: boolean;
  isNew: boolean;
}

export const BulkPriceEditorTab: React.FC<BulkPriceEditorTabProps> = ({
  products,
  categories,
  currency,
  onUpdateProduct,
  onBulkUpdateProducts,
  onDeleteProduct,
  onOpenStoriesForProduct,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'inStock' | 'outOfStock' | 'hits' | 'discount' | 'modified'
  >('all');

  // Stores only modified product fields keyed by product.id
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customAdjustValue, setCustomAdjustValue] = useState<string>('');
  const [customAdjustMode, setCustomAdjustMode] = useState<'percent' | 'fixed'>('percent');
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [saveSuccessBanner, setSaveSuccessBanner] = useState<string | null>(null);

  const getEffectiveRow = (p: Product): DraftRow => {
    if (drafts[p.id]) return drafts[p.id];
    return {
      price: p.price,
      oldPrice: p.oldPrice,
      inStock: Boolean(p.inStock),
      isHit: Boolean(p.isHit),
      isNew: Boolean(p.isNew),
    };
  };

  const isRowModified = (p: Product): boolean => {
    const d = drafts[p.id];
    if (!d) return false;
    return (
      d.price !== p.price ||
      (d.oldPrice || 0) !== (p.oldPrice || 0) ||
      d.inStock !== Boolean(p.inStock) ||
      d.isHit !== Boolean(p.isHit) ||
      d.isNew !== Boolean(p.isNew)
    );
  };

  const modifiedProductIds = useMemo(() => {
    return products.filter((p) => isRowModified(p)).map((p) => p.id);
  }, [products, drafts]);

  const updateDraftField = (product: Product, patch: Partial<DraftRow>) => {
    setDrafts((prev) => {
      const current = prev[product.id] || {
        price: product.price,
        oldPrice: product.oldPrice,
        inStock: Boolean(product.inStock),
        isHit: Boolean(product.isHit),
        isNew: Boolean(product.isNew),
      };
      const next = { ...current, ...patch };
      return {
        ...prev,
        [product.id]: next,
      };
    });
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) {
        return false;
      }
      const row = getEffectiveRow(p);
      if (statusFilter === 'inStock' && !row.inStock) return false;
      if (statusFilter === 'outOfStock' && row.inStock) return false;
      if (statusFilter === 'hits' && !row.isHit) return false;
      if (statusFilter === 'discount' && (!row.oldPrice || row.oldPrice <= row.price)) return false;
      if (statusFilter === 'modified' && !isRowModified(p)) return false;

      if (!q) return true;
      return (
        p.titleRu.toLowerCase().includes(q) ||
        (p.titleKz && p.titleKz.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    });
  }, [products, search, categoryFilter, statusFilter, drafts]);

  const allFilteredSelected =
    filteredProducts.length > 0 && filteredProducts.every((p) => selectedIds.has(p.id));

  const handleToggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filteredProducts.forEach((p) => next.delete(p.id));
      } else {
        filteredProducts.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Target products for mass operations: either checked items or all currently filtered items
  const getTargetProducts = (): Product[] => {
    if (selectedIds.size > 0) {
      return products.filter((p) => selectedIds.has(p.id));
    }
    return filteredProducts;
  };

  const roundTo50 = (val: number): number => {
    return Math.max(50, Math.round(val / 50) * 50);
  };

  const handleBulkPriceAdjust = (mode: 'percent' | 'fixed', amount: number) => {
    if (!amount || isNaN(amount)) return;
    const targets = getTargetProducts();
    if (targets.length === 0) return;

    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of targets) {
        const cur = next[p.id] || {
          price: p.price,
          oldPrice: p.oldPrice,
          inStock: Boolean(p.inStock),
          isHit: Boolean(p.isHit),
          isNew: Boolean(p.isNew),
        };
        const newPrice =
          mode === 'percent'
            ? roundTo50(cur.price * (1 + amount / 100))
            : Math.max(50, cur.price + amount);
        next[p.id] = {
          ...cur,
          price: newPrice,
        };
      }
      return next;
    });
  };

  const handleBulkStockSet = (inStockVal: boolean) => {
    const targets = getTargetProducts();
    if (targets.length === 0) return;

    setDrafts((prev) => {
      const next = { ...prev };
      for (const p of targets) {
        const cur = next[p.id] || {
          price: p.price,
          oldPrice: p.oldPrice,
          inStock: Boolean(p.inStock),
          isHit: Boolean(p.isHit),
          isNew: Boolean(p.isNew),
        };
        next[p.id] = {
          ...cur,
          inStock: inStockVal,
        };
      }
      return next;
    });
  };

  const handleDiscardAll = () => {
    setDrafts({});
  };

  const handleSaveAllChanges = async () => {
    const changedProducts: Product[] = [];
    for (const p of products) {
      if (isRowModified(p)) {
        const d = drafts[p.id];
        changedProducts.push({
          ...p,
          price: Number(d.price) || p.price,
          oldPrice: d.oldPrice && d.oldPrice > 0 ? Number(d.oldPrice) : undefined,
          inStock: d.inStock,
          isHit: d.isHit,
          isNew: d.isNew,
        });
      }
    }

    if (changedProducts.length === 0) return;

    setIsSavingAll(true);
    try {
      // Update React state immediately
      if (onBulkUpdateProducts) {
        onBulkUpdateProducts(changedProducts);
      } else {
        for (const cp of changedProducts) {
          onUpdateProduct(cp);
        }
      }

      // Persist all changed products to Local Delta + IndexedDB + Server + Cloud Relay + Firestore
      await saveProductsBulkToFirestore(changedProducts);

      setDrafts({});
      setSaveSuccessBanner(
        `✓ Успешно обновлено и синхронизировано товаров: ${changedProducts.length} шт.`
      );
      setTimeout(() => setSaveSuccessBanner(null), 5000);
    } catch (err) {
      console.error('Bulk save error:', err);
    } finally {
      setIsSavingAll(false);
    }
  };

  const handleExportCsv = () => {
    const headers = ['Артикул', 'Название (RU)', 'Категория', 'Цена (₸)', 'Старая цена (₸)', 'В наличии', 'Хит'];
    const rows = products.map((p) => {
      const row = getEffectiveRow(p);
      const catName = categories.find((c) => c.id === p.categoryId)?.nameRu || p.categoryId;
      const escapeCsv = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escapeCsv(p.sku || p.id),
        escapeCsv(p.titleRu),
        escapeCsv(catName),
        row.price,
        row.oldPrice || '',
        row.inStock ? 'Да' : 'Нет',
        row.isHit ? 'Да' : 'Нет',
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `muslimshop-pricelist-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-16 animate-in fade-in">
      {/* Header & Export */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-stone-900 text-base">
            Быстрый прайс-лист (Массовое изменение цен и наличия)
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            Меняйте цены, скидки и наличие сразу у десятков товаров в одной таблице и сохраняйте в 1 клик
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="self-start sm:self-auto px-3.5 py-2 rounded-xl border border-stone-300 hover:border-emerald-700 bg-stone-50 hover:bg-emerald-50 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-emerald-800" />
          <span>Скачать прайс в Excel (CSV)</span>
        </button>
      </div>

      {/* Save Success Notice */}
      {saveSuccessBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            <span>{saveSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessBanner(null)}
            className="text-emerald-800 hover:text-emerald-950 px-2 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search & Filters Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или артикулу (например: Кыст, MS-397, Магний)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-stone-50 focus:bg-white"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-bold rounded-xl border border-stone-300 bg-white text-stone-800"
          >
            <option value="all">Все категории ({products.length})</option>
            {categories
              .filter((c) => c.id !== 'cat-all')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameRu} ({products.filter((p) => p.categoryId === c.id).length})
                </option>
              ))}
          </select>

          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl overflow-x-auto text-[11px] font-bold">
            {(
              [
                { id: 'all', label: 'Все' },
                { id: 'inStock', label: 'В наличии' },
                { id: 'outOfStock', label: 'Нет' },
                { id: 'hits', label: '🔥 Хиты' },
                { id: 'discount', label: 'Со скидкой' },
                { id: 'modified', label: `✏️ Изменено (${modifiedProductIds.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-emerald-950 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Mass Operations Toolbar */}
        <div className="pt-2.5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-stone-600 mr-1">
              {selectedIds.size > 0
                ? `Для выбранных (${selectedIds.size} шт.):`
                : `Для списка (${filteredProducts.length} шт.):`}
            </span>

            <button
              type="button"
              onClick={() => handleBulkPriceAdjust('percent', 5)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-800 hover:text-emerald-950 font-bold text-[11px] cursor-pointer transition-colors"
              title="Повысить цены на 5% (с округлением до 50 ₸)"
            >
              +5%
            </button>
            <button
              type="button"
              onClick={() => handleBulkPriceAdjust('percent', 10)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-800 hover:text-emerald-950 font-bold text-[11px] cursor-pointer transition-colors"
              title="Повысить цены на 10% (с округлением до 50 ₸)"
            >
              +10%
            </button>
            <button
              type="button"
              onClick={() => handleBulkPriceAdjust('percent', -5)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-950 font-bold text-[11px] cursor-pointer transition-colors"
              title="Снизить цены на 5% (с округлением до 50 ₸)"
            >
              -5%
            </button>
            <button
              type="button"
              onClick={() => handleBulkPriceAdjust('percent', -10)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-amber-950 font-bold text-[11px] cursor-pointer transition-colors"
              title="Снизить цены на 10% (с округлением до 50 ₸)"
            >
              -10%
            </button>
            <button
              type="button"
              onClick={() => handleBulkPriceAdjust('fixed', 500)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-100 text-stone-800 font-bold text-[11px] cursor-pointer transition-colors"
            >
              +500 ₸
            </button>
            <button
              type="button"
              onClick={() => handleBulkPriceAdjust('fixed', -500)}
              className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-800 font-bold text-[11px] cursor-pointer transition-colors"
            >
              -500 ₸
            </button>

            {/* Custom adjustment */}
            <div className="flex items-center gap-1 ml-1 pl-2 border-l border-stone-200">
              <input
                type="number"
                value={customAdjustValue}
                onChange={(e) => setCustomAdjustValue(e.target.value)}
                placeholder="+/-"
                className="w-16 px-2 py-1 text-[11px] rounded-lg border border-stone-300 bg-white font-bold"
              />
              <select
                value={customAdjustMode}
                onChange={(e) => setCustomAdjustMode(e.target.value as 'percent' | 'fixed')}
                className="px-1.5 py-1 text-[11px] rounded-lg border border-stone-300 bg-white font-bold"
              >
                <option value="percent">%</option>
                <option value="fixed">₸</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const val = Number(customAdjustValue);
                  if (val) handleBulkPriceAdjust(customAdjustMode, val);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[11px] font-bold cursor-pointer"
              >
                Применить
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkStockSet(true)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold cursor-pointer"
            >
              Все → В наличии
            </button>
            <button
              type="button"
              onClick={() => handleBulkStockSet(false)}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200 text-[11px] font-bold cursor-pointer"
            >
              Все → Нет на складе
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Unsaved Changes Bar */}
      {modifiedProductIds.length > 0 && (
        <div className="sticky top-0 z-20 bg-amber-50 border-2 border-amber-400 rounded-2xl p-3.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl bg-amber-500 text-stone-950 font-black text-xs flex items-center justify-center shrink-0">
              {modifiedProductIds.length}
            </span>
            <div>
              <p className="text-xs font-extrabold text-stone-900">
                Несохранённые изменения в прайс-листе ({modifiedProductIds.length} тов.)
              </p>
              <p className="text-[11px] text-stone-600">
                Нажмите «Сохранить все изменения», чтобы обновить цены и наличие во всех браузерах
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleDiscardAll}
              disabled={isSavingAll}
              className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить</span>
            </button>
            <button
              type="button"
              onClick={handleSaveAllChanges}
              disabled={isSavingAll}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isSavingAll ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <Save className="w-4 h-4 text-amber-300" />
              )}
              <span>
                {isSavingAll
                  ? 'Сохранение...'
                  : `Сохранить все изменения (${modifiedProductIds.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Fast Price Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[58vh] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-stone-100 text-stone-700 sticky top-0 z-10 border-b border-stone-200 text-[11px] uppercase font-extrabold">
              <tr>
                <th className="p-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAllFiltered}
                    className="text-stone-600 hover:text-emerald-800 cursor-pointer"
                    title="Выбрать или снять выделение со всех товаров в списке"
                  >
                    {allFilteredSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700 inline" />
                    ) : (
                      <Square className="w-4 h-4 inline" />
                    )}
                  </button>
                </th>
                <th className="p-3 min-w-[220px]">Товар и артикул</th>
                <th className="p-3 w-36">Цена ({currency})</th>
                <th className="p-3 w-36">Старая цена ({currency})</th>
                <th className="p-3 w-32 text-center">Наличие</th>
                <th className="p-3 w-28 text-center">Метки</th>
                {onOpenStoriesForProduct && (
                  <th className="p-3 w-28 text-center">Stories</th>
                )}
                {onDeleteProduct && (
                  <th className="p-3 w-28 text-center">Удаление</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredProducts.map((p) => {
                const row = getEffectiveRow(p);
                const modified = isRowModified(p);
                const isSelected = selectedIds.has(p.id);
                const catName =
                  categories.find((c) => c.id === p.categoryId)?.nameRu || p.categoryId;

                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      modified
                        ? 'bg-amber-50/70 hover:bg-amber-50'
                        : isSelected
                        ? 'bg-emerald-50/40 hover:bg-stone-50'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectOne(p.id)}
                        className="text-stone-500 hover:text-emerald-800 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-700 inline" />
                        ) : (
                          <Square className="w-4 h-4 inline" />
                        )}
                      </button>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={p.images?.[0]}
                          alt=""
                          className="w-10 h-12 rounded-lg object-cover bg-stone-100 border border-stone-200 shrink-0"
                          onError={(e) => {
                            (e.target as any).src =
                              'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80';
                          }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 line-clamp-1">{p.titleRu}</p>
                          <p className="text-[11px] text-stone-500">
                            {catName} • <span className="font-mono">{p.sku}</span>
                            {modified && (
                              <span className="ml-2 text-amber-800 font-extrabold">
                                • Изменено
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={row.price}
                          onChange={(e) =>
                            updateDraftField(p, { price: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className={`w-24 px-2.5 py-1.5 rounded-lg border text-right font-extrabold text-xs focus:ring-2 focus:ring-emerald-700 ${
                            row.price !== p.price
                              ? 'border-amber-500 bg-white text-emerald-950'
                              : 'border-stone-300 bg-stone-50 text-stone-900'
                          }`}
                        />
                        <span className="text-stone-500 font-bold">{currency}</span>
                      </div>
                    </td>

                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={row.oldPrice || ''}
                          placeholder="Нет"
                          onChange={(e) =>
                            updateDraftField(p, {
                              oldPrice: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 focus:bg-white text-right font-semibold text-stone-600 text-xs focus:ring-2 focus:ring-emerald-700"
                        />
                        <span className="text-stone-400">{currency}</span>
                      </div>
                    </td>

                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => updateDraftField(p, { inStock: !row.inStock })}
                        className={`px-3 py-1 rounded-full font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                          row.inStock
                            ? 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-900 hover:bg-rose-200'
                        }`}
                      >
                        {row.inStock ? '✓ В наличии' : '✕ Нет'}
                      </button>
                    </td>

                    <td className="p-2.5 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateDraftField(p, { isHit: !row.isHit })}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            row.isHit
                              ? 'bg-amber-400 text-stone-950 font-black shadow-2xs'
                              : 'bg-stone-100 text-stone-400 hover:text-amber-700'
                          }`}
                          title="Хит продаж"
                        >
                          <Flame className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateDraftField(p, { isNew: !row.isNew })}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            row.isNew
                              ? 'bg-emerald-600 text-white font-bold shadow-2xs'
                              : 'bg-stone-100 text-stone-400 hover:text-emerald-700'
                          }`}
                          title="Новинка"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    {onOpenStoriesForProduct && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onOpenStoriesForProduct(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                          title="Создать карточку для Instagram Stories / WhatsApp Status"
                        >
                          <Camera className="w-3.5 h-3.5 text-amber-800" />
                          <span>Stories</span>
                        </button>
                      </td>
                    )}

                    {onDeleteProduct && (
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteProduct(p)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          title="Удалить товар из каталога и базы данных"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Удалить</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

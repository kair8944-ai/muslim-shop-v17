import React, { useState, useMemo } from 'react';
import {
  X,
  Lock,
  KeyRound,
  Save,
  Plus,
  Check,
  RefreshCw,
  Trash2,
  Search,
  Edit2,
  AlertCircle,
  ExternalLink,
  Link,
  Copy,
  LayoutGrid,
  List,
  Eye,
  Camera,
  Upload,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import { Category, Language, Product, StoreConfig } from '../types';
import {
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveSettingsToFirestore,
} from '../services/firestoreService';
import { getProductDirectUrl, copyTextToClipboard } from '../utils/formatters';
import { compressImageFile } from '../utils/imageCompressor';

interface AdminModalProps {
  config: StoreConfig;
  products: Product[];
  categories: Category[];
  lang: Language;
  onUpdateConfig: (newConfig: StoreConfig) => void;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onPreviewProduct?: (product: Product) => void;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  config,
  products,
  categories,
  lang,
  onUpdateConfig,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onPreviewProduct,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentConfig, setCurrentConfig] = useState<StoreConfig>(config);
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'add'>('products');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search, Filter & View Mode in Admin products list
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');
  const [adminViewMode, setAdminViewMode] = useState<'grid' | 'list'>('grid');
  const [copiedProductId, setCopiedProductId] = useState<string | null>(null);
  const [copyFeedbackMsg, setCopyFeedbackMsg] = useState<string | null>(null);

  // Editing state for existing product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // New product form state
  const [newTitleRu, setNewTitleRu] = useState('');
  const [newTitleKz, setNewTitleKz] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOldPrice, setNewOldPrice] = useState('');
  const [newCategory, setNewCategory] = useState(categories[1]?.id || 'cat-health');
  const [newDescRu, setNewDescRu] = useState('');
  const [newSpecsRu, setNewSpecsRu] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newInStock, setNewInStock] = useState(true);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  const handleImageFileUpload = async (
    file: File,
    target: 'new' | 'edit'
  ) => {
    if (!file) return;
    setIsCompressingImage(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 900, 900, 0.82);
      if (target === 'new') {
        setNewImageUrl(compressedDataUrl);
      } else if (editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [compressedDataUrl],
        });
      }
    } catch (err: any) {
      alert('Ошибка при обработке фото: ' + (err?.message || 'Попробуйте другое изображение'));
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === config.adminPin || pin === '505534') {
      setIsAuthenticated(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Неверный PIN-код (по умолчанию: 505534)');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSettingsToFirestore(currentConfig);
      onUpdateConfig(currentConfig);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Ошибка при сохранении настроек в Firestore: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStock = async (product: Product) => {
    const updated = { ...product, inStock: !product.inStock };
    onUpdateProduct(updated);
    try {
      await saveProductToFirestore(updated);
    } catch (err) {
      console.error('Failed to update stock in Firestore:', err);
    }
  };

  const handlePriceChange = async (product: Product, newPriceVal: number) => {
    if (newPriceVal > 0 && newPriceVal !== product.price) {
      const updated = { ...product, price: newPriceVal };
      onUpdateProduct(updated);
      try {
        await saveProductToFirestore(updated);
      } catch (err) {
        console.error('Failed to update price in Firestore:', err);
      }
    }
  };

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Вы действительно хотите удалить товар «${product.titleRu}» из каталога и базы данных?`)) {
      onDeleteProduct(product.id);
      try {
        await deleteProductFromFirestore(product.id);
      } catch (err: any) {
        alert('Ошибка при удалении из Firestore: ' + err.message);
      }
    }
  };

  const handleCopyDirectLink = async (product: Product) => {
    const url = getProductDirectUrl(product.id);
    const ok = await copyTextToClipboard(url);
    if (ok) {
      setCopiedProductId(product.id);
      setCopyFeedbackMsg(`Прямая ссылка на «${product.titleRu}» скопирована в буфер обмена!`);
      setTimeout(() => {
        setCopiedProductId((curr) => (curr === product.id ? null : curr));
      }, 3000);
      setTimeout(() => {
        setCopyFeedbackMsg((curr) => (curr?.includes(product.titleRu) ? null : curr));
      }, 5000);
    } else {
      alert(`Прямая ссылка на товар:\n${url}`);
    }
  };

  const handleSaveEditedProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      await saveProductToFirestore(editingProduct);
      onUpdateProduct(editingProduct);
      setEditingProduct(null);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      alert('Ошибка сохранения товара в Firestore: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleRu.trim() || !newPrice) return;

    setIsSaving(true);
    const newId = `prod-${Date.now()}`;
    const newProd: Product = {
      id: newId,
      titleRu: newTitleRu.trim(),
      titleKz: newTitleKz.trim() || newTitleRu.trim(),
      price: Number(newPrice),
      oldPrice: newOldPrice ? Number(newOldPrice) : undefined,
      categoryId: newCategory,
      descriptionRu: newDescRu.trim() || 'Описание товара',
      descriptionKz: newDescRu.trim(),
      specsRu: newSpecsRu.trim(),
      specsKz: '',
      inStock: newInStock,
      sku: `MS-${Math.floor(100 + Math.random() * 900)}`,
      images: [
        newImageUrl.trim() ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
      ],
      createdAt: new Date().toISOString(),
    };

    try {
      await saveProductToFirestore(newProd);
      onAddProduct(newProd);
      setNewTitleRu('');
      setNewTitleKz('');
      setNewPrice('');
      setNewOldPrice('');
      setNewDescRu('');
      setNewSpecsRu('');
      setNewImageUrl('');
      setActiveTab('products');
    } catch (err: any) {
      alert('Ошибка добавления товара в Firestore: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredAdminProducts = useMemo(() => {
    return products.filter((p) => {
      if (adminCategoryFilter !== 'all' && p.categoryId !== adminCategoryFilter) {
        return false;
      }
      if (adminSearch.trim()) {
        const q = adminSearch.toLowerCase().trim();
        return (
          p.titleRu.toLowerCase().includes(q) ||
          p.titleKz?.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, adminCategoryFilter, adminSearch]);

  return (
    <div
      id="admin-modal-backdrop"
      className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        id="admin-modal-container"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl xl:max-w-6xl bg-white rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base font-serif">
              Панель администратора • MUSLIM SHOP (Firestore онлайн)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="p-8 max-w-sm mx-auto w-full text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <h4 className="font-bold text-stone-900 text-lg">Вход для владельца</h4>
            <p className="text-xs text-stone-500">
              Введите PIN-код для доступа к управлению товарами и настройками магазина
            </p>

            <form onSubmit={handleLogin} className="space-y-3">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN"
                className="w-full text-center tracking-widest text-xl px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700"
                maxLength={8}
                autoFocus
              />
              {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-emerald-900 text-white font-bold text-sm hover:bg-emerald-950 transition-colors"
              >
                Войти в панель
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="px-5 pt-3 border-b border-stone-200 flex gap-4 text-xs font-bold bg-stone-50/60">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setActiveTab('products');
                }}
                className={`pb-2.5 border-b-2 transition-colors ${
                  activeTab === 'products' && !editingProduct
                    ? 'border-emerald-800 text-emerald-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Все товары ({products.length})
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setActiveTab('add');
                }}
                className={`pb-2.5 border-b-2 transition-colors ${
                  activeTab === 'add'
                    ? 'border-emerald-800 text-emerald-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                + Добавить товар
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setActiveTab('settings');
                }}
                className={`pb-2.5 border-b-2 transition-colors ${
                  activeTab === 'settings'
                    ? 'border-emerald-800 text-emerald-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                Настройки бутика
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {/* EDIT PRODUCT SUB-VIEW */}
              {editingProduct ? (
                <form onSubmit={handleSaveEditedProduct} className="space-y-4 max-w-xl mx-auto">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                    <h4 className="font-bold text-stone-900 text-sm">
                      Редактирование: {editingProduct.titleRu}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="text-xs text-stone-500 hover:text-stone-800 underline"
                    >
                      Отмена
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Название (RU)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.titleRu}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, titleRu: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Название (KZ)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.titleKz || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, titleKz: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Цена (₸)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.price}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Старая цена (₸, зачеркнутая)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.oldPrice || ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            oldPrice: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="Не обязательно"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Категория
                      </label>
                      <select
                        value={editingProduct.categoryId}
                        onChange={(e) =>
                          setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      >
                        {categories
                          .filter((c) => c.id !== 'cat-all')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameRu}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Наличие
                      </label>
                      <select
                        value={editingProduct.inStock ? 'true' : 'false'}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            inStock: e.target.value === 'true',
                          })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      >
                        <option value="true">В наличии</option>
                        <option value="false">Нет в наличии</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Фотография товара
                    </label>

                    {/* Image Preview & Upload Controls */}
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 rounded-xl border border-stone-200 bg-white overflow-hidden shrink-0 flex items-center justify-center relative">
                          {editingProduct.images?.[0] ? (
                            <img
                              src={editingProduct.images[0]}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-stone-300" />
                          )}
                          {isCompressingImage && (
                            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-white">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 cursor-pointer transition-colors shadow-xs active:scale-95">
                            <Camera className="w-4 h-4" />
                            <span>{isCompressingImage ? 'Обработка фото...' : 'Выбрать фото с телефона'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isCompressingImage}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileUpload(file, 'edit');
                              }}
                            />
                          </label>
                          <p className="text-[11px] text-stone-500 leading-snug">
                            Сделайте фото на камеру или выберите из галереи телефона. Фото автоматически оптимизируется.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200/80">
                        <span className="block text-[10px] font-semibold text-stone-500 mb-1">
                          Или укажите прямую ссылку на фото:
                        </span>
                        <input
                          type="text"
                          value={editingProduct.images?.[0] || ''}
                          onChange={(e) =>
                            setEditingProduct({
                              ...editingProduct,
                              images: [e.target.value],
                            })
                          }
                          placeholder="https://..."
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:ring-1 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Описание товара
                    </label>
                    <textarea
                      value={editingProduct.descriptionRu || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, descriptionRu: e.target.value })
                      }
                      rows={4}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-emerald-900 text-white font-bold text-xs hover:bg-emerald-950 transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Сохранение...' : 'Сохранить изменения в Firestore'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingProduct(null)}
                      className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50"
                    >
                      Отмена
                    </button>
                  </div>
                </form>
              ) : activeTab === 'products' ? (
                <div className="space-y-3.5">
                  {/* Copy Feedback Alert Toast */}
                  {copyFeedbackMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-semibold flex items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <span>{copyFeedbackMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCopyFeedbackMsg(null)}
                        className="text-emerald-700 hover:text-emerald-950 text-sm font-bold px-2 py-0.5"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Filter, Search & View Switcher */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
                    <div className="flex flex-1 items-center gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                          type="text"
                          value={adminSearch}
                          onChange={(e) => setAdminSearch(e.target.value)}
                          placeholder="Поиск по названию или артикулу..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                      <select
                        value={adminCategoryFilter}
                        onChange={(e) => setAdminCategoryFilter(e.target.value)}
                        className="text-xs px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium"
                      >
                        <option value="all">Все категории ({products.length})</option>
                        {categories
                          .filter((c) => c.id !== 'cat-all')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameRu}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setAdminViewMode('grid')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          adminViewMode === 'grid'
                            ? 'bg-white text-emerald-950 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Крупные карточки</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminViewMode('list')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          adminViewMode === 'list'
                            ? 'bg-white text-emerald-950 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Список</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>
                      Показано товаров: <b className="text-stone-800">{filteredAdminProducts.length}</b> из {products.length}
                    </span>
                    <span className="hidden sm:inline">
                      💡 Нажмите <b>«Скопировать ссылку»</b> над любым товаром, чтобы отправить прямую ссылку клиенту
                    </span>
                  </div>

                  {/* PRODUCTS CONTAINER */}
                  {filteredAdminProducts.length === 0 ? (
                    <div className="p-12 text-center text-stone-400 text-xs border border-dashed border-stone-200 rounded-2xl">
                      По вашему запросу товары не найдены
                    </div>
                  ) : adminViewMode === 'grid' ? (
                    /* 1. LARGE VISUAL CARDS GRID (9:16 VERTICAL RATIO) */
                    <div
                      id="admin-products-grid"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4.5 max-h-[60vh] overflow-y-auto pr-1 p-0.5"
                    >
                      {filteredAdminProducts.map((p) => {
                        const directUrl = getProductDirectUrl(p.id);
                        const isCopied = copiedProductId === p.id;
                        const catName = categories.find((c) => c.id === p.categoryId)?.nameRu || p.categoryId;

                        return (
                          <div
                            key={p.id}
                            id={`admin-card-${p.id}`}
                            className="bg-white rounded-2xl border border-stone-200 hover:border-amber-400/80 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group"
                          >
                            {/* TOP DIRECT LINK BAR (Над каждым товаром - по запросу пользователя) */}
                            <div className="p-2.5 bg-stone-50 border-b border-stone-200/80 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleCopyDirectLink(p)}
                                className={`flex-1 px-2.5 py-1.5 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                                  isCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/60'
                                }`}
                                title="Скопировать прямую ссылку на товар для отправки клиенту в WhatsApp"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Ссылка скопирована!</span>
                                  </>
                                ) : (
                                  <>
                                    <Link className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                                    <span>Скопировать ссылку</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={directUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-xl bg-white border border-stone-200 text-stone-600 hover:text-stone-950 hover:bg-stone-100 transition-colors shrink-0"
                                title="Открыть прямую ссылку в новой вкладке"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>

                            {/* LARGE VISUAL IMAGE (9:16 Vertical Ratio) */}
                            <div
                              className="relative aspect-[9/16] max-h-72 w-full bg-stone-100 overflow-hidden cursor-pointer flex items-center justify-center border-b border-stone-100"
                              onClick={() => setEditingProduct(p)}
                              title="Нажмите для редактирования"
                            >
                              <img
                                src={p.images[0]}
                                alt={p.titleRu}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as any).src =
                                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80';
                                }}
                              />

                              {/* Badges on image */}
                              <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-950/80 text-white backdrop-blur-xs shadow-xs">
                                  {catName}
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-white/95 text-stone-800 border border-stone-200 shadow-2xs">
                                  Арт: {p.sku}
                                </span>
                              </div>

                              {/* Stock Toggle Button directly on image */}
                              <div className="absolute top-2.5 right-2.5 z-10">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleStock(p);
                                  }}
                                  className={`px-2.5 py-1 rounded-full font-bold text-[10px] shadow-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    p.inStock
                                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                      : 'bg-rose-600 text-white hover:bg-rose-700'
                                  }`}
                                  title="Нажмите для переключения наличия товара"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  <span>{p.inStock ? 'В наличии' : 'Нет на складе'}</span>
                                </button>
                              </div>

                              {/* Edit Cue Overlay */}
                              <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <div className="px-3 py-1.5 rounded-xl bg-stone-950/80 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs shadow-md">
                                  <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Редактировать</span>
                                </div>
                              </div>
                            </div>

                            {/* CARD DETAILS & FAST EDITING */}
                            <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                              <div>
                                <h4
                                  className="font-bold text-stone-900 text-xs sm:text-sm leading-snug line-clamp-2 hover:text-emerald-800 transition-colors cursor-pointer"
                                  onClick={() => setEditingProduct(p)}
                                  title="Нажмите, чтобы редактировать подробное описание"
                                >
                                  {p.titleRu}
                                </h4>
                                {p.titleKz && p.titleKz !== p.titleRu && (
                                  <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                                    {p.titleKz}
                                  </p>
                                )}
                              </div>

                              {/* Fast Inline Price Editor */}
                              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-bold text-stone-600">Цена:</span>
                                  <div className="flex items-center">
                                    <input
                                      type="number"
                                      defaultValue={p.price}
                                      onBlur={(e) => handlePriceChange(p, Number(e.target.value))}
                                      className="w-24 px-2 py-1 border border-stone-300 rounded-lg text-right font-bold text-stone-900 text-xs focus:ring-2 focus:ring-emerald-700 bg-stone-50 focus:bg-white"
                                      title="Измените цену и кликните в любое место для мгновенного сохранения"
                                    />
                                    <span className="font-bold text-stone-800 text-xs ml-1">₸</span>
                                  </div>
                                </div>

                                {p.oldPrice && (
                                  <span className="text-[10px] text-stone-400 line-through">
                                    {p.oldPrice} ₸
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2.5 border-t border-stone-100">
                                <button
                                  type="button"
                                  onClick={() => setEditingProduct(p)}
                                  className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                  title="Редактировать описание, фото и характеристики"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-amber-300" />
                                  <span>Редактировать</span>
                                </button>

                                {onPreviewProduct && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onPreviewProduct(p);
                                      onClose();
                                    }}
                                    className="p-1.5 rounded-xl border border-stone-300 text-stone-700 hover:text-emerald-900 hover:bg-stone-50 transition-colors cursor-pointer"
                                    title="Посмотреть на сайте (как видит клиент)"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDelete(p)}
                                  className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Удалить товар из базы данных"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* 2. COMPACT LIST VIEW */
                    <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white max-h-[60vh] overflow-y-auto">
                      {filteredAdminProducts.map((p) => {
                        const directUrl = getProductDirectUrl(p.id);
                        const isCopied = copiedProductId === p.id;
                        const catName = categories.find((c) => c.id === p.categoryId)?.nameRu || p.categoryId;

                        return (
                          <div
                            key={p.id}
                            className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs hover:bg-stone-50/70 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={p.images[0]}
                                alt=""
                                className="w-14 h-20 rounded-xl object-cover bg-stone-100 shrink-0 border border-stone-200 cursor-pointer"
                                onClick={() => setEditingProduct(p)}
                                onError={(e) => {
                                  (e.target as any).src =
                                    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80';
                                }}
                              />
                              <div className="min-w-0">
                                <p
                                  className="font-bold text-stone-900 truncate max-w-xs sm:max-w-md hover:text-emerald-800 cursor-pointer"
                                  onClick={() => setEditingProduct(p)}
                                >
                                  {p.titleRu}
                                </p>
                                <p className="text-[11px] text-stone-500">
                                  {catName} • Арт: {p.sku}
                                </p>
                                <div className="mt-1 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyDirectLink(p)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                                      isCopied
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-amber-100 text-amber-950 hover:bg-amber-200'
                                    }`}
                                  >
                                    {isCopied ? (
                                      <>
                                        <Check className="w-3 h-3" />
                                        <span>Ссылка скопирована!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Link className="w-3 h-3 text-amber-800" />
                                        <span>Скопировать ссылку</span>
                                      </>
                                    )}
                                  </button>
                                  <a
                                    href={directUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-stone-400 hover:text-stone-700"
                                    title="Открыть"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  defaultValue={p.price}
                                  onBlur={(e) => handlePriceChange(p, Number(e.target.value))}
                                  className="w-20 px-2 py-1 border border-stone-300 rounded-lg text-right font-bold text-stone-900 text-xs"
                                />
                                <span className="font-semibold text-stone-500 text-xs">₸</span>
                              </div>

                              <button
                                onClick={() => handleToggleStock(p)}
                                className={`px-2.5 py-1 rounded-full font-bold text-[10px] sm:text-[11px] transition-colors cursor-pointer ${
                                  p.inStock
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-rose-100 hover:text-rose-800'
                                    : 'bg-rose-100 text-rose-800 hover:bg-emerald-100 hover:text-emerald-800'
                                }`}
                              >
                                {p.inStock ? 'В наличии' : 'Нет'}
                              </button>

                              <button
                                onClick={() => setEditingProduct(p)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-900 hover:bg-emerald-50 transition-colors"
                                title="Редактировать товар"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDelete(p)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Удалить из каталога"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : activeTab === 'add' ? (
                <form onSubmit={handleAddNewProduct} className="space-y-4 max-w-xl mx-auto">
                  <h4 className="font-bold text-stone-900 text-sm">
                    Добавление нового товара в каталог
                  </h4>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Название на русском (RU)*
                    </label>
                    <input
                      type="text"
                      value={newTitleRu}
                      onChange={(e) => setNewTitleRu(e.target.value)}
                      placeholder="Например: Масло черного тмина Hemani 100 мл"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Название на казахском (KZ)
                    </label>
                    <input
                      type="text"
                      value={newTitleKz}
                      onChange={(e) => setNewTitleKz(e.target.value)}
                      placeholder="Қара зере майы..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Цена (₸)*</label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="5500"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Старая цена (₸)
                      </label>
                      <input
                        type="number"
                        value={newOldPrice}
                        onChange={(e) => setNewOldPrice(e.target.value)}
                        placeholder="7000 (не обязательно)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Категория*
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      >
                        {categories
                          .filter((c) => c.id !== 'cat-all')
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nameRu}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Наличие
                      </label>
                      <select
                        value={newInStock ? 'true' : 'false'}
                        onChange={(e) => setNewInStock(e.target.value === 'true')}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      >
                        <option value="true">В наличии</option>
                        <option value="false">Нет в наличии</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5">
                      Фотография товара
                    </label>

                    {/* Image Preview & Upload Controls */}
                    <div className="p-3 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-20 rounded-xl border border-stone-200 bg-white overflow-hidden shrink-0 flex items-center justify-center relative">
                          {newImageUrl ? (
                            <img
                              src={newImageUrl}
                              alt="New product preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-stone-300" />
                          )}
                          {isCompressingImage && (
                            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-white">
                              <Loader2 className="w-5 h-5 animate-spin" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <label className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-800 text-white text-xs font-bold hover:bg-emerald-900 cursor-pointer transition-colors shadow-xs active:scale-95">
                            <Camera className="w-4 h-4" />
                            <span>{isCompressingImage ? 'Обработка фото...' : 'Выбрать фото с телефона'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={isCompressingImage}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageFileUpload(file, 'new');
                              }}
                            />
                          </label>
                          <p className="text-[11px] text-stone-500 leading-snug">
                            Сделайте снимок на камеру или выберите фотографию из галереи телефона.
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200/80">
                        <span className="block text-[10px] font-semibold text-stone-500 mb-1">
                          Или укажите ссылку на фото (не обязательно):
                        </span>
                        <input
                          type="text"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          placeholder="https://... или оставьте как есть"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:ring-1 focus:ring-emerald-700 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Описание товара
                    </label>
                    <textarea
                      value={newDescRu}
                      onChange={(e) => setNewDescRu(e.target.value)}
                      rows={3}
                      placeholder="Полезные свойства, рекомендации по приему..."
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Характеристики (страна, объем, фасовка)
                    </label>
                    <input
                      type="text"
                      value={newSpecsRu}
                      onChange={(e) => setNewSpecsRu(e.target.value)}
                      placeholder="Объем: 100 мл, Производство: Турция"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-900 text-white font-bold text-xs hover:bg-emerald-950 transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSaving ? 'Сохранение...' : 'Добавить товар в Firestore'}</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSaveConfig} className="space-y-4 max-w-xl mx-auto">
                  <h4 className="font-bold text-stone-900 text-sm">
                    Настройки магазина и контактные данные
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Название магазина
                      </label>
                      <input
                        type="text"
                        value={currentConfig.storeName}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, storeName: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Бутик</label>
                      <input
                        type="text"
                        value={currentConfig.boutiqueNumber}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, boutiqueNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Номер WhatsApp (без +)
                      </label>
                      <input
                        type="text"
                        value={currentConfig.whatsappNumber}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, whatsappNumber: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={currentConfig.instagram}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, instagram: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Адрес бутика
                    </label>
                    <input
                      type="text"
                      value={currentConfig.address}
                      onChange={(e) =>
                        setCurrentConfig({ ...currentConfig, address: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Часы работы (RU)
                      </label>
                      <input
                        type="text"
                        value={currentConfig.workingHoursRu}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, workingHoursRu: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Часы работы (KZ)
                      </label>
                      <input
                        type="text"
                        value={currentConfig.workingHoursKz}
                        onChange={(e) =>
                          setCurrentConfig({ ...currentConfig, workingHoursKz: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Ссылка 2GIS
                    </label>
                    <input
                      type="url"
                      value={currentConfig.gis2Url}
                      onChange={(e) =>
                        setCurrentConfig({ ...currentConfig, gis2Url: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      PIN-код для входа администратора
                    </label>
                    <input
                      type="text"
                      value={currentConfig.adminPin}
                      onChange={(e) =>
                        setCurrentConfig({ ...currentConfig, adminPin: e.target.value })
                      }
                      className="w-48 px-3 py-2 text-xs rounded-xl border border-stone-300"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-emerald-900 text-white font-bold text-xs hover:bg-emerald-950 transition-colors flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Сохранение...' : 'Сохранить настройки в Firestore'}</span>
                  </button>

                  {savedSuccess && (
                    <p className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Настройки успешно сохранены в Firestore!
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

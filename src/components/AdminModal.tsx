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
} from 'lucide-react';
import { Category, Language, Product, StoreConfig } from '../types';
import {
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveSettingsToFirestore,
} from '../services/firestoreService';

interface AdminModalProps {
  config: StoreConfig;
  products: Product[];
  categories: Category[];
  lang: Language;
  onUpdateConfig: (newConfig: StoreConfig) => void;
  onUpdateProduct: (product: Product) => void;
  onAddProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
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
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentConfig, setCurrentConfig] = useState<StoreConfig>(config);
  const [activeTab, setActiveTab] = useState<'products' | 'settings' | 'add'>('products');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search & Filter in Admin products list
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');

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
        className="w-full max-w-4xl bg-white rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
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
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Ссылка на изображение (URL)
                    </label>
                    <input
                      type="text"
                      value={editingProduct.images?.[0] || ''}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          images: [e.target.value],
                        })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
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
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-2 border-b border-stone-100">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        placeholder="Поиск по названию или артикулу..."
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                      />
                    </div>
                    <select
                      value={adminCategoryFilter}
                      onChange={(e) => setAdminCategoryFilter(e.target.value)}
                      className="text-xs px-3 py-1.5 rounded-xl border border-stone-300 bg-white"
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

                  <p className="text-[11px] text-stone-500">
                    Товары синхронизированы в реальном времени с вашей базой Firestore (проект: muslim-shop-55c12).
                  </p>

                  <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl overflow-hidden bg-white max-h-[55vh] overflow-y-auto">
                    {filteredAdminProducts.map((p) => (
                      <div
                        key={p.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-stone-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={p.images[0]}
                            alt=""
                            className="w-10 h-16 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                            onError={(e) => {
                              (e.target as any).src =
                                'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 truncate max-w-xs sm:max-w-md">
                              {p.titleRu}
                            </p>
                            <p className="text-[11px] text-stone-500">
                              {categories.find((c) => c.id === p.categoryId)?.nameRu || p.categoryId} • Арт: {p.sku}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                    ))}

                    {filteredAdminProducts.length === 0 && (
                      <div className="p-8 text-center text-stone-400 text-xs">
                        По вашему запросу товары не найдены
                      </div>
                    )}
                  </div>
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
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Ссылка на фото (URL)
                    </label>
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://... или вставьте прямую ссылку"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-1 focus:ring-emerald-700"
                    />
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

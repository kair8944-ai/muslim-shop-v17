import { useState, useEffect, useMemo } from 'react';
import {
  AccessibilitySettings,
  CartItem,
  Category,
  Language,
  Product,
  StoreConfig,
} from './types';
import { CATEGORIES, INITIAL_CONFIG } from './data/storeData';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { CategoryFilter } from './components/CategoryFilter';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { QuickOrderModal } from './components/QuickOrderModal';
import { FavoritesDrawer } from './components/FavoritesDrawer';
import { AdminModal } from './components/AdminModal';
import { Footer } from './components/Footer';
import {
  MessageCircle,
  PhoneCall,
  SlidersHorizontal,
  PackageSearch,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  subscribeToProducts,
  subscribeToCategories,
  subscribeToSettings,
} from './services/firestoreService';

export default function App() {
  // Config state
  const [config, setConfig] = useState<StoreConfig>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_config');
      return saved ? JSON.parse(saved) : INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  // Categories state (starts with defaults, gets populated from Firestore)
  const [categories, setCategories] = useState<Category[]>(CATEGORIES);

  // Products state (loads directly from Firestore)
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_products');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it's old demo data, ignore it
        if (
          Array.isArray(parsed) &&
          parsed.some((p: any) => p.sku === 'MS-101-OIL' || p.titleRu?.includes('Королевское'))
        ) {
          localStorage.removeItem('muslim_shop_products');
          return [];
        }
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(products.length === 0);

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_lang');
      return (saved as Language) || 'ru';
    } catch {
      return 'ru';
    }
  });

  // Accessibility state (Font scale & Contrast)
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_accessibility');
      return saved ? JSON.parse(saved) : { scale: 'normal', highContrast: false };
    } catch {
      return { scale: 'normal', highContrast: false };
    }
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorites state
  const [favorites, setFavorites] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Filtering & Search state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('cat-all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'popular' | 'priceAsc' | 'priceDesc'>('popular');

  // Modals state
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [selectedProductForQuickOrder, setSelectedProductForQuickOrder] = useState<Product | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 1. Subscribe to Firestore Products
  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (firestoreProducts) => {
        setProducts(firestoreProducts);
        setIsLoadingProducts(false);
        try {
          localStorage.setItem('muslim_shop_products', JSON.stringify(firestoreProducts));
        } catch {
          // LocalStorage quota might be reached if base64 images exist
        }
      },
      (error) => {
        console.error('Failed to load products from Firestore:', error);
        setIsLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to Firestore Categories
  useEffect(() => {
    const unsubscribe = subscribeToCategories((firestoreCategories) => {
      if (firestoreCategories.length > 0) {
        // Ensure "cat-all" is the first category
        const allCat: Category = {
          id: 'cat-all',
          nameRu: 'Все товары',
          nameKz: 'Барлық өнімдер',
          icon: '✨',
          order: 0,
        };
        const uniqueCats = firestoreCategories.filter((c) => c.id !== 'cat-all');
        setCategories([allCat, ...uniqueCats]);
      }
    });

    return () => unsubscribe();
  }, []);

  // 3. Subscribe to Firestore Store Settings
  useEffect(() => {
    const unsubscribe = subscribeToSettings(INITIAL_CONFIG, (firestoreConfig) => {
      setConfig((prev) => ({ ...prev, ...firestoreConfig }));
    });

    return () => unsubscribe();
  }, []);

  // Sync state with localStorage
  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_config', JSON.stringify(config));
    } catch (e) {
      console.warn(e);
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('muslim_shop_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.warn(e);
    }
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('muslim_shop_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('muslim_shop_accessibility', JSON.stringify(accessibility));
  }, [accessibility]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Cart handlers
  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
    const pTitle = (lang === 'kz' && product.titleKz?.trim()) ? product.titleKz : product.titleRu;
    showToast(
      lang === 'kz'
        ? `«${pTitle}» себетке қосылды!`
        : `«${pTitle}» добавлен в корзину!`
    );
  };

  const handleUpdateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Favorites handlers
  const handleToggleFavorite = (product: Product) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        showToast(
          lang === 'kz'
            ? 'Таңдаулылардан алынды'
            : 'Удалено из избранного'
        );
        return prev.filter((p) => p.id !== product.id);
      } else {
        showToast(
          lang === 'kz'
            ? 'Таңдаулыларға сақталды'
            : 'Сохранено в избранное'
        );
        return [...prev, product];
      }
    });
  };

  // Product Counts for categories
  const productCounts = useMemo(() => {
    const counts: Record<string, number> = { 'cat-all': products.length };
    products.forEach((p) => {
      counts[p.categoryId] = (counts[p.categoryId] || 0) + 1;
      if (p.isHit) counts['cat-hits'] = (counts['cat-hits'] || 0) + 1;
      if (p.isNew) counts['cat-new'] = (counts['cat-new'] || 0) + 1;
    });
    return counts;
  }, [products]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategoryId === 'cat-hits') return p.isHit;
        if (selectedCategoryId === 'cat-new') return p.isNew;
        if (selectedCategoryId !== 'cat-all' && p.categoryId !== selectedCategoryId) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle =
            (p.titleRu && p.titleRu.toLowerCase().includes(q)) ||
            (p.titleKz && p.titleKz.toLowerCase().includes(q));
          const matchDesc =
            (p.descriptionRu && p.descriptionRu.toLowerCase().includes(q)) ||
            (p.descriptionKz && p.descriptionKz.toLowerCase().includes(q));
          const matchSku = p.sku && p.sku.toLowerCase().includes(q);
          return matchTitle || matchDesc || matchSku;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priceAsc') return a.price - b.price;
        if (sortBy === 'priceDesc') return b.price - a.price;
        // Default popular
        if (a.isHit && !b.isHit) return -1;
        if (!a.isHit && b.isHit) return 1;
        return 0;
      });
  }, [products, selectedCategoryId, searchQuery, sortBy]);

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      id="app-root"
      className={`min-h-screen flex flex-col transition-colors ${
        accessibility.highContrast
          ? 'bg-amber-50/30 text-stone-950 font-normal contrast-125'
          : 'bg-[#FAF8F5] text-stone-900'
      } ${
        accessibility.scale === 'extra'
          ? 'text-lg'
          : accessibility.scale === 'large'
          ? 'text-base'
          : 'text-sm'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-amber-500/40 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-bounce"
        >
          <CheckCircle2 className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        config={config}
        lang={lang}
        onLanguageChange={setLang}
        accessibility={accessibility}
        onAccessibilityChange={setAccessibility}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        favoritesCount={favorites.length}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Hero Banner with Islamic Elegance & Boutique Highlights */}
      <HeroBanner config={config} lang={lang} onScrollToCatalog={scrollToCatalog} />

      {/* Category Horizontal Nav Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        lang={lang}
        productCounts={productCounts}
      />

      {/* Main Catalog Content */}
      <main id="catalog-section" className="max-w-7xl mx-auto px-4 py-8 sm:py-12 flex-1 w-full">
        {/* Title & Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
          <div>
            <h2 className="font-serif font-extrabold text-2xl sm:text-3xl text-emerald-950 flex items-center gap-2.5">
              <span>
                {categories.find((c) => c.id === selectedCategoryId)
                  ? lang === 'kz' && categories.find((c) => c.id === selectedCategoryId)?.nameKz
                    ? categories.find((c) => c.id === selectedCategoryId)?.nameKz
                    : categories.find((c) => c.id === selectedCategoryId)?.nameRu
                  : lang === 'kz'
                  ? 'Барлық өнімдер'
                  : 'Все товары'}
              </span>
              <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-stone-200 text-stone-700 font-bold">
                {filteredProducts.length}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              {lang === 'kz'
                ? 'Атыраудағы Бутик №24 сөрелеріндегі түпнұсқа өнімдер'
                : 'Оригинальные сертифицированные товары в наличии в Бутике №24'}
            </p>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-stone-400" />
            <select
              id="sort-products-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs sm:text-sm font-semibold py-2 px-3 rounded-xl border border-stone-200 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer shadow-2xs"
            >
              <option value="popular">{lang === 'kz' ? 'Танымалдығы бойынша' : 'Сначала популярные'}</option>
              <option value="priceAsc">{lang === 'kz' ? 'Арзаннан қымбатқа' : 'Сначала недорогие'}</option>
              <option value="priceDesc">{lang === 'kz' ? 'Қымбаттан арзанға' : 'Сначала премиум'}</option>
            </select>
          </div>
        </div>

        {/* Loading Spinner during initial fetch */}
        {isLoadingProducts && products.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-10 h-10 text-emerald-800 animate-spin mx-auto" />
            <p className="text-stone-600 font-medium text-sm">
              {lang === 'kz' ? 'Өнімдер жүктелуде...' : 'Загрузка товаров из каталога...'}
            </p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div id="catalog-empty-state" className="py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mx-auto">
              <PackageSearch className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-800">
              {lang === 'kz' ? 'Өнімдер табылмады' : 'Товары не найдены'}
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              {lang === 'kz'
                ? 'Іздеу сұранысын өзгертіп көріңіз немесе басқа санатты таңдаңыз'
                : 'Попробуйте изменить запрос в строке поиска или выберите другую категорию'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('cat-all');
              }}
              className="px-5 py-2 rounded-xl bg-emerald-900 text-white text-xs font-bold hover:bg-emerald-950 transition-colors"
            >
              {lang === 'kz' ? 'Барлық өнімдерді көрсету' : 'Сбросить фильтры'}
            </button>
          </div>
        ) : (
          <div
            id="products-grid"
            className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-6 mt-6"
          >
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                accessibility={accessibility}
                isFavorite={favorites.some((f) => f.id === product.id)}
                isInCart={cart.some((c) => c.product.id === product.id)}
                onToggleFavorite={handleToggleFavorite}
                onAddToCart={handleAddToCart}
                onOpenDetail={setSelectedProductForDetail}
                onQuickOrder={setSelectedProductForQuickOrder}
              />
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Buttons for Mobile/Desktop: WhatsApp & Phone quick call */}
      <div id="floating-actions" className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5">
        <a
          id="floating-whatsapp-btn"
          href={`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(
            lang === 'kz'
              ? 'Сәлеметсіз бе! Маған MUSLIM SHOP бойынша кеңес керек еді.'
              : 'Здравствуйте! Мне нужна консультация по ассортименту MUSLIM SHOP.'
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg hover:scale-105 transition-all"
          title="Написать в WhatsApp менеджеру"
        >
          <MessageCircle className="w-6 h-6" />
        </a>

        <a
          id="floating-call-btn"
          href={`tel:+${config.whatsappNumber}`}
          className="w-13 h-13 rounded-full bg-amber-500 hover:bg-amber-600 text-stone-950 flex items-center justify-center shadow-lg hover:scale-105 transition-all"
          title="Позвонить в Бутик №24"
        >
          <PhoneCall className="w-6 h-6" />
        </a>
      </div>

      {/* Footer (NO Telegram) */}
      <Footer config={config} lang={lang} onOpenAdmin={() => setIsAdminOpen(true)} />

      {/* Modals & Drawers */}

      {/* 1. Full-Screen Zoomable Product Detail Modal */}
      {selectedProductForDetail && (
        <ProductDetailModal
          product={selectedProductForDetail}
          config={config}
          lang={lang}
          accessibility={accessibility}
          isFavorite={favorites.some((f) => f.id === selectedProductForDetail.id)}
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onQuickOrder={setSelectedProductForQuickOrder}
          onClose={() => setSelectedProductForDetail(null)}
        />
      )}

      {/* 2. 1-Click Quick Order Modal */}
      {selectedProductForQuickOrder && (
        <QuickOrderModal
          product={selectedProductForQuickOrder}
          config={config}
          lang={lang}
          onClose={() => setSelectedProductForQuickOrder(null)}
        />
      )}

      {/* 3. Cart Drawer with WhatsApp Order */}
      {isCartOpen && (
        <CartDrawer
          items={cart}
          config={config}
          lang={lang}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveFromCart}
          onClearCart={handleClearCart}
          onClose={() => setIsCartOpen(false)}
        />
      )}

      {/* 4. Favorites Drawer */}
      {isFavoritesOpen && (
        <FavoritesDrawer
          favorites={favorites}
          lang={lang}
          onRemoveFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onOpenDetail={setSelectedProductForDetail}
          onClose={() => setIsFavoritesOpen(false)}
        />
      )}

      {/* 5. Store Admin Modal (PIN protected, connected to Firestore) */}
      {isAdminOpen && (
        <AdminModal
          config={config}
          products={products}
          categories={categories}
          lang={lang}
          onUpdateConfig={setConfig}
          onUpdateProduct={(updated) =>
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
          }
          onAddProduct={(newProd) => setProducts((prev) => [newProd, ...prev])}
          onDeleteProduct={(deletedId) =>
            setProducts((prev) => prev.filter((p) => p.id !== deletedId))
          }
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}

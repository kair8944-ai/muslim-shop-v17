import { useState, useEffect, useMemo, useCallback } from 'react';
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
  getProductById,
  fetchUniversalCatalog,
  isQuotaOrNetworkError,
} from './services/firestoreService';
import { trackVisit, trackProductView } from './services/analyticsService';
import {
  deduplicateProducts,
  extractProductIdFromUrl,
  getProductDirectUrl,
} from './utils/formatters';

export default function App() {
  // Config state
  const [config, setConfig] = useState<StoreConfig>(() => {
    try {
      const saved = localStorage.getItem('muslim_shop_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const merged = { ...INITIAL_CONFIG, ...parsed };
        if (!merged.taglineRu || merged.taglineRu === 'Красота. Здоровье. Вера.') {
          merged.taglineRu = INITIAL_CONFIG.taglineRu;
          merged.taglineKz = INITIAL_CONFIG.taglineKz;
        }
        if (
          !merged.subtitleRu ||
          merged.subtitleRu.includes('Премиальные товары для здоровья, красоты и повседневной')
        ) {
          merged.subtitleRu = INITIAL_CONFIG.subtitleRu;
          merged.subtitleKz = INITIAL_CONFIG.subtitleKz;
        }
        return merged;
      }
      return INITIAL_CONFIG;
    } catch {
      return INITIAL_CONFIG;
    }
  });

  // Helper for tracking deleted categories to prevent resurrection from static defaults
  const getDeletedCategoryIds = (): string[] => {
    try {
      const raw = localStorage.getItem('muslim_shop_deleted_categories');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addDeletedCategoryId = (id: string) => {
    try {
      const list = getDeletedCategoryIds();
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('muslim_shop_deleted_categories', JSON.stringify(list));
      }
    } catch {}
  };

  // Categories state (starts with defaults/cache, gets populated from Firestore)
  const [categories, setCategories] = useState<Category[]>(() => {
    const deletedIds = getDeletedCategoryIds();
    try {
      const saved = localStorage.getItem('muslim_shop_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c: Category) => !deletedIds.includes(c.id));
        }
      }
      return CATEGORIES.filter((c) => !deletedIds.includes(c.id));
    } catch {
      return CATEGORIES.filter((c) => !deletedIds.includes(c.id));
    }
  });

  // Products state (loads from shared server / Firestore catalog)
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

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
  const [isDirectProductLoading, setIsDirectProductLoading] = useState<boolean>(false);

  // 1. Subscribe to Firestore & Universal Server Catalog Products
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      setIsLoadingProducts(false);
    }, 15000);

    const unsubscribe = subscribeToProducts(
      (firestoreProducts) => {
        clearTimeout(fallbackTimer);
        const deduped = deduplicateProducts(firestoreProducts);
        setProducts(deduped);
        setIsLoadingProducts(false);
      },
      (error) => {
        clearTimeout(fallbackTimer);
        if (isQuotaOrNetworkError(error)) {
          console.warn('Firestore notice: operating via fallback catalog.');
        } else {
          console.warn('Could not load products from Firestore:', error);
        }
        setIsLoadingProducts(false);
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, []);

  // 2. Subscribe to Firestore Categories
  useEffect(() => {
    const unsubscribe = subscribeToCategories((firestoreCategories) => {
      const deletedIds = getDeletedCategoryIds();
      const catMap = new Map<string, Category>();

      if (firestoreCategories.length > 0) {
        firestoreCategories.forEach((fc) => {
          if (!deletedIds.includes(fc.id)) {
            catMap.set(fc.id, fc);
          }
        });
      } else {
        CATEGORIES.filter((c) => !deletedIds.includes(c.id)).forEach((c) =>
          catMap.set(c.id, c)
        );
      }

      // Ensure "cat-all" is the first category
      const allCat: Category = catMap.get('cat-all') || {
        id: 'cat-all',
        nameRu: 'Все товары',
        nameKz: 'Барлық өнімдер',
        icon: '✨',
        order: 0,
      };
      catMap.delete('cat-all');

      const otherCats = Array.from(catMap.values()).sort((a, b) => a.order - b.order);
      const merged = [allCat, ...otherCats];

      setCategories(merged);
      try {
        localStorage.setItem('muslim_shop_categories', JSON.stringify(merged));
      } catch {}
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

  // Helper to match targetId against products array with high tolerance
  const findProductMatch = useCallback((list: Product[], targetId: string): Product | undefined => {
    if (!targetId || !Array.isArray(list) || list.length === 0) return undefined;
    const clean = targetId.trim().toLowerCase();

    // 1. Strict ID match or case-insensitive match
    let found = list.find((p) => p.id === targetId || p.id.toLowerCase() === clean);
    if (found) return found;

    // 2. SKU match
    found = list.find((p) => p.sku && (p.sku === targetId || p.sku.toLowerCase() === clean));
    if (found) return found;

    // 3. Match without prefix 'prod-'
    const cleanNoPrefix = clean.replace(/^prod-/, '');
    found = list.find((p) => p.id.toLowerCase().replace(/^prod-/, '') === cleanNoPrefix);
    if (found) return found;

    // 4. Match SKU numeric part
    const numPart = clean.replace(/^[a-z]+-?/i, '');
    if (numPart && numPart.length >= 3) {
      found = list.find((p) => p.sku && p.sku.toLowerCase().endsWith(numPart));
      if (found) return found;
    }

    return undefined;
  }, []);

  // Deep linking: Automatically open product detail modal if URL has ?p=prod-id or #prod-id
  useEffect(() => {
    let isCancelled = false;

    const resolveDirectLink = async () => {
      const targetId = extractProductIdFromUrl();
      if (!targetId) {
        // If there is no targetId in URL (e.g. user navigated Back via browser button), close detail modal
        setSelectedProductForDetail((curr) => (curr ? null : curr));
        return;
      }

      // 1. Check if already loaded in current state
      const existing = findProductMatch(products, targetId);
      if (existing) {
        setSelectedProductForDetail(existing);
        const title = (lang === 'kz' && existing.titleKz?.trim()) ? existing.titleKz : existing.titleRu;
        document.title = `${title} — ${config.storeName}`;
        return;
      }

      // 2. Check cached products in localStorage
      try {
        const cachedRaw = localStorage.getItem('muslim_shop_products_cache') || localStorage.getItem('muslim_shop_products');
        if (cachedRaw) {
          const cachedList = JSON.parse(cachedRaw);
          const cachedMatch = findProductMatch(cachedList, targetId);
          if (cachedMatch) {
            setSelectedProductForDetail(cachedMatch);
            const title = (lang === 'kz' && cachedMatch.titleKz?.trim()) ? cachedMatch.titleKz : cachedMatch.titleRu;
            document.title = `${title} — ${config.storeName}`;
            return;
          }
        }
      } catch {}

      // 3. Directly fetch single document from Firestore by ID or SKU
      setIsDirectProductLoading(true);
      try {
        const directProd = await getProductById(targetId);
        if (isCancelled) return;

        if (directProd) {
          setSelectedProductForDetail(directProd);
          const title = (lang === 'kz' && directProd.titleKz?.trim()) ? directProd.titleKz : directProd.titleRu;
          document.title = `${title} — ${config.storeName}`;

          // Also inject into products list if not yet included so catalog renders it
          setProducts((prev) => {
            if (prev.some((p) => p.id === directProd.id)) return prev;
            return [directProd, ...prev];
          });
        } else {
          // If products collection is still loading, wait; otherwise notify user
          if (!isLoadingProducts) {
            setToastMessage(
              lang === 'kz'
                ? 'Өнім сілтемесі бойынша табылмады немесе сатылымнан алынды'
                : 'Товар по ссылке не найден или был снят с продажи'
            );
            setTimeout(() => setToastMessage(null), 4000);
          }
        }
      } catch (err) {
        console.error('Direct link resolution error:', err);
      } finally {
        if (!isCancelled) {
          setIsDirectProductLoading(false);
        }
      }
    };

    resolveDirectLink();

    const handleUrlChange = () => {
      resolveDirectLink();
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);

    return () => {
      isCancelled = true;
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [products, isLoadingProducts, lang, config.storeName, findProductMatch]);

  // Track visitor traffic safely
  useEffect(() => {
    trackVisit({ page: 'Каталог бутика', lang, isInitialLoad: true });
  }, []);

  const handleOpenDetail = (product: Product) => {
    setSelectedProductForDetail(product);
    trackProductView(product.id, product.titleRu);
    try {
      const targetUrl = getProductDirectUrl(product.id);
      window.history.pushState({ productId: product.id }, '', targetUrl);
      const title = (lang === 'kz' && product.titleKz?.trim()) ? product.titleKz : product.titleRu;
      document.title = `${title} — ${config.storeName}`;
    } catch {}
  };

  const handleCloseDetail = () => {
    setSelectedProductForDetail(null);
    try {
      const url = new URL(window.location.href);
      ['p', 'product', 'prod', 'id', 'sku', 'item'].forEach((k) => url.searchParams.delete(k));
      const cleanPath = url.pathname + (url.search ? url.search : '');
      window.history.replaceState({}, '', cleanPath);
      document.title = `${config.storeName} — ${lang === 'kz' ? config.taglineKz : config.taglineRu} | Бутик №24`;
    } catch {}
  };

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
        ? `«${pTitle}» — өнім себетке жіберілді!`
        : `«${pTitle}» — товар отправлен в корзину!`
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
        if (selectedCategoryId === 'cat-hits') return Boolean(p.isHit);
        if (selectedCategoryId === 'cat-new') return Boolean(p.isNew);
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
        
        // Default "popular" sorting:
        // 1. First priority: Hits of sales (isHit)
        if (a.isHit && !b.isHit) return -1;
        if (!a.isHit && b.isHit) return 1;
        
        // 2. Second priority: Newest products first (by createdAt or ID timestamp)
        const timeA = a.createdAt || (a.id.startsWith('prod-') ? a.id.replace('prod-', '') : '');
        const timeB = b.createdAt || (b.id.startsWith('prod-') ? b.id.replace('prod-', '') : '');
        return timeB.localeCompare(timeA);
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
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col transition-colors ${
        accessibility.highContrast
          ? 'bg-white text-black font-semibold selection:bg-amber-300 selection:text-black'
          : 'bg-[#FAF8F5] text-stone-900'
      } ${
        accessibility.scale === 'extra'
          ? 'text-lg sm:text-xl'
          : accessibility.scale === 'large'
          ? 'text-base sm:text-lg'
          : 'text-sm'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          id="toast-notification"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border-2 border-amber-400 text-xs sm:text-sm font-bold flex items-center gap-3 animate-bounce"
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Loading banner when opening a direct link from Instagram Story or WhatsApp */}
      {isDirectProductLoading && !selectedProductForDetail && (
        <div
          id="direct-product-loader"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-950/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/80 text-xs sm:text-sm font-bold flex items-center gap-3 animate-pulse"
        >
          <Loader2 className="w-5 h-5 text-amber-300 animate-spin shrink-0" />
          <span>{lang === 'kz' ? 'Өнім жүктелуде...' : 'Загружаем товар по ссылке...'}</span>
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
      <HeroBanner
        config={config}
        lang={lang}
        onScrollToCatalog={scrollToCatalog}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
      />

      {/* Category Nav Filter — All visible side-by-side without horizontal scrolling */}
      <CategoryFilter
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        lang={lang}
        productCounts={productCounts}
        onOpenAdminCategories={() => setIsAdminOpen(true)}
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
              onClick={async () => {
                setSearchQuery('');
                setSelectedCategoryId('cat-all');
                if (products.length === 0) {
                  setIsLoadingProducts(true);
                  const cat = await fetchUniversalCatalog();
                  if (cat && cat.products.length > 0) {
                    setProducts(deduplicateProducts(cat.products));
                  }
                  setIsLoadingProducts(false);
                }
              }}
              className="px-5 py-2 rounded-xl bg-emerald-900 text-white text-xs font-bold hover:bg-emerald-950 transition-colors"
            >
              {products.length === 0
                ? lang === 'kz'
                  ? 'Каталогты қайта жүктеу'
                  : 'Обновить каталог'
                : lang === 'kz'
                ? 'Барлық өнімдерді көрсету'
                : 'Сбросить фильтры'}
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
                onOpenDetail={handleOpenDetail}
                onQuickOrder={setSelectedProductForQuickOrder}
                onShareFeedback={showToast}
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
          onLanguageChange={setLang}
          accessibility={accessibility}
          isFavorite={favorites.some((f) => f.id === selectedProductForDetail.id)}
          onToggleFavorite={handleToggleFavorite}
          onAddToCart={handleAddToCart}
          onQuickOrder={setSelectedProductForQuickOrder}
          onClose={handleCloseDetail}
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
          onOpenDetail={handleOpenDetail}
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
          onUpdateConfig={(newCfg) => {
            setConfig(newCfg);
            try {
              localStorage.setItem('muslim_shop_config', JSON.stringify(newCfg));
            } catch {}
          }}
          onUpdateProduct={(updated) => {
            setProducts((prev) => {
              const next = deduplicateProducts(prev.map((p) => (p.id === updated.id ? updated : p)));
              try {
                localStorage.setItem('muslim_shop_products', JSON.stringify(next));
              } catch {}
              return next;
            });
          }}
          onAddProduct={(newProd) => {
            setProducts((prev) => {
              const alreadyExists = prev.some(
                (p) => p.id === newProd.id || (p.sku && newProd.sku && p.sku === newProd.sku)
              );
              if (alreadyExists) return prev;
              const next = deduplicateProducts([newProd, ...prev]);
              try {
                localStorage.setItem('muslim_shop_products', JSON.stringify(next));
              } catch {}
              return next;
            });
            showToast(lang === 'kz' ? 'Өнім сәтті қосылды!' : 'Товар успешно добавлен в каталог!');
          }}
          onDeleteProduct={(deletedId) => {
            setProducts((prev) => {
              const next = prev.filter((p) => p.id !== deletedId);
              try {
                localStorage.setItem('muslim_shop_products', JSON.stringify(next));
              } catch {}
              return next;
            });
            showToast(lang === 'kz' ? 'Өнім жойылды' : 'Товар удален из каталога');
          }}
          onPreviewProduct={handleOpenDetail}
          onAddCategory={(newCat) => {
            // Remove from deleted list if present
            try {
              const currentDeleted = getDeletedCategoryIds().filter((id) => id !== newCat.id);
              localStorage.setItem('muslim_shop_deleted_categories', JSON.stringify(currentDeleted));
            } catch {}
            setCategories((prev) => {
              const exists = prev.some((c) => c.id === newCat.id);
              if (exists) return prev;
              const updated = [...prev, newCat];
              try {
                localStorage.setItem('muslim_shop_categories', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast(lang === 'kz' ? 'Каталог қосылды!' : 'Каталог успешно добавлен!');
          }}
          onUpdateCategory={(updatedCat) => {
            setCategories((prev) => {
              const updated = prev.map((c) => (c.id === updatedCat.id ? updatedCat : c));
              try {
                localStorage.setItem('muslim_shop_categories', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            showToast(lang === 'kz' ? 'Каталог жаңартылды!' : 'Каталог успешно обновлен!');
          }}
          onDeleteCategory={(deletedCatId) => {
            addDeletedCategoryId(deletedCatId);
            setCategories((prev) => {
              const updated = prev.filter((c) => c.id !== deletedCatId);
              try {
                localStorage.setItem('muslim_shop_categories', JSON.stringify(updated));
              } catch {}
              return updated;
            });
            // If the deleted category was currently selected, reset to 'cat-all'
            if (selectedCategoryId === deletedCatId) {
              setSelectedCategoryId('cat-all');
            }
            showToast(lang === 'kz' ? 'Каталог жойылды' : 'Каталог удален');
          }}
          onClose={() => setIsAdminOpen(false)}
        />
      )}
    </div>
  );
}

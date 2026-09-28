import {
  doc,
  setDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db, FIREBASE_CONFIG, FIRESTORE_DB_ID } from '../firebase';
import { AnalyticsOverview, DailyAnalytics, VisitLogItem } from '../types';

export const SETTINGS_COLLECTION = 'settings';
export const ANALYTICS_DOC_ID = 'analytics_stats';

const ADMIN_IGNORE_KEY = 'muslim_shop_ignore_admin_visits';
const VISITOR_ID_KEY = 'muslim_shop_visitor_id';
const LAST_VISITED_DATE_KEY = 'muslim_shop_last_visit_date';
const SESSION_ACTIVE_KEY = 'muslim_shop_session_active';
const ANALYTICS_LOCAL_CACHE_KEY = 'muslim_shop_analytics_cache_v4';

// CORS-enabled Cloud Relay for cross-browser & cross-device analytics (works on muslimshop.kz and when Firestore read quota is reached)
const CLOUD_RELAY_APP_KEY = 'hbqgqy42';
const CLOUD_RELAY_ANALYTICS_PREFIX = 'ms_a5_';

export interface PersistedAnalyticsState {
  overview: {
    totalVisits: number;
    uniqueVisitors: number;
    pageViews: number;
    lastVisitAt?: string;
  };
  days: Record<
    string,
    {
      date: string;
      totalVisits: number;
      uniqueVisitors: number;
      pageViews: number;
      mobileVisits: number;
      desktopVisits: number;
      ruVisits: number;
      kzVisits: number;
      productViews?: Record<string, { title: string; count: number }>;
      updatedAt: string;
      resetToken?: number;
    }
  >;
  recentVisits: VisitLogItem[];
  updatedAt: string;
}

const analyticsListeners = new Set<
  (data: {
    overview: AnalyticsOverview;
    dailyData: DailyAnalytics[];
    recentVisits: VisitLogItem[];
  }) => void
>();

let inMemoryAnalytics: PersistedAnalyticsState | null = null;

function createEmptyAnalyticsState(): PersistedAnalyticsState {
  return {
    overview: {
      totalVisits: 0,
      uniqueVisitors: 0,
      pageViews: 0,
    },
    days: {},
    recentVisits: [],
    updatedAt: new Date(0).toISOString(),
  };
}

function isStaticGitHubPagesHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.endsWith('github.io') || host === 'muslimshop.kz' || host === 'www.muslimshop.kz';
}

export function getLocalAnalyticsState(): PersistedAnalyticsState {
  if (inMemoryAnalytics) return inMemoryAnalytics;
  try {
    const raw = localStorage.getItem(ANALYTICS_LOCAL_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        inMemoryAnalytics = {
          overview: {
            totalVisits: Number(parsed.overview?.totalVisits) || 0,
            uniqueVisitors: Number(parsed.overview?.uniqueVisitors) || 0,
            pageViews: Number(parsed.overview?.pageViews) || 0,
            lastVisitAt: parsed.overview?.lastVisitAt,
          },
          days: parsed.days && typeof parsed.days === 'object' ? parsed.days : {},
          recentVisits: Array.isArray(parsed.recentVisits) ? parsed.recentVisits : [],
          updatedAt: parsed.updatedAt || new Date().toISOString(),
        };
        return inMemoryAnalytics;
      }
    }
  } catch {}
  inMemoryAnalytics = createEmptyAnalyticsState();
  return inMemoryAnalytics;
}

function saveLocalAnalyticsState(state: PersistedAnalyticsState): void {
  inMemoryAnalytics = state;
  try {
    localStorage.setItem(ANALYTICS_LOCAL_CACHE_KEY, JSON.stringify(state));
  } catch {}
  notifyAnalyticsListeners(state);
}

function formatStateForUI(state: PersistedAnalyticsState): {
  overview: AnalyticsOverview;
  dailyData: DailyAnalytics[];
  recentVisits: VisitLogItem[];
} {
  const daysRaw = state.days || {};
  const dailyList: DailyAnalytics[] = Object.keys(daysRaw).map((dKey) => {
    const item = daysRaw[dKey] || ({} as any);
    // Also recover any dotted productViews keys if present from older Firestore documents
    const productViews: Record<string, { title: string; count: number }> = {
      ...(item.productViews || {}),
    };
    for (const [k, v] of Object.entries(item)) {
      if (k.startsWith('productViews.')) {
        const parts = k.split('.');
        const prodId = parts[1];
        const field = parts[2];
        if (prodId && field) {
          if (!productViews[prodId]) {
            productViews[prodId] = { title: 'Товар', count: 0 };
          }
          if (field === 'title' && typeof v === 'string') {
            productViews[prodId].title = v;
          } else if (field === 'count' && typeof v === 'number') {
            productViews[prodId].count = Math.max(productViews[prodId].count, v);
          }
        }
      }
    }

    return {
      id: dKey,
      date: item.date || dKey,
      totalVisits: Number(item.totalVisits) || 0,
      uniqueVisitors: Number(item.uniqueVisitors) || 0,
      pageViews: Number(item.pageViews) || 0,
      mobileVisits: Number(item.mobileVisits) || 0,
      desktopVisits: Number(item.desktopVisits) || 0,
      ruVisits: Number(item.ruVisits) || 0,
      kzVisits: Number(item.kzVisits) || 0,
      productViews,
      updatedAt: item.updatedAt || '',
    };
  });

  dailyList.sort((a, b) => a.date.localeCompare(b.date));

  // Recompute overview totals as at least the sum of daily totals so overview is never smaller than daily sum
  const sumVisits = dailyList.reduce((acc, d) => acc + d.totalVisits, 0);
  const sumUniques = dailyList.reduce((acc, d) => acc + d.uniqueVisitors, 0);
  const sumViews = dailyList.reduce((acc, d) => acc + d.pageViews, 0);

  const overview: AnalyticsOverview = {
    totalVisitsAllTime: Math.max(Number(state.overview?.totalVisits) || 0, sumVisits),
    uniqueVisitorsAllTime: Math.max(Number(state.overview?.uniqueVisitors) || 0, sumUniques),
    totalPageViewsAllTime: Math.max(Number(state.overview?.pageViews) || 0, sumViews),
    lastVisitAt: state.overview?.lastVisitAt,
  };

  const sortedVisits = [...(state.recentVisits || [])].sort((a, b) =>
    (b.timestamp || '').localeCompare(a.timestamp || '')
  );

  return {
    overview,
    dailyData: dailyList,
    recentVisits: sortedVisits.slice(0, 35),
  };
}

function notifyAnalyticsListeners(state: PersistedAnalyticsState): void {
  const formatted = formatStateForUI(state);
  analyticsListeners.forEach((cb) => {
    try {
      cb(formatted);
    } catch {}
  });
}

/**
 * Merges two analytics states (e.g. local cache + remote Cloud Relay / Server / Firestore)
 * so no customer visit is ever lost across browsers or devices.
 */
export function mergeAnalyticsStates(
  local: PersistedAnalyticsState,
  remote: Partial<PersistedAnalyticsState> | null | undefined
): PersistedAnalyticsState {
  if (!remote || typeof remote !== 'object') return local;

  const mergedDays: PersistedAnalyticsState['days'] = { ...(local.days || {}) };
  const remoteDays = remote.days || {};

  for (const [dateKey, rDay] of Object.entries(remoteDays)) {
    if (!rDay) continue;
    const lDay = mergedDays[dateKey];
    if (!lDay) {
      mergedDays[dateKey] = {
        date: rDay.date || dateKey,
        totalVisits: Number(rDay.totalVisits) || 0,
        uniqueVisitors: Number(rDay.uniqueVisitors) || 0,
        pageViews: Number(rDay.pageViews) || 0,
        mobileVisits: Number(rDay.mobileVisits) || 0,
        desktopVisits: Number(rDay.desktopVisits) || 0,
        ruVisits: Number(rDay.ruVisits) || 0,
        kzVisits: Number(rDay.kzVisits) || 0,
        productViews: { ...(rDay.productViews || {}) },
        updatedAt: rDay.updatedAt || new Date().toISOString(),
        resetToken: rDay.resetToken || 0,
      };
    } else {
      const lReset = Number(lDay.resetToken) || 0;
      const rReset = Number(rDay.resetToken) || 0;

      // If one side was explicitly reset more recently, honor the newer reset token
      if (rReset > lReset) {
        mergedDays[dateKey] = {
          ...rDay,
          date: rDay.date || dateKey,
          productViews: { ...(rDay.productViews || {}) },
          resetToken: rReset,
        };
      } else if (lReset > rReset) {
        mergedDays[dateKey] = lDay;
      } else {
        // Merge productViews by taking max count per product
        const mergedProdViews: Record<string, { title: string; count: number }> = {
          ...(lDay.productViews || {}),
        };
        if (rDay.productViews && typeof rDay.productViews === 'object') {
          for (const [pid, pInfo] of Object.entries(rDay.productViews)) {
            if (!pInfo) continue;
            const existing = mergedProdViews[pid];
            mergedProdViews[pid] = {
              title: pInfo.title || existing?.title || 'Товар',
              count: Math.max(Number(existing?.count) || 0, Number(pInfo.count) || 0),
            };
          }
        }

        mergedDays[dateKey] = {
          date: dateKey,
          totalVisits: Math.max(Number(lDay.totalVisits) || 0, Number(rDay.totalVisits) || 0),
          uniqueVisitors: Math.max(Number(lDay.uniqueVisitors) || 0, Number(rDay.uniqueVisitors) || 0),
          pageViews: Math.max(Number(lDay.pageViews) || 0, Number(rDay.pageViews) || 0),
          mobileVisits: Math.max(Number(lDay.mobileVisits) || 0, Number(rDay.mobileVisits) || 0),
          desktopVisits: Math.max(Number(lDay.desktopVisits) || 0, Number(rDay.desktopVisits) || 0),
          ruVisits: Math.max(Number(lDay.ruVisits) || 0, Number(rDay.ruVisits) || 0),
          kzVisits: Math.max(Number(lDay.kzVisits) || 0, Number(rDay.kzVisits) || 0),
          productViews: mergedProdViews,
          updatedAt:
            (rDay.updatedAt || '') > (lDay.updatedAt || '')
              ? rDay.updatedAt
              : lDay.updatedAt || new Date().toISOString(),
          resetToken: Math.max(lReset, rReset),
        };
      }
    }
  }

  // Deduplicate recentVisits by id and filter out visits from a day that was reset after the visit timestamp
  const visitMap = new Map<string, VisitLogItem>();
  for (const v of [...(local.recentVisits || []), ...(remote.recentVisits || [])]) {
    if (!v || !v.id) continue;
    const visitDate = (v.timestamp || '').slice(0, 10);
    const dayObj = mergedDays[visitDate];
    if (dayObj?.resetToken && v.timestamp) {
      const visitMs = new Date(v.timestamp).getTime();
      if (!isNaN(visitMs) && visitMs < dayObj.resetToken) {
        continue;
      }
    }
    visitMap.set(v.id, v);
  }

  const mergedVisits = Array.from(visitMap.values())
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
    .slice(0, 30);

  const sumVisits = Object.values(mergedDays).reduce((acc, d) => acc + (Number(d.totalVisits) || 0), 0);
  const sumUniques = Object.values(mergedDays).reduce((acc, d) => acc + (Number(d.uniqueVisitors) || 0), 0);
  const sumViews = Object.values(mergedDays).reduce((acc, d) => acc + (Number(d.pageViews) || 0), 0);

  const mergedOverview = {
    totalVisits: Math.max(
      Number(local.overview?.totalVisits) || 0,
      Number(remote.overview?.totalVisits) || 0,
      sumVisits
    ),
    uniqueVisitors: Math.max(
      Number(local.overview?.uniqueVisitors) || 0,
      Number(remote.overview?.uniqueVisitors) || 0,
      sumUniques
    ),
    pageViews: Math.max(
      Number(local.overview?.pageViews) || 0,
      Number(remote.overview?.pageViews) || 0,
      sumViews
    ),
    lastVisitAt:
      (remote.overview?.lastVisitAt || '') > (local.overview?.lastVisitAt || '')
        ? remote.overview?.lastVisitAt
        : local.overview?.lastVisitAt,
  };

  return {
    overview: mergedOverview,
    days: mergedDays,
    recentVisits: mergedVisits,
    updatedAt: new Date().toISOString(),
  };
}

function fromFirestoreRestVal(v: any): any {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue?.values || []).map(fromFirestoreRestVal);
  if ('mapValue' in v) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v.mapValue?.fields || {})) {
      out[k] = fromFirestoreRestVal(val);
    }
    return out;
  }
  return undefined;
}

async function pullAnalyticsFromFirestoreRest(): Promise<PersistedAnalyticsState | null> {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/${FIRESTORE_DB_ID}/documents/${SETTINGS_COLLECTION}/${ANALYTICS_DOC_ID}?key=${FIREBASE_CONFIG.apiKey}`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!res.ok) return null;
    const rawDoc = await res.json();
    if (!rawDoc || !rawDoc.fields) return null;
    const parsed = fromFirestoreRestVal({ mapValue: { fields: rawDoc.fields } });
    if (parsed && typeof parsed === 'object') {
      const merged = mergeAnalyticsStates(getLocalAnalyticsState(), parsed);
      saveLocalAnalyticsState(merged);
      return merged;
    }
  } catch {}
  return null;
}

async function pullAnalyticsFromCloudRelay(): Promise<PersistedAnalyticsState | null> {
  try {
    const lenRes = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PREFIX}len`,
      { method: 'GET', cache: 'no-store' }
    );
    if (!lenRes.ok) return null;
    const lenNum = parseInt((await lenRes.text()).replace(/^"|"$/g, '').trim(), 10);
    if (!lenNum || isNaN(lenNum) || lenNum <= 0 || lenNum > 20) return null;

    const parts = await Promise.all(
      Array.from({ length: lenNum }, (_, idx) =>
        fetch(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PREFIX}c${idx}`,
          { method: 'GET', cache: 'no-store' }
        ).then(async (r) => (r.ok ? (await r.text()).replace(/^"|"$/g, '').trim() : ''))
      )
    );
    if (parts.some((p) => !p)) return null;
    let b64 = parts.join('').replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';

    const jsonStr = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object') {
      const merged = mergeAnalyticsStates(getLocalAnalyticsState(), parsed);
      saveLocalAnalyticsState(merged);
      return merged;
    }
  } catch {}
  return null;
}

async function pushAnalyticsToCloudRelay(state: PersistedAnalyticsState): Promise<void> {
  try {
    const sortedDayKeys = Object.keys(state.days || {}).sort().slice(-7);
    const compactDays: PersistedAnalyticsState['days'] = {};
    for (const k of sortedDayKeys) {
      compactDays[k] = state.days[k];
    }
    const compactState: PersistedAnalyticsState = {
      overview: state.overview,
      days: compactDays,
      recentVisits: (state.recentVisits || []).slice(0, 8),
      updatedAt: state.updatedAt,
    };
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(compactState))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const chunkSize = 180;
    const chunks: string[] = [];
    for (let i = 0; i < b64.length; i += chunkSize) {
      chunks.push(b64.slice(i, i + chunkSize));
    }
    if (chunks.length > 0 && chunks.length <= 20) {
      await Promise.all(
        chunks.map((chunk, idx) =>
          fetch(
            `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PREFIX}c${idx}/${chunk}`,
            { method: 'POST' }
          )
        )
      );
      await fetch(
        `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PREFIX}len/${chunks.length}`,
        { method: 'POST' }
      );
    }
  } catch {}
}

async function pullAnalyticsFromServer(): Promise<PersistedAnalyticsState | null> {
  if (isStaticGitHubPagesHost()) return null;
  try {
    const res = await fetch('/api/analytics', { method: 'GET', cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object' && data.analytics) {
      const merged = mergeAnalyticsStates(getLocalAnalyticsState(), data.analytics);
      saveLocalAnalyticsState(merged);
      return merged;
    }
  } catch {}
  return null;
}

async function pushAnalyticsToServer(state: PersistedAnalyticsState): Promise<void> {
  if (isStaticGitHubPagesHost()) return;
  try {
    await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analytics: state }),
    });
  } catch {}
}

/**
 * Pulls latest remote state from Cloud Relay + Server, merges with local state, and pushes back.
 */
export async function syncAnalyticsEverywhere(): Promise<PersistedAnalyticsState> {
  const [restState, relayState, serverState] = await Promise.all([
    pullAnalyticsFromFirestoreRest().catch(() => null),
    pullAnalyticsFromCloudRelay().catch(() => null),
    pullAnalyticsFromServer().catch(() => null),
  ]);

  let current = getLocalAnalyticsState();
  if (restState) {
    current = mergeAnalyticsStates(current, restState);
  }
  if (relayState) {
    current = mergeAnalyticsStates(current, relayState);
  }
  if (serverState) {
    current = mergeAnalyticsStates(current, serverState);
  }
  saveLocalAnalyticsState(current);
  return current;
}

/**
 * Gets or creates an anonymous persistent visitor ID
 */
export function getVisitorId(): string {
  try {
    let vid = localStorage.getItem(VISITOR_ID_KEY);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-4);
      localStorage.setItem(VISITOR_ID_KEY, vid);
    }
    return vid;
  } catch {
    return 'v_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * Check if current browser has admin mode enabled to ignore visits (defaults to false unless explicitly enabled by admin)
 */
export function isIgnoreAdminVisits(): boolean {
  try {
    const val = localStorage.getItem(ADMIN_IGNORE_KEY);
    return val === 'true';
  } catch {
    return false;
  }
}

export function setIgnoreAdminVisits(ignore: boolean): void {
  try {
    localStorage.setItem(ADMIN_IGNORE_KEY, ignore ? 'true' : 'false');
  } catch {}
}

/**
 * Detects visitor device type
 */
function getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Formats date into YYYY-MM-DD format (local timezone)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats referrer into friendly human label
 */
function formatReferrer(raw: string): string {
  if (!raw) return 'Прямой заход';
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host.includes('instagram')) return 'Instagram';
    if (host.includes('wa.me') || host.includes('whatsapp')) return 'WhatsApp';
    if (host.includes('2gis')) return '2ГИС';
    if (host.includes('google')) return 'Google';
    if (host.includes('yandex')) return 'Яндекс';
    if (host.includes('telegram') || host.includes('t.me')) return 'Telegram';
    return host.replace(/^www\./, '');
  } catch {
    return 'Внешняя ссылка';
  }
}

/**
 * Records a client visit / page view in Local Cache + Cloud Relay + Server API + Firestore
 */
export async function trackVisit(options: {
  page?: string;
  lang?: string;
  isInitialLoad?: boolean;
}): Promise<void> {
  if (isIgnoreAdminVisits()) {
    return;
  }

  const today = getTodayDateString();
  const visitorId = getVisitorId();
  const device = getDeviceType();
  const lang = options.lang === 'kz' ? 'kz' : 'ru';
  const page = options.page || 'Главная';

  let isNewVisitorToday = false;
  try {
    const lastVisitDate = localStorage.getItem(LAST_VISITED_DATE_KEY);
    if (lastVisitDate !== today) {
      isNewVisitorToday = true;
      localStorage.setItem(LAST_VISITED_DATE_KEY, today);
    }
  } catch {
    isNewVisitorToday = true;
  }

  let isNewSession = false;
  try {
    const hasSession = sessionStorage.getItem(SESSION_ACTIVE_KEY);
    if (!hasSession || options.isInitialLoad) {
      isNewSession = true;
      sessionStorage.setItem(SESSION_ACTIVE_KEY, 'active_' + Date.now());
    }
  } catch {
    isNewSession = true;
  }

  const nowIso = new Date().toISOString();
  const referrer =
    typeof document !== 'undefined' ? formatReferrer(document.referrer) : 'Прямой заход';

  const visitItem: VisitLogItem = {
    id: 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
    visitorId: visitorId.slice(-6),
    timestamp: nowIso,
    device,
    lang,
    page,
    referrer,
    isNewVisitor: isNewVisitorToday,
  };

  // 1. Pull latest remote state first so we increment on top of accurate global counts
  await Promise.all([
    pullAnalyticsFromCloudRelay().catch(() => null),
    pullAnalyticsFromServer().catch(() => null),
  ]);

  const current = getLocalAnalyticsState();
  const prevDay = current.days[today] || {
    date: today,
    totalVisits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    mobileVisits: 0,
    desktopVisits: 0,
    ruVisits: 0,
    kzVisits: 0,
    productViews: {},
    updatedAt: nowIso,
    resetToken: 0,
  };

  // If this browser already visited today, but the admin reset today's counter to 0, count this as a fresh visit
  const effectiveNewVisitor = isNewVisitorToday || prevDay.uniqueVisitors === 0;
  const effectiveNewSession = isNewSession || prevDay.totalVisits === 0;

  const updatedState: PersistedAnalyticsState = {
    overview: {
      totalVisits: (Number(current.overview.totalVisits) || 0) + (effectiveNewSession ? 1 : 0),
      uniqueVisitors: (Number(current.overview.uniqueVisitors) || 0) + (effectiveNewVisitor ? 1 : 0),
      pageViews: (Number(current.overview.pageViews) || 0) + 1,
      lastVisitAt: nowIso,
    },
    days: {
      ...current.days,
      [today]: {
        ...prevDay,
        date: today,
        totalVisits: (Number(prevDay.totalVisits) || 0) + (effectiveNewSession ? 1 : 0),
        uniqueVisitors: (Number(prevDay.uniqueVisitors) || 0) + (effectiveNewVisitor ? 1 : 0),
        pageViews: (Number(prevDay.pageViews) || 0) + 1,
        mobileVisits: (Number(prevDay.mobileVisits) || 0) + (device === 'mobile' ? 1 : 0),
        desktopVisits: (Number(prevDay.desktopVisits) || 0) + (device !== 'mobile' ? 1 : 0),
        ruVisits: (Number(prevDay.ruVisits) || 0) + (lang === 'ru' ? 1 : 0),
        kzVisits: (Number(prevDay.kzVisits) || 0) + (lang === 'kz' ? 1 : 0),
        updatedAt: nowIso,
      },
    },
    recentVisits: [visitItem, ...(current.recentVisits || [])].slice(0, 30),
    updatedAt: nowIso,
  };

  saveLocalAnalyticsState(updatedState);

  // 2. Sync to Cloud Relay, Server API, and Firestore in parallel
  await Promise.all([
    pushAnalyticsToCloudRelay(updatedState),
    pushAnalyticsToServer(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await setDoc(
          docRef,
          {
            overview: {
              totalVisits: increment(effectiveNewSession ? 1 : 0),
              uniqueVisitors: increment(effectiveNewVisitor ? 1 : 0),
              pageViews: increment(1),
              lastVisitAt: nowIso,
            },
            days: {
              [today]: updatedState.days[today],
            },
            recentVisits: updatedState.recentVisits.slice(0, 25),
          },
          { merge: true }
        );
      } catch {}
    })(),
  ]);
}

/**
 * Tracks product detail view across Local Cache, Cloud Relay, Server API, and Firestore
 */
export async function trackProductView(productId: string, productTitle: string): Promise<void> {
  if (isIgnoreAdminVisits()) return;

  const today = getTodayDateString();
  const nowIso = new Date().toISOString();

  await Promise.all([
    pullAnalyticsFromCloudRelay().catch(() => null),
    pullAnalyticsFromServer().catch(() => null),
  ]);

  const current = getLocalAnalyticsState();
  const prevDay = current.days[today] || {
    date: today,
    totalVisits: 1,
    uniqueVisitors: 1,
    pageViews: 0,
    mobileVisits: getDeviceType() === 'mobile' ? 1 : 0,
    desktopVisits: getDeviceType() !== 'mobile' ? 1 : 0,
    ruVisits: 1,
    kzVisits: 0,
    productViews: {},
    updatedAt: nowIso,
    resetToken: 0,
  };

  const prevProdViews = prevDay.productViews || {};
  const prevItem = prevProdViews[productId] || { title: productTitle, count: 0 };

  const updatedProductViews = {
    ...prevProdViews,
    [productId]: {
      title: productTitle || prevItem.title,
      count: (Number(prevItem.count) || 0) + 1,
    },
  };

  const updatedState: PersistedAnalyticsState = {
    ...current,
    overview: {
      ...current.overview,
      pageViews: (Number(current.overview.pageViews) || 0) + 1,
      lastVisitAt: nowIso,
    },
    days: {
      ...current.days,
      [today]: {
        ...prevDay,
        pageViews: (Number(prevDay.pageViews) || 0) + 1,
        productViews: updatedProductViews,
        updatedAt: nowIso,
      },
    },
    updatedAt: nowIso,
  };

  saveLocalAnalyticsState(updatedState);

  await Promise.all([
    pushAnalyticsToCloudRelay(updatedState),
    pushAnalyticsToServer(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await setDoc(
          docRef,
          {
            overview: {
              pageViews: increment(1),
              lastVisitAt: nowIso,
            },
            days: {
              [today]: {
                date: today,
                pageViews: updatedState.days[today].pageViews,
                productViews: updatedProductViews,
                updatedAt: nowIso,
              },
            },
          },
          { merge: true }
        );
      } catch {}
    })(),
  ]);
}

/**
 * Generates an instant test visit so the store owner can verify tracking in real-time.
 */
export async function recordTestVisit(): Promise<{ success: boolean; ignored: boolean }> {
  if (isIgnoreAdminVisits()) {
    return { success: false, ignored: true };
  }

  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  const device = getDeviceType();

  const testVisit: VisitLogItem = {
    id: 'v_test_' + Date.now().toString(36),
    visitorId: 'owner',
    timestamp: nowIso,
    device,
    lang: 'ru',
    page: 'Тестовый визит',
    referrer: 'Тест счетчика в админке',
    isNewVisitor: true,
  };

  await syncAnalyticsEverywhere().catch(() => {});
  const current = getLocalAnalyticsState();
  const prevDay = current.days[today] || {
    date: today,
    totalVisits: 0,
    uniqueVisitors: 0,
    pageViews: 0,
    mobileVisits: 0,
    desktopVisits: 0,
    ruVisits: 0,
    kzVisits: 0,
    productViews: {},
    updatedAt: nowIso,
    resetToken: 0,
  };

  const updatedState: PersistedAnalyticsState = {
    overview: {
      totalVisits: (Number(current.overview.totalVisits) || 0) + 1,
      uniqueVisitors: (Number(current.overview.uniqueVisitors) || 0) + 1,
      pageViews: (Number(current.overview.pageViews) || 0) + 1,
      lastVisitAt: nowIso,
    },
    days: {
      ...current.days,
      [today]: {
        ...prevDay,
        date: today,
        totalVisits: (Number(prevDay.totalVisits) || 0) + 1,
        uniqueVisitors: (Number(prevDay.uniqueVisitors) || 0) + 1,
        pageViews: (Number(prevDay.pageViews) || 0) + 1,
        mobileVisits: (Number(prevDay.mobileVisits) || 0) + (device === 'mobile' ? 1 : 0),
        desktopVisits: (Number(prevDay.desktopVisits) || 0) + (device !== 'mobile' ? 1 : 0),
        ruVisits: (Number(prevDay.ruVisits) || 0) + 1,
        updatedAt: nowIso,
      },
    },
    recentVisits: [testVisit, ...(current.recentVisits || [])].slice(0, 30),
    updatedAt: nowIso,
  };

  saveLocalAnalyticsState(updatedState);

  await Promise.all([
    pushAnalyticsToCloudRelay(updatedState),
    pushAnalyticsToServer(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await setDoc(
          docRef,
          {
            overview: updatedState.overview,
            days: {
              [today]: updatedState.days[today],
            },
            recentVisits: updatedState.recentVisits.slice(0, 25),
          },
          { merge: true }
        );
      } catch {}
    })(),
  ]);

  return { success: true, ignored: false };
}

/**
 * Resets today's visitor analytics so accidental test visits do not distort real statistics.
 */
export async function resetTodayAnalytics(): Promise<void> {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  const resetToken = Date.now();

  try {
    localStorage.setItem('muslim_shop_analytics_reset_today', today);
    localStorage.removeItem(LAST_VISITED_DATE_KEY);
    sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  } catch {}

  const current = getLocalAnalyticsState();
  const todayOld = current.days[today];
  const oldVisits = Number(todayOld?.totalVisits) || 0;
  const oldUniques = Number(todayOld?.uniqueVisitors) || 0;
  const oldViews = Number(todayOld?.pageViews) || 0;

  const updatedState: PersistedAnalyticsState = {
    overview: {
      totalVisits: Math.max(0, (Number(current.overview.totalVisits) || 0) - oldVisits),
      uniqueVisitors: Math.max(0, (Number(current.overview.uniqueVisitors) || 0) - oldUniques),
      pageViews: Math.max(0, (Number(current.overview.pageViews) || 0) - oldViews),
      lastVisitAt: current.overview.lastVisitAt,
    },
    days: {
      ...current.days,
      [today]: {
        date: today,
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        mobileVisits: 0,
        desktopVisits: 0,
        ruVisits: 0,
        kzVisits: 0,
        productViews: {},
        updatedAt: nowIso,
        resetToken,
      },
    },
    recentVisits: (current.recentVisits || []).filter(
      (v) => !v.timestamp || !v.timestamp.startsWith(today)
    ),
    updatedAt: nowIso,
  };

  saveLocalAnalyticsState(updatedState);

  await Promise.all([
    pushAnalyticsToCloudRelay(updatedState),
    pushAnalyticsToServer(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await setDoc(
          docRef,
          {
            overview: updatedState.overview,
            days: {
              [today]: updatedState.days[today],
            },
            recentVisits: updatedState.recentVisits,
          },
          { merge: true }
        );
      } catch {}
    })(),
  ]);
}

/**
 * Real-time subscription to analytics stats with automatic Cloud Relay + Server + Firestore sync
 */
export function subscribeToAnalytics(
  callback: (data: {
    overview: AnalyticsOverview;
    dailyData: DailyAnalytics[];
    recentVisits: VisitLogItem[];
  }) => void
): () => void {
  analyticsListeners.add(callback);

  // 1. Immediately emit cached state (0ms)
  const initial = getLocalAnalyticsState();
  callback(formatStateForUI(initial));

  // 2. Immediately pull latest cross-browser analytics from Cloud Relay & Server API
  syncAnalyticsEverywhere().catch(() => {});

  // 3. Poll Cloud Relay & Server API every 6 seconds while Admin Analytics tab is open
  const pollTimer = setInterval(() => {
    syncAnalyticsEverywhere().catch(() => {});
  }, 6000);

  // 4. Also subscribe to Firestore onSnapshot when quota is available
  let unsubscribeFirestore = () => {};
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
    unsubscribeFirestore = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const raw = snapshot.data() as any;
          const merged = mergeAnalyticsStates(getLocalAnalyticsState(), {
            overview: raw.overview,
            days: raw.days,
            recentVisits: raw.recentVisits,
          });
          saveLocalAnalyticsState(merged);
        }
      },
      () => {
        // Fallback to Cloud Relay & Server API silently when Firestore read quota is reached
      }
    );
  } catch {}

  return () => {
    analyticsListeners.delete(callback);
    clearInterval(pollTimer);
    unsubscribeFirestore();
  };
}

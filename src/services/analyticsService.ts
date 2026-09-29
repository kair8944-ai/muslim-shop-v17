import {
  doc,
  setDoc,
  increment,
  arrayUnion,
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
const ANALYTICS_LOCAL_CACHE_KEY = 'muslim_shop_analytics_cache_v5';
const LEGACY_ANALYTICS_CACHE_KEY = 'muslim_shop_analytics_cache_v4';

// CORS-enabled Cloud Relay for cross-browser & cross-device analytics (works on muslimshop.kz and when Firestore read quota is reached)
const CLOUD_RELAY_APP_KEY = 'hbqgqy42';
const CLOUD_RELAY_ANALYTICS_PREFIX = 'ms_a5_';
const CLOUD_RELAY_ANALYTICS_PTR_KEY = 'ms_a6_ptr';
const CLOUD_BLOB_POST_URL = 'https://bytebin.lucko.me/post';
const CLOUD_BLOB_GET_BASE = 'https://bytebin.lucko.me/';

function withFirestoreTimeout<T>(promise: Promise<T>, timeoutMs = 2000): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

/**
 * Converts an ISO timestamp or date string into a local YYYY-MM-DD key
 */
function toLocalDateString(isoOrDate?: string): string {
  if (!isoOrDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return String(isoOrDate).slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
      visitIds?: string[];
      visitorIds?: string[];
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
    const raw =
      localStorage.getItem(ANALYTICS_LOCAL_CACHE_KEY) ||
      localStorage.getItem(LEGACY_ANALYTICS_CACHE_KEY);
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
  const daysRaw = { ...(state.days || {}) };
  const allRecentVisits = Array.isArray(state.recentVisits) ? state.recentVisits : [];

  // Ensure every date that has visits in recentVisits exists in daysRaw
  for (const v of allRecentVisits) {
    if (!v || !v.timestamp) continue;
    const vDayKey = toLocalDateString(v.timestamp);
    if (vDayKey && !daysRaw[vDayKey]) {
      daysRaw[vDayKey] = {
        date: vDayKey,
        totalVisits: 0,
        uniqueVisitors: 0,
        pageViews: 0,
        mobileVisits: 0,
        desktopVisits: 0,
        ruVisits: 0,
        kzVisits: 0,
        productViews: {},
        visitIds: [],
        visitorIds: [],
        updatedAt: v.timestamp,
        resetToken: 0,
      };
    }
  }

  const dailyList: DailyAnalytics[] = Object.keys(daysRaw).map((dKey) => {
    const item = daysRaw[dKey] || ({} as any);
    const resetToken = Number(item.resetToken) || 0;

    // Filter recentVisits belonging to this local day (after any resetToken)
    const dayLiveVisits = allRecentVisits.filter((v) => {
      if (!v || toLocalDateString(v.timestamp) !== dKey) return false;
      if (resetToken > 0 && v.timestamp) {
        const vMs = new Date(v.timestamp).getTime();
        if (!isNaN(vMs) && vMs < resetToken) return false;
      }
      return true;
    });

    const knownVisitIds = new Set<string>(Array.isArray(item.visitIds) ? item.visitIds : []);
    const knownVisitorIds = new Set<string>(Array.isArray(item.visitorIds) ? item.visitorIds : []);

    let liveUnrecordedVisits = 0;
    let liveUnrecordedVisitors = 0;

    for (const v of dayLiveVisits) {
      if (v.id && !knownVisitIds.has(v.id)) {
        knownVisitIds.add(v.id);
        liveUnrecordedVisits++;
      }
      if (v.visitorId && !knownVisitorIds.has(v.visitorId)) {
        knownVisitorIds.add(v.visitorId);
        liveUnrecordedVisitors++;
      }
    }

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

    const sumProdViews = Object.values(productViews).reduce(
      (acc, p) => acc + (Number(p?.count) || 0),
      0
    );

    const resolvedTotalVisits = Math.max(
      (Number(item.totalVisits) || 0) + liveUnrecordedVisits,
      knownVisitIds.size,
      dayLiveVisits.length
    );
    const resolvedUniqueVisitors = Math.min(
      resolvedTotalVisits,
      Math.max(
        (Number(item.uniqueVisitors) || 0) + liveUnrecordedVisitors,
        knownVisitorIds.size,
        new Set(dayLiveVisits.map((v) => v.visitorId).filter(Boolean)).size
      )
    );
    const resolvedPageViews = Math.max(
      (Number(item.pageViews) || 0) + liveUnrecordedVisits,
      resolvedTotalVisits + sumProdViews
    );

    return {
      id: dKey,
      date: item.date || dKey,
      totalVisits: resolvedTotalVisits,
      uniqueVisitors: resolvedUniqueVisitors,
      pageViews: resolvedPageViews,
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

  const sortedVisits = [...allRecentVisits].sort((a, b) =>
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

  const localRecent = Array.isArray(local.recentVisits) ? local.recentVisits : [];
  const remoteRecent = Array.isArray(remote.recentVisits) ? remote.recentVisits : [];

  const allDayKeys = new Set<string>([
    ...Object.keys(mergedDays),
    ...Object.keys(remoteDays),
    ...localRecent.map((v) => toLocalDateString(v?.timestamp)).filter(Boolean),
    ...remoteRecent.map((v) => toLocalDateString(v?.timestamp)).filter(Boolean),
  ]);

  for (const dateKey of allDayKeys) {
    if (!dateKey) continue;
    const lDay = mergedDays[dateKey];
    const rDay = remoteDays[dateKey];

    const lReset = Number(lDay?.resetToken) || 0;
    const rReset = Number(rDay?.resetToken) || 0;
    const effectiveReset = Math.max(lReset, rReset);

    // If remote explicitly triggered a fresh reset (0 visits with newer resetToken), honor it
    if (rDay && rReset > lReset && Number(rDay.totalVisits) === 0 && (rDay.visitIds || []).length === 0) {
      mergedDays[dateKey] = {
        ...rDay,
        date: rDay.date || dateKey,
        productViews: { ...(rDay.productViews || {}) },
        visitIds: [],
        visitorIds: [],
        resetToken: rReset,
      };
      continue;
    }

    const localDayVisits = localRecent.filter((v) => {
      if (!v || toLocalDateString(v.timestamp) !== dateKey) return false;
      if (effectiveReset > 0 && v.timestamp) {
        const vMs = new Date(v.timestamp).getTime();
        if (!isNaN(vMs) && vMs < effectiveReset) return false;
      }
      return true;
    });

    const remoteDayVisits = remoteRecent.filter((v) => {
      if (!v || toLocalDateString(v.timestamp) !== dateKey) return false;
      if (effectiveReset > 0 && v.timestamp) {
        const vMs = new Date(v.timestamp).getTime();
        if (!isNaN(vMs) && vMs < effectiveReset) return false;
      }
      return true;
    });

    if (!lDay && rDay) {
      const visitIds = Array.from(
        new Set([
          ...(Array.isArray(rDay.visitIds) ? rDay.visitIds : []),
          ...remoteDayVisits.map((v) => v.id).filter(Boolean),
        ])
      ).slice(-250);
      const visitorIds = Array.from(
        new Set([
          ...(Array.isArray(rDay.visitorIds) ? rDay.visitorIds : []),
          ...remoteDayVisits.map((v) => v.visitorId).filter(Boolean),
        ])
      ).slice(-250);

      // Recover dotted productViews if any
      const rProdViews: Record<string, { title: string; count: number }> = {
        ...(rDay.productViews || {}),
      };
      for (const [k, v] of Object.entries(rDay)) {
        if (k.startsWith('productViews.')) {
          const parts = k.split('.');
          const prodId = parts[1];
          const field = parts[2];
          if (prodId && field) {
            if (!rProdViews[prodId]) rProdViews[prodId] = { title: 'Товар', count: 0 };
            if (field === 'title' && typeof v === 'string') rProdViews[prodId].title = v;
            else if (field === 'count' && typeof v === 'number') {
              rProdViews[prodId].count = Math.max(rProdViews[prodId].count, v);
            }
          }
        }
      }

      const totalVisits = Math.max(Number(rDay.totalVisits) || 0, visitIds.length);
      const uniqueVisitors = Math.min(
        totalVisits,
        Math.max(Number(rDay.uniqueVisitors) || 0, visitorIds.length)
      );

      mergedDays[dateKey] = {
        date: rDay.date || dateKey,
        totalVisits,
        uniqueVisitors,
        pageViews: Math.max(Number(rDay.pageViews) || 0, totalVisits),
        mobileVisits: Number(rDay.mobileVisits) || 0,
        desktopVisits: Number(rDay.desktopVisits) || 0,
        ruVisits: Number(rDay.ruVisits) || 0,
        kzVisits: Number(rDay.kzVisits) || 0,
        productViews: rProdViews,
        visitIds,
        visitorIds,
        updatedAt: rDay.updatedAt || new Date().toISOString(),
        resetToken: effectiveReset,
      };
      continue;
    }

    if (!lDay && !rDay) {
      if (localDayVisits.length === 0 && remoteDayVisits.length === 0) continue;
      const allDayV = [...localDayVisits, ...remoteDayVisits];
      const visitIds = Array.from(new Set(allDayV.map((v) => v.id).filter(Boolean)));
      const visitorIds = Array.from(new Set(allDayV.map((v) => v.visitorId).filter(Boolean)));
      mergedDays[dateKey] = {
        date: dateKey,
        totalVisits: visitIds.length,
        uniqueVisitors: Math.min(visitIds.length, visitorIds.length),
        pageViews: visitIds.length,
        mobileVisits: allDayV.filter((v) => v.device === 'mobile').length,
        desktopVisits: allDayV.filter((v) => v.device !== 'mobile').length,
        ruVisits: allDayV.filter((v) => v.lang !== 'kz').length,
        kzVisits: allDayV.filter((v) => v.lang === 'kz').length,
        productViews: {},
        visitIds,
        visitorIds,
        updatedAt: new Date().toISOString(),
        resetToken: effectiveReset,
      };
      continue;
    }

    const safeL = lDay!;
    const safeR = rDay || ({} as any);

    // If local was reset more recently than remote's updatedAt, do not trust remote's old scalar counters,
    // only merge remote's post-reset visits from remoteDayVisits!
    const rUpdatedMs = safeR.updatedAt ? new Date(safeR.updatedAt).getTime() : 0;
    const isRemoteOlderThanLocalReset = lReset > rReset && (rUpdatedMs === 0 || rUpdatedMs < lReset);

    // Merge productViews by taking max count per product
    const mergedProdViews: Record<string, { title: string; count: number }> = {
      ...(safeL.productViews || {}),
    };
    if (!isRemoteOlderThanLocalReset && safeR.productViews && typeof safeR.productViews === 'object') {
      for (const [pid, pInfo] of Object.entries(safeR.productViews as Record<string, any>)) {
        if (!pInfo) continue;
        const existing = mergedProdViews[pid];
        mergedProdViews[pid] = {
          title: pInfo.title || existing?.title || 'Товар',
          count: Math.max(Number(existing?.count) || 0, Number(pInfo.count) || 0),
        };
      }
    }

    const knownLocalVisitSet = new Set<string>([
      ...(Array.isArray(safeL.visitIds) ? safeL.visitIds : []),
      ...localDayVisits.map((v) => v.id).filter(Boolean),
    ]);
    const incomingRemoteVisitSet = new Set<string>([
      ...(!isRemoteOlderThanLocalReset && Array.isArray(safeR.visitIds) ? safeR.visitIds : []),
      ...remoteDayVisits.map((v) => v.id).filter(Boolean),
    ]);

    let newRemoteVisitsDelta = 0;
    let newRemoteMobileDelta = 0;
    let newRemoteDesktopDelta = 0;
    for (const vid of incomingRemoteVisitSet) {
      if (vid && !knownLocalVisitSet.has(vid)) {
        newRemoteVisitsDelta++;
        const vObj = remoteDayVisits.find((v) => v.id === vid);
        if (vObj) {
          if (vObj.device === 'mobile') newRemoteMobileDelta++;
          else newRemoteDesktopDelta++;
        }
      }
    }

    const knownLocalVisitorSet = new Set<string>([
      ...(Array.isArray(safeL.visitorIds) ? safeL.visitorIds : []),
      ...localDayVisits.map((v) => v.visitorId).filter(Boolean),
    ]);
    const incomingRemoteVisitorSet = new Set<string>([
      ...(!isRemoteOlderThanLocalReset && Array.isArray(safeR.visitorIds) ? safeR.visitorIds : []),
      ...remoteDayVisits.map((v) => v.visitorId).filter(Boolean),
    ]);

    let newRemoteUniquesDelta = 0;
    for (const uId of incomingRemoteVisitorSet) {
      if (uId && !knownLocalVisitorSet.has(uId)) {
        newRemoteUniquesDelta++;
      }
    }

    const mergedVisitIds = Array.from(
      new Set([...Array.from(knownLocalVisitSet), ...Array.from(incomingRemoteVisitSet)])
    ).slice(-250);
    const mergedVisitorIds = Array.from(
      new Set([...Array.from(knownLocalVisitorSet), ...Array.from(incomingRemoteVisitorSet)])
    ).slice(-250);

    const remoteScalarTotalVisits = isRemoteOlderThanLocalReset ? 0 : Number(safeR.totalVisits) || 0;
    const remoteScalarUniques = isRemoteOlderThanLocalReset ? 0 : Number(safeR.uniqueVisitors) || 0;
    const remoteScalarPageViews = isRemoteOlderThanLocalReset ? 0 : Number(safeR.pageViews) || 0;

    const nextTotalVisits = Math.max(
      (Number(safeL.totalVisits) || 0) + newRemoteVisitsDelta,
      remoteScalarTotalVisits,
      mergedVisitIds.length
    );
    const nextUniqueVisitors = Math.min(
      nextTotalVisits,
      Math.max(
        (Number(safeL.uniqueVisitors) || 0) + newRemoteUniquesDelta,
        remoteScalarUniques,
        mergedVisitorIds.length
      )
    );
    const sumProdViews = Object.values(mergedProdViews).reduce(
      (acc, p) => acc + (Number(p.count) || 0),
      0
    );
    const nextPageViews = Math.max(
      (Number(safeL.pageViews) || 0) + newRemoteVisitsDelta,
      remoteScalarPageViews,
      nextTotalVisits + sumProdViews
    );

    mergedDays[dateKey] = {
      date: dateKey,
      totalVisits: nextTotalVisits,
      uniqueVisitors: nextUniqueVisitors,
      pageViews: nextPageViews,
      mobileVisits: Math.max(
        (Number(safeL.mobileVisits) || 0) + newRemoteMobileDelta,
        isRemoteOlderThanLocalReset ? 0 : Number(safeR.mobileVisits) || 0
      ),
      desktopVisits: Math.max(
        (Number(safeL.desktopVisits) || 0) + newRemoteDesktopDelta,
        isRemoteOlderThanLocalReset ? 0 : Number(safeR.desktopVisits) || 0
      ),
      ruVisits: Math.max(
        (Number(safeL.ruVisits) || 0) + newRemoteVisitsDelta,
        isRemoteOlderThanLocalReset ? 0 : Number(safeR.ruVisits) || 0
      ),
      kzVisits: Math.max(
        Number(safeL.kzVisits) || 0,
        isRemoteOlderThanLocalReset ? 0 : Number(safeR.kzVisits) || 0
      ),
      productViews: mergedProdViews,
      visitIds: mergedVisitIds,
      visitorIds: mergedVisitorIds,
      updatedAt:
        (safeR.updatedAt || '') > (safeL.updatedAt || '')
          ? safeR.updatedAt
          : safeL.updatedAt || new Date().toISOString(),
      resetToken: effectiveReset,
    };
  }

  // Deduplicate recentVisits by id and filter out visits from a day that was reset after the visit timestamp
  const visitMap = new Map<string, VisitLogItem>();
  for (const v of [...localRecent, ...remoteRecent]) {
    if (!v || !v.id) continue;
    const visitDate = toLocalDateString(v.timestamp);
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
    .slice(0, 35);

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
      { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(2500) }
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
  // 1. Primary: Atomic CORS Blob pointer (`ms_a6_ptr`) — zero chunk race conditions!
  try {
    const ptrRes = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PTR_KEY}`,
      { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(2500) }
    );
    if (ptrRes.ok) {
      const ptrKey = (await ptrRes.text()).replace(/^"|"$/g, '').trim();
      if (ptrKey && ptrKey.length >= 5 && ptrKey.length <= 40) {
        const blobRes = await fetch(`${CLOUD_BLOB_GET_BASE}${ptrKey}`, {
          method: 'GET',
          cache: 'no-store',
          signal: AbortSignal.timeout(2500),
        });
        if (blobRes.ok) {
          const parsed = await blobRes.json();
          if (parsed && typeof parsed === 'object') {
            const merged = mergeAnalyticsStates(getLocalAnalyticsState(), parsed);
            saveLocalAnalyticsState(merged);
            return merged;
          }
        }
      }
    }
  } catch {}

  // 2. Fallback: Legacy chunked relay (`ms_a5_`)
  try {
    const lenRes = await fetch(
      `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PREFIX}len`,
      { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(2000) }
    );
    if (!lenRes.ok) return null;
    const lenNum = parseInt((await lenRes.text()).replace(/^"|"$/g, '').trim(), 10);
    if (!lenNum || isNaN(lenNum) || lenNum <= 0 || lenNum > 25) return null;

    const parts = await Promise.all(
      Array.from({ length: lenNum }, (_, idx) =>
        fetch(
          `https://keyvalue.immanuel.co/api/KeyVal/GetValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PREFIX}c${idx}`,
          { method: 'GET', cache: 'no-store', signal: AbortSignal.timeout(2000) }
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
    const sortedDayKeys = Object.keys(state.days || {}).sort().slice(-14);
    const compactDays: PersistedAnalyticsState['days'] = {};
    for (const k of sortedDayKeys) {
      compactDays[k] = state.days[k];
    }
    const fullState: PersistedAnalyticsState = {
      overview: state.overview,
      days: compactDays,
      recentVisits: (state.recentVisits || []).slice(0, 30),
      updatedAt: state.updatedAt,
    };

    // 1. Atomic upload to CORS Blob (Simple request without Content-Type preflight) + update pointer key
    const uploadBlobPromise = (async () => {
      try {
        const postRes = await fetch(CLOUD_BLOB_POST_URL, {
          method: 'POST',
          body: JSON.stringify(fullState),
        });
        if (postRes.ok) {
          const postData = await postRes.json();
          if (postData && postData.key) {
            await fetch(
              `https://keyvalue.immanuel.co/api/KeyVal/UpdateValue/${CLOUD_RELAY_APP_KEY}/${CLOUD_RELAY_ANALYTICS_PTR_KEY}/${String(postData.key).trim()}`,
              { method: 'POST' }
            );
          }
        }
      } catch {}
    })();

    // 2. Secondary ultra-compact chunk backup (last 2 days, slimmed arrays so it ALWAYS fits in <= 12 chunks)
    const uploadChunksPromise = (async () => {
      try {
        const recent2Keys = Object.keys(state.days || {}).sort().slice(-2);
        const miniDays: PersistedAnalyticsState['days'] = {};
        for (const k of recent2Keys) {
          const d = state.days[k];
          if (!d) continue;
          miniDays[k] = {
            date: d.date || k,
            totalVisits: d.totalVisits,
            uniqueVisitors: d.uniqueVisitors,
            pageViews: d.pageViews,
            mobileVisits: d.mobileVisits,
            desktopVisits: d.desktopVisits,
            ruVisits: d.ruVisits,
            kzVisits: d.kzVisits,
            visitIds: (d.visitIds || []).slice(-15),
            visitorIds: (d.visitorIds || []).slice(-15),
            updatedAt: d.updatedAt,
            resetToken: d.resetToken || 0,
          };
        }
        const compactState: PersistedAnalyticsState = {
          overview: state.overview,
          days: miniDays,
          recentVisits: (state.recentVisits || []).slice(0, 5),
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
        if (chunks.length > 0 && chunks.length <= 25) {
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
    })();

    await Promise.all([uploadBlobPromise, uploadChunksPromise]);
  } catch {}
}

async function pullAnalyticsFromServer(): Promise<PersistedAnalyticsState | null> {
  if (isStaticGitHubPagesHost()) return null;
  try {
    const res = await fetch('/api/analytics', {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });
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
    const res = await fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analytics: state }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.analytics) {
        const merged = mergeAnalyticsStates(getLocalAnalyticsState(), data.analytics);
        saveLocalAnalyticsState(merged);
      }
    }
  } catch {}
}

async function pushAnalyticsEventToServer(payload: Record<string, any>): Promise<void> {
  if (isStaticGitHubPagesHost()) return;
  try {
    const res = await fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.analytics) {
        const merged = mergeAnalyticsStates(getLocalAnalyticsState(), data.analytics);
        saveLocalAnalyticsState(merged);
      }
    }
  } catch {}
}

/**
 * Pulls latest remote state from Firestore REST + Cloud Relay + Server, merges with local state, and saves.
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
  const shortVisitorId = visitorId.slice(-6);
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
    visitorId: shortVisitorId,
    timestamp: nowIso,
    device,
    lang,
    page,
    referrer,
    isNewVisitor: isNewVisitorToday,
  };

  // 1. Pull latest remote state from ALL 3 sources (Firestore REST + Server + Cloud Relay) with fast timeout
  await withFirestoreTimeout(
    Promise.all([
      pullAnalyticsFromFirestoreRest().catch(() => null),
      pullAnalyticsFromServer().catch(() => null),
      pullAnalyticsFromCloudRelay().catch(() => null),
    ]),
    1800
  );

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
    visitIds: [],
    visitorIds: [],
    updatedAt: nowIso,
    resetToken: 0,
  };

  const existingVisitorIds = new Set<string>(prevDay.visitorIds || []);
  const existingVisitIds = new Set<string>(prevDay.visitIds || []);

  // Every page entry counts as a real visit (`effectiveNewSession = true`),
  // and if this visitorId hasn't been recorded in today's visitorIds (or was reset), count as unique visitor!
  const effectiveNewVisitor =
    isNewVisitorToday || !existingVisitorIds.has(shortVisitorId) || prevDay.uniqueVisitors === 0;
  const effectiveNewSession =
    isNewSession || !existingVisitIds.has(visitItem.id) || prevDay.totalVisits === 0;

  existingVisitIds.add(visitItem.id);
  existingVisitorIds.add(shortVisitorId);

  const nextVisitIds = Array.from(existingVisitIds).slice(-250);
  const nextVisitorIds = Array.from(existingVisitorIds).slice(-250);

  const nextTotalVisits = Math.max(
    (Number(prevDay.totalVisits) || 0) + (effectiveNewSession ? 1 : 0),
    nextVisitIds.length
  );
  const nextUniqueVisitors = Math.min(
    nextTotalVisits,
    Math.max(
      (Number(prevDay.uniqueVisitors) || 0) + (effectiveNewVisitor ? 1 : 0),
      nextVisitorIds.length
    )
  );

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
        totalVisits: nextTotalVisits,
        uniqueVisitors: nextUniqueVisitors,
        pageViews: Math.max((Number(prevDay.pageViews) || 0) + 1, nextTotalVisits),
        mobileVisits: (Number(prevDay.mobileVisits) || 0) + (device === 'mobile' ? 1 : 0),
        desktopVisits: (Number(prevDay.desktopVisits) || 0) + (device !== 'mobile' ? 1 : 0),
        ruVisits: (Number(prevDay.ruVisits) || 0) + (lang === 'ru' ? 1 : 0),
        kzVisits: (Number(prevDay.kzVisits) || 0) + (lang === 'kz' ? 1 : 0),
        visitIds: nextVisitIds,
        visitorIds: nextVisitorIds,
        updatedAt: nowIso,
      },
    },
    recentVisits: [visitItem, ...(current.recentVisits || [])].slice(0, 35),
    updatedAt: nowIso,
  };

  saveLocalAnalyticsState(updatedState);

  // 2. Sync atomically to Server Event API, Cloud Relay, and Firestore (using atomic increment & arrayUnion!)
  await Promise.all([
    pushAnalyticsEventToServer({
      type: 'visit',
      date: today,
      visitItem,
      visitorId: shortVisitorId,
      isNewVisitor: effectiveNewVisitor,
      isNewSession: effectiveNewSession,
      device,
      lang,
    }),
    pushAnalyticsToServer(updatedState),
    pushAnalyticsToCloudRelay(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await withFirestoreTimeout(
          setDoc(
            docRef,
            {
              overview: {
                totalVisits: increment(effectiveNewSession ? 1 : 0),
                uniqueVisitors: increment(effectiveNewVisitor ? 1 : 0),
                pageViews: increment(1),
                lastVisitAt: nowIso,
              },
              days: {
                [today]: {
                  date: today,
                  totalVisits: increment(effectiveNewSession ? 1 : 0),
                  uniqueVisitors: increment(effectiveNewVisitor ? 1 : 0),
                  pageViews: increment(1),
                  mobileVisits: increment(device === 'mobile' ? 1 : 0),
                  desktopVisits: increment(device !== 'mobile' ? 1 : 0),
                  ruVisits: increment(lang === 'ru' ? 1 : 0),
                  kzVisits: increment(lang === 'kz' ? 1 : 0),
                  visitIds: arrayUnion(visitItem.id),
                  visitorIds: arrayUnion(shortVisitorId),
                  updatedAt: nowIso,
                },
              },
              recentVisits: updatedState.recentVisits.slice(0, 25),
            },
            { merge: true }
          ),
          2500
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

  await withFirestoreTimeout(
    Promise.all([
      pullAnalyticsFromFirestoreRest().catch(() => null),
      pullAnalyticsFromServer().catch(() => null),
      pullAnalyticsFromCloudRelay().catch(() => null),
    ]),
    1500
  );

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
    visitIds: [],
    visitorIds: [],
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
    pushAnalyticsEventToServer({
      type: 'productView',
      date: today,
      productId,
      productTitle,
    }),
    pushAnalyticsToServer(updatedState),
    pushAnalyticsToCloudRelay(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await withFirestoreTimeout(
          setDoc(
            docRef,
            {
              overview: {
                pageViews: increment(1),
                lastVisitAt: nowIso,
              },
              days: {
                [today]: {
                  date: today,
                  pageViews: increment(1),
                  productViews: {
                    [productId]: {
                      title: productTitle || prevItem.title,
                      count: increment(1),
                    },
                  },
                  updatedAt: nowIso,
                },
              },
            },
            { merge: true }
          ),
          2500
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
    visitorId: 'owner_' + Date.now().toString(36).slice(-4),
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
    visitIds: [],
    visitorIds: [],
    updatedAt: nowIso,
    resetToken: 0,
  };

  const nextVisitIds = Array.from(new Set([...(prevDay.visitIds || []), testVisit.id])).slice(-250);
  const nextVisitorIds = Array.from(new Set([...(prevDay.visitorIds || []), testVisit.visitorId])).slice(-250);

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
        totalVisits: Math.max((Number(prevDay.totalVisits) || 0) + 1, nextVisitIds.length),
        uniqueVisitors: Math.max((Number(prevDay.uniqueVisitors) || 0) + 1, nextVisitorIds.length),
        pageViews: (Number(prevDay.pageViews) || 0) + 1,
        mobileVisits: (Number(prevDay.mobileVisits) || 0) + (device === 'mobile' ? 1 : 0),
        desktopVisits: (Number(prevDay.desktopVisits) || 0) + (device !== 'mobile' ? 1 : 0),
        ruVisits: (Number(prevDay.ruVisits) || 0) + 1,
        visitIds: nextVisitIds,
        visitorIds: nextVisitorIds,
        updatedAt: nowIso,
      },
    },
    recentVisits: [testVisit, ...(current.recentVisits || [])].slice(0, 35),
    updatedAt: nowIso,
  };

  saveLocalAnalyticsState(updatedState);

  await Promise.all([
    pushAnalyticsEventToServer({
      type: 'visit',
      date: today,
      visitItem: testVisit,
      visitorId: testVisit.visitorId,
      isNewVisitor: true,
      isNewSession: true,
      device,
      lang: 'ru',
    }),
    pushAnalyticsToCloudRelay(updatedState),
    pushAnalyticsToServer(updatedState),
    (async () => {
      try {
        const docRef = doc(db, SETTINGS_COLLECTION, ANALYTICS_DOC_ID);
        await withFirestoreTimeout(
          setDoc(
            docRef,
            {
              overview: {
                totalVisits: increment(1),
                uniqueVisitors: increment(1),
                pageViews: increment(1),
                lastVisitAt: nowIso,
              },
              days: {
                [today]: {
                  date: today,
                  totalVisits: increment(1),
                  uniqueVisitors: increment(1),
                  pageViews: increment(1),
                  mobileVisits: increment(device === 'mobile' ? 1 : 0),
                  desktopVisits: increment(device !== 'mobile' ? 1 : 0),
                  ruVisits: increment(1),
                  visitIds: arrayUnion(testVisit.id),
                  visitorIds: arrayUnion(testVisit.visitorId),
                  updatedAt: nowIso,
                },
              },
              recentVisits: updatedState.recentVisits.slice(0, 25),
            },
            { merge: true }
          ),
          2500
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
        visitIds: [],
        visitorIds: [],
        updatedAt: nowIso,
        resetToken,
      },
    },
    recentVisits: (current.recentVisits || []).filter(
      (v) => !v.timestamp || toLocalDateString(v.timestamp) !== today
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

  // 2. Immediately pull latest cross-browser analytics from Firestore REST, Cloud Relay & Server API
  syncAnalyticsEverywhere().catch(() => {});

  // 3. Poll every 4 seconds while Admin Analytics tab is open for near-instant updates
  const pollTimer = setInterval(() => {
    syncAnalyticsEverywhere().catch(() => {});
  }, 4000);

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

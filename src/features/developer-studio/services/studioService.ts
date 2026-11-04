import {
  CURRENT_SCHEMA_VERSION,
  DEFAULT_STUDIO_DESIGN_SYSTEM,
  StudioDraft,
  StudioPublishedConfig,
  StudioHistoryRecord,
  StudioNamedSnapshot,
  ElementModel,
  PageModel,
  createStudioId,
  validateDraftHierarchy,
  normalizeStudioDraftPageReferences,
  compareStudioSnapshots,
} from "../models/studio.types";

const DB_NAME = "developer-studio-independent-pro";
const STORE_NAME = "workspace";
const STORAGE_KEY = "developer-studio-independent-pro:v1";

type LocalState = {
  draft: StudioDraft;
  savedDraft: StudioDraft;
  publishedConfig: StudioPublishedConfig;
  history: StudioHistoryRecord[];
};
const now = () => new Date().toISOString();
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
let state: LocalState | null = null;
let hydration: Promise<void> | null = null;
let revisionCounter = 1;
const subscribers = new Set<(next: LocalState) => void>();
let writeQueue: Promise<void> = Promise.resolve();

function makeElement(
  id: string,
  pageId: string,
  type: ElementModel["type"],
  content: Record<string, any>,
  styles: Record<string, any>,
  order: number,
  parentId: string | null = null,
): ElementModel {
  return {
    id, pageId, parentId, type, content, styles,
    layout: { position: "static", order, visibility: true },
    attributes: { "data-studio-id": id },
    locked: false,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision: 1,
    updatedAt: now(),
    updatedBy: "local-user",
  };
}

function createDefaultDraft(): StudioDraft {
  const stamp = now();
  const pageId = "page_home";
  const page: PageModel = {
    id: pageId,
    route: "/",
    name: "لوحة التحكم",
    description: "مساحة التصميم الرئيسية للمشروع المستقل",
    visibleInNav: true,
    elementIds: [
      "elem_welcome",
      "elem_heading",
      "elem_container",
      "elem_sales",
      "elem_orders",
      "elem_customers",
      "elem_description",
      "elem_action",
    ],
    styles: { padding: "24px", gap: "16px" },
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision: 1,
    updatedAt: stamp,
    updatedBy: "local-user",
  };
  const elements: Record<string, ElementModel> = {
    elem_welcome: makeElement("elem_welcome", pageId, "card", {
      title: "مرحباً بك في Developer Studio Pro",
      subtitle: "مساحة تصميم مستقلة لبناء الواجهات وتخصيصها بدقة",
      description: "ابدأ بتحديد أي عنصر داخل المعاينة الحية، ثم عدّل المحتوى والألوان والأبعاد والاستجابة من لوحة الخصائص",
      showHeader: true,
    }, {
      backgroundColor: "#1c2d4c",
      textColor: "#ffffff",
      borderRadius: "20px",
      padding: "28px",
      marginBottom: "20px",
      boxShadow: "lg",
    }, 1),
    elem_heading: makeElement("elem_heading", pageId, "heading", {
      text: "نظرة عامة على المشروع",
      level: "h2",
    }, {
      textColor: "#182338",
      fontSize: "25px",
      fontWeight: "800",
      textAlign: "right",
      marginBottom: "14px",
    }, 2),
    elem_container: makeElement("elem_container", pageId, "container", {
      label: "بطاقات المؤشرات",
      direction: "row",
      wrap: true,
    }, {
      display: "flex",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: "14px",
      marginBottom: "18px",
    }, 3),
    elem_sales: makeElement("elem_sales", pageId, "card", {
      title: "إجمالي العمليات",
      subtitle: "1,248",
      description: "مؤشر توضيحي قابل للتعديل",
    }, {
      backgroundColor: "#ffffff",
      textColor: "#182338",
      borderColor: "#dce3ed",
      borderWidth: "1px",
      borderStyle: "solid",
      borderRadius: "16px",
      padding: "20px",
      width: "31%",
      minWidth: "175px",
      boxShadow: "sm",
    }, 1, "elem_container"),
    elem_orders: makeElement("elem_orders", pageId, "card", {
      title: "الطلبات النشطة",
      subtitle: "38",
      description: "مؤشر توضيحي قابل للتعديل",
    }, {
      backgroundColor: "#ffffff",
      textColor: "#182338",
      borderColor: "#dce3ed",
      borderWidth: "1px",
      borderStyle: "solid",
      borderRadius: "16px",
      padding: "20px",
      width: "31%",
      minWidth: "175px",
      boxShadow: "sm",
    }, 2, "elem_container"),
    elem_customers: makeElement("elem_customers", pageId, "card", {
      title: "العملاء",
      subtitle: "864",
      description: "مؤشر توضيحي قابل للتعديل",
    }, {
      backgroundColor: "#ffffff",
      textColor: "#182338",
      borderColor: "#dce3ed",
      borderWidth: "1px",
      borderStyle: "solid",
      borderRadius: "16px",
      padding: "20px",
      width: "31%",
      minWidth: "175px",
      boxShadow: "sm",
    }, 3, "elem_container"),
    elem_description: makeElement("elem_description", pageId, "text", {
      text: "هذه مساحة تجريبية مستقلة. التعديلات تحفظ داخل متصفحك، ويمكنك تصدير المشروع كملف JSON أو نشر نسخة محلية للمعاينة دون الاتصال بقاعدة بيانات Juba.",
    }, {
      textColor: "#64748b",
      fontSize: "14px",
      lineHeight: "1.8",
      textAlign: "right",
      marginTop: "12px",
      marginBottom: "16px",
    }, 4),
    elem_action: makeElement("elem_action", pageId, "button", {
      label: "ابدأ التخصيص",
      action: "alert",
      message: "تم إعداد مساحة العمل المستقلة.",
      variant: "default",
    }, {
      backgroundColor: "#4f46e5",
      textColor: "#ffffff",
      borderRadius: "10px",
      padding: "11px 20px",
      fontWeight: "700",
      fontSize: "14px",
    }, 5),
  };
  return {
    id: "developer-studio-independent-draft",
    owner: "local-user",
    baseRevision: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    pages: { [pageId]: page },
    elements,
    domEdits: {},
    designSystem: clone(DEFAULT_STUDIO_DESIGN_SYSTEM),
    assets: [],
    reusableComponents: [],
    namedSnapshots: [],
    createdAt: stamp,
    updatedAt: stamp,
    hasUnpublishedChanges: false,
    hasUnsavedLocalChanges: false,
  };
}

function createDefaultPublished(): StudioPublishedConfig {
  const draft = createDefaultDraft();
  return {
    id: "local-published",
    revision: 1,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    schema_version: CURRENT_SCHEMA_VERSION,
    pages: clone(draft.pages),
    elements: clone(draft.elements),
    domEdits: clone(draft.domEdits || {}),
    designSystem: clone(draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
    assets: clone(draft.assets || []),
    reusableComponents: clone(draft.reusableComponents || []),
    publishedBy: "local-user",
    publishedAt: draft.createdAt,
    summary: "إصدار البداية المحلي",
  };
}

function createInitialState(): LocalState {
  const draft = createDefaultDraft();
  const publishedConfig: StudioPublishedConfig = {
    ...createDefaultPublished(),
    pages: clone(draft.pages),
    elements: clone(draft.elements),
    domEdits: {},
    designSystem: clone(draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
    assets: [],
    reusableComponents: [],
  };
  return {
    draft: clone(draft),
    savedDraft: clone(draft),
    publishedConfig,
    history: [{
      revision: 1,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      publishedBy: "local-user",
      publishedAt: draft.createdAt,
      summary: "إصدار البداية المحلي",
      snapshot: {
        pages: clone(draft.pages),
        elements: clone(draft.elements),
        domEdits: {},
        designSystem: clone(draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
      },
    }],
  };
}

function readLocalCache(): LocalState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LocalState;
    if (!parsed?.draft?.pages || !parsed?.draft?.elements || !parsed?.publishedConfig) return null;
    return parsed;
  } catch {
    return null;
  }
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Unable to open local workspace"));
  });
}

async function readIndexedState(): Promise<LocalState | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("state");
    request.onsuccess = () => {
      db.close();
      const result = request.result as LocalState | undefined;
      resolve(result || null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function writeIndexedState(value: LocalState): Promise<void> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, "state");
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

function notify() {
  if (!state) return;
  const safe = clone(state);
  subscribers.forEach(listener => listener(safe));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("developer-studio-independent-updates");
    channel.postMessage({ updatedAt: safe.draft.updatedAt, revision: safe.publishedConfig.revision });
    channel.close();
  }
}

function persist() {
  if (!state) return;
  const snapshot = clone(state);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch { /* IndexedDB remains the primary store */ }
  writeQueue = writeQueue.catch(() => undefined).then(() => writeIndexedState(snapshot)).catch(() => undefined);
  notify();
}

function ensureState(): LocalState {
  if (!state) state = readLocalCache() || createInitialState();
  return state;
}

async function hydrate(): Promise<void> {
  if (!hydration) {
    hydration = (async () => {
      const localVersion = state?.draft.updatedAt || "";
      try {
        const remoteLocal = await readIndexedState();
        if (remoteLocal && (!state || Date.parse(remoteLocal.draft.updatedAt) >= Date.parse(localVersion))) {
          state = remoteLocal;
          notify();
        } else if (state) {
          await writeIndexedState(state);
        }
      } catch {
        // Keep the localStorage copy and in-memory draft usable when IndexedDB is blocked.
      }
    })();
  }
  await hydration;
}

function snapshotFromDraft(draft: StudioDraft): StudioHistoryRecord["snapshot"] {
  return {
    pages: clone(draft.pages),
    elements: clone(draft.elements),
    domEdits: clone(draft.domEdits || {}),
    designSystem: clone(draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
  };
}

function newHistoryRecord(draft: StudioDraft, revision: number, summary: string): StudioHistoryRecord {
  return {
    revision,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    publishedBy: "local-user",
    publishedAt: now(),
    summary,
    snapshot: snapshotFromDraft(draft),
  };
}

export const DEFAULT_STARTER_CONFIG = createDefaultPublished();
export const DEFAULT_STUDIO_PUBLISHED_CONFIG = createDefaultPublishedConfigSafe();

function createDefaultPublishedConfigSafe(): StudioPublishedConfig {
  return createDefaultPublished();
}

export const studioService = {
  getImmediateLocalOrDefaultDraft(_owner = "local-user"): StudioDraft {
    return clone(ensureState().draft);
  },

  getImmediateLocalOrDefaultPublishedConfig(): StudioPublishedConfig {
    return clone(ensureState().publishedConfig);
  },

  async syncWithServerInBackground(_owner = "local-user", _timeoutMs = 5000) {
    await hydrate();
    const current = ensureState();
    return {
      draft: clone(current.draft),
      publishedConfig: clone(current.publishedConfig),
      serverSavedDraft: clone(current.savedDraft),
      error: null,
      offline: false,
      preservedNewerLocalChanges: false,
    };
  },

  saveLocalDraft(draft: StudioDraft) {
    const current = ensureState();
    const stamp = now();
    current.draft = {
      ...clone(draft),
      updatedAt: stamp,
      hasUnsavedLocalChanges: true,
      hasUnpublishedChanges: true,
    };
    persist();
    return { success: true, updatedAt: stamp };
  },

  async saveDraft(draft: StudioDraft) {
    const current = ensureState();
    const validation = validateDraftHierarchy(draft);
    if (!validation.valid) {
      return { success: false, updatedAt: current.draft.updatedAt, error: validation.errors.join(" • ") };
    }
    const stamp = now();
    const saved = {
      ...clone(draft),
      updatedAt: stamp,
      hasUnsavedLocalChanges: false,
      hasUnpublishedChanges: true,
    };
    current.draft = clone(saved);
    current.savedDraft = clone(saved);
    persist();
    return { success: true, updatedAt: stamp, serverUpdatedAt: stamp };
  },

  async getDraft(_owner = "local-user") {
    await hydrate();
    return clone(ensureState().savedDraft);
  },

  async getServerSavedDraft(_owner = "local-user") {
    await hydrate();
    return clone(ensureState().savedDraft);
  },

  async getPublishedConfig() {
    await hydrate();
    return clone(ensureState().publishedConfig);
  },

  async getHistory() {
    await hydrate();
    return clone(ensureState().history).sort((a, b) => b.revision - a.revision);
  },

  async checkConflicts(_draft: StudioDraft) {
    const current = ensureState();
    return {
      hasConflict: false,
      conflicts: [],
      serverRevision: current.publishedConfig.revision,
      error: null,
    };
  },

  async checkDraftSyncCompatibility(_draft: StudioDraft) {
    const current = ensureState();
    return {
      compatible: true,
      needsRebase: false,
      serverDraft: clone(current.savedDraft),
      serverUpdatedAt: current.savedDraft.updatedAt,
    };
  },

  async discardDraft(_owner = "local-user") {
    const current = ensureState();
    current.draft = clone(current.savedDraft);
    current.draft.hasUnsavedLocalChanges = false;
    persist();
    return clone(current.draft);
  },

  async reloadLatestPublishedDraft(_owner = "local-user") {
    const current = ensureState();
    const published = current.publishedConfig;
    const restored: StudioDraft = {
      ...clone(current.savedDraft),
      baseRevision: published.revision,
      pages: clone(published.pages),
      elements: clone(published.elements),
      domEdits: clone(published.domEdits || {}),
      designSystem: clone(published.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
      assets: clone(published.assets || []),
      reusableComponents: clone(published.reusableComponents || []),
      hasUnpublishedChanges: false,
      hasUnsavedLocalChanges: false,
      updatedAt: now(),
    };
    current.draft = clone(restored);
    current.savedDraft = clone(restored);
    persist();
    return restored;
  },

  async mergeWithLatest(draft: StudioDraft) {
    const current = ensureState();
    const remote = current.publishedConfig;
    const merged: StudioDraft = {
      ...clone(remote),
      id: draft.id,
      owner: draft.owner,
      baseRevision: remote.revision,
      createdAt: draft.createdAt,
      pages: { ...clone(remote.pages), ...clone(draft.pages) },
      elements: { ...clone(remote.elements), ...clone(draft.elements) },
      domEdits: { ...clone(remote.domEdits || {}), ...clone(draft.domEdits || {}) },
      designSystem: clone(draft.designSystem || remote.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
      assets: clone(draft.assets || remote.assets || []),
      reusableComponents: clone(draft.reusableComponents || remote.reusableComponents || []),
      namedSnapshots: clone(draft.namedSnapshots || []),
      updatedAt: now(),
      hasUnpublishedChanges: true,
      hasUnsavedLocalChanges: true,
    };
    current.draft = clone(merged);
    persist();
    return merged;
  },

  async publishDraft(draft: StudioDraft, summary = "نشر تحديث الاستوديو", author = "local-user") {
    const validation = validateDraftHierarchy(draft);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(" • "),
        newRevision: ensureState().publishedConfig.revision,
        conflict: false,
        offline: false,
      };
    }
    const current = ensureState();
    const revision = Math.max(current.publishedConfig.revision, ...current.history.map(item => item.revision)) + 1;
    const stamp = now();
    const published: StudioPublishedConfig = {
      id: "local-published",
      revision,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      schema_version: CURRENT_SCHEMA_VERSION,
      pages: clone(draft.pages),
      elements: clone(draft.elements),
      domEdits: clone(draft.domEdits || {}),
      designSystem: clone(draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
      assets: clone(draft.assets || []),
      reusableComponents: clone(draft.reusableComponents || []),
      publishedBy: author || "local-user",
      publishedAt: stamp,
      summary,
    };
    const saved: StudioDraft = {
      ...clone(draft),
      baseRevision: revision,
      updatedAt: stamp,
      hasUnpublishedChanges: false,
      hasUnsavedLocalChanges: false,
    };
    current.publishedConfig = published;
    current.savedDraft = clone(saved);
    current.draft = clone(saved);
    current.history.push(newHistoryRecord(saved, revision, summary));
    persist();
    return { success: true, newRevision: revision, publishedAt: stamp, conflict: false, offline: false };
  },

  async rollbackRevision(revision: number, _author = "local-user") {
    const current = ensureState();
    const record = current.history.find(item => item.revision === revision);
    if (!record) return { success: false, newRevision: current.publishedConfig.revision, error: "الإصدار المطلوب غير موجود في السجل المحلي." };
    const draft: StudioDraft = {
      ...clone(current.savedDraft),
      baseRevision: current.publishedConfig.revision,
      pages: clone(record.snapshot.pages),
      elements: clone(record.snapshot.elements),
      domEdits: clone(record.snapshot.domEdits || {}),
      designSystem: clone(record.snapshot.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
      updatedAt: now(),
      hasUnpublishedChanges: true,
      hasUnsavedLocalChanges: true,
    };
    const result = await this.publishDraft(draft, "استعادة الإصدار #" + revision, "local-user");
    return result;
  },

  restoreSnapshotToLocalDraft(draft: StudioDraft, snapshot: any): StudioDraft {
    const next = {
      ...clone(draft),
      pages: clone(snapshot.pages || draft.pages),
      elements: clone(snapshot.elements || draft.elements),
      domEdits: clone(snapshot.domEdits || {}),
      designSystem: clone(snapshot.designSystem || draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
      assets: clone(snapshot.assets || draft.assets || []),
      reusableComponents: clone(snapshot.reusableComponents || draft.reusableComponents || []),
      updatedAt: now(),
      hasUnpublishedChanges: true,
      hasUnsavedLocalChanges: true,
    };
    this.saveLocalDraft(next);
    return next;
  },

  createNamedSnapshot(draft: StudioDraft, name: string, note = "") {
    const snapshot: StudioNamedSnapshot = {
      id: createStudioId("checkpoint", (draft.namedSnapshots || []).map(item => item.id)),
      name,
      createdAt: now(),
      createdBy: "local-user",
      baseRevision: draft.baseRevision,
      note,
      snapshot: {
        ...snapshotFromDraft(draft),
        domEdits: clone(draft.domEdits || {}),
        assets: clone(draft.assets || []),
        reusableComponents: clone(draft.reusableComponents || []),
      },
    };
    const updated: StudioDraft = {
      ...clone(draft),
      namedSnapshots: [...(draft.namedSnapshots || []), snapshot],
      updatedAt: now(),
      hasUnpublishedChanges: true,
      hasUnsavedLocalChanges: true,
    };
    this.saveLocalDraft(updated);
    return { draft: updated, snapshot };
  },

  exportProjectJson(draft: StudioDraft) {
    return JSON.stringify({
      format: "developer-studio-independent",
      schemaVersion: CURRENT_SCHEMA_VERSION,
      exportedAt: now(),
      draft,
      publishedConfig: ensureState().publishedConfig,
    }, null, 2);
  },

  importProjectJson(text: string, currentDraft: StudioDraft) {
    try {
      const value = JSON.parse(text);
      const imported = value?.draft || value;
      if (!imported || typeof imported !== "object" || !imported.pages || !imported.elements) {
        return { success: false, error: "ملف المشروع لا يحتوي على الصفحات والعناصر المطلوبة." };
      }
      const draft: StudioDraft = {
        ...clone(currentDraft),
        ...clone(imported),
        owner: "local-user",
        id: "developer-studio-independent-draft",
        designSystem: clone(imported.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM),
        domEdits: clone(imported.domEdits || {}),
        assets: clone(imported.assets || []),
        reusableComponents: clone(imported.reusableComponents || []),
        namedSnapshots: clone(imported.namedSnapshots || []),
        updatedAt: now(),
        hasUnpublishedChanges: true,
        hasUnsavedLocalChanges: true,
      };
      const validation = validateDraftHierarchy(draft);
      if (!validation.valid) return { success: false, error: validation.errors.join(" • ") };
      this.saveLocalDraft(draft);
      return { success: true, draft };
    } catch (error: any) {
      return { success: false, error: error?.message || "تعذر قراءة ملف المشروع." };
    }
  },

  acceptRealtimeDraft(draft: StudioDraft) {
    ensureState().draft = clone(draft);
    persist();
  },

  acceptRealtimePublishedConfig(config: StudioPublishedConfig) {
    ensureState().publishedConfig = clone(config);
    persist();
  },

  getAccessStatus() {
    return { authenticated: false, allowed: true, localOnly: true, reason: "مستودع محلي مستقل" };
  },

  async subscribe(listener: (next: LocalState) => void) {
    subscribers.add(listener);
    return () => { subscribers.delete(listener); };
  },

  async waitForPersistence() {
    await writeQueue;
  },
};

export function compareLocalSnapshots(a: any, b: any) {
  return compareStudioSnapshots(a, b);
}

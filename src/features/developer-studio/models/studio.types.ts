/**
 * Developer Studio Pro — Core Data Models & Schema Validators
 * Supports hierarchical Page -> Section/Container -> Element -> Style/Props architecture,
 * Optimistic Concurrency Control (revisions), Design System tokens, Asset Management,
 * Reusable Components, Responsive Overrides, Animations, Audits, and Diff Comparison.
 */

export const CURRENT_SCHEMA_VERSION = 1;

export type ElementType =
  | "heading"
  | "text"
  | "button"
  | "image"
  | "card"
  | "container"
  | "table"
  | "input"
  | "badge"
  | "divider";

export type ViewportBreakpoint = "desktop" | "tablet" | "mobile";

export type StudioSaveState =
  | "saved"
  | "saving"
  | "unsaved"
  | "offline"
  | "conflict"
  | "error";

export interface ElementAnimationConfig {
  type?: "none" | "fade-in" | "slide-up" | "slide-right" | "slide-left" | "zoom-in" | "bounce";
  durationMs?: number;
  delayMs?: number;
  easing?: "ease" | "ease-in-out" | "linear" | "spring";
  hoverEffect?: "none" | "lift" | "scale" | "glow" | "brighten";
  previewEnabled?: boolean;
}

export interface ElementSvgConfig {
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  opacity?: number;
  rotate?: string;
  scale?: number;
  preserveAspectRatio?: boolean;
  iconName?: string;
  shapeBg?: "none" | "circle" | "rounded" | "square";
  pathData?: string;
}

export interface ElementStyles {
  // Colors & Gradients
  textColor?: string;
  backgroundColor?: string;
  backgroundGradient?: string;
  borderColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  activeBackgroundColor?: string;

  // Typography
  fontSize?: string;
  fontWeight?: string;
  fontFamily?: string;
  textAlign?: "right" | "center" | "left" | "justify";
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";

  // Dimensions
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;

  // Spacing (Margin & Padding)
  margin?: string;
  marginTop?: string;
  marginRight?: string;
  marginBottom?: string;
  marginLeft?: string;
  padding?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;

  // Borders & Effects
  borderWidth?: string;
  borderStyle?: "none" | "solid" | "dashed" | "dotted";
  borderRadius?: string;
  outline?: string;
  boxShadow?: "none" | "sm" | "md" | "lg" | "xl" | "2xl" | string;
  opacity?: number;

  // Layout & Flexbox / Grid
  display?: "block" | "flex" | "inline-flex" | "grid" | "none";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  gap?: string;
  flexWrap?: "nowrap" | "wrap";
  gridTemplateColumns?: string;
  overflow?: "visible" | "hidden" | "auto" | "scroll";
  zIndex?: string;
}

export interface ResponsiveStyleOverrides {
  desktop?: Partial<ElementStyles> & { hidden?: boolean };
  tablet?: Partial<ElementStyles> & { hidden?: boolean };
  mobile?: Partial<ElementStyles> & { hidden?: boolean };
}

export interface ElementLayout {
  position: "static" | "relative" | "absolute" | "sticky";
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;
  order: number;
  visibility: boolean;
  responsiveVisibility?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  responsive?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
    hideOnMobile?: boolean;
    hideOnTablet?: boolean;
    hideOnDesktop?: boolean;
  };
}

// Type-specific structured content definitions
export interface HeadingContent {
  text: string;
  level: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  iconName?: string;
}

export interface TextContent {
  text: string;
  format?: "plain" | "markdown";
}

export interface ButtonContent {
  label: string;
  action?: "link" | "alert" | "submit" | "external" | "formula" | "toggle" | "none";
  url?: string;
  message?: string;
  formula?: string;
  targetElementId?: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost";
  icon?: string;
}

export interface ImageContent {
  src: string;
  alt: string;
  caption?: string;
  fit?: "cover" | "contain" | "fill";
  assetId?: string;
}

export interface CardContent {
  title: string;
  subtitle?: string;
  description: string;
  badgeText?: string;
  footerText?: string;
  showHeader?: boolean;
  iconName?: string;
}

export interface TableContent {
  columns: Array<{ id: string; label: string; align?: "right" | "center" | "left" }>;
  rows: Array<Record<string, any>>;
  striped?: boolean;
  bordered?: boolean;
}

export interface InputContent {
  label: string;
  placeholder: string;
  inputType?: "text" | "number" | "email" | "password" | "date" | "select";
  required?: boolean;
  defaultValue?: string;
}

export interface BadgeContent {
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive" | "success";
}

export interface ContainerContent {
  label?: string;
  direction?: "row" | "column";
  wrap?: boolean;
}

export interface DividerContent {
  label?: string;
  thickness?: string;
}

export type ElementContentMap = {
  heading: HeadingContent;
  text: TextContent;
  button: ButtonContent;
  image: ImageContent;
  card: CardContent;
  container: ContainerContent;
  table: TableContent;
  input: InputContent;
  badge: BadgeContent;
  divider: DividerContent;
};

export interface ElementModel<T extends ElementType = ElementType> {
  id: string;
  pageId: string;
  parentId: string | null;
  type: T;
  name?: string;
  content: Record<string, any>;
  styles: ElementStyles;
  responsiveStyles?: ResponsiveStyleOverrides;
  svgProps?: ElementSvgConfig;
  animation?: ElementAnimationConfig;
  layout: ElementLayout;
  attributes: Record<string, any>;
  locked: boolean;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

export interface PageModel {
  id: string;
  route: string;
  name: string;
  description?: string;
  visibleInNav?: boolean;
  iconName?: string;
  elementIds: string[];
  styles: ElementStyles;
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Direct visual edits made on real application DOM elements in the live preview.
 * Keyed by deterministic CSS selector inside StudioDraft.domEdits.
 */
export interface StudioDomEdit {
  text?: string;
  styles?: Record<string, string>;
  responsiveStyles?: {
    desktop?: Record<string, string>;
    tablet?: Record<string, string>;
    mobile?: Record<string, string>;
  };
  hoverStyles?: Record<string, string>;
  activeStyles?: Record<string, string>;
  svgProps?: ElementSvgConfig;
  animation?: ElementAnimationConfig;
  attributes?: Record<string, string>;
  className?: string;
  customId?: string;
  ariaLabel?: string;
  role?: string;
  deleted?: boolean;
  locked?: boolean;
  hiddenOn?: {
    desktop?: boolean;
    tablet?: boolean;
    mobile?: boolean;
  };
  duplicateCount?: number;
  order?: number;
  label?: string;
  pageRoute?: string;
}

/**
 * Filter out unsafe or unscoped positional `body > ...` selectors that can collide across routes
 * or accidentally target Studio UI / Top Bar / hidden tab panels.
 */
export function sanitizeStudioDomEditsMap(
  rawEdits: Record<string, any> | undefined | null,
): Record<string, StudioDomEdit> {
  if (!rawEdits || typeof rawEdits !== "object") return {};
  const clean: Record<string, StudioDomEdit> = {};
  for (const [selector, edit] of Object.entries(rawEdits)) {
    if (!selector || selector.startsWith("__studio_")) continue;
    if (!edit || typeof edit !== "object") continue;
    const trimmed = selector.trim();
    // Drop legacy unscoped positional paths starting from `body >` that lacked a pageRoute
    // or targeted top-level layout wrappers (`body > div`, `header`, `aside`, `[role="tabpanel"]`)
    if (trimmed.startsWith("body >") && !edit.pageRoute) {
      continue;
    }
    if (
      trimmed === "body" ||
      trimmed === "main" ||
      trimmed === "header" ||
      trimmed === "aside" ||
      trimmed.includes('[data-studio-ui-root') ||
      trimmed.includes('[data-studio-preserve') ||
      trimmed.includes('[role="tabpanel"]')
    ) {
      continue;
    }
    // Strip accidental pointer-drag translate styles on non-positioned elements
    const nextEdit: StudioDomEdit = { ...edit };
    if (nextEdit.styles && typeof nextEdit.styles === "object") {
      const nextStyles = { ...nextEdit.styles };
      if (nextStyles.translate) {
        delete nextStyles.translate;
        if (nextStyles.zIndex === "10") {
          delete nextStyles.zIndex;
        }
      }
      nextEdit.styles = nextStyles;
      if (
        Object.keys(nextStyles).length === 0 &&
        nextEdit.text === undefined &&
        !nextEdit.deleted &&
        !nextEdit.ariaLabel &&
        !nextEdit.role &&
        !nextEdit.attributes &&
        !nextEdit.responsiveStyles &&
        !nextEdit.hoverStyles &&
        !nextEdit.animation &&
        !nextEdit.hiddenOn &&
        nextEdit.duplicateCount === undefined &&
        nextEdit.order === undefined
      ) {
        continue;
      }
    }
    clean[selector] = nextEdit;
  }
  return clean;
}

/**
 * Global Design System Tokens managed in Developer Studio Pro
 */
export interface StudioDesignSystem {
  themePreset: "pearl-light" | "obsidian-dark" | "emerald-luxury" | "royal-gold" | "ocean-blue";
  mode: "light" | "dark";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    success: string;
    warning: string;
    danger: string;
  };
  typography: {
    fontFamily: string;
    headingFontFamily: string;
    monoFontFamily: string;
    baseFontSize: string;
    scaleRatio: number;
    lineHeight: string;
  };
  spacing: {
    unitPx: number;
    containerPadding: string;
    sectionGap: string;
    cardPadding: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    button: string;
    card: string;
  };
  shadows: {
    card: string;
    button: string;
    modal: string;
  };
}

export const DEFAULT_STUDIO_DESIGN_SYSTEM: StudioDesignSystem = {
  themePreset: "pearl-light",
  mode: "light",
  colors: {
    primary: "#4f46e5",
    secondary: "#0ea5e9",
    accent: "#f59e0b",
    background: "#f8fafc",
    surface: "#ffffff",
    textPrimary: "#0f172a",
    textSecondary: "#475569",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  },
  typography: {
    fontFamily: "Cairo, sans-serif",
    headingFontFamily: "Cairo, sans-serif",
    monoFontFamily: "JetBrains Mono, monospace",
    baseFontSize: "14px",
    scaleRatio: 1.2,
    lineHeight: "1.6",
  },
  spacing: {
    unitPx: 4,
    containerPadding: "20px",
    sectionGap: "16px",
    cardPadding: "16px",
  },
  radius: {
    sm: "6px",
    md: "10px",
    lg: "14px",
    xl: "20px",
    button: "10px",
    card: "16px",
  },
  shadows: {
    card: "0 4px 14px rgba(15, 23, 42, 0.06)",
    button: "0 2px 6px rgba(79, 70, 229, 0.18)",
    modal: "0 20px 50px rgba(15, 23, 42, 0.2)",
  },
};

export interface StudioAssetItem {
  id: string;
  name: string;
  type: "image" | "svg" | "icon";
  mimeType: string;
  url: string;
  folder: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  svgContent?: string;
  alt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioReusableComponent {
  id: string;
  name: string;
  category: "cards" | "buttons" | "headers" | "navigation" | "tables" | "forms" | "containers" | "custom";
  description: string;
  variant: "primary" | "secondary" | "outline" | "glass" | "minimal";
  rootType: ElementType;
  content: Record<string, any>;
  styles: ElementStyles;
  createdAt: string;
}

export interface StudioNamedSnapshot {
  id: string;
  name: string;
  createdAt: string;
  createdBy: string;
  baseRevision: number;
  note?: string;
  snapshot: {
    pages: Record<string, PageModel>;
    elements: Record<string, ElementModel>;
    domEdits: Record<string, StudioDomEdit>;
    designSystem?: StudioDesignSystem;
    assets?: StudioAssetItem[];
    reusableComponents?: StudioReusableComponent[];
  };
}

export interface StudioPublishedConfig {
  id: string;
  revision: number;
  schemaVersion: number;
  schema_version?: number;
  pages: Record<string, PageModel>;
  elements: Record<string, ElementModel>;
  domEdits?: Record<string, StudioDomEdit>;
  designSystem?: StudioDesignSystem;
  assets?: StudioAssetItem[];
  reusableComponents?: StudioReusableComponent[];
  publishedBy: string;
  publishedAt: string;
  summary: string;
}

export interface StudioDraft {
  id: string;
  owner: string;
  baseRevision: number;
  schemaVersion: number;
  pages: Record<string, PageModel>;
  elements: Record<string, ElementModel>;
  domEdits?: Record<string, StudioDomEdit>;
  designSystem?: StudioDesignSystem;
  assets?: StudioAssetItem[];
  reusableComponents?: StudioReusableComponent[];
  namedSnapshots?: StudioNamedSnapshot[];
  updatedAt: string;
  createdAt: string;
  /** Exact `updated_at` timestamp confirmed by `studio_drafts` on Supabase. */
  serverUpdatedAt?: string;
  hasUnpublishedChanges: boolean;
  /** True when local preview edits have not been manually saved to Supabase yet. */
  hasUnsavedLocalChanges?: boolean;
}

export interface StudioHistoryRecord {
  id?: number;
  revision: number;
  schemaVersion: number;
  publishedBy: string;
  publishedAt: string;
  summary: string;
  isNamedCheckpoint?: boolean;
  checkpointName?: string;
  snapshot: {
    pages: Record<string, PageModel>;
    elements: Record<string, ElementModel>;
    domEdits?: Record<string, StudioDomEdit>;
    designSystem?: StudioDesignSystem;
  };
}

export interface ConflictDetail {
  type: "page_modified" | "element_modified" | "revision_gap" | "draft_session_conflict";
  targetId: string;
  title: string;
  localValue: any;
  serverValue: any;
  description: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface StudioAuditIssue {
  id: string;
  category: "accessibility" | "responsive" | "consistency";
  severity: "error" | "warning" | "info";
  title: string;
  description: string;
  targetId?: string;
  selector?: string;
  autoFixable?: boolean;
  fixType?:
    | "add_alt"
    | "fix_contrast"
    | "fix_heading_level"
    | "add_button_label"
    | "fix_mobile_width"
    | "fix_mobile_font"
    | "align_color_token"
    | "align_radius_token";
}

export interface StudioDiffItem {
  id: string;
  scope: "page" | "element" | "domEdit" | "designSystem";
  changeType: "added" | "modified" | "deleted";
  title: string;
  path: string;
  beforeValue: any;
  afterValue: any;
}

export const STUDIO_META_KEY = "__studio_meta__";

/**
 * Pack Studio workspace metadata (designSystem, assets, reusableComponents, namedSnapshots)
 * inside `domEdits.__studio_meta__` so it persists atomically through existing Supabase RPCs
 * without requiring schema DDL changes, while keeping clean separation from real DOM selectors.
 */
export function packDomEditsWithMeta(draft: Pick<StudioDraft, "domEdits" | "designSystem" | "assets" | "reusableComponents" | "namedSnapshots">): Record<string, any> {
  const cleanEdits: Record<string, any> = {};
  for (const [key, value] of Object.entries(draft.domEdits || {})) {
    if (key === STUDIO_META_KEY || key.startsWith("__studio_")) continue;
    cleanEdits[key] = value;
  }
  const hasMeta =
    !!draft.designSystem ||
    (Array.isArray(draft.assets) && draft.assets.length > 0) ||
    (Array.isArray(draft.reusableComponents) && draft.reusableComponents.length > 0) ||
    (Array.isArray(draft.namedSnapshots) && draft.namedSnapshots.length > 0);

  if (hasMeta) {
    cleanEdits[STUDIO_META_KEY] = {
      designSystem: draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM,
      assets: draft.assets || [],
      reusableComponents: draft.reusableComponents || [],
      namedSnapshots: draft.namedSnapshots || [],
    };
  }
  return cleanEdits;
}

/**
 * Ensure any partial or legacy designSystem object has all required nested token groups.
 */
export function normalizeStudioDesignSystem(
  raw?: Partial<StudioDesignSystem> | null,
): StudioDesignSystem {
  if (!raw || typeof raw !== "object") {
    return JSON.parse(JSON.stringify(DEFAULT_STUDIO_DESIGN_SYSTEM));
  }
  return {
    ...DEFAULT_STUDIO_DESIGN_SYSTEM,
    ...raw,
    colors: {
      ...DEFAULT_STUDIO_DESIGN_SYSTEM.colors,
      ...(raw.colors && typeof raw.colors === "object" ? raw.colors : {}),
    },
    typography: {
      ...DEFAULT_STUDIO_DESIGN_SYSTEM.typography,
      ...(raw.typography && typeof raw.typography === "object" ? raw.typography : {}),
    },
    spacing: {
      ...DEFAULT_STUDIO_DESIGN_SYSTEM.spacing,
      ...(raw.spacing && typeof raw.spacing === "object" ? raw.spacing : {}),
    },
    radius: {
      ...DEFAULT_STUDIO_DESIGN_SYSTEM.radius,
      ...(raw.radius && typeof raw.radius === "object" ? raw.radius : {}),
    },
    shadows: {
      ...DEFAULT_STUDIO_DESIGN_SYSTEM.shadows,
      ...(raw.shadows && typeof raw.shadows === "object" ? raw.shadows : {}),
    },
  };
}

/**
 * Unpack `domEdits` from Supabase row into clean DOM selector edits + workspace metadata.
 */
export function unpackDomEditsAndMeta(rawDomEdits: Record<string, any> | undefined | null): {
  domEdits: Record<string, StudioDomEdit>;
  designSystem: StudioDesignSystem;
  assets: StudioAssetItem[];
  reusableComponents: StudioReusableComponent[];
  namedSnapshots: StudioNamedSnapshot[];
} {
  const domEdits: Record<string, StudioDomEdit> = {};
  let meta: Record<string, any> = {};
  if (rawDomEdits && typeof rawDomEdits === "object") {
    for (const [key, value] of Object.entries(rawDomEdits)) {
      if (key === STUDIO_META_KEY && value && typeof value === "object") {
        meta = value;
      } else if (!key.startsWith("__studio_") && value && typeof value === "object") {
        domEdits[key] = value as StudioDomEdit;
      }
    }
  }
  return {
    domEdits: sanitizeStudioDomEditsMap(domEdits),
    designSystem: normalizeStudioDesignSystem(meta.designSystem),
    assets: Array.isArray(meta.assets) ? meta.assets : [],
    reusableComponents: Array.isArray(meta.reusableComponents) ? meta.reusableComponents : [],
    namedSnapshots: Array.isArray(meta.namedSnapshots) ? meta.namedSnapshots : [],
  };
}

let studioEntityCounter = 0;

/**
 * Generate a collision-safe Studio entity identifier.
 */
export function createStudioId(prefix: string, existingIds: Iterable<string> = []): string {
  const reserved = new Set(existingIds);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, "_") || "studio";

  for (let attempt = 0; attempt < 16; attempt++) {
    studioEntityCounter = (studioEntityCounter + 1) % 1_000_000;
    const randomPart =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
    const candidate = `${cleanPrefix}_${Date.now().toString(36)}_${studioEntityCounter.toString(36)}_${randomPart}`;
    if (!reserved.has(candidate)) return candidate;
  }

  return `${cleanPrefix}_${Date.now()}_${++studioEntityCounter}`;
}

/**
 * Preserve the first appearance of each non-empty element ID.
 */
export function uniquePageElementIds(elementIds: readonly string[] | undefined | null): string[] {
  if (!Array.isArray(elementIds)) return [];
  const seen = new Set<string>();
  const output: string[] = [];
  for (const rawId of elementIds) {
    const id = typeof rawId === "string" ? rawId.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    output.push(id);
  }
  return output;
}

/**
 * Return a new draft whose page `elementIds` lists have no duplicate IDs.
 */
export function normalizeStudioDraftPageReferences(draft: StudioDraft): {
  draft: StudioDraft;
  changed: boolean;
} {
  let changed = false;
  const pages: Record<string, PageModel> = {};

  for (const [pageId, page] of Object.entries(draft.pages || {})) {
    const deduped = uniquePageElementIds(page?.elementIds);
    const sameLength = Array.isArray(page?.elementIds) && deduped.length === page.elementIds.length;
    const sameOrder = sameLength && deduped.every((id, index) => id === page.elementIds[index]);
    if (!sameOrder) changed = true;
    pages[pageId] = sameOrder ? page : { ...page, elementIds: deduped };
  }

  return {
    draft: changed ? { ...draft, pages } : draft,
    changed,
  };
}

function canonicalizeJson(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalizeJson).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  return (
    "{" +
    keys
      .filter((k) => value[k] !== undefined)
      .map((k) => JSON.stringify(k) + ":" + canonicalizeJson(value[k]))
      .join(",") +
    "}"
  );
}

/**
 * Detect whether a published element is still identical to the initial demo seed.
 */
export function isUnmodifiedStudioStarterElement(
  element: ElementModel | undefined,
  starter: ElementModel | undefined,
): boolean {
  if (!element || !starter) return false;
  return (
    element.id === starter.id &&
    element.pageId === starter.pageId &&
    element.parentId === starter.parentId &&
    element.type === starter.type &&
    canonicalizeJson(element.content || {}) === canonicalizeJson(starter.content || {}) &&
    canonicalizeJson(element.styles || {}) === canonicalizeJson(starter.styles || {}) &&
    canonicalizeJson(element.layout || {}) === canonicalizeJson(starter.layout || {})
  );
}

/**
 * Human-readable element label used across the Studio UI.
 */
export function getElementDisplayName(element: Pick<ElementModel, "type" | "content" | "name">): string {
  if (element.name && element.name.trim()) return element.name.trim();
  const typeNames: Record<ElementType, string> = {
    heading: "عنوان",
    text: "نص",
    button: "زر",
    image: "صورة",
    card: "بطاقة",
    container: "مجموعة عناصر",
    table: "جدول",
    input: "حقل إدخال",
    badge: "شارة",
    divider: "فاصل",
  };
  const content = element.content || {};
  const label = String(
    content.text ||
      content.title ||
      content.label ||
      content.alt ||
      content.placeholder ||
      "",
  ).trim();
  const baseName = typeNames[element.type] || "عنصر";
  return label ? `${baseName}: ${label.slice(0, 32)}` : baseName;
}

/**
 * Runtime Schema Validator for ElementModel
 */
export function validateElement(element: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!element || typeof element !== "object") {
    return { valid: false, errors: ["العنصر غير صالح أو فارغ"], warnings };
  }

  if (!element.id || typeof element.id !== "string") {
    errors.push("معرّف العنصر (id) مفقود أو غير صالح");
  }
  if (!element.pageId || typeof element.pageId !== "string") {
    errors.push(`العنصر (${element.id || "unknown"}) لا يحتوي على معرّف صفحة (pageId)`);
  }

  const validTypes: ElementType[] = [
    "heading",
    "text",
    "button",
    "image",
    "card",
    "container",
    "table",
    "input",
    "badge",
    "divider",
  ];
  if (!validTypes.includes(element.type)) {
    errors.push(`نوع العنصر (${element.type}) غير مدعوم في النظام`);
  }

  if (!element.content || typeof element.content !== "object") {
    errors.push(`محتوى العنصر (${element.id}) مفقود`);
  }

  if (!element.styles || typeof element.styles !== "object") {
    warnings.push(`تنسيقات العنصر (${element.id}) غير معرّفة، سيتم استخدام التنسيق الافتراضي`);
  }

  if (!element.layout || typeof element.layout !== "object") {
    errors.push(`إعدادات التخطيط (layout) للعنصر (${element.id}) مفقودة`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Runtime Schema Validator for PageModel
 */
export function validatePage(page: any, allElements: Record<string, ElementModel>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!page || typeof page !== "object") {
    return { valid: false, errors: ["بيانات الصفحة غير صالحة"], warnings };
  }

  if (!page.id || typeof page.id !== "string") {
    errors.push("معرّف الصفحة (id) مفقود");
  }
  if (!page.route || typeof page.route !== "string" || !page.route.startsWith("/")) {
    errors.push(`مسار الصفحة (${page.name || page.id}) يجب أن يبدأ بـ /`);
  }
  if (!page.name || typeof page.name !== "string") {
    errors.push(`اسم الصفحة (${page.id}) مفقود`);
  }
  if (!Array.isArray(page.elementIds)) {
    errors.push(`قائمة عناصر الصفحة (${page.id}) يجب أن تكون مصفوفة`);
  } else {
    const seenIds = new Set<string>();
    for (const elId of page.elementIds) {
      if (seenIds.has(elId)) {
        errors.push(`الصفحة (${page.name}) تحتوي على معرفات مكررة للعنصر (${elId})`);
        continue;
      }
      seenIds.add(elId);
      if (!allElements[elId]) {
        errors.push(`الصفحة (${page.name}) تشير إلى عنصر غير موجود (${elId})`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect parent-child cycles in an element dictionary starting from elementId.
 */
export function detectCycle(
  elementId: string,
  allElements: Record<string, ElementModel>,
): boolean {
  const visited = new Set<string>();
  let currentId: string | null = elementId;
  while (currentId) {
    if (visited.has(currentId)) return true;
    visited.add(currentId);
    currentId = allElements[currentId]?.parentId || null;
  }
  return false;
}

/**
 * Validate complete Studio Draft hierarchy before Save or Publish
 */
export function validateDraftHierarchy(draft: StudioDraft): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!draft || typeof draft !== "object") {
    return { valid: false, errors: ["المسودة فارغة أو تالفة"], warnings };
  }

  const pageEntries = Object.entries(draft.pages || {});
  if (pageEntries.length === 0) {
    errors.push("يجب أن تحتوي المسودة على صفحة واحدة على الأقل");
  }

  const normalizeRoute = (route: string) => (route.trim().replace(/\/+$/, "") || "/").toLocaleLowerCase();
  const routes = new Map<string, string>();

  for (const [pageKey, page] of pageEntries) {
    if (page?.id && page.id !== pageKey) {
      errors.push(`مفتاح الصفحة (${pageKey}) لا يطابق معرّفها الداخلي (${page.id})`);
    }
    const res = validatePage(page, draft.elements || {});
    errors.push(...res.errors);
    warnings.push(...res.warnings);
    if (page?.route) {
      const normalizedRoute = normalizeRoute(page.route);
      const existingPage = routes.get(normalizedRoute);
      if (existingPage && existingPage !== page.id) {
        errors.push(`مسار الصفحة (${normalizedRoute}) مكرر بين الصفحتين (${existingPage}) و(${page.id})`);
      } else {
        routes.set(normalizedRoute, page.id);
      }
    }
  }

  for (const [elementKey, elem] of Object.entries(draft.elements || {})) {
    if (elem?.id && elem.id !== elementKey) {
      errors.push(`مفتاح العنصر (${elementKey}) لا يطابق معرّفه الداخلي (${elem.id})`);
    }
    const res = validateElement(elem);
    errors.push(...res.errors);
    warnings.push(...res.warnings);

    if (elem.pageId && !draft.pages?.[elem.pageId]) {
      errors.push(`العنصر (${elem.id}) ينتمي إلى صفحة غير موجودة (${elem.pageId})`);
    }

    if (elem.parentId) {
      const parent = draft.elements[elem.parentId];
      if (!parent) {
        errors.push(`العنصر (${elem.id}) مرتبط بحاوية أب غير موجودة (${elem.parentId})`);
      } else if (parent.pageId !== elem.pageId) {
        errors.push(`العنصر (${elem.id}) مرتبط بأب من صفحة أخرى (${parent.pageId})`);
      }
    }

    let cursor = elem.parentId;
    const visited = new Set<string>([elem.id]);
    while (cursor) {
      if (visited.has(cursor)) {
        errors.push(`تم اكتشاف حلقة لا نهائية في شجرة العناصر عند العنصر (${elem.id})`);
        break;
      }
      visited.add(cursor);
      cursor = draft.elements[cursor]?.parentId || null;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Find all elements and DOM edits referencing a specific asset (by ID or URL)
 * to prevent accidental deletion of in-use assets.
 */
export function findAssetUsages(
  asset: Pick<StudioAssetItem, "id" | "url">,
  draft: Pick<StudioDraft, "elements" | "domEdits">,
): Array<{ id: string; label: string; type: "element" | "domEdit" }> {
  const usages: Array<{ id: string; label: string; type: "element" | "domEdit" }> = [];
  if (!asset?.url && !asset?.id) return usages;

  for (const elem of Object.values(draft?.elements || {})) {
    if (!elem || typeof elem !== "object") continue;
    const c = elem.content || {};
    const bg = elem.styles?.backgroundColor || "";
    if (
      (asset.id && c.assetId === asset.id) ||
      (asset.url && (c.src === asset.url || bg.includes(asset.url)))
    ) {
      usages.push({
        id: elem.id,
        label: getElementDisplayName(elem),
        type: "element",
      });
    }
  }

  for (const [selector, edit] of Object.entries(draft?.domEdits || {})) {
    if (selector.startsWith("__studio_") || !edit || typeof edit !== "object") continue;
    const srcAttr = edit.attributes?.src || "";
    const bgStyle = edit.styles?.backgroundImage || "";
    if (asset.url && (srcAttr === asset.url || bgStyle.includes(asset.url))) {
      usages.push({
        id: selector,
        label: edit.label || selector,
        type: "domEdit",
      });
    }
  }

  return usages;
}

/**
 * Parse a hex color (#rgb or #rrggbb) into relative luminance for WCAG contrast checks.
 */
function parseHexLuminance(hex: string | undefined): number | null {
  if (!hex || typeof hex !== "string") return null;
  const clean = hex.trim().replace(/^#/, "");
  let r = 0, g = 0, b = 0;
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else if (/^[0-9a-f]{6}$/i.test(clean)) {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  } else {
    return null;
  }
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function calculateContrastRatio(fgHex?: string, bgHex?: string): number | null {
  const l1 = parseHexLuminance(fgHex);
  const l2 = parseHexLuminance(bgHex);
  if (l1 === null || l2 === null) return null;
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2));
}

/**
 * Run comprehensive Accessibility, Responsive, and Design Consistency audits on a StudioDraft.
 */
export function runStudioAudits(draft: StudioDraft, activePageId?: string): StudioAuditIssue[] {
  const issues: StudioAuditIssue[] = [];
  if (!draft || typeof draft !== "object") return issues;
  const ds = normalizeStudioDesignSystem(draft.designSystem);
  const paletteColors = new Set(
    Object.values(ds.colors || {})
      .filter((c): c is string => typeof c === "string")
      .map((c) => c.toLowerCase()),
  );

  const elements = Object.values(draft.elements || {}).filter(
    (el): el is ElementModel => Boolean(el && typeof el === "object" && (!activePageId || el.pageId === activePageId)),
  );

  let previousHeadingLevel = 0;

  for (const el of elements) {
    const displayName = getElementDisplayName(el);

    // 1. Accessibility Audits
    if (el.type === "image") {
      const alt = String(el.content?.alt || "").trim();
      if (!alt) {
        issues.push({
          id: `a11y_alt_${el.id}`,
          category: "accessibility",
          severity: "error",
          title: `صورة بدون نص بديل (alt): ${displayName}`,
          description: "الصور يجب أن تحتوي على وصف بديل (alt) لدعم قارئات الشاشة ومعايير الوصول.",
          targetId: el.id,
          autoFixable: true,
          fixType: "add_alt",
        });
      }
    }

    if (el.type === "button") {
      const label = String(el.content?.label || "").trim();
      const aria = String(el.attributes?.["aria-label"] || "").trim();
      if (!label && !aria) {
        issues.push({
          id: `a11y_btn_${el.id}`,
          category: "accessibility",
          severity: "error",
          title: `زر تفاعلي بدون تسمية واضحة (${el.id})`,
          description: "الأزرار تحتاج إلى نص ظاهر أو خاصية aria-label واضحة.",
          targetId: el.id,
          autoFixable: true,
          fixType: "add_button_label",
        });
      }
    }

    if (el.type === "input") {
      const label = String(el.content?.label || "").trim();
      const aria = String(el.attributes?.["aria-label"] || "").trim();
      if (!label && !aria) {
        issues.push({
          id: `a11y_input_${el.id}`,
          category: "accessibility",
          severity: "warning",
          title: `حقل إدخال بدون عنوان وصفي (${el.id})`,
          description: "يفضل ربط كل حقل إدخال بتسمية توضيحية للمستخدم.",
          targetId: el.id,
        });
      }
    }

    if (el.type === "heading") {
      const lvl = parseInt(String(el.content?.level || "h2").replace("h", ""), 10) || 2;
      if (previousHeadingLevel > 0 && lvl - previousHeadingLevel > 1) {
        issues.push({
          id: `a11y_heading_${el.id}`,
          category: "accessibility",
          severity: "warning",
          title: `قفزة في تسلسل العناوين (${displayName})`,
          description: `الانتقال المباشر من H${previousHeadingLevel} إلى H${lvl} يضعف التسلسل الهرمي الدلالي للصفحة.`,
          targetId: el.id,
          autoFixable: true,
          fixType: "fix_heading_level",
        });
      }
      previousHeadingLevel = lvl;
    }

    const ratio = calculateContrastRatio(
      el.styles?.textColor,
      el.styles?.backgroundColor || ds.colors.surface,
    );
    if (ratio !== null && ratio < 4.5) {
      issues.push({
        id: `a11y_contrast_${el.id}`,
        category: "accessibility",
        severity: ratio < 3 ? "error" : "warning",
        title: `تباين ألوان منخفض (${ratio}:1) في ${displayName}`,
        description: "ينصح بمعيار WCAG بنسبة تباين 4.5:1 على الأقل بين النص والخلفية لضمان وضوح القراءة.",
        targetId: el.id,
        autoFixable: true,
        fixType: "fix_contrast",
      });
    }

    // 2. Responsive Audits
    const widthPxMatch = String(el.styles?.width || "").match(/^(\d+)px$/i);
    if (widthPxMatch && Number(widthPxMatch[1]) > 390 && !el.responsiveStyles?.mobile?.width) {
      issues.push({
        id: `resp_width_${el.id}`,
        category: "responsive",
        severity: "error",
        title: `عرض ثابت كبير (${el.styles.width}) قد يسبب التمرير الأفقي على الهاتف`,
        description: `العنصر «${displayName}» يستخدم عرضاً ثابتاً أكبر من 390px بدون تخصيص متجاوب للهاتف.`,
        targetId: el.id,
        autoFixable: true,
        fixType: "fix_mobile_width",
      });
    }

    const fontPxMatch = String(el.styles?.fontSize || "").match(/^(\d+)px$/i);
    if (fontPxMatch && Number(fontPxMatch[1]) < 12) {
      issues.push({
        id: `resp_font_${el.id}`,
        category: "responsive",
        severity: "warning",
        title: `حجم خط صغير جداً (${el.styles.fontSize}) في ${displayName}`,
        description: "الأحجام الأقل من 12px يصعب قراءتها على شاشات الهواتف الذكية.",
        targetId: el.id,
        autoFixable: true,
        fixType: "fix_mobile_font",
      });
    }

    // 3. Design Consistency Audits
    if (
      el.styles?.textColor &&
      /^#[0-9a-f]{6}$/i.test(el.styles.textColor) &&
      !paletteColors.has(el.styles.textColor.toLowerCase())
    ) {
      issues.push({
        id: `cons_color_${el.id}`,
        category: "consistency",
        severity: "info",
        title: `لون نص خارج نظام التصميم (${el.styles.textColor})`,
        description: `العنصر «${displayName}» يستخدم لوناً غير معرّف في رموز نظام التصميم الموحد (Design Tokens).`,
        targetId: el.id,
        autoFixable: true,
        fixType: "align_color_token",
      });
    }
  }

  // Also audit live DOM Edits
  for (const [selector, edit] of Object.entries(draft.domEdits || {})) {
    if (selector.startsWith("__studio_") || !edit || typeof edit !== "object") continue;
    const widthMatch = String(edit.styles?.width || "").match(/^(\d+)px$/i);
    if (widthMatch && Number(widthMatch[1]) > 390 && !edit.responsiveStyles?.mobile?.width) {
      issues.push({
        id: `resp_dom_width_${selector}`,
        category: "responsive",
        severity: "warning",
        title: `تعديل DOM بعرض ثابت (${edit.styles?.width})`,
        description: `المحدد (${selector}) قد يتجاوز عرض شاشة الجوال (390px).`,
        selector,
      });
    }
    const domRatio = calculateContrastRatio(edit.styles?.color, edit.styles?.backgroundColor);
    if (domRatio !== null && domRatio < 4.5) {
      issues.push({
        id: `a11y_dom_contrast_${selector}`,
        category: "accessibility",
        severity: "warning",
        title: `تباين منخفض (${domRatio}:1) على العنصر الحي`,
        description: `المحدد (${selector}) يملك تبايناً أقل من 4.5:1 بين لون النص والخلفية.`,
        selector,
      });
    }
  }

  return issues;
}

/**
 * Compare two Studio snapshots (e.g., Draft vs Saved vs Published) and return structured diff items.
 */
export function compareStudioSnapshots(
  before: Pick<StudioDraft, "pages" | "elements" | "domEdits" | "designSystem"> | null | undefined,
  after: Pick<StudioDraft, "pages" | "elements" | "domEdits" | "designSystem"> | null | undefined,
): StudioDiffItem[] {
  const diffs: StudioDiffItem[] = [];
  const bPages = before?.pages || {};
  const aPages = after?.pages || {};
  const allPageIds = new Set([...Object.keys(bPages), ...Object.keys(aPages)]);

  for (const pageId of allPageIds) {
    const bp = bPages[pageId];
    const ap = aPages[pageId];
    if (!bp && ap) {
      diffs.push({
        id: `page_${pageId}`,
        scope: "page",
        changeType: "added",
        title: `إضافة صفحة: ${ap.name} (${ap.route})`,
        path: `pages.${pageId}`,
        beforeValue: null,
        afterValue: ap,
      });
    } else if (bp && !ap) {
      diffs.push({
        id: `page_${pageId}`,
        scope: "page",
        changeType: "deleted",
        title: `حذف صفحة: ${bp.name} (${bp.route})`,
        path: `pages.${pageId}`,
        beforeValue: bp,
        afterValue: null,
      });
    } else if (bp && ap) {
      const { revision: _r1, updatedAt: _u1, updatedBy: _b1, ...bClean } = bp;
      const { revision: _r2, updatedAt: _u2, updatedBy: _b2, ...aClean } = ap;
      if (JSON.stringify(bClean) !== JSON.stringify(aClean)) {
        diffs.push({
          id: `page_${pageId}`,
          scope: "page",
          changeType: "modified",
          title: `تعديل صفحة: ${ap.name} (${ap.route})`,
          path: `pages.${pageId}`,
          beforeValue: bClean,
          afterValue: aClean,
        });
      }
    }
  }

  const bElements = before?.elements || {};
  const aElements = after?.elements || {};
  const allElemIds = new Set([...Object.keys(bElements), ...Object.keys(aElements)]);

  for (const elemId of allElemIds) {
    const be = bElements[elemId];
    const ae = aElements[elemId];
    if (!be && ae) {
      diffs.push({
        id: `elem_${elemId}`,
        scope: "element",
        changeType: "added",
        title: `إضافة ${getElementDisplayName(ae)}`,
        path: `elements.${elemId}`,
        beforeValue: null,
        afterValue: ae,
      });
    } else if (be && !ae) {
      diffs.push({
        id: `elem_${elemId}`,
        scope: "element",
        changeType: "deleted",
        title: `حذف ${getElementDisplayName(be)}`,
        path: `elements.${elemId}`,
        beforeValue: be,
        afterValue: null,
      });
    } else if (be && ae) {
      const { revision: _r1, updatedAt: _u1, updatedBy: _b1, ...bClean } = be;
      const { revision: _r2, updatedAt: _u2, updatedBy: _b2, ...aClean } = ae;
      if (JSON.stringify(bClean) !== JSON.stringify(aClean)) {
        diffs.push({
          id: `elem_${elemId}`,
          scope: "element",
          changeType: "modified",
          title: `تعديل ${getElementDisplayName(ae)}`,
          path: `elements.${elemId}`,
          beforeValue: bClean,
          afterValue: aClean,
        });
      }
    }
  }

  const bEdits = before?.domEdits || {};
  const aEdits = after?.domEdits || {};
  const allSelectors = new Set(
    [...Object.keys(bEdits), ...Object.keys(aEdits)].filter((k) => !k.startsWith("__studio_")),
  );

  for (const selector of allSelectors) {
    const bd = bEdits[selector];
    const ad = aEdits[selector];
    if (!bd && ad && typeof ad === "object") {
      diffs.push({
        id: `dom_${selector}`,
        scope: "domEdit",
        changeType: "added",
        title: `تخصيص عنصر حي: ${ad.label || selector}`,
        path: `domEdits.${selector}`,
        beforeValue: null,
        afterValue: ad,
      });
    } else if (bd && typeof bd === "object" && !ad) {
      diffs.push({
        id: `dom_${selector}`,
        scope: "domEdit",
        changeType: "deleted",
        title: `إزالة تخصيص عنصر حي: ${bd.label || selector}`,
        path: `domEdits.${selector}`,
        beforeValue: bd,
        afterValue: null,
      });
    } else if (bd && ad && typeof bd === "object" && typeof ad === "object" && JSON.stringify(bd) !== JSON.stringify(ad)) {
      diffs.push({
        id: `dom_${selector}`,
        scope: "domEdit",
        changeType: "modified",
        title: `تحديث عنصر حي: ${ad.label || selector}`,
        path: `domEdits.${selector}`,
        beforeValue: bd,
        afterValue: ad,
      });
    }
  }

  if (
    before?.designSystem &&
    after?.designSystem &&
    JSON.stringify(before.designSystem) !== JSON.stringify(after.designSystem)
  ) {
    diffs.push({
      id: "design_system_tokens",
      scope: "designSystem",
      changeType: "modified",
      title: "تحديث رموز نظام التصميم والألوان (Design System)",
      path: "designSystem",
      beforeValue: before.designSystem,
      afterValue: after.designSystem,
    });
  }

  return diffs;
}

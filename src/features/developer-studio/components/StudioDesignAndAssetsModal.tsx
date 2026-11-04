/**
 * Developer Studio Pro — Design System Manager & Asset Manager Modal
 * 1. Global Design System Tokens (Colors, Theme Presets, Light/Dark, Typography Scale, Spacing, Radius, Shadows)
 *    with Global Token Impact Preview.
 * 2. Asset Manager (Upload Images & SVGs, Validate types/sizes, Search/Filter, Folders, Rename, Replace across draft,
 *    Usage tracking via `findAssetUsages`, and Deletion Protection for in-use assets).
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  StudioDraft,
  StudioDesignSystem,
  StudioAssetItem,
  normalizeStudioDesignSystem,
  findAssetUsages,
  createStudioId,
} from "../models/studio.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  Image as ImageIcon,
  Upload,
  FolderOpen,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Copy,
  RefreshCw,
  Sun,
  Moon,
  Type,
  Box,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudioSectionSaveDiscardBar } from "./StudioSectionSaveDiscardBar";

interface StudioDesignAndAssetsModalProps {
  isOpen: boolean;
  initialTab?: "design" | "assets";
  onClose: () => void;
  draft: StudioDraft;
  onUpdateDraft: (updatedDraft: StudioDraft, description?: string) => void;
  onApplyAssetToSelection?: (asset: StudioAssetItem) => void;
  onSaveChanges?: () => void;
  onDiscardChanges?: () => void;
  isSaving?: boolean;
}

const THEME_PRESETS: Record<
  StudioDesignSystem["themePreset"],
  { label: string; mode: "light" | "dark"; colors: StudioDesignSystem["colors"] }
> = {
  "pearl-light": {
    label: "لؤلؤي كلاسيكي (Pearl Light)",
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
  },
  "obsidian-dark": {
    label: "أوبسيديان داكن (Obsidian Dark)",
    mode: "dark",
    colors: {
      primary: "#6366f1",
      secondary: "#38bdf8",
      accent: "#fbbf24",
      background: "#090d16",
      surface: "#111827",
      textPrimary: "#f8fafc",
      textSecondary: "#94a3b8",
      border: "#1e293b",
      success: "#34d399",
      warning: "#fbbf24",
      danger: "#f87171",
    },
  },
  "emerald-luxury": {
    label: "زمردي فاخر (Emerald Luxury)",
    mode: "light",
    colors: {
      primary: "#059669",
      secondary: "#0d9488",
      accent: "#d97706",
      background: "#f0fdf4",
      surface: "#ffffff",
      textPrimary: "#064e3b",
      textSecondary: "#047857",
      border: "#a7f3d0",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
  "royal-gold": {
    label: "ذهبي ملكي (Royal Gold)",
    mode: "dark",
    colors: {
      primary: "#d97706",
      secondary: "#f59e0b",
      accent: "#fde68a",
      background: "#18130a",
      surface: "#261e10",
      textPrimary: "#fef3c7",
      textSecondary: "#d6d3d1",
      border: "#44371d",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
  "ocean-blue": {
    label: "محيطي احترافي (Ocean Blue)",
    mode: "light",
    colors: {
      primary: "#0284c7",
      secondary: "#2563eb",
      accent: "#06b6d4",
      background: "#f0f9ff",
      surface: "#ffffff",
      textPrimary: "#0c4a6e",
      textSecondary: "#0369a1",
      border: "#bae6fd",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    },
  },
};

const ASSET_FOLDERS = ["عام", "الشعارات", "الخلفيات", "الأيقونات", "المنتجات"];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"];
const MAX_ASSET_BYTES = 2 * 1024 * 1024; // 2 MB

export function StudioDesignAndAssetsModal({
  isOpen,
  initialTab = "design",
  onClose,
  draft,
  onUpdateDraft,
  onApplyAssetToSelection,
  onSaveChanges,
  onDiscardChanges,
  isSaving = false,
}: StudioDesignAndAssetsModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"design" | "assets">(initialTab);
  const hasUnsavedChanges = Boolean(draft?.hasUnsavedLocalChanges);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Normalized Design System state (guarantees colors, typography, spacing, radius, shadows exist)
  const ds: StudioDesignSystem = useMemo(
    () => normalizeStudioDesignSystem(draft?.designSystem),
    [draft?.designSystem],
  );

  // Asset Manager state
  const assets: StudioAssetItem[] = Array.isArray(draft?.assets) ? draft.assets : [];
  const [assetSearch, setAssetSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("الكل");
  const [selectedType, setSelectedType] = useState<"all" | "image" | "svg">("all");
  const [newAssetUrl, setNewAssetUrl] = useState("");
  const [newAssetName, setNewAssetName] = useState("");
  const [newAssetFolder, setNewAssetFolder] = useState("عام");
  const [renamingAssetId, setRenamingAssetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);
  const [replaceUrlValue, setReplaceUrlValue] = useState("");

  // Calculate global token impact
  const tokenImpact = useMemo(() => {
    const elemCount = Object.keys(draft.elements || {}).length;
    const pageCount = Object.keys(draft.pages || {}).length;
    const domEditCount = Object.keys(draft.domEdits || {}).filter(
      (k) => !k.startsWith("__studio_"),
    ).length;
    return { elemCount, pageCount, domEditCount };
  }, [draft]);

  const updateDesignSystem = (patch: Partial<StudioDesignSystem>) => {
    const nextDs: StudioDesignSystem = {
      ...ds,
      ...patch,
      colors: { ...ds.colors, ...(patch.colors || {}) },
      typography: { ...ds.typography, ...(patch.typography || {}) },
      spacing: { ...ds.spacing, ...(patch.spacing || {}) },
      radius: { ...ds.radius, ...(patch.radius || {}) },
      shadows: { ...ds.shadows, ...(patch.shadows || {}) },
    };
    onUpdateDraft({ ...draft, designSystem: nextDs }, "تحديث نظام التصميم الموحد");
  };

  const handleApplyPreset = (presetKey: StudioDesignSystem["themePreset"]) => {
    const preset = THEME_PRESETS[presetKey];
    if (!preset) return;
    updateDesignSystem({
      themePreset: presetKey,
      mode: preset.mode,
      colors: { ...preset.colors },
    });
    toast({
      title: `تم تطبيق سمة: ${preset.label}`,
      description: "تحدثت رموز الألوان والوضع العام في المسودة.",
    });
  };

  const handleApplyTokensToAllElements = () => {
    const nextElements = { ...draft.elements };
    Object.keys(nextElements).forEach((id) => {
      const el = nextElements[id];
      if (el.locked) return;
      const styles = { ...el.styles };
      styles.fontFamily = ds.typography.fontFamily;
      if (el.type === "card") {
        styles.backgroundColor = ds.colors.surface;
        styles.textColor = ds.colors.textPrimary;
        styles.borderColor = ds.colors.border;
        styles.borderRadius = ds.radius.card;
      } else if (el.type === "button") {
        styles.backgroundColor = ds.colors.primary;
        styles.textColor = "#ffffff";
        styles.borderRadius = ds.radius.button;
      } else if (el.type === "heading") {
        styles.textColor = ds.colors.textPrimary;
      } else if (el.type === "text") {
        styles.textColor = ds.colors.textSecondary;
      }
      nextElements[id] = {
        ...el,
        styles,
        updatedAt: new Date().toISOString(),
      };
    });
    onUpdateDraft(
      { ...draft, elements: nextElements },
      "تعميم رموز نظام التصميم على عناصر المسودة",
    );
    toast({
      title: "تم تعميم رموز التصميم على العناصر",
      description: `تم تحديث الألوان والخطوط والحواف على ${Object.keys(nextElements).length} عنصر في المسودة.`,
    });
  };

  // Asset Upload Handler (File Input)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      toast({
        title: "نوع الملف غير مدعوم",
        description: "يرجى رفع صورة بصيغة PNG أو JPG أو WEBP أو SVG فقط.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > MAX_ASSET_BYTES) {
      toast({
        title: "حجم الملف كبير جداً",
        description: "الحد الأقصى لحجم الأصل المرفوع هو 2 ميجابايت.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const isSvg = file.type === "image/svg+xml";
      const newAsset: StudioAssetItem = {
        id: createStudioId("asset", assets.map((a) => a.id)),
        name: file.name.replace(/\.[^.]+$/, ""),
        type: isSvg ? "svg" : "image",
        mimeType: file.type,
        url: dataUrl,
        folder: newAssetFolder,
        sizeBytes: file.size,
        alt: file.name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onUpdateDraft(
        { ...draft, assets: [newAsset, ...assets] },
        `رفع أصل جديد: ${newAsset.name}`,
      );
      toast({
        title: "تم رفع الأصل بنجاح",
        description: `أُضيف «${newAsset.name}» إلى مجلد ${newAssetFolder}.`,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddExternalAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = newAssetUrl.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith("https://") && !cleanUrl.startsWith("/") && !cleanUrl.startsWith("data:image/")) {
      toast({
        title: "رابط غير صالح",
        description: "يجب أن يبدأ الرابط بـ https:// أو مسار محلي /.",
        variant: "destructive",
      });
      return;
    }
    const isSvg = cleanUrl.toLowerCase().endsWith(".svg") || cleanUrl.startsWith("data:image/svg");
    const newAsset: StudioAssetItem = {
      id: createStudioId("asset", assets.map((a) => a.id)),
      name: newAssetName.trim() || "صورة مضافة",
      type: isSvg ? "svg" : "image",
      mimeType: isSvg ? "image/svg+xml" : "image/jpeg",
      url: cleanUrl,
      folder: newAssetFolder,
      sizeBytes: cleanUrl.length,
      alt: newAssetName.trim() || "صورة",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdateDraft(
      { ...draft, assets: [newAsset, ...assets] },
      `إضافة أصل: ${newAsset.name}`,
    );
    setNewAssetUrl("");
    setNewAssetName("");
    toast({ title: "تمت إضافة الأصل إلى المكتبة" });
  };

  const handleDeleteAsset = (asset: StudioAssetItem) => {
    const usages = findAssetUsages(asset, draft);
    if (usages.length > 0) {
      toast({
        title: "لا يمكن حذف أصل مستخدم حالياً",
        description: `الأصل «${asset.name}» مستخدم في ${usages.length} عنصر (${usages
          .slice(0, 2)
          .map((u) => u.label)
          .join("، ")}). استبدله أو أزله من العناصر أولاً.`,
        variant: "destructive",
      });
      return;
    }
    const filtered = assets.filter((a) => a.id !== asset.id);
    onUpdateDraft({ ...draft, assets: filtered }, `حذف الأصل: ${asset.name}`);
    toast({ title: "تم حذف الأصل من المكتبة" });
  };

  const handleReplaceAssetUrl = (asset: StudioAssetItem) => {
    const nextUrl = replaceUrlValue.trim();
    if (!nextUrl) return;
    const oldUrl = asset.url;

    const nextAssets = assets.map((a) =>
      a.id === asset.id ? { ...a, url: nextUrl, updatedAt: new Date().toISOString() } : a,
    );

    const nextElements = { ...draft.elements };
    Object.keys(nextElements).forEach((elId) => {
      const el = nextElements[elId];
      if (el.content?.assetId === asset.id || el.content?.src === oldUrl) {
        nextElements[elId] = {
          ...el,
          content: { ...el.content, src: nextUrl, assetId: asset.id },
          updatedAt: new Date().toISOString(),
        };
      }
    });

    const nextDomEdits = { ...(draft.domEdits || {}) };
    Object.keys(nextDomEdits).forEach((sel) => {
      if (sel.startsWith("__studio_")) return;
      const edit = nextDomEdits[sel];
      if (edit?.attributes?.src === oldUrl) {
        nextDomEdits[sel] = {
          ...edit,
          attributes: { ...edit.attributes, src: nextUrl },
        };
      }
    });

    onUpdateDraft(
      { ...draft, assets: nextAssets, elements: nextElements, domEdits: nextDomEdits },
      `استبدال رابط الأصل: ${asset.name}`,
    );
    setReplacingAssetId(null);
    setReplaceUrlValue("");
    toast({
      title: "تم استبدال الأصل في المكتبة وكافة العناصر المرتبطة",
    });
  };

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      if (selectedFolder !== "الكل" && asset.folder !== selectedFolder) return false;
      if (selectedType !== "all" && asset.type !== selectedType) return false;
      if (assetSearch.trim()) {
        const q = assetSearch.toLowerCase();
        return (
          asset.name.toLowerCase().includes(q) ||
          asset.folder.toLowerCase().includes(q) ||
          (asset.alt || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [assets, selectedFolder, selectedType, assetSearch]);

  if (!isOpen) return null;

  return (
    <aside
      dir="rtl"
      className="absolute top-0 left-0 bottom-0 z-40 flex w-[360px] sm:w-[430px] flex-col border-r border-border bg-card/98 backdrop-blur-md shadow-2xl overflow-hidden text-right font-cairo"
    >
      {/* Side Drawer Header (Matches Property Inspector & Pages/Layers Drawers) */}
      <div className="shrink-0 border-b px-3 py-2 bg-muted/30 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-black text-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>التصميم والهوية والوسائط</span>
          </h3>
          <p className="truncate text-[10px] text-muted-foreground mt-0.5">
            لوحات الألوان العالمية، الخطوط، ومكتبة الصور والأيقونات
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
          title="إغلاق درج التصميم والوسائط"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2 Drawer Tabs: Design System | Assets */}
      <div className="grid grid-cols-2 gap-1 border-b bg-muted/50 p-1 text-[11px] font-bold shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab("design")}
          className={`py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "design"
              ? "bg-card text-primary shadow-2xs border font-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          <span>نظام التصميم والهوية</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("assets")}
          className={`py-1.5 px-2 rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === "assets"
              ? "bg-card text-primary shadow-2xs border font-black"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>مدير الوسائط ({assets.length})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DESIGN SYSTEM MANAGER                              */}
      {/* ========================================================= */}
      {activeTab === "design" && (
        <div className="flex-1 overflow-y-auto space-y-3.5 p-3 text-xs">
            <StudioSectionSaveDiscardBar
              hasChanges={hasUnsavedChanges}
              onSave={onSaveChanges}
              onDiscard={onDiscardChanges}
              isSaving={isSaving}
              sectionLabel="نظام التصميم والهوية"
            />
            {/* Global Token Impact Preview Banner */}
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-black text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>معاينة أثر الرموز العالمية (Global Token Impact)</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  الرموز الحالية تؤثر على {tokenImpact.pageCount} صفحات، {tokenImpact.elemCount} عنصر استوديو، و{tokenImpact.domEditCount} تخصيص DOM حي.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyTokensToAllElements}
                className="h-8 text-xs font-bold gap-1.5 shrink-0 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>تطبيق الهوية على جميع عناصر المسودة</span>
              </Button>
            </div>

            {/* Theme Presets & Light/Dark Mode */}
            <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-primary" />
                  <span>السمات الجاهزة والوضع اللوني (Theme Presets)</span>
                </h4>
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                  <Button
                    type="button"
                    size="sm"
                    variant={ds.mode === "light" ? "default" : "ghost"}
                    onClick={() => updateDesignSystem({ mode: "light" })}
                    className="h-7 px-2.5 text-[11px] gap-1"
                  >
                    <Sun className="w-3.5 h-3.5" /> نهاري
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={ds.mode === "dark" ? "default" : "ghost"}
                    onClick={() => updateDesignSystem({ mode: "dark" })}
                    className="h-7 px-2.5 text-[11px] gap-1"
                  >
                    <Moon className="w-3.5 h-3.5" /> ليلي
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(THEME_PRESETS) as Array<StudioDesignSystem["themePreset"]>).map(
                  (key) => {
                    const preset = THEME_PRESETS[key];
                    const isSelected = ds.themePreset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleApplyPreset(key)}
                        className={`p-2 rounded-xl border text-right transition cursor-pointer space-y-1.5 ${
                          isSelected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate">{preset.label}</div>
                        <div className="flex items-center gap-1">
                          {[
                            preset.colors.primary,
                            preset.colors.secondary,
                            preset.colors.accent,
                            preset.colors.background,
                            preset.colors.textPrimary,
                          ].map((c, i) => (
                            <span
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-black/15"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* Color Tokens Grid */}
            <div className="p-3 rounded-xl border border-border bg-card space-y-2.5">
              <h4 className="font-black text-xs text-foreground">رموز الألوان العالمية (Color Tokens)</h4>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    ["primary", "اللون الأساسي"],
                    ["secondary", "اللون الثانوي"],
                    ["accent", "لون التمييز"],
                    ["background", "خلفية الصفحة"],
                    ["surface", "خلفية البطاقات"],
                    ["textPrimary", "النص الأساسي"],
                    ["textSecondary", "النص الفرعي"],
                    ["border", "لون الحدود"],
                    ["success", "حالة النجاح"],
                    ["warning", "حالة التنبيه"],
                    ["danger", "حالة الخطر"],
                  ] as const
                ).map(([colorKey, label]) => (
                  <div key={colorKey} className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground block">
                      {label}
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={
                          /^#[0-9a-f]{6}$/i.test(ds.colors[colorKey] || "")
                            ? ds.colors[colorKey]
                            : "#000000"
                        }
                        onChange={(e) =>
                          updateDesignSystem({
                            colors: { ...ds.colors, [colorKey]: e.target.value },
                          })
                        }
                        className="w-7 h-7 rounded border border-border p-0.5 cursor-pointer shrink-0 bg-background"
                      />
                      <Input
                        value={ds.colors[colorKey] || ""}
                        onChange={(e) =>
                          updateDesignSystem({
                            colors: { ...ds.colors, [colorKey]: e.target.value },
                          })
                        }
                        className="h-7 text-[11px] font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography & Spacing/Radius Tokens */}
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-primary" />
                  <span>مقياس الطباعة والخطوط (Typography Scale)</span>
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      عائلة الخط الأساسية
                    </label>
                    <select
                      value={ds.typography.fontFamily}
                      onChange={(e) =>
                        updateDesignSystem({
                          typography: {
                            ...ds.typography,
                            fontFamily: e.target.value,
                            headingFontFamily: e.target.value,
                          },
                        })
                      }
                      className="w-full h-8 rounded-lg border border-border bg-background px-2 text-xs"
                    >
                      <option value="Cairo, sans-serif">Cairo (القاهرة — افتراضي)</option>
                      <option value="'IBM Plex Sans Arabic', sans-serif">IBM Plex Sans Arabic</option>
                      <option value="'Readex Pro', sans-serif">Readex Pro</option>
                      <option value="'Plus Jakarta Sans', sans-serif">Plus Jakarta Sans</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        الحجم الأساسي
                      </label>
                      <Input
                        value={ds.typography.baseFontSize}
                        onChange={(e) =>
                          updateDesignSystem({
                            typography: { ...ds.typography, baseFontSize: e.target.value },
                          })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                        ارتفاع السطر (Line Height)
                      </label>
                      <Input
                        value={ds.typography.lineHeight}
                        onChange={(e) =>
                          updateDesignSystem({
                            typography: { ...ds.typography, lineHeight: e.target.value },
                          })
                        }
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border bg-card space-y-3">
                <h4 className="font-black text-sm text-foreground flex items-center gap-1.5">
                  <Box className="w-4 h-4 text-primary" />
                  <span>رموز المسافات واستدارة الحواف (Spacing & Radius)</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      استدارة البطاقات
                    </label>
                    <Input
                      value={ds.radius.card}
                      onChange={(e) =>
                        updateDesignSystem({
                          radius: { ...ds.radius, card: e.target.value },
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      استدارة الأزرار
                    </label>
                    <Input
                      value={ds.radius.button}
                      onChange={(e) =>
                        updateDesignSystem({
                          radius: { ...ds.radius, button: e.target.value },
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      المسافة بين الأقسام
                    </label>
                    <Input
                      value={ds.spacing.sectionGap}
                      onChange={(e) =>
                        updateDesignSystem({
                          spacing: { ...ds.spacing, sectionGap: e.target.value },
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                      الحشو الداخلي للبطاقات
                    </label>
                    <Input
                      value={ds.spacing.cardPadding}
                      onChange={(e) =>
                        updateDesignSystem({
                          spacing: { ...ds.spacing, cardPadding: e.target.value },
                        })
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: ASSET MANAGER                                      */}
        {/* ========================================================= */}
        {activeTab === "assets" && (
          <div className="flex-1 overflow-y-auto space-y-3.5 p-3 text-xs">
            <StudioSectionSaveDiscardBar
              hasChanges={hasUnsavedChanges}
              onSave={onSaveChanges}
              onDiscard={onDiscardChanges}
              isSaving={isSaving}
              sectionLabel="مدير الوسائط والأصول"
            />
            {/* Upload & Add Bar */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black text-foreground flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-primary" />
                  <span>رفع صور أو أيقونات SVG جديدة (بحد أقصى 2MB)</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={newAssetFolder}
                    onChange={(e) => setNewAssetFolder(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                  >
                    {ASSET_FOLDERS.map((f) => (
                      <option key={f} value={f}>
                        📁 {f}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground font-bold text-xs cursor-pointer hover:bg-primary/90">
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع ملف صورة / SVG</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <form onSubmit={handleAddExternalAsset} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="اسم الأصل (مثال: شعار المطعم)"
                  className="h-8 text-xs"
                />
                <Input
                  value={newAssetUrl}
                  onChange={(e) => setNewAssetUrl(e.target.value)}
                  placeholder="رابط الصورة https://... أو /assets/..."
                  className="h-8 text-xs font-mono text-left"
                />
                <Button type="submit" variant="outline" size="sm" className="h-8 text-xs font-bold">
                  إضافة الرابط إلى المكتبة
                </Button>
              </form>
            </div>

            {/* Search & Folder Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {["الكل", ...ASSET_FOLDERS].map((folder) => (
                  <Button
                    key={folder}
                    type="button"
                    size="sm"
                    variant={selectedFolder === folder ? "default" : "outline"}
                    onClick={() => setSelectedFolder(folder)}
                    className="h-7 text-[11px] px-2.5 gap-1"
                  >
                    <FolderOpen className="w-3 h-3" />
                    <span>{folder}</span>
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
                >
                  <option value="all">كل الأنواع</option>
                  <option value="image">صور (Images)</option>
                  <option value="svg">رسوم متجهة (SVG)</option>
                </select>
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={assetSearch}
                    onChange={(e) => setAssetSearch(e.target.value)}
                    placeholder="بحث في الأصول..."
                    className="h-8 pr-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Assets Grid */}
            {filteredAssets.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground border border-dashed rounded-xl">
                لا توجد أصول مطابقة في هذا المجلد. ارفع صورة أو ملف SVG أعلاه للبدء.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {filteredAssets.map((asset) => {
                  const usages = findAssetUsages(asset, draft);
                  const inUse = usages.length > 0;

                  return (
                    <div
                      key={asset.id}
                      className="rounded-xl border border-border bg-card overflow-hidden flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="h-32 bg-muted/60 flex items-center justify-center p-2 relative border-b">
                          <img
                            src={asset.url}
                            alt={asset.alt || asset.name}
                            className="max-h-full max-w-full object-contain rounded"
                          />
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <Badge variant="secondary" className="text-[9px] uppercase">
                              {asset.type}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] bg-background/90">
                              {asset.folder}
                            </Badge>
                          </div>
                          <Badge
                            variant={inUse ? "default" : "outline"}
                            className="absolute bottom-2 left-2 text-[9px]"
                            title={
                              inUse
                                ? `مستخدم في: ${usages.map((u) => u.label).join("، ")}`
                                : "غير مستخدم حالياً"
                            }
                          >
                            {inUse ? `مستخدم (${usages.length})` : "غير مستخدم"}
                          </Badge>
                        </div>

                        <div className="p-2.5 space-y-1.5">
                          {renamingAssetId === asset.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                className="h-7 text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 px-2 text-[10px]"
                                onClick={() => {
                                  if (renameValue.trim()) {
                                    onUpdateDraft(
                                      {
                                        ...draft,
                                        assets: assets.map((a) =>
                                          a.id === asset.id
                                            ? { ...a, name: renameValue.trim() }
                                            : a,
                                        ),
                                      },
                                      "إعادة تسمية أصل",
                                    );
                                  }
                                  setRenamingAssetId(null);
                                }}
                              >
                                حفظ
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-foreground truncate">
                                {asset.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingAssetId(asset.id);
                                  setRenameValue(asset.name);
                                }}
                                className="text-[10px] text-primary hover:underline cursor-pointer"
                              >
                                تسمية
                              </button>
                            </div>
                          )}

                          {inUse && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 truncate">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>مرتبط بـ: {usages.map((u) => u.label).join("، ")}</span>
                            </p>
                          )}

                          {replacingAssetId === asset.id && (
                            <div className="pt-1 space-y-1">
                              <Input
                                value={replaceUrlValue}
                                onChange={(e) => setReplaceUrlValue(e.target.value)}
                                placeholder="الرابط البديل الجديد..."
                                className="h-7 text-[11px] font-mono text-left"
                              />
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px]"
                                  onClick={() => setReplacingAssetId(null)}
                                >
                                  إلغاء
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-6 text-[10px]"
                                  onClick={() => handleReplaceAssetUrl(asset)}
                                >
                                  تأكيد الاستبدال
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-2 bg-muted/30 border-t flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {onApplyAssetToSelection && (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => {
                                onApplyAssetToSelection(asset);
                                onClose();
                              }}
                              className="h-7 px-2 text-[10px] font-bold"
                            >
                              تعيين للعنصر
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard?.writeText(asset.url);
                              toast({ title: "تم نسخ رابط الأصل" });
                            }}
                            className="h-7 px-2 text-[10px]"
                            title="نسخ الرابط"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReplacingAssetId(asset.id);
                              setReplaceUrlValue(asset.url);
                            }}
                            className="h-7 px-2 text-[10px]"
                            title="استبدال الأصل في كل العناصر"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAsset(asset)}
                          className={`h-7 px-2 text-[10px] ${
                            inUse
                              ? "text-muted-foreground opacity-50 cursor-not-allowed"
                              : "text-destructive hover:bg-destructive/10"
                          }`}
                          title={
                            inUse
                              ? "محمي من الحذف لأنه مستخدم حالياً في المسودة"
                              : "حذف الأصل"
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
    </aside>
  );
}

/**
 * Developer Studio Pro — Visual Editor Canvas
 * Provides interactive WYSIWYG canvas, responsive viewport simulation, live selection,
 * inline action toolbar, reordering, and element rendering.
 */

import React, { useState } from "react";
import {
  ElementModel,
  PageModel,
  ElementType,
  uniquePageElementIds,
} from "../models/studio.types";
import { StudioElementRenderer } from "./StudioElementRenderer";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Tablet,
  Smartphone,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface VisualEditorCanvasProps {
  page: PageModel;
  elements: Record<string, ElementModel>;
  selectedElementId: string | null;
  onSelectElement: (elementId: string | null) => void;
  onUpdateElement: (elementId: string, updates: Partial<ElementModel>) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  onMoveElement: (elementId: string, direction: "up" | "down") => void;
  onAddElement: (type: ElementType, parentId?: string | null) => void;
  className?: string;
}

export type ViewportMode = "desktop" | "tablet" | "mobile";

export function VisualEditorCanvas({
  page,
  elements,
  selectedElementId,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onMoveElement,
  onAddElement,
  className,
}: VisualEditorCanvasProps) {
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [zoom, setZoom] = useState<number>(100);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  const selectedElement = selectedElementId ? elements[selectedElementId] : null;

  // Root elements for this page (parentId === null) ordered by page.elementIds
  const rootElements = uniquePageElementIds(page.elementIds)
    .map((id) => elements[id])
    .filter((el): el is ElementModel =>
      !!el && el.pageId === page.id && el.parentId === null,
    );

  // Viewport width styling
  const getViewportWidth = () => {
    switch (viewport) {
      case "mobile":
        return "max-w-[390px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "w-full max-w-5xl";
    }
  };

  return (
    <div className={cn("flex-1 flex flex-col h-full overflow-hidden bg-slate-900/10 dark:bg-black/30", className)}>
      {/* Canvas Top Toolbar: Viewport & Zoom Controls */}
      <div className="shrink-0 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-xs">
        {/* Viewport switchers */}
        <div className="flex items-center gap-1 bg-muted/80 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setViewport("desktop")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer",
              viewport === "desktop"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="معاينة سطح المكتب (Desktop)"
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">شاشة كاملة</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport("tablet")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer",
              viewport === "tablet"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="معاينة التابلت (Tablet 768px)"
          >
            <Tablet size={14} />
            <span className="hidden sm:inline">تابلت</span>
          </button>
          <button
            type="button"
            onClick={() => setViewport("mobile")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer",
              viewport === "mobile"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
            title="معاينة الهاتف (Mobile 390px)"
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">هاتف</span>
          </button>
        </div>

        {/* Selected Element Quick Action Toolbar (Floating when element is selected) */}
        {selectedElement && (
          <div className="hidden md:flex items-center gap-1 bg-card border border-primary/40 px-3 py-1 rounded-xl shadow-sm text-xs animate-in fade-in duration-150">
            <span className="font-black text-primary ml-2 flex items-center gap-1">
              <Sparkles size={13} />
              {selectedElement.type}
            </span>

            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg"
              onClick={() => onMoveElement(selectedElement.id, "up")}
              title="تحريك لأعلى"
            >
              <ArrowUp size={14} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg"
              onClick={() => onMoveElement(selectedElement.id, "down")}
              title="تحريك لأسفل"
            >
              <ArrowDown size={14} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg"
              onClick={() => onDuplicateElement(selectedElement.id)}
              title="تكرار العنصر (Duplicate)"
            >
              <Copy size={14} />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg"
              onClick={() =>
                onUpdateElement(selectedElement.id, {
                  locked: !selectedElement.locked,
                })
              }
              title={selectedElement.locked ? "إلغاء القفل" : "قفل العنصر لمنع التعديل"}
            >
              {selectedElement.locked ? (
                <Lock size={14} className="text-amber-500" />
              ) : (
                <Unlock size={14} />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg"
              onClick={() =>
                onUpdateElement(selectedElement.id, {
                  layout: {
                    ...selectedElement.layout,
                    visibility: !selectedElement.layout.visibility,
                  },
                })
              }
              title={selectedElement.layout.visibility ? "إخفاء العنصر" : "إظهار العنصر"}
            >
              {selectedElement.layout.visibility ? <Eye size={14} /> : <EyeOff size={14} className="text-rose-500" />}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={selectedElement.locked}
              className="h-7 w-7 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              onClick={() => onDeleteElement(selectedElement.id)}
              title="حذف العنصر"
            >
              <Trash2 size={14} />
            </Button>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(50, z - 15))}
            className="p-1 hover:text-foreground rounded transition cursor-pointer"
            title="تصغير"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-[11px] font-bold w-10 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(150, z + 15))}
            className="p-1 hover:text-foreground rounded transition cursor-pointer"
            title="تكبير"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="p-1 hover:text-foreground rounded transition ml-1 cursor-pointer"
            title="إعادة ضبط 100%"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center cursor-default bg-dot-grid"
        onClick={() => onSelectElement(null)}
      >
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
            transition: "transform 0.15s ease-out",
          }}
          className={cn(
            "transition-all duration-300 w-full min-h-[600px] bg-background border border-border rounded-3xl shadow-xl flex flex-col p-6 sm:p-8",
            getViewportWidth(),
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Page Header / Route Badge */}
          <div className="pb-4 mb-6 border-b border-border/80 flex items-center justify-between gap-3 select-none">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-base font-black text-foreground">{page.name}</h2>
              </div>
              <p className="text-xs font-mono text-muted-foreground mt-0.5">{page.route}</p>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground bg-muted px-2.5 py-1 rounded-full border border-border">
              {rootElements.length} عناصر معروضة
            </span>
          </div>

          {/* Render Elements List */}
          {rootElements.length > 0 ? (
            <div className="space-y-4 flex-1">
              {rootElements.map((elem) => (
                <div
                  key={elem.id}
                  onMouseEnter={() => setHoveredElementId(elem.id)}
                  onMouseLeave={() => setHoveredElementId(null)}
                >
                  <StudioElementRenderer
                    element={elem}
                    allElements={elements}
                    isEditorMode={true}
                    isSelected={selectedElementId === elem.id}
                    selectedElementId={selectedElementId}
                    isHovered={hoveredElementId === elem.id}
                    onSelect={(id) => onSelectElement(id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed border-border rounded-2xl p-8 text-center bg-muted/20">
              <Sparkles size={36} className="text-primary mb-3" />
              <h3 className="text-base font-black text-foreground">الصفحة فارغة</h3>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-5">
                ابدأ ببناء الواجهة عبر إضافة أول عنصر من لوحة المكونات أدناه.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  size="sm"
                  onClick={() => onAddElement("heading")}
                  className="gap-1.5 text-xs font-bold rounded-xl"
                >
                  <Plus size={14} /> إضافة عنوان
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddElement("card")}
                  className="gap-1.5 text-xs font-bold rounded-xl"
                >
                  <Plus size={14} /> إضافة بطاقة
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAddElement("button")}
                  className="gap-1.5 text-xs font-bold rounded-xl"
                >
                  <Plus size={14} /> إضافة زر
                </Button>
              </div>
            </div>
          )}

          {/* Bottom Add Element Strip */}
          <div className="pt-6 mt-6 border-t border-dashed border-border/80 flex items-center justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddElement("card")}
              className="gap-1.5 text-xs font-bold border-dashed border-primary/40 text-primary hover:bg-primary/5 rounded-xl cursor-pointer"
            >
              <Plus size={14} />
              إضافة عنصر جديد للصفحة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Developer Studio Pro — Element Tree & Component Palette Panel
 */

import React, { useState } from "react";
import {
  ElementModel,
  PageModel,
  ElementType,
  getElementDisplayName,
} from "../models/studio.types";
import { cn } from "@/lib/utils";
import {
  Layers,
  Heading,
  Type,
  Square,
  Image as ImageIcon,
  CreditCard,
  Box,
  Table as TableIcon,
  TextCursorInput,
  Tag,
  SplitSquareVertical,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronRight,
  ChevronDown,
  Search,
  FilePlus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ElementTreePanelProps {
  pages: Record<string, PageModel>;
  activePageId: string;
  elements: Record<string, ElementModel>;
  selectedElementId: string | null;
  onSelectPage: (pageId: string) => void;
  onAddPage: (name: string, route: string) => void;
  onSelectElement: (elementId: string) => void;
  onAddElement: (type: ElementType, parentId?: string | null) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  onToggleVisibility: (elementId: string) => void;
  onToggleLock: (elementId: string) => void;
  className?: string;
}

const ELEMENT_TYPE_ICONS: Record<ElementType, React.ElementType> = {
  heading: Heading,
  text: Type,
  button: Square,
  image: ImageIcon,
  card: CreditCard,
  container: Box,
  table: TableIcon,
  input: TextCursorInput,
  badge: Tag,
  divider: SplitSquareVertical,
};

const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  heading: "عنوان",
  text: "نص وصفي",
  button: "زر وإجراء",
  image: "صورة",
  card: "بطاقة",
  container: "مجموعة عناصر",
  table: "جدول بيانات",
  input: "حقل إدخال",
  badge: "حالة",
  divider: "فاصل",
};

export function ElementTreePanel({
  pages,
  activePageId,
  elements,
  selectedElementId,
  onSelectPage,
  onAddPage,
  onSelectElement,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  onToggleVisibility,
  onToggleLock,
  className,
}: ElementTreePanelProps) {
  const [activeTab, setActiveTab] = useState<"tree" | "components" | "pages">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPageForm, setShowNewPageForm] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageRoute, setNewPageRoute] = useState("");

  const activePage = pages[activePageId];

  // Build a readable parent/child tree and keep each group together.
  const pageElements = Object.values(elements).filter((el) => el.pageId === activePageId);
  const pageOrder = new Map((activePage?.elementIds || []).map((id, index) => [id, index]));
  const sortTreeSiblings = (a: ElementModel, b: ElementModel) =>
    (a.layout?.order ?? pageOrder.get(a.id) ?? 0) - (b.layout?.order ?? pageOrder.get(b.id) ?? 0);
  const orderedPageElements: ElementModel[] = [];
  const visited = new Set<string>();
  const appendChildren = (parentId: string | null) => {
    pageElements
      .filter((element) => element.parentId === parentId && !visited.has(element.id))
      .sort(sortTreeSiblings)
      .forEach((element) => {
        visited.add(element.id);
        orderedPageElements.push(element);
        appendChildren(element.id);
      });
  };
  appendChildren(null);
  pageElements.filter((element) => !visited.has(element.id)).sort(sortTreeSiblings).forEach((element) => {
    visited.add(element.id);
    orderedPageElements.push(element);
    appendChildren(element.id);
  });
  const depthById = new Map<string, number>();
  orderedPageElements.forEach((element) => {
    let depth = 0;
    let parentId = element.parentId;
    const seenParents = new Set<string>();
    while (parentId && !seenParents.has(parentId)) {
      seenParents.add(parentId);
      depth += 1;
      parentId = elements[parentId]?.parentId || null;
    }
    depthById.set(element.id, Math.min(depth, 6));
  });

  // Search matches user-facing labels and content; internal identifiers are not shown.
  const filteredElements = orderedPageElements.filter((el) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const matchLabel = getElementDisplayName(el).toLowerCase().includes(query);
    const matchType = ELEMENT_TYPE_LABELS[el.type].toLowerCase().includes(query);
    const matchText = JSON.stringify(el.content || {}).toLowerCase().includes(query);
    return matchLabel || matchType || matchText;
  });

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() || !newPageRoute.trim()) return;
    const route = newPageRoute.startsWith("/") ? newPageRoute.trim() : `/${newPageRoute.trim()}`;
    onAddPage(newPageName.trim(), route);
    setNewPageName("");
    setNewPageRoute("");
    setShowNewPageForm(false);
  };

  return (
    <div className={cn("w-72 sm:w-80 border-l border-border bg-card flex flex-col h-full overflow-hidden select-none", className)}>
      {/* Header Tabs: Tree / Components / Pages */}
      <div className="shrink-0 p-3 border-b border-border bg-muted/30">
        <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("tree")}
            className={cn(
              "py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1",
              activeTab === "tree"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Layers size={13} />
            <span>الشجرة</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("components")}
            className={cn(
              "py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1",
              activeTab === "components"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Plus size={13} />
            <span>المكونات</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pages")}
            className={cn(
              "py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1",
              activeTab === "pages"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FilePlus size={13} />
            <span>الصفحات</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Element Tree */}
      {activeTab === "tree" && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Active Page Indicator & Search Bar */}
          <div className="p-3 border-b border-border/60 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs font-bold text-foreground">
              <span className="truncate">{activePage?.name || "الصفحة الحالية"}</span>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                {pageElements.length} عناصر
              </span>
            </div>
            <div className="relative">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في العناصر..."
                className="h-8 text-xs pr-8 rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Tree list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredElements.length > 0 ? (
              filteredElements.map((elem) => {
                const Icon = ELEMENT_TYPE_ICONS[elem.type] || Box;
                const isSelected = selectedElementId === elem.id;
                const excerpt = getElementDisplayName(elem);
                const depth = depthById.get(elem.id) || 0;

                return (
                  <div
                    key={elem.id}
                    onClick={() => onSelectElement(elem.id)}
                    style={{ marginRight: `${depth * 12}px` }}
                    className={cn(
                      "group flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer",
                      depth > 0 ? "border-r-2 border-primary/20" : "",
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-2xs"
                        : "hover:bg-muted/70 text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        size={14}
                        className={isSelected ? "text-primary-foreground" : "text-primary"}
                      />
                      <span className="truncate max-w-[120px]">{excerpt}</span>
                    </div>

                    {/* Quick Action Buttons on Tree Item */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(elem.id);
                        }}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                        title={elem.layout.visibility ? "إخفاء" : "إظهار"}
                      >
                        {elem.layout.visibility ? (
                          <Eye size={12} />
                        ) : (
                          <EyeOff size={12} className="text-rose-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLock(elem.id);
                        }}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                        title={elem.locked ? "إلغاء القفل" : "قفل"}
                      >
                        {elem.locked ? (
                          <Lock size={12} className="text-amber-400" />
                        ) : (
                          <Unlock size={12} />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateElement(elem.id);
                        }}
                        className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded transition cursor-pointer"
                        title="تكرار"
                      >
                        <Copy size={12} />
                      </button>

                      <button
                        type="button"
                        disabled={elem.locked}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteElement(elem.id);
                        }}
                        className="p-1 hover:bg-rose-500/20 text-rose-500 rounded transition cursor-pointer disabled:opacity-30"
                        title="حذف"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                لا توجد عناصر مطابقة
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Components Library Palette */}
      {activeTab === "components" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-[11px] font-bold text-muted-foreground mb-3">
            اضغط لإضافة المكون مباشرة للصفحة الحالية:
          </p>

          {(Object.keys(ELEMENT_TYPE_LABELS) as ElementType[]).map((type) => {
            const Icon = ELEMENT_TYPE_ICONS[type] || Box;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onAddElement(type, selectedElementId ? (elements[selectedElementId]?.type === "container" ? selectedElementId : null) : null)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border bg-background hover:bg-primary/5 hover:border-primary/50 text-foreground text-xs font-bold transition shadow-2xs group cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition">
                    <Icon size={15} />
                  </div>
                  <span>{ELEMENT_TYPE_LABELS[type]}</span>
                </div>
                <Plus size={14} className="text-muted-foreground group-hover:text-primary transition" />
              </button>
            );
          })}
        </div>
      )}

      {/* Tab 3: Pages Management */}
      {activeTab === "pages" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">صفحات التطبيق</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowNewPageForm(!showNewPageForm)}
              className="h-7 text-xs gap-1 rounded-lg font-bold"
            >
              <Plus size={12} /> صفحة جديدة
            </Button>
          </div>

          {showNewPageForm && (
            <form onSubmit={handleCreatePage} className="p-3 bg-muted/60 rounded-xl border space-y-2 text-xs">
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  اسم الصفحة:
                </label>
                <Input
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  placeholder="مثال: التقارير الخاصة"
                  className="h-8 text-xs bg-background"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-muted-foreground block mb-1">
                  المسار (Route):
                </label>
                <Input
                  value={newPageRoute}
                  onChange={(e) => setNewPageRoute(e.target.value)}
                  placeholder="/admin/custom-page"
                  className="h-8 text-xs font-mono bg-background"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewPageForm(false)}
                  className="h-7 text-xs"
                >
                  إلغاء
                </Button>
                <Button type="submit" size="sm" className="h-7 text-xs font-bold">
                  إضافة
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-1.5">
            {Object.values(pages).map((p) => {
              const isActive = p.id === activePageId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPage(p.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition text-right cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-background border-border text-foreground hover:bg-muted/60",
                  )}
                >
                  <div>
                    <div className="font-black truncate">{p.name}</div>
                    <div
                      className={cn(
                        "text-[10px] font-mono mt-0.5",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                      )}
                    >
                      {p.route}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10 font-bold">
                    {(p.elementIds || []).length} عناصر
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

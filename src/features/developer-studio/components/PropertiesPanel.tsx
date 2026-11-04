/**
 * Developer Studio Pro — Element Properties & Styling Panel
 * Provides rich live controls for Content, Typography, Colors, Dimensions,
 * Spacing, Borders, Alignment/Flex, Attributes, and Lock/Visibility status.
 */

import React, { useState } from "react";
import {
  ElementModel,
  ElementType,
  HeadingContent,
  TextContent,
  ButtonContent,
  ImageContent,
  CardContent,
  BadgeContent,
  InputContent,
  ContainerContent,
  DividerContent,
  PageModel,
  getElementDisplayName,
} from "../models/studio.types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Palette,
  Maximize,
  Sliders,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Smartphone,
  Tablet,
  Monitor,
} from "lucide-react";

interface PropertiesPanelProps {
  element: ElementModel | null;
  onUpdateElement: (elementId: string, updates: Partial<ElementModel>) => void;
  onDeleteElement: (elementId: string) => void;
  onDuplicateElement: (elementId: string) => void;
  pages?: Record<string, PageModel>;
  elements?: Record<string, ElementModel>;
  className?: string;
}

export function PropertiesPanel({
  element,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  pages = {},
  elements = {},
  className,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "layout" | "advanced">("content");

  if (!element) {
    return (
      <div
        className={cn(
          "w-80 shrink-0 border-r border-border bg-card/60 backdrop-blur p-6 flex flex-col items-center justify-center text-center text-muted-foreground",
          className,
        )}
      >
        <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center mb-3">
          <Sliders className="w-6 h-6 text-muted-foreground/60" />
        </div>
        <h3 className="font-bold text-foreground text-sm mb-1">خصائص العنصر</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          اختر أي عنصر من لوحة التصميم أو شجرة العناصر لتعديل نصوصه وتنسيقاته وأبعاده.
        </p>
      </div>
    );
  }

  const updateContent = (partialContent: Record<string, any>) => {
    onUpdateElement(element.id, {
      content: { ...element.content, ...partialContent },
    });
  };

  const updateStyles = (partialStyles: Record<string, any>) => {
    onUpdateElement(element.id, {
      styles: { ...element.styles, ...partialStyles },
    });
  };

  const updateLayout = (partialLayout: Record<string, any>) => {
    onUpdateElement(element.id, {
      layout: { ...element.layout, ...partialLayout },
    });
  };

  return (
    <div
      className={cn(
        "w-80 shrink-0 border-r border-border bg-card flex flex-col h-full overflow-hidden text-right font-cairo",
        className,
      )}
    >
      {/* Panel Header */}
      <div className="shrink-0 p-3.5 border-b border-border bg-muted/30 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-xs font-black shrink-0">
            {element.type.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-foreground truncate">
                {getElementDisplayName(element)}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              عدّل المحتوى والشكل أو طريقة عمل العنصر.
            </p>
          </div>
        </div>

        {/* Quick Actions (Lock, Hide, Duplicate, Delete) */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-md cursor-pointer",
              element.locked ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground",
            )}
            onClick={() => onUpdateElement(element.id, { locked: !element.locked })}
            title={element.locked ? "إلغاء القفل" : "قفل العنصر لمنع التعديل"}
          >
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-md cursor-pointer",
              !element.layout.visibility ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground",
            )}
            onClick={() => updateLayout({ visibility: !element.layout.visibility })}
            title={element.layout.visibility ? "إخفاء العنصر" : "إظهار العنصر"}
          >
            {element.layout.visibility ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={() => onDuplicateElement(element.id)}
            title="تكرار العنصر"
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={element.locked}
            className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive cursor-pointer disabled:opacity-40"
            onClick={() => onDeleteElement(element.id)}
            title={element.locked ? "العنصر مقفل لا يمكن حذفه" : "حذف العنصر"}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="shrink-0 grid grid-cols-4 m-2 bg-muted/60 p-0.5 rounded-lg border border-border/60">
          <TabsTrigger value="content" className="text-[11px] py-1 cursor-pointer">
            المحتوى
          </TabsTrigger>
          <TabsTrigger value="style" className="text-[11px] py-1 cursor-pointer">
            التنسيق
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-[11px] py-1 cursor-pointer">
            الأبعاد
          </TabsTrigger>
          <TabsTrigger value="advanced" className="text-[11px] py-1 cursor-pointer">
            عرض الأجهزة
          </TabsTrigger>
        </TabsList>

        {/* 1. CONTENT TAB */}
        <TabsContent value="content" className="flex-1 overflow-y-auto p-3.5 space-y-4 m-0">
          {element.locked && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>هذا العنصر مقفل لحمايته. يمكنك فك القفل من زر القفل بالأعلى للتعديل.</span>
            </div>
          )}

          {/* Heading Content */}
          {element.type === "heading" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">نص العنوان</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as HeadingContent).text || ""}
                  onChange={(e) => updateContent({ text: e.target.value })}
                  placeholder="اكتب العنوان هنا..."
                  className="text-xs text-right"
                />
              </div>

              <div>
                <Label className="text-xs font-bold mb-1.5 block">حجم العنوان</Label>
                <div className="grid grid-cols-6 gap-1">
                  {(["h1", "h2", "h3", "h4", "h5", "h6"] as const).map((lvl) => (
                    <Button
                      key={lvl}
                      type="button"
                      size="sm"
                      variant={
                        (element.content as HeadingContent).level === lvl
                          ? "default"
                          : "outline"
                      }
                      disabled={element.locked}
                      onClick={() => updateContent({ level: lvl })}
                      className="text-xs h-7 px-1 font-mono uppercase cursor-pointer"
                    >
                      {({ h1: "الأكبر", h2: "كبير", h3: "متوسط", h4: "صغير", h5: "أصغر", h6: "الأصغر" } as const)[lvl]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Text Content */}
          {element.type === "text" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">النص</Label>
                <Textarea
                  disabled={element.locked}
                  rows={5}
                  value={(element.content as TextContent).text || ""}
                  onChange={(e) => updateContent({ text: e.target.value })}
                  placeholder="اكتب النص هنا..."
                  className="text-xs text-right leading-relaxed"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">طريقة عرض النص</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      (element.content as TextContent).format !== "markdown"
                        ? "default"
                        : "outline"
                    }
                    disabled={element.locked}
                    onClick={() => updateContent({ format: "plain" })}
                    className="text-xs h-7 cursor-pointer"
                  >
                    نص عادي
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      (element.content as TextContent).format === "markdown"
                        ? "default"
                        : "outline"
                    }
                    disabled={element.locked}
                    onClick={() => updateContent({ format: "markdown" })}
                    className="text-xs h-7 cursor-pointer"
                  >
                    نص منسق
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Button actions in everyday language */}
          {element.type === "button" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">النص الظاهر على الزر</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as ButtonContent).label || ""}
                  onChange={(e) => updateContent({ label: e.target.value })}
                  placeholder="مثال: عرض التقرير"
                  className="text-xs text-right"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">ماذا يحدث عند الضغط؟</Label>
                <select
                  disabled={element.locked}
                  value={(element.content as ButtonContent).action || "none"}
                  onChange={(e) => updateContent({ action: e.target.value })}
                  className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                >
                  <option value="none">لا يحدث شيء</option>
                  <option value="link">الانتقال إلى صفحة داخل التطبيق</option>
                  <option value="external">فتح موقع خارجي</option>
                  <option value="alert">إظهار رسالة</option>
                  <option value="formula">حساب قيمة وعرض النتيجة</option>
                  <option value="toggle">إظهار أو إخفاء عنصر</option>
                  <option value="submit">إرسال نموذج</option>
                </select>
              </div>
              {(element.content as ButtonContent).action === "link" && Object.values(pages).length > 0 && (
                <div>
                  <Label className="text-xs font-bold mb-1.5 block">اختر صفحة الربط</Label>
                  <select
                    disabled={element.locked}
                    value={(element.content as ButtonContent).url || ""}
                    onChange={(e) => updateContent({ url: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="">اختر صفحة...</option>
                    {Object.values(pages).map((page) => (
                      <option key={page.id} value={page.route}>{page.name}</option>
                    ))}
                    {(element.content as ButtonContent).url && !Object.values(pages).some((page) => page.route === (element.content as ButtonContent).url) && (
                      <option value={(element.content as ButtonContent).url}>وجهة الربط الحالية</option>
                    )}
                  </select>
                </div>
              )}
              {["link", "external"].includes((element.content as ButtonContent).action || "") && (
                <div>
                  <Label className="text-xs font-bold mb-1.5 block">
                    {(element.content as ButtonContent).action === "external" ? "رابط الموقع الخارجي" : "عنوان صفحة الربط (يمكن تعديله)"}
                  </Label>
                  <Input
                    disabled={element.locked}
                    value={(element.content as ButtonContent).url || ""}
                    onChange={(e) => updateContent({ url: e.target.value })}
                    placeholder={(element.content as ButtonContent).action === "external" ? "https://example.com" : "/admin/menu"}
                    className="text-xs text-left"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">يمكنك اختيار صفحة موجودة أو تعديل وجهة الربط الحالية.</p>
                </div>
              )}
              {(element.content as ButtonContent).action === "alert" && (
                <div>
                  <Label className="text-xs font-bold mb-1.5 block">الرسالة التي ستظهر</Label>
                  <Textarea
                    disabled={element.locked}
                    rows={3}
                    value={(element.content as ButtonContent).message || ""}
                    onChange={(e) => updateContent({ message: e.target.value })}
                    placeholder="اكتب الرسالة هنا..."
                    className="text-xs text-right"
                  />
                </div>
              )}
              {(element.content as ButtonContent).action === "formula" && (
                <div>
                  <Label className="text-xs font-bold mb-1.5 block">المعادلة الحسابية</Label>
                  <Input
                    disabled={element.locked}
                    value={(element.content as ButtonContent).formula || ""}
                    onChange={(e) => updateContent({ formula: e.target.value })}
                    placeholder="مثال: (120 + 30) * 1.14"
                    className="text-xs text-left"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">استخدم الأرقام والأقواس وعلامات + − × ÷. لا حاجة إلى كتابة كود.</p>
                </div>
              )}
              {(element.content as ButtonContent).action === "toggle" && (
                <div>
                  <Label className="text-xs font-bold mb-1.5 block">العنصر الذي تريد إظهاره أو إخفاءه</Label>
                  <select
                    disabled={element.locked}
                    value={(element.content as ButtonContent).targetElementId || ""}
                    onChange={(e) => updateContent({ targetElementId: e.target.value })}
                    className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="">اختر عنصرًا من الصفحة...</option>
                    {Object.values(elements).filter((item) => item.pageId === element.pageId && item.id !== element.id).map((item) => (
                      <option key={item.id} value={item.id}>{getElementDisplayName(item)}</option>
                    ))}
                  </select>
                </div>
              )}
              {(element.content as ButtonContent).action === "submit" && (
                <p className="text-[10px] leading-5 text-muted-foreground bg-muted/50 p-2 rounded-lg">
                  يرسل البيانات عند وضع الزر داخل نموذج. إذا لم يوجد نموذج، سيظهر تنبيه يوضح ذلك في المعاينة.
                </p>
              )}
              <div>
                <Label className="text-xs font-bold mb-1.5 block">شكل الزر</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["default", "secondary", "outline", "destructive", "ghost"] as const).map((v) => {
                    const labels = { default: "أساسي", secondary: "ثانوي", outline: "بإطار", destructive: "تحذيري", ghost: "بسيط" };
                    return (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant={(element.content as ButtonContent).variant === v ? "default" : "outline"}
                        disabled={element.locked}
                        onClick={() => updateContent({ variant: v })}
                        className="text-[10px] h-7 px-1 cursor-pointer"
                      >
                        {labels[v]}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Image Content */}
          {element.type === "image" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">رابط الصورة</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as ImageContent).src || ""}
                  onChange={(e) => updateContent({ src: e.target.value })}
                  placeholder="https://..."
                  className="text-xs text-left font-mono"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">وصف الصورة</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as ImageContent).alt || ""}
                  onChange={(e) => updateContent({ alt: e.target.value })}
                  placeholder="وصف الصورة..."
                  className="text-xs text-right"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">طريقة ملاءمة الصورة</Label>
                <div className="grid grid-cols-3 gap-1">
                  {(["cover", "contain", "fill"] as const).map((fit) => (
                    <Button
                      key={fit}
                      type="button"
                      size="sm"
                      variant={(element.content as ImageContent).fit === fit ? "default" : "outline"}
                      disabled={element.locked}
                      onClick={() => updateContent({ fit })}
                      className="text-xs h-7 cursor-pointer"
                    >
                      {fit}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Card Content */}
          {element.type === "card" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">عنوان البطاقة</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as CardContent).title || ""}
                  onChange={(e) => updateContent({ title: e.target.value })}
                  placeholder="عنوان البطاقة..."
                  className="text-xs text-right"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">العنوان الفرعي</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as CardContent).subtitle || ""}
                  onChange={(e) => updateContent({ subtitle: e.target.value })}
                  placeholder="عنوان فرعي اختياري..."
                  className="text-xs text-right"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">وصف البطاقة</Label>
                <Textarea
                  disabled={element.locked}
                  rows={3}
                  value={(element.content as CardContent).description || ""}
                  onChange={(e) => updateContent({ description: e.target.value })}
                  placeholder="وصف تفصيلي للبطاقة..."
                  className="text-xs text-right"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs font-bold">إظهار ترويسة البطاقة</Label>
                <Switch
                  disabled={element.locked}
                  checked={(element.content as CardContent).showHeader !== false}
                  onCheckedChange={(checked) => updateContent({ showHeader: checked })}
                />
              </div>
            </div>
          )}

          {/* Badge Content */}
          {element.type === "badge" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">نص الشارة</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as BadgeContent).label || ""}
                  onChange={(e) => updateContent({ label: e.target.value })}
                  placeholder="نص الشارة..."
                  className="text-xs text-right"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">نوع الشارة (Variant)</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["default", "secondary", "outline", "destructive", "success"] as const).map(
                    (v) => (
                      <Button
                        key={v}
                        type="button"
                        size="sm"
                        variant={(element.content as BadgeContent).variant === v ? "default" : "outline"}
                        disabled={element.locked}
                        onClick={() => updateContent({ variant: v })}
                        className="text-xs h-7 cursor-pointer capitalize"
                      >
                        {v}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Input Content */}
          {element.type === "input" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">اسم الحقل</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as InputContent).label || ""}
                  onChange={(e) => updateContent({ label: e.target.value })}
                  placeholder="اسم الحقل..."
                  className="text-xs text-right"
                />
              </div>
              <div>
                <Label className="text-xs font-bold mb-1.5 block">النص المساعد</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as InputContent).placeholder || ""}
                  onChange={(e) => updateContent({ placeholder: e.target.value })}
                  placeholder="مثال: أدخل رقم الهاتف..."
                  className="text-xs text-right"
                />
              </div>
            </div>
          )}

          {/* Container Content */}
          {element.type === "container" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">أسلوب عرض المحتوى (Grid / List)</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={element.styles.display === "grid" ? "default" : "outline"}
                    disabled={element.locked}
                    onClick={() => {
                      updateStyles({
                        display: "grid",
                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                        gap: element.styles.gap || "16px",
                      });
                    }}
                    className="text-xs h-7 cursor-pointer"
                  >
                    شبكة (Grid)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      element.styles.display === "flex" &&
                      (element.content as ContainerContent).direction === "column"
                        ? "default"
                        : "outline"
                    }
                    disabled={element.locked}
                    onClick={() => {
                      updateContent({ direction: "column" });
                      updateStyles({
                        display: "flex",
                        flexDirection: "column",
                        gridTemplateColumns: "none",
                      });
                    }}
                    className="text-xs h-7 cursor-pointer"
                  >
                    قائمة رأسية (List)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={
                      element.styles.display !== "grid" &&
                      (element.content as ContainerContent).direction === "row"
                        ? "default"
                        : "outline"
                    }
                    disabled={element.locked}
                    onClick={() => {
                      updateContent({ direction: "row" });
                      updateStyles({
                        flexDirection: "row",
                        display: "flex",
                        gridTemplateColumns: "none",
                      });
                    }}
                    className="text-xs h-7 cursor-pointer"
                  >
                    صف أفقي (Row)
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={element.styles.display === "block" ? "default" : "outline"}
                    disabled={element.locked}
                    onClick={() => {
                      updateStyles({ display: "block", gridTemplateColumns: "none" });
                    }}
                    className="text-xs h-7 cursor-pointer"
                  >
                    كتلة عادية (Block)
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <Label className="text-xs font-bold">السماح بنقل العناصر إلى سطر جديد</Label>
                <Switch
                  disabled={element.locked}
                  checked={(element.content as ContainerContent).wrap !== false}
                  onCheckedChange={(checked) => {
                    updateContent({ wrap: checked });
                    updateStyles({ flexWrap: checked ? "wrap" : "nowrap" });
                  }}
                />
              </div>
            </div>
          )}

          {/* Divider Content */}
          {element.type === "divider" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold mb-1.5 block">نص في المنتصف (اختياري)</Label>
                <Input
                  disabled={element.locked}
                  value={(element.content as DividerContent).label || ""}
                  onChange={(e) => updateContent({ label: e.target.value })}
                  placeholder="نص فاصل..."
                  className="text-xs text-right"
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* 2. STYLE & TYPOGRAPHY TAB */}
        <TabsContent value="style" className="flex-1 overflow-y-auto p-3.5 space-y-4 m-0">
          {/* Typography Controls */}
          <div className="space-y-3 border-b border-border/60 pb-3.5">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 text-primary" />
              <span>الخطوط والطباعة</span>
            </h4>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  حجم الخط
                </Label>
                <Input
                  disabled={element.locked}
                  value={element.styles.fontSize || ""}
                  onChange={(e) => updateStyles({ fontSize: e.target.value })}
                  placeholder="16px"
                  className="text-xs font-mono h-8"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  سُمك الخط
                </Label>
                <select
                  disabled={element.locked}
                  value={element.styles.fontWeight || "400"}
                  onChange={(e) => updateStyles({ fontWeight: e.target.value })}
                  className="w-full text-xs h-8 px-2 rounded-md border border-border bg-background"
                >
                  <option value="300">رفيع (300)</option>
                  <option value="400">عادي (400)</option>
                  <option value="500">متوسط (500)</option>
                  <option value="600">شبه عريض (600)</option>
                  <option value="700">عريض (700)</option>
                  <option value="800">عريض جداً (800)</option>
                </select>
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                محاذاة النص
              </Label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { align: "right", icon: AlignRight },
                  { align: "center", icon: AlignCenter },
                  { align: "left", icon: AlignLeft },
                  { align: "justify", icon: AlignJustify },
                ].map(({ align, icon: Icon }) => (
                  <Button
                    key={align}
                    type="button"
                    size="sm"
                    variant={element.styles.textAlign === align ? "default" : "outline"}
                    disabled={element.locked}
                    onClick={() => updateStyles({ textAlign: align })}
                    className="h-7 cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Colors Controls */}
          <div className="space-y-3 border-b border-border/60 pb-3.5">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-primary" />
              <span>الألوان والمظهر</span>
            </h4>

            {/* Text Color */}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium">لون النص</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={element.locked}
                  value={element.styles.textColor || "#0f172a"}
                  onChange={(e) => updateStyles({ textColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-border p-0"
                />
                <Input
                  disabled={element.locked}
                  value={element.styles.textColor || ""}
                  onChange={(e) => updateStyles({ textColor: e.target.value })}
                  placeholder="#0f172a"
                  className="text-xs font-mono w-24 h-7"
                />
              </div>
            </div>

            {/* Background Color */}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium">لون الخلفية</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={element.locked}
                  value={element.styles.backgroundColor || "#ffffff"}
                  onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-border p-0"
                />
                <Input
                  disabled={element.locked}
                  value={element.styles.backgroundColor || ""}
                  onChange={(e) => updateStyles({ backgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="text-xs font-mono w-24 h-7"
                />
              </div>
            </div>

            {/* Border Color */}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs font-medium">لون الإطار</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={element.locked}
                  value={element.styles.borderColor || "#e2e8f0"}
                  onChange={(e) => updateStyles({ borderColor: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-border p-0"
                />
                <Input
                  disabled={element.locked}
                  value={element.styles.borderColor || ""}
                  onChange={(e) => updateStyles({ borderColor: e.target.value })}
                  placeholder="#e2e8f0"
                  className="text-xs font-mono w-24 h-7"
                />
              </div>
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <Label className="text-xs font-medium">الشفافية</Label>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {Math.round((element.styles.opacity ?? 1) * 100)}%
                </span>
              </div>
              <Slider
                disabled={element.locked}
                min={0}
                max={100}
                step={5}
                value={[(element.styles.opacity ?? 1) * 100]}
                onValueChange={(val) => updateStyles({ opacity: val[0] / 100 })}
              />
            </div>
          </div>

          {/* Borders & Shape */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-foreground">الإطار والانحناء</h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  سُمك الإطار
                </Label>
                <Input
                  disabled={element.locked}
                  value={element.styles.borderWidth || ""}
                  onChange={(e) => updateStyles({ borderWidth: e.target.value })}
                  placeholder="1px"
                  className="text-xs font-mono h-8"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  انحناء الزوايا
                </Label>
                <Input
                  disabled={element.locked}
                  value={element.styles.borderRadius || ""}
                  onChange={(e) => updateStyles({ borderRadius: e.target.value })}
                  placeholder="12px"
                  className="text-xs font-mono h-8"
                />
              </div>
            </div>

            {/* Shadow Preset */}
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                الظل
              </Label>
              <div className="grid grid-cols-5 gap-1">
                {(["none", "sm", "md", "lg", "xl"] as const).map((sh) => (
                  <Button
                    key={sh}
                    type="button"
                    size="sm"
                    variant={element.styles.boxShadow === sh ? "default" : "outline"}
                    disabled={element.locked}
                    onClick={() => updateStyles({ boxShadow: sh })}
                    className="text-[10px] h-7 px-1 uppercase cursor-pointer"
                  >
                    {sh}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. LAYOUT & DIMENSIONS TAB */}
        <TabsContent value="layout" className="flex-1 overflow-y-auto p-3.5 space-y-4 m-0">
          {/* Dimensions */}
          <div className="space-y-3 border-b border-border/60 pb-3.5">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Maximize className="w-3.5 h-3.5 text-primary" />
              <span>الأبعاد</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  العرض
                </Label>
                <Input
                  disabled={element.locked}
                  value={element.styles.width || ""}
                  onChange={(e) => updateStyles({ width: e.target.value })}
                  placeholder="100% أو 300px"
                  className="text-xs font-mono h-8"
                />
              </div>
              <div>
                <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                  الارتفاع
                </Label>
                <Input
                  disabled={element.locked}
                  value={element.styles.height || ""}
                  onChange={(e) => updateStyles({ height: e.target.value })}
                  placeholder="auto أو 200px"
                  className="text-xs font-mono h-8"
                />
              </div>
            </div>
          </div>

          {/* Padding */}
          <div className="space-y-2 border-b border-border/60 pb-3.5">
            <h4 className="text-xs font-bold text-foreground">المساحة الداخلية</h4>
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">أعلى</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.paddingTop || ""}
                  onChange={(e) => updateStyles({ paddingTop: e.target.value })}
                  placeholder="12px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">يمين</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.paddingRight || ""}
                  onChange={(e) => updateStyles({ paddingRight: e.target.value })}
                  placeholder="16px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">أسفل</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.paddingBottom || ""}
                  onChange={(e) => updateStyles({ paddingBottom: e.target.value })}
                  placeholder="12px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">يسار</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.paddingLeft || ""}
                  onChange={(e) => updateStyles({ paddingLeft: e.target.value })}
                  placeholder="16px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
            </div>
          </div>

          {/* Margin */}
          <div className="space-y-2 border-b border-border/60 pb-3.5">
            <h4 className="text-xs font-bold text-foreground">المساحة الخارجية</h4>
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">أعلى</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.marginTop || ""}
                  onChange={(e) => updateStyles({ marginTop: e.target.value })}
                  placeholder="0px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">يمين</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.marginRight || ""}
                  onChange={(e) => updateStyles({ marginRight: e.target.value })}
                  placeholder="0px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">أسفل</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.marginBottom || ""}
                  onChange={(e) => updateStyles({ marginBottom: e.target.value })}
                  placeholder="16px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block text-center mb-0.5">يسار</span>
                <Input
                  disabled={element.locked}
                  value={element.styles.marginLeft || ""}
                  onChange={(e) => updateStyles({ marginLeft: e.target.value })}
                  placeholder="0px"
                  className="text-[11px] font-mono h-7 text-center p-1"
                />
              </div>
            </div>
          </div>

          {/* Flexbox & Grid Display Mode */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-foreground">أسلوب عرض المحتوى والمحاذاة</h4>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <Button
                type="button"
                size="sm"
                variant={element.styles.display === "grid" ? "default" : "outline"}
                disabled={element.locked}
                onClick={() =>
                  updateStyles({
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: element.styles.gap || "16px",
                  })
                }
                className="text-[11px] h-7 cursor-pointer"
              >
                شبكة (Grid)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  element.styles.display === "flex" && element.styles.flexDirection === "column"
                    ? "default"
                    : "outline"
                }
                disabled={element.locked}
                onClick={() =>
                  updateStyles({
                    display: "flex",
                    flexDirection: "column",
                    gridTemplateColumns: "none",
                  })
                }
                className="text-[11px] h-7 cursor-pointer"
              >
                قائمة رأسية (List)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={
                  element.styles.display === "flex" && element.styles.flexDirection !== "column"
                    ? "default"
                    : "outline"
                }
                disabled={element.locked}
                onClick={() =>
                  updateStyles({
                    display: "flex",
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gridTemplateColumns: "none",
                  })
                }
                className="text-[11px] h-7 cursor-pointer"
              >
                صف أفقي (Row)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={element.styles.display === "block" ? "default" : "outline"}
                disabled={element.locked}
                onClick={() =>
                  updateStyles({
                    display: "block",
                    gridTemplateColumns: "none",
                  })
                }
                className="text-[11px] h-7 cursor-pointer"
              >
                كتلة عادية (Block)
              </Button>
            </div>
            <div>
              <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                المسافة بين العناصر
              </Label>
              <Input
                disabled={element.locked}
                value={element.styles.gap || ""}
                onChange={(e) => updateStyles({ gap: e.target.value })}
                placeholder="12px"
                className="text-xs font-mono h-8"
              />
            </div>
          </div>
        </TabsContent>

        {/* 4. ADVANCED & RESPONSIVE TAB */}
        <TabsContent value="advanced" className="flex-1 overflow-y-auto p-3.5 space-y-4 m-0">
          {/* Responsive Visibility Controls */}
          <div className="space-y-3 border-b border-border/60 pb-3.5">
            <h4 className="text-xs font-bold text-foreground">إعدادات الشاشات والاستجابة</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>إخفاء على الهواتف</span>
                </span>
                <Switch
                  disabled={element.locked}
                  checked={element.layout.responsive?.hideOnMobile || false}
                  onCheckedChange={(checked) =>
                    updateLayout({
                      responsive: { ...element.layout.responsive, hideOnMobile: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Tablet className="w-3.5 h-3.5" />
                  <span>إخفاء على الأجهزة اللوحية</span>
                </span>
                <Switch
                  disabled={element.locked}
                  checked={element.layout.responsive?.hideOnTablet || false}
                  onCheckedChange={(checked) =>
                    updateLayout({
                      responsive: { ...element.layout.responsive, hideOnTablet: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Monitor className="w-3.5 h-3.5" />
                  <span>إخفاء على الحواسيب</span>
                </span>
                <Switch
                  disabled={element.locked}
                  checked={element.layout.responsive?.hideOnDesktop || false}
                  onCheckedChange={(checked) =>
                    updateLayout({
                      responsive: { ...element.layout.responsive, hideOnDesktop: checked },
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            تُستخدم هذه الإعدادات لتحديد ظهور العنصر على الهاتف أو الجهاز اللوحي أو الحاسوب. لا تحتاج إلى تعديل أي أكواد.
          </div>
        </TabsContent>
      </Tabs>

      {/* Persistent Footer Delete Action */}
      <div className="shrink-0 p-3 border-t border-border bg-muted/20 flex items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={element.locked}
          onClick={() => onDeleteElement(element.id)}
          className="w-full h-8 text-xs font-bold gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>حذف هذا العنصر</span>
        </Button>
      </div>
    </div>
  );
}

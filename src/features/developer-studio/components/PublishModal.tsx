/**
 * Developer Studio Pro — Server-Confirmed Publish Workflow Modal
 * Performs pre-flight schema validation, change diff summary, automatic save-before-publish,
 * server-confirmed atomic publish with authoritative verification, and retry on failure.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  StudioDraft,
  StudioPublishedConfig,
  validateDraftHierarchy,
  compareStudioSnapshots,
} from "../models/studio.types";
import { studioService } from "../services/studioService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  ShieldAlert,
  Loader2,
  RefreshCw,
  GitCompare,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: StudioDraft;
  onPublishSuccess: (newRevision: number, updatedDraft?: StudioDraft) => void;
  onConflictDetected: (conflictInfo: any) => void;
}

export function PublishModal({
  isOpen,
  onClose,
  draft,
  onPublishSuccess,
  onConflictDetected,
}: PublishModalProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState("تحديث ونشر تصاميم الواجهات وتخطيط العناصر");
  const [author, setAuthor] = useState("admin");
  const [confirmed, setConfirmed] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedBaseline, setPublishedBaseline] = useState<StudioPublishedConfig | null>(null);
  const [publishResult, setPublishResult] = useState<{
    success: boolean;
    revision?: number;
    error?: string;
    offline?: boolean;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPublishResult(null);
      studioService
        .getPublishedConfig()
        .then((cfg) => setPublishedBaseline(cfg))
        .catch(() => setPublishedBaseline(null));
    }
  }, [isOpen]);

  // Pre-flight hierarchy & schema validation
  const validation = useMemo(() => validateDraftHierarchy(draft), [draft]);
  const diffs = useMemo(
    () => (publishedBaseline ? compareStudioSnapshots(publishedBaseline, draft) : []),
    [publishedBaseline, draft],
  );

  const pageCount = Object.keys(draft.pages || {}).length;
  const elementCount = Object.keys(draft.elements || {}).length;
  const domEditCount = Object.keys(draft.domEdits || {}).filter(
    (k) => !k.startsWith("__studio_"),
  ).length;
  const targetRevision = (publishedBaseline?.revision || draft.baseRevision || 1) + 1;

  const handlePublish = async () => {
    if (!validation.valid) {
      toast({
        title: "تعذر النشر",
        description: "يوجد أخطاء في التحقق من بنية المخطط يجب إصلاحها أولاً.",
        variant: "destructive",
      });
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const res = await studioService.publishDraft(draft, summary, author);

      if (res.success) {
        setPublishResult({ success: true, revision: res.newRevision });
        toast({
          title: "تم النشر والتأكيد السحابي بنجاح",
          description: `تم التحقق من الإصدار المنشور رقم #${res.newRevision} على Supabase وتفعيله في التطبيق.`,
        });
        const refreshedDraft = await studioService.getDraft(draft.owner);
        setTimeout(() => {
          onPublishSuccess(res.newRevision, refreshedDraft);
          onClose();
        }, 700);
      } else {
        if (res.conflict || res.error?.includes("CONCURRENCY_CONFLICT")) {
          onClose();
          onConflictDetected({ error: res.error, serverRevision: res.newRevision });
        } else {
          setPublishResult({
            success: false,
            error: res.error || "لم يؤكد الخادم عملية النشر.",
            offline: res.offline,
          });
          toast({
            title: "فشل النشر السحابي — لم يتم تعديل النسخة الحية",
            description:
              (res.error || "حدث خطأ أثناء الاتصال بالخادم.") +
              " تم الحفاظ على المسودة المحلية بالكامل.",
            variant: "destructive",
          });
        }
      }
    } catch (e: any) {
      setPublishResult({
        success: false,
        error: e?.message || "تعذر الاتصال بالخادم لإتمام النشر.",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isPublishing && onClose()}>
      <DialogContent className="max-w-xl text-right font-cairo sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-end mb-1">
            <Badge variant="outline" className="font-mono text-xs">
              Rev #{draft.baseRevision} → #{targetRevision}
            </Badge>
            <DialogTitle className="text-lg font-black text-foreground">
              تأكيد ونشر التعديلات (Server-Confirmed Publish)
            </DialogTitle>
            <UploadCloud className="w-5 h-5 text-primary shrink-0" />
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            يقوم الاستوديو أولاً بحفظ وتأكيد أحدث مسودة على Supabase، ثم ينشر اللقطة المحفوظة ذرّياً ويتحقق من الإصدار الجديد على الخادم قبل تحديث التطبيق الحي.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Unsaved local changes notice */}
          {draft.hasUnsavedLocalChanges && (
            <div className="bg-blue-500/10 border border-blue-500/25 text-blue-800 dark:text-blue-200 p-2.5 rounded-xl text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                توجد تعديلات محلية غير متزامنة: سيقوم زر النشر بحفظها وتأكيدها على Supabase أولاً قبل نشرها.
              </span>
            </div>
          )}

          {/* Validation Status Box */}
          {validation.valid ? (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">المخطط سليم وجاهز للنشر المؤكد (100% Validated)</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {pageCount} صفحات • {elementCount} عناصر • {domEditCount} تعديل حي
              </Badge>
            </div>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>فشل فحص سلامة المخطط ({validation.errors.length} خطأ):</span>
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-0.5 max-h-24 overflow-y-auto">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Diff Summary */}
          <div className="bg-muted/40 border border-border/80 rounded-xl p-2.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold text-foreground">
              <span className="flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-primary" />
                <span>ملخص الفروقات مقارنة بالنسخة المنشورة حالياً</span>
              </span>
              <Badge variant="outline" className="text-[10px]">
                {diffs.length} تغيير
              </Badge>
            </div>
            {diffs.length > 0 ? (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 text-[11px] text-muted-foreground">
                {diffs.slice(0, 8).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{d.title}</span>
                    <Badge
                      variant="outline"
                      className={
                        d.changeType === "added"
                          ? "text-emerald-600 border-emerald-500/30 text-[9px]"
                          : d.changeType === "deleted"
                            ? "text-rose-600 border-rose-500/30 text-[9px]"
                            : "text-amber-600 border-amber-500/30 text-[9px]"
                      }
                    >
                      {d.changeType === "added"
                        ? "إضافة"
                        : d.changeType === "deleted"
                          ? "حذف"
                          : "تعديل"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                لا توجد فروقات مسجلة أو جاري نشر نسخة تأكيدية جديدة.
              </p>
            )}
          </div>

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-2.5 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تنبيه: {validation.warnings[0]}</span>
            </div>
          )}

          {/* Publish Metadata Form */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                ملخص التحديث (Commit Note)
              </label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="اكتب وصفاً موجزاً للتعديلات المنشورة..."
                className="text-xs text-right"
                disabled={isPublishing}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-foreground block mb-1">
                اسم الناشر / المطور
              </label>
              <Input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="admin"
                className="text-xs text-right font-mono"
                disabled={isPublishing}
              />
            </div>

            {/* Explicit Confirmation Check */}
            <div className="flex items-center gap-2 bg-muted/40 p-3 rounded-xl border border-border/80">
              <input
                type="checkbox"
                id="confirmPublish"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="rounded cursor-pointer w-4 h-4"
                disabled={isPublishing || !validation.valid}
              />
              <label
                htmlFor="confirmPublish"
                className="text-xs text-foreground cursor-pointer select-none font-medium"
              >
                أؤكد اعتماد ونشر هذا المخطط بعد التحقق السحابي، مع حفظ النسخة السابقة للاسترجاع الآمن (Pre-Publish Rollback Point).
              </label>
            </div>
          </div>

          {/* Publishing Error Notice with Explicit Retry Action */}
          {publishResult && !publishResult.success && (
            <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-xl text-xs space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold">
                    فشل النشر على الخادم — لم يتم تغيير النسخة المنشورة ومسودتك محفوظة بالكامل:
                  </p>
                  <p className="text-[11px] leading-relaxed break-words">{publishResult.error}</p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="h-7 text-xs gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>إعادة محاولة النشر الآن</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-2 border-t pt-3 border-border/60">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPublishing}
            className="text-xs cursor-pointer"
          >
            إلغاء
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handlePublish}
            disabled={!confirmed || !validation.valid || isPublishing}
            className="text-xs font-bold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPublishing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ والنشر والتحقق السحابي...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>نشر الإصدار #{targetRevision} الآن</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

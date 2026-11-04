/**
 * Developer Studio Pro — Concurrency Conflict Resolution Workflow
 * Handles optimistic concurrency conflicts (baseRevision < serverRevision)
 * Offers Reload Latest, Smart Merge (preserving non-conflicting edits),
 * and Manual Compare/Override with explicit confirmation.
 */

import React, { useState } from "react";
import {
  StudioDraft,
  ConflictDetail,
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
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  GitMerge,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Layers,
  FileCode,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: StudioDraft;
  conflicts: ConflictDetail[];
  serverRevision: number;
  onResolved: (updatedDraft: StudioDraft) => void;
}

export function ConflictResolutionModal({
  isOpen,
  onClose,
  draft,
  conflicts,
  serverRevision,
  onResolved,
}: ConflictResolutionModalProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "compare">("list");
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  // 1. Reload latest from server (discard local draft)
  const handleReloadLatest = async () => {
    setIsProcessing(true);
    try {
      const freshDraft = await studioService.reloadLatestPublishedDraft(draft.owner);
      toast({
        title: "تم استرجاع أحدث إصدار من الخادم",
        description: `تم تحديث مساحة العمل لتطابق الإصدار الحالي #${freshDraft.baseRevision}.`,
      });
      onResolved(freshDraft);
      onClose();
    } catch (e: any) {
      toast({
        title: "خطأ في التحديث",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Smart Merge (combine non-conflicting changes with latest published config)
  const handleSmartMerge = async () => {
    setIsProcessing(true);
    try {
      const merged = await studioService.mergeWithLatest(draft);
      toast({
        title: "تم الدمج التلقائي بنجاح! 🔀",
        description: `تم دمج التعديلات المحلية غير المتعارضة وتحديث الإصدار المرجعي إلى #${merged.baseRevision}.`,
      });
      onResolved(merged);
      onClose();
    } catch (e: any) {
      toast({
        title: "فشل الدمج التلقائي",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Force override after explicit confirmation
  const handleForceOverride = async () => {
    if (!overrideConfirmed) return;
    setIsProcessing(true);
    try {
      // Advance base revision to current server revision
      const updatedDraft: StudioDraft = {
        ...draft,
        baseRevision: serverRevision,
        updatedAt: new Date().toISOString(),
        hasUnsavedLocalChanges: true,
        hasUnpublishedChanges: true,
      };
      // Conflict resolution changes only the in-memory draft. The user must click Save Draft.
      onResolved(updatedDraft);
      toast({
        title: "تم تحديث مرجع المسودة محليًا",
        description: `لم يتم حفظ التعديلات تلقائيًا. اضغط «حفظ المسودة» لتأكيد الإصدار المرجعي #${serverRevision} على Supabase.`,
      });
      onClose();
    } catch (e: any) {
      toast({
        title: "فشل التحديث",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="max-w-xl text-right font-cairo sm:rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 justify-end mb-1">
            <Badge variant="destructive" className="font-mono text-xs gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تعارض إصدارات (Conflict Rev #{draft.baseRevision} vs #{serverRevision})</span>
            </Badge>
            <DialogTitle className="text-lg font-black text-foreground">
              اكتشاف تعارض تعديلات متزامنة
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            تم نشر إصدار أحدث على الخادم (رقم #{serverRevision}) بواسطة مستخدم آخر منذ بدء جلسة التعديل الحالية. تم الحفاظ على مسودتك بالكامل دون فقدان أي بيانات.
          </DialogDescription>
        </DialogHeader>

        {/* Conflicts List */}
        <div className="space-y-3 py-2">
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-xs space-y-2">
            <h4 className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تفاصيل نقاط التعارض المحتملة ({conflicts.length}):</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pl-1">
              {conflicts.map((c, idx) => (
                <div
                  key={idx}
                  className="bg-background/80 p-2 rounded-lg border border-border/60 text-[11px] space-y-0.5"
                >
                  <div className="font-bold text-foreground">{c.title}</div>
                  <p className="text-muted-foreground">{c.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {/* Action 1: Smart Merge */}
            <div className="p-3 rounded-xl border border-border hover:border-primary/50 bg-card/60 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                  <GitMerge className="w-4 h-4 text-primary" />
                  <span>الدمج الذكي (Smart Merge)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  الحفاظ على تعديلاتك الحالية مع استيعاب صفحات وتعديلات الخادم الجديدة غير المتعارضة تلقائياً.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={handleSmartMerge}
                disabled={isProcessing}
                className="mt-3 w-full text-xs font-bold gap-1 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
                <span>تنفيذ الدمج الذكي</span>
              </Button>
            </div>

            {/* Action 2: Reload Latest */}
            <div className="p-3 rounded-xl border border-border hover:border-amber-500/50 bg-card/60 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mb-1">
                  <RefreshCw className="w-4 h-4 text-amber-600" />
                  <span>تحميل الأحدث (Reload Latest)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  إلغاء التعديلات المحلية غير المنشورة واستعادة الحالة المنشورة رسمياً على الخادم (#{serverRevision}).
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReloadLatest}
                disabled={isProcessing}
                className="mt-3 w-full text-xs font-bold gap-1 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>استعادة أحدث نسخة</span>
              </Button>
            </div>
          </div>

          {/* Action 3: Force Override Section */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="confirmOverride"
                checked={overrideConfirmed}
                onChange={(e) => setOverrideConfirmed(e.target.checked)}
                className="rounded cursor-pointer w-4 h-4"
                disabled={isProcessing}
              />
              <label
                htmlFor="confirmOverride"
                className="text-[11px] text-foreground font-medium cursor-pointer select-none"
              >
                أرغب في تجاوز التعارض يدوياً واعتماد مسودتي المحلية كمرجع رئيسي (Force Base Rev).
              </label>
            </div>
            {overrideConfirmed && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleForceOverride}
                disabled={isProcessing}
                className="w-full text-xs font-bold gap-1.5 cursor-pointer"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span>تحديث المرجع ونشر المسودة الحالية إجبارياً</span>
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row items-center justify-between border-t pt-3 border-border/60">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isProcessing}
            className="text-xs cursor-pointer"
          >
            إغلاق ومتابعة التعديل محلياً
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

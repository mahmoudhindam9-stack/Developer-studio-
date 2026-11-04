/**
 * Developer Studio Pro — History, Named Checkpoints, Version Comparison & Safe Rollback Modal
 * Supports:
 * 1. Viewing immutable published revisions from `studio_history`
 * 2. Creating and restoring named local/draft checkpoints (`namedSnapshots`)
 * 3. Restoring any version into the active draft WITHOUT deleting current history or overwriting live config
 * 4. Comparing any historical revision/checkpoint against the current draft
 * 5. Atomic server-confirmed rollback publication
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  StudioDraft,
  StudioHistoryRecord,
  StudioNamedSnapshot,
  compareStudioSnapshots,
} from "../models/studio.types";
import { studioService } from "../services/studioService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  History,
  RotateCcw,
  Clock,
  User,
  Layers,
  AlertTriangle,
  Loader2,
  BookmarkPlus,
  GitCompare,
  FileDown,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudioSectionSaveDiscardBar } from "./StudioSectionSaveDiscardBar";

interface HistoryRollbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRevision: number;
  draft?: StudioDraft;
  onRestoreToDraft?: (restoredDraft: StudioDraft, label: string) => void;
  onCreateCheckpoint?: (name: string, note: string) => void;
  onSaveChanges?: () => void;
  onDiscardChanges?: () => void;
  isSaving?: boolean;
  onRollbackSuccess: (newRevision: number) => void;
}

export function HistoryRollbackModal({
  isOpen,
  onClose,
  currentRevision,
  draft,
  onRestoreToDraft,
  onCreateCheckpoint,
  onSaveChanges,
  onDiscardChanges,
  isSaving = false,
  onRollbackSuccess,
}: HistoryRollbackModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"revisions" | "checkpoints" | "compare">("revisions");
  const hasUnsavedChanges = Boolean(draft?.hasUnsavedLocalChanges);
  const [history, setHistory] = useState<StudioHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetRecord, setTargetRecord] = useState<StudioHistoryRecord | null>(null);
  const [compareTarget, setCompareTarget] = useState<{
    label: string;
    snapshot: any;
  } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [checkpointName, setCheckpointName] = useState("");
  const [checkpointNote, setCheckpointNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const records = await studioService.getHistory();
      setHistory(records);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async (record: StudioHistoryRecord) => {
    setIsRollingBack(true);
    try {
      const res = await studioService.rollbackRevision(record.revision, "admin");
      if (res.success) {
        toast({
          title: "تم استرجاع ونشر الإصدار بنجاح",
          description: `تم استرجاع لقطة الإصدار #${record.revision} ونشرها كإصدار جديد برقم #${res.newRevision}.`,
        });
        onRollbackSuccess(res.newRevision);
        onClose();
      } else {
        toast({
          title: "فشل الاسترجاع السحابي",
          description: res.error || "تعذر استرجاع لقطة الإصدار المحدد.",
          variant: "destructive",
        });
      }
    } catch (e: any) {
      toast({
        title: "خطأ في عملية الاسترجاع",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsRollingBack(false);
      setTargetRecord(null);
    }
  };

  const handleRestoreSnapshotIntoDraft = (snapshot: any, label: string) => {
    if (!draft || !onRestoreToDraft) return;
    const restored = studioService.restoreSnapshotToLocalDraft(draft, snapshot);
    onRestoreToDraft(restored, label);
    toast({
      title: "تمت استعادة اللقطة إلى المسودة الحالية",
      description: `أصبحت «${label}» في المسودة للمعاينة والتعديل دون حذف السجل أو تغيير النسخة الحية.`,
    });
    onClose();
  };

  const handleAddCheckpoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkpointName.trim() || !onCreateCheckpoint) return;
    onCreateCheckpoint(checkpointName.trim(), checkpointNote.trim());
    setCheckpointName("");
    setCheckpointNote("");
    toast({
      title: "تم حفظ نقطة الاستعادة المسماة",
      description: "يمكنك استعادتها أو مقارنتها في أي وقت.",
    });
  };

  const compareDiffs = useMemo(() => {
    if (!compareTarget || !draft) return [];
    return compareStudioSnapshots(compareTarget.snapshot, draft);
  }, [compareTarget, draft]);

  const namedSnapshots: StudioNamedSnapshot[] = draft?.namedSnapshots || [];

  if (!isOpen) return null;

  return (
    <aside
      data-testid="studio-history-drawer"
      className="absolute top-0 left-0 bottom-0 z-40 flex w-[360px] sm:w-[440px] flex-col border-r border-border bg-card/98 backdrop-blur-md shadow-2xl overflow-hidden text-right font-cairo"
    >
      <div className="shrink-0 p-3 pb-2.5 border-b border-border flex items-center justify-between gap-2 bg-muted/20">
        <div className="flex items-center gap-2 min-w-0">
          <History className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs font-black text-foreground truncate">
              سجل الإصدارات ونقاط الحفظ والمقارنة
            </h3>
            <p className="text-[10px] text-muted-foreground truncate">
              الإصدار النشط: #{currentRevision} • مقارنة واستعادة آمنة للمسودة
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => !isRollingBack && onClose()}
          className="h-7 w-7 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer shrink-0"
          title="إغلاق الدرج"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col min-h-0 p-3 space-y-2.5 overflow-hidden">

        {/* Sub-navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-muted p-1 rounded-xl text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("revisions")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "revisions"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>الإصدارات المنشورة ({history.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checkpoints")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "checkpoints"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>نقاط الحفظ المسماة ({namedSnapshots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("compare")}
            className={`py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "compare"
                ? "bg-card text-foreground shadow-2xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>مقارنة النسخ {compareTarget ? `(${compareDiffs.length})` : ""}</span>
          </button>
        </div>

        {/* TAB 1: Published Revisions */}
        {activeTab === "revisions" && (
          <div className="flex-1 overflow-y-auto space-y-2.5 py-2">
            <StudioSectionSaveDiscardBar
              hasChanges={hasUnsavedChanges}
              onSave={onSaveChanges}
              onDiscard={onDiscardChanges}
              isSaving={isSaving}
              sectionLabel="الإصدارات المنشورة"
            />
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">جاري تحميل سجل التعديلات...</span>
              </div>
            ) : history.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                لا توجد إصدارات سابقة مسجلة بعد في الأرشيف.
              </div>
            ) : (
              history.map((item, index) => {
                const isCurrent = item.revision === currentRevision;
                const pageCount = Object.keys(item.snapshot?.pages || {}).length;
                const elemCount = Object.keys(item.snapshot?.elements || {}).length;

                return (
                  <div
                    key={item.id || item.revision || index}
                    className={`p-3.5 rounded-xl border transition-all text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                        : "bg-card hover:bg-muted/30 border-border"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-foreground">
                          الإصدار #{item.revision}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] bg-primary text-primary-foreground">
                            النشط حالياً
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.publishedAt).toLocaleString("ar-EG")}
                        </span>
                      </div>

                      <p className="text-foreground font-medium text-xs line-clamp-1">
                        {item.summary || "بدون ملخص"}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.publishedBy || "admin"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {pageCount} صفحات • {elemCount} عناصر
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCompareTarget({
                            label: `الإصدار المنشور #${item.revision}`,
                            snapshot: item.snapshot,
                          });
                          setActiveTab("compare");
                        }}
                        className="h-7 text-[11px] gap-1 cursor-pointer"
                      >
                        <GitCompare className="w-3 h-3" />
                        <span>مقارنة</span>
                      </Button>

                      {draft && onRestoreToDraft && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRestoreSnapshotIntoDraft(
                              item.snapshot,
                              `الإصدار #${item.revision}`,
                            )
                          }
                          className="h-7 text-[11px] gap-1 cursor-pointer"
                          title="استعادة هذه النسخة إلى المسودة فقط دون حذف السجل أو النشر المباشر"
                        >
                          <FileDown className="w-3 h-3" />
                          <span>استعادة للمسودة</span>
                        </Button>
                      )}

                      {!isCurrent && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isRollingBack}
                          onClick={() => setTargetRecord(item)}
                          className="h-7 text-[11px] font-bold gap-1 hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/40 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>نشر كإصدار جديد</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: Named Checkpoints */}
        {activeTab === "checkpoints" && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            <StudioSectionSaveDiscardBar
              hasChanges={hasUnsavedChanges}
              onSave={onSaveChanges}
              onDiscard={onDiscardChanges}
              isSaving={isSaving}
              sectionLabel="نقاط الحفظ المسماة"
            />
            {onCreateCheckpoint && (
              <form
                onSubmit={handleAddCheckpoint}
                className="p-3 rounded-xl border border-border bg-muted/40 space-y-2.5 text-xs"
              >
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <BookmarkPlus className="w-4 h-4 text-primary" />
                  <span>حفظ لقطة مسماة جديدة (Named Checkpoint) من المسودة الحالية</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    value={checkpointName}
                    onChange={(e) => setCheckpointName(e.target.value)}
                    placeholder="اسم اللقطة (مثال: قبل تعديل ألوان الهيدر)"
                    className="h-8 text-xs"
                    required
                  />
                  <Input
                    value={checkpointNote}
                    onChange={(e) => setCheckpointNote(e.target.value)}
                    placeholder="ملاحظة اختيارية..."
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" size="sm" className="h-7 text-xs font-bold gap-1">
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>حفظ اللقطة الآن</span>
                  </Button>
                </div>
              </form>
            )}

            {namedSnapshots.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                لا توجد نقاط حفظ مسماة بعد. احفظ نقطة استعادة أعلاه للرجوع إليها في أي وقت.
              </div>
            ) : (
              namedSnapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-3.5 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-foreground">{snap.name}</span>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Rev #{snap.baseRevision}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(snap.createdAt).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    {snap.note && <p className="text-muted-foreground text-[11px]">{snap.note}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompareTarget({
                          label: `لقطة: ${snap.name}`,
                          snapshot: snap.snapshot,
                        });
                        setActiveTab("compare");
                      }}
                      className="h-7 text-[11px] gap-1"
                    >
                      <GitCompare className="w-3 h-3" />
                      <span>مقارنة</span>
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => handleRestoreSnapshotIntoDraft(snap.snapshot, snap.name)}
                      className="h-7 text-[11px] font-bold gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة إلى المسودة</span>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: Version Comparison */}
        {activeTab === "compare" && (
          <div className="flex-1 overflow-y-auto space-y-3 py-2 text-xs">
            <StudioSectionSaveDiscardBar
              hasChanges={hasUnsavedChanges}
              onSave={onSaveChanges}
              onDiscard={onDiscardChanges}
              isSaving={isSaving}
              sectionLabel="مقارنة النسخ"
            />
            {!compareTarget ? (
              <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                اختر أي إصدار منشور أو لقطة مسماة واضغط «مقارنة» لعرض الفروقات التفصيلية مع مسودتك الحالية.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border">
                  <div>
                    <span className="font-black text-foreground">
                      مقارنة المسودة الحالية مع: {compareTarget.label}
                    </span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      إجمالي الاختلافات المكتشفة: {compareDiffs.length}
                    </p>
                  </div>
                  {draft && onRestoreToDraft && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleRestoreSnapshotIntoDraft(compareTarget.snapshot, compareTarget.label)
                      }
                      className="h-7 text-xs gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>استعادة هذه النسخة للمسودة</span>
                    </Button>
                  )}
                </div>

                {compareDiffs.length === 0 ? (
                  <div className="py-8 text-center text-emerald-600 font-bold bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    المسودة الحالية مطابقة تماماً لهذه النسخة.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {compareDiffs.map((diff) => (
                      <div
                        key={diff.id}
                        className="p-3 rounded-xl border border-border bg-card space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{diff.title}</span>
                          <Badge
                            variant="outline"
                            className={
                              diff.changeType === "added"
                                ? "text-emerald-600 border-emerald-500/30"
                                : diff.changeType === "deleted"
                                  ? "text-rose-600 border-rose-500/30"
                                  : "text-amber-600 border-amber-500/30"
                            }
                          >
                            {diff.changeType === "added"
                              ? "مضاف في المسودة"
                              : diff.changeType === "deleted"
                                ? "محذوف في المسودة"
                                : "معدّل في المسودة"}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground">{diff.path}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Confirmation Modal if Rollback target is selected */}
        {targetRecord && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-2 shrink-0">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>هل أنت متأكد من نشر استعادة الإصدار رقم #{targetRecord.revision}؟</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              سيتم إنشاء إصدار منشور جديد على الخادم يحمل محتويات اللقطة رقم #{targetRecord.revision} مع الاحتفاظ بجميع الإصدارات السابقة في السجل.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setTargetRecord(null)}
                disabled={isRollingBack}
                className="text-xs h-7 cursor-pointer"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleRollback(targetRecord)}
                disabled={isRollingBack}
                className="text-xs h-7 font-bold gap-1 cursor-pointer"
              >
                {isRollingBack ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                <span>تأكيد الاستعادة والنشر</span>
              </Button>
            </div>
          </div>
        )}

        <div className="shrink-0 border-t pt-2.5 border-border/60 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-7 cursor-pointer"
          >
            إغلاق الدرج
          </Button>
        </div>
      </div>
    </aside>
  );
}

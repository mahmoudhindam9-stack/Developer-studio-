import React from "react";
import { Save, RotateCcw, Sparkles } from "lucide-react";

interface StudioSectionSaveDiscardBarProps {
  /** Whether there are unsaved changes in the studio draft or current section */
  hasChanges: boolean;
  /** Callback to save the current changes */
  onSave?: () => void;
  /** Callback to discard the current changes */
  onDiscard?: () => void;
  /** Optional callback to reset only the selected element's edits */
  onResetElement?: () => void;
  /** Whether a save operation is currently in progress */
  isSaving?: boolean;
  /** Optional label for the section where edits were made */
  sectionLabel?: string;
}

/**
 * Integrated Save & Discard bar that remains completely hidden (`null`) when no edits exist,
 * and automatically appears inside every tool and section as soon as the user performs an edit.
 */
export function StudioSectionSaveDiscardBar({
  hasChanges,
  onSave,
  onDiscard,
  onResetElement,
  isSaving = false,
  sectionLabel,
}: StudioSectionSaveDiscardBarProps) {
  if (!hasChanges) {
    return null;
  }

  return (
    <div
      dir="rtl"
      data-testid="studio-section-save-discard-bar"
      className="my-2 rounded-xl border border-amber-500/40 bg-gradient-to-l from-amber-500/15 via-slate-900/95 to-emerald-500/15 p-2.5 shadow-lg transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>
            {sectionLabel
              ? `تعديلات غير محفوظة (${sectionLabel})`
              : "توجد تعديلات غير محفوظة"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60"
              title="حفظ التعديلات التي أجريتها"
            >
              <Save className="h-3 w-3" />
              <span>{isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}</span>
            </button>
          )}

          {onDiscard && (
            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-200 transition hover:bg-rose-500/25 disabled:opacity-60"
              title="تجاهل التعديلات والعودة لآخر نسخة محفوظة"
            >
              <RotateCcw className="h-3 w-3" />
              <span>تجاهل التعديلات</span>
            </button>
          )}

          {onResetElement && (
            <button
              type="button"
              onClick={onResetElement}
              disabled={isSaving}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/90 px-2 py-1 text-[10px] font-bold text-slate-300 transition hover:bg-slate-700 disabled:opacity-60"
              title="إلغاء تعديلات هذا العنصر فقط"
            >
              <span>إلغاء تعديل العنصر</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { StudioElementRenderer } from "./features/developer-studio/components/StudioElementRenderer";
import { studioService } from "./features/developer-studio/services/studioService";
import type { ElementModel, PageModel, StudioDraft } from "./features/developer-studio/models/studio.types";
import { DEFAULT_STUDIO_DESIGN_SYSTEM, uniquePageElementIds } from "./features/developer-studio/models/studio.types";
import "./styles.css";

function StudioPreview() {
  const [draft, setDraft] = useState<StudioDraft>(() => studioService.getImmediateLocalOrDefaultDraft("local-user"));
  const route = useMemo(() => {
    const value = new URLSearchParams(window.location.search).get("route") || "/";
    try { return decodeURIComponent(value); } catch { return value; }
  }, []);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let alive = true;
    studioService.syncWithServerInBackground("local-user").then(result => {
      if (alive) { setDraft(result.draft); setIsReady(true); }
    }).catch(() => setIsReady(true));
    let unsubscribe: (() => void) | undefined;
    studioService.subscribe(next => {
      if (alive) setDraft(next.draft);
    }).then(fn => { unsubscribe = fn; });
    return () => { alive = false; unsubscribe?.(); };
  }, []);

  const page = useMemo(() => {
    const exact = Object.values(draft.pages).find(item => item.route === route);
    return exact || Object.values(draft.pages)[0];
  }, [draft.pages, route]);
  const allElements = draft.elements || {};
  const rootElements = useMemo(() => {
    if (!page) return [];
    return uniquePageElementIds(page.elementIds || [])
      .map(id => allElements[id])
      .filter((element): element is ElementModel =>
        !!element && element.pageId === page.id && element.parentId == null
      )
      .sort((a,b) => (a.layout?.order || 0) - (b.layout?.order || 0));
  }, [page, allElements]);

  const design = draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM;
  const colors = design.colors;
  if (!isReady) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">جاري تحميل معاينة المسودة...</div>;

  return <div
    data-studio-preview-root="true"
    dir="rtl"
    className={design.mode === "dark" ? "dark min-h-screen" : "min-h-screen"}
    style={{
      background: colors.background,
      color: colors.textPrimary,
      fontFamily: design.typography.fontFamily,
      ["--preview-primary" as any]: colors.primary,
    }}
  >
    <div className="mx-auto min-h-screen w-full max-w-[1440px]">
      <div className="flex min-h-14 items-center justify-between border-b px-6" style={{background:colors.surface,borderColor:colors.border}}>
        <div className="flex items-center gap-2 font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{background:colors.primary}}>DS</span>
          <span>معاينة المشروع</span>
        </div>
        <span className="text-xs opacity-65">{page?.name || "صفحة"}</span>
      </div>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-5 sm:p-8" data-studio-page={page?.id || "page"}>
        {rootElements.map(element => <StudioElementRenderer
          key={element.id}
          element={element}
          allElements={allElements}
          isEditorMode={false}
          selectedElementId={null}
          className="max-w-full"
        />)}
        {!rootElements.length && <div className="rounded-xl border border-dashed p-12 text-center text-sm" style={{borderColor:colors.border,color:colors.textSecondary}}>لا توجد عناصر ظاهرة في هذه الصفحة.</div>}
      </main>
      <div className="border-t px-6 py-3 text-center text-[10px] opacity-55" style={{borderColor:colors.border}}>
        Developer Studio · معاينة من المسودة المحلية المستقلة
      </div>
    </div>
  </div>;
}

createRoot(document.getElementById("studio-preview-root")!).render(
  <React.StrictMode><StudioPreview /></React.StrictMode>
);

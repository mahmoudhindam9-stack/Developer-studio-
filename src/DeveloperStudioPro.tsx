import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, ArrowDownToLine, ArrowUp, CheckCircle2, Clock3, Code2, Eye, FileDown,
  FileUp, History, Layers, Palette, Plus, Redo2, RefreshCw, Save, ShieldCheck,
  Sparkles, Undo2, UploadCloud, Wand2, X, AlertTriangle
} from "lucide-react";
import type {
  StudioDraft, StudioPublishedConfig, ElementModel, ElementType, PageModel,
  StudioAssetItem, StudioReusableComponent, ConflictDetail, StudioDomEdit
} from "./features/developer-studio/models/studio.types";
import type { StudioToolTab } from "./features/developer-studio/components/StudioAdvancedToolsModal";
import {
  CURRENT_SCHEMA_VERSION, DEFAULT_STUDIO_DESIGN_SYSTEM, createStudioId,
  validateDraftHierarchy, getElementDisplayName, uniquePageElementIds
} from "./features/developer-studio/models/studio.types";
import { studioService, DEFAULT_STUDIO_PUBLISHED_CONFIG } from "./features/developer-studio/services/studioService";
import { LiveAppPreview } from "./features/developer-studio/components/LiveAppPreview";
import { StudioDesignAndAssetsModal } from "./features/developer-studio/components/StudioDesignAndAssetsModal";
import { StudioAdvancedToolsModal } from "./features/developer-studio/components/StudioAdvancedToolsModal";
import { HistoryRollbackModal } from "./features/developer-studio/components/HistoryRollbackModal";
import { PublishModal } from "./features/developer-studio/components/PublishModal";
import { ConflictResolutionModal } from "./features/developer-studio/components/ConflictResolutionModal";
import { useToast } from "./hooks/use-toast";

type SaveStatus = "loading" | "saved" | "saving" | "unsaved" | "error";
const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const stamp = () => new Date().toISOString();

function makeElement(type: ElementType, pageId: string, parentId: string | null, order: number): ElementModel {
  const id = createStudioId("elem");
  const defaults: Record<ElementType, { content: Record<string, any>; styles: Record<string, any>; name: string }> = {
    heading: { name: "عنوان جديد", content: { text: "عنوان جديد", level: "h2" }, styles: { fontSize: "24px", fontWeight: "800", textColor: "#182338", marginBottom: "12px" } },
    text: { name: "فقرة نصية", content: { text: "اكتب النص هنا..." }, styles: { fontSize: "14px", lineHeight: "1.7", textColor: "#475569", marginBottom: "12px" } },
    button: { name: "زر إجراء", content: { label: "زر إجراء", action: "none", variant: "default" }, styles: { backgroundColor: "#4f46e5", textColor: "#ffffff", borderRadius: "10px", paddingTop: "10px", paddingBottom: "10px", paddingLeft: "18px", paddingRight: "18px", fontWeight: "700" } },
    image: { name: "صورة", content: { src: "", alt: "صورة توضيحية", fit: "cover" }, styles: { width: "100%", maxWidth: "560px", borderRadius: "14px" } },
    card: { name: "بطاقة", content: { title: "عنوان البطاقة", subtitle: "وصف البطاقة", description: "", showHeader: true }, styles: { backgroundColor: "#ffffff", textColor: "#182338", borderColor: "#e2e8f0", borderWidth: "1px", borderStyle: "solid", borderRadius: "16px", padding: "20px", width: "48%" } },
    container: { name: "حاوية", content: { label: "مجموعة عناصر", direction: "row", wrap: true }, styles: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "12px", padding: "12px" } },
    table: { name: "جدول", content: { headers: ["العمود الأول", "العمود الثاني"], rows: [["قيمة 1", "قيمة 2"]] }, styles: { width: "100%", borderRadius: "10px" } },
    input: { name: "حقل إدخال", content: { name: "field", placeholder: "اكتب هنا..." }, styles: { width: "100%", padding: "10px", borderRadius: "8px" } },
    badge: { name: "شارة", content: { text: "جديد", variant: "default" }, styles: { padding: "5px 10px", borderRadius: "999px", backgroundColor: "#e0e7ff", textColor: "#3730a3" } },
    divider: { name: "فاصل", content: {}, styles: { width: "100%", borderWidth: "1px", borderStyle: "solid", borderColor: "#e2e8f0", marginTop: "12px", marginBottom: "12px" } },
  };
  const preset = defaults[type];
  return {
    id, pageId, parentId, type, name: preset.name, content: copy(preset.content), styles: copy(preset.styles),
    layout: { position: "static", order, visibility: true }, attributes: { "data-studio-id": id },
    locked: false, schemaVersion: CURRENT_SCHEMA_VERSION, revision: 1, updatedAt: stamp(), updatedBy: "local-user"
  };
}

export function DeveloperStudioPro() {
  const { toast } = useToast();
  const [draft, setDraft] = useState<StudioDraft>(() => studioService.getImmediateLocalOrDefaultDraft("local-user"));
  const [published, setPublished] = useState<StudioPublishedConfig>(() => studioService.getImmediateLocalOrDefaultPublishedConfig());
  const [serverSavedDraft, setServerSavedDraft] = useState<StudioDraft | null>(null);
  const [activePageId, setActivePageId] = useState(() => Object.keys(studioService.getImmediateLocalOrDefaultDraft("local-user").pages)[0] || "page_home");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedDomSelector, setSelectedDomSelector] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [isSaving, setIsSaving] = useState(false);
  const [showDesign, setShowDesign] = useState(false);
  const [designTab, setDesignTab] = useState<"design" | "assets">("design");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<StudioToolTab>("command");
  const [showHistory, setShowHistory] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showConflict, setShowConflict] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictDetail[]>([]);
  const [conflictRevision, setConflictRevision] = useState(1);
  const [xRayMode, setXRayMode] = useState(false);
  const [closeDrawersSignal, setCloseDrawersSignal] = useState(0);
  const [assetPickerCallback, setAssetPickerCallback] = useState<((url: string) => void) | null>(null);
  const [historyStack, setHistoryStack] = useState<StudioDraft[]>([]);
  const [historyPointer, setHistoryPointer] = useState(0);
  const [notice, setNotice] = useState("");
  const debounceRef = useRef<number | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const pages = draft.pages || {};
  const elements = draft.elements || {};
  const activePage = pages[activePageId] || Object.values(pages)[0];
  const pageElements = useMemo(
    () => activePage ? uniquePageElementIds(activePage.elementIds || []).map(id => elements[id]).filter(Boolean) : [],
    [activePage, elements]
  );
  const unsaved = Boolean(draft.hasUnsavedLocalChanges);
  const hasLocalChanges = unsaved || Boolean(draft.hasUnpublishedChanges);

  useEffect(() => {
    let active = true;
    studioService.syncWithServerInBackground("local-user").then(result => {
      if (!active) return;
      setDraft(result.draft);
      setPublished(result.publishedConfig);
      setServerSavedDraft(result.serverSavedDraft);
      setActivePageId(prev => result.draft.pages[prev] ? prev : Object.keys(result.draft.pages)[0]);
      setHistoryStack([copy(result.draft)]);
      setHistoryPointer(0);
      setStatus("saved");
    }).catch(() => {
      if (active) setStatus("saved");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draft || !Object.keys(draft.pages || {}).length) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    setStatus(unsaved ? "saving" : "saved");
    if (!unsaved) return;
    const snapshot = copy(draft);
    debounceRef.current = window.setTimeout(() => {
      studioService.saveLocalDraft(snapshot);
      setStatus("saved");
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [draft, unsaved]);

  const commitDraftChange = useCallback((incoming: StudioDraft, description?: string) => {
    const changed: StudioDraft = {
      ...incoming,
      updatedAt: stamp(),
      hasUnsavedLocalChanges: true,
      hasUnpublishedChanges: true,
    };
    studioService.saveLocalDraft(changed);
    setDraft(changed);
    setHistoryStack(prev => [...prev.slice(0, historyPointer + 1), copy(changed)].slice(-35));
    setHistoryPointer(prev => Math.min(prev + 1, 34));
    setSelectedDomSelector(null);
    setNotice(description || "");
    setStatus("unsaved");
  }, [historyPointer]);

  const saveDraft = async () => {
    setIsSaving(true);
    try {
      const validation = validateDraftHierarchy(draft);
      if (!validation.valid) {
        setStatus("error");
        toast({ title: "المسودة تحتاج إلى تصحيح", description: validation.errors.slice(0, 5).join(" • "), variant: "destructive" });
        return;
      }
      const result = await studioService.saveDraft(draft);
      if (!result.success) throw new Error(result.error || "تعذر حفظ المسودة.");
      const saved = await studioService.getDraft("local-user");
      setDraft(saved);
      setServerSavedDraft(saved);
      setStatus("saved");
      toast({ title: "تم حفظ المسودة محلياً", description: "التغييرات محفوظة في مساحة الاستوديو المستقلة على هذا المتصفح." });
    } catch (error: any) {
      setStatus("error");
      toast({ title: "فشل الحفظ", description: error?.message || "تعذر حفظ المسودة.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const discardDraft = async () => {
    if (!window.confirm("هل تريد تجاهل التعديلات غير المحفوظة واستعادة آخر مسودة محفوظة؟")) return;
    const restored = await studioService.discardDraft("local-user");
    setDraft(restored);
    setActivePageId(Object.keys(restored.pages)[0]);
    setSelectedElementId(null);
    setStatus("saved");
    toast({ title: "تم استرجاع آخر مسودة محفوظة" });
  };

  const undo = () => {
    if (historyPointer <= 0) return;
    const prev = copy(historyStack[historyPointer - 1]);
    prev.updatedAt = stamp();
    prev.hasUnpublishedChanges = true;
    prev.hasUnsavedLocalChanges = true;
    studioService.saveLocalDraft(prev);
    setHistoryPointer(p => p - 1);
    setDraft(prev);
    setStatus("unsaved");
  };
  const redo = () => {
    if (historyPointer >= historyStack.length - 1) return;
    const next = copy(historyStack[historyPointer + 1]);
    next.updatedAt = stamp();
    next.hasUnpublishedChanges = true;
    next.hasUnsavedLocalChanges = true;
    studioService.saveLocalDraft(next);
    setHistoryPointer(p => p + 1);
    setDraft(next);
    setStatus("unsaved");
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void saveDraft(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setAdvancedTab("command"); setShowAdvanced(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const addPage = (name: string, route: string) => {
    const id = createStudioId("page", Object.keys(draft.pages));
    const page: PageModel = {
      id, name, route, description: "صفحة جديدة قابلة للتخصيص", visibleInNav: true,
      elementIds: [], styles: {}, schemaVersion: CURRENT_SCHEMA_VERSION, revision: 1, updatedAt: stamp(), updatedBy: "local-user"
    };
    commitDraftChange({ ...draft, pages: { ...draft.pages, [id]: page } }, "إضافة صفحة جديدة");
    setActivePageId(id);
    setSelectedElementId(null);
  };
  const duplicatePage = (pageId: string) => {
    const original = draft.pages[pageId];
    if (!original) return;
    const id = createStudioId("page", Object.keys(draft.pages));
    const page: PageModel = { ...copy(original), id, name: original.name + " - نسخة", route: original.route === "/" ? "/copy" : original.route + "-copy", elementIds: [], updatedAt: stamp() };
    const nextElements = { ...draft.elements };
    const idMap = new Map<string,string>();
    original.elementIds.forEach(oldId => idMap.set(oldId, createStudioId("elem")));
    original.elementIds.forEach(oldId => {
      const current = draft.elements[oldId];
      if (!current) return;
      const newId = idMap.get(oldId)!;
      nextElements[newId] = { ...copy(current), id:newId, pageId:id, parentId:current.parentId ? (idMap.get(current.parentId) || null) : null, attributes:{...current.attributes,"data-studio-id":newId}, updatedAt:stamp() };
      page.elementIds.push(newId);
    });
    commitDraftChange({ ...draft, pages:{...draft.pages,[id]:page}, elements:nextElements }, "تكرار الصفحة");
    setActivePageId(id);
  };
  const deletePage = (pageId: string) => {
    if (Object.keys(draft.pages).length <= 1) {
      toast({ title: "لا يمكن حذف آخر صفحة", description: "يجب أن يحتوي المشروع على صفحة واحدة على الأقل.", variant: "destructive" });
      return;
    }
    const page = draft.pages[pageId];
    if (!page || !window.confirm("حذف الصفحة وجميع عناصرها؟")) return;
    const ids = new Set(page.elementIds);
    const nextPages = { ...draft.pages };
    delete nextPages[pageId];
    const nextElements = Object.fromEntries(Object.entries(draft.elements).filter(([id]) => !ids.has(id)));
    commitDraftChange({ ...draft, pages:nextPages, elements:nextElements }, "حذف صفحة");
    setActivePageId(Object.keys(nextPages)[0]);
    setSelectedElementId(null);
  };
  const updatePage = (pageId: string, changes: Partial<PageModel>) => {
    const current = draft.pages[pageId];
    if (!current) return;
    commitDraftChange({ ...draft, pages:{...draft.pages,[pageId]:{...current,...changes,updatedAt:stamp()}} }, "تحديث بيانات الصفحة");
  };
  const addElement = (type: ElementType, parentId?: string | null) => {
    if (!activePage) return;
    const element = makeElement(type, activePage.id, parentId ?? null, pageElements.length + 1);
    const page = { ...activePage, elementIds: [...activePage.elementIds, element.id], updatedAt:stamp() };
    commitDraftChange({ ...draft, pages:{...draft.pages,[page.id]:page}, elements:{...draft.elements,[element.id]:element} }, "إضافة عنصر جديد");
    setSelectedElementId(element.id);
  };
  const deleteElement = (id: string) => {
    const nextElements = { ...draft.elements };
    const remove = new Set([id]);
    let changed = true;
    while (changed) {
      changed = false;
      Object.values(nextElements).forEach(el => { if (el.parentId && remove.has(el.parentId) && !remove.has(el.id)) { remove.add(el.id); changed = true; } });
    }
    remove.forEach(key => delete nextElements[key]);
    const nextPages = { ...draft.pages };
    Object.values(nextPages).forEach(page => { page.elementIds = page.elementIds.filter(key => !remove.has(key)); });
    commitDraftChange({ ...draft, elements:nextElements, pages:nextPages }, "حذف العنصر");
    setSelectedElementId(null);
  };
  const duplicateElement = (id: string) => {
    const current = draft.elements[id];
    if (!current) return;
    const copyId = createStudioId("elem",Object.keys(draft.elements));
    const duplicate = { ...copy(current), id:copyId, name:(current.name || getElementDisplayName(current)) + " - نسخة", attributes:{...current.attributes,"data-studio-id":copyId}, updatedAt:stamp() };
    const page = draft.pages[current.pageId];
    commitDraftChange({
      ...draft,
      pages:{...draft.pages,[page.id]:{...page,elementIds:[...page.elementIds,copyId]}},
      elements:{...draft.elements,[copyId]:duplicate}
    },"تكرار العنصر");
    setSelectedElementId(copyId);
  };
  const toggleVisibility = (id:string) => {
    const item=draft.elements[id]; if(!item)return;
    commitDraftChange({ ...draft, elements:{...draft.elements,[id]:{...item,layout:{...item.layout,visibility:!item.layout.visibility},updatedAt:stamp()}}},"تحديث ظهور العنصر");
  };
  const toggleLock = (id:string) => {
    const item=draft.elements[id]; if(!item)return;
    commitDraftChange({ ...draft, elements:{...draft.elements,[id]:{...item,locked:!item.locked,updatedAt:stamp()}}},"تحديث قفل العنصر");
  };
  const updateElement = (id:string, changes:Partial<ElementModel>) => {
    const item=draft.elements[id]; if(!item || item.locked)return;
    commitDraftChange({ ...draft, elements:{...draft.elements,[id]:{...item,...changes,updatedAt:stamp()}}},"تعديل خصائص العنصر");
  };
  const saveReusableComponent = (component: Omit<StudioReusableComponent,"id"|"createdAt">) => {
    const newComponent:StudioReusableComponent={...copy(component),id:createStudioId("component"),createdAt:stamp()};
    commitDraftChange({ ...draft, reusableComponents:[...(draft.reusableComponents||[]),newComponent] },"حفظ مكون قابل لإعادة الاستخدام");
  };

  const openTools = (tab:StudioToolTab) => { setShowDesign(false); setShowHistory(false); setAdvancedTab(tab); setShowAdvanced(true); };
  const exportJson = () => {
    const blob=new Blob([studioService.exportProjectJson(draft)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="developer-studio-independent-project.json";a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),1200);
  };
  const importJson = (file?:File) => {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      const result=studioService.importProjectJson(String(reader.result||""),draft);
      if(!result.success || !result.draft){toast({title:"تعذر استيراد المشروع",description:result.error||"ملف غير صالح",variant:"destructive"});return;}
      commitDraftChange(result.draft,"استيراد مشروع JSON");
      setActivePageId(Object.keys(result.draft.pages)[0]);
      toast({title:"تم استيراد المشروع إلى المسودة المحلية"});
    };
    reader.onerror=()=>toast({title:"تعذر قراءة الملف",variant:"destructive"});
    reader.readAsText(file);
  };

  const openAssetPicker = (callback:(url:string)=>void) => {
    setAssetPickerCallback(()=>callback);
    setDesignTab("assets");
    setShowAdvanced(false);
    setShowDesign(true);
  };
  const applyAssetToSelection = (asset:StudioAssetItem) => {
    if(assetPickerCallback){assetPickerCallback(asset.url);setAssetPickerCallback(null);setShowDesign(false);}
  };

  const triggerPublish = async () => {
    const check=await studioService.checkConflicts(draft);
    if(check.hasConflict){setConflicts(check.conflicts);setConflictRevision(check.serverRevision);setShowConflict(true);return;}
    setShowPublish(true);
  };
  const onPublished = async () => {
    const refreshed=await studioService.getDraft("local-user");
    const publishedNow=await studioService.getPublishedConfig();
    setDraft(refreshed);setServerSavedDraft(refreshed);setPublished(publishedNow);
    setHistoryStack([copy(refreshed)]);setHistoryPointer(0);setStatus("saved");
  };
  const openHistory = () => { setShowAdvanced(false);setShowDesign(false);setShowHistory(true); };
  const restoreHistory = async (revision:number) => { await onPublished(); toast({title:"تمت استعادة الإصدار",description:"تم إنشاء إصدار جديد داخل السجل المحلي."}); };

  return <div className="min-h-screen flex h-full flex-col bg-background text-foreground" dir="rtl">
    <header className="relative z-20 flex min-h-16 shrink-0 flex-wrap items-center gap-2 border-b bg-card/95 px-3 py-2 shadow-sm backdrop-blur md:px-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Layers className="h-5 w-5"/></div>
        <div><div className="text-sm font-black tracking-tight">Developer Studio <span className="text-primary">Pro</span></div><div className="text-[10px] text-muted-foreground">INDEPENDENT VISUAL WORKSPACE</div></div>
      </div>
      <div className="mx-2 hidden h-8 w-px bg-border sm:block"/>
      <div className="hidden items-center gap-2 text-[11px] text-muted-foreground lg:flex"><ShieldCheck className="h-4 w-4 text-emerald-600"/> مستقل عن Juba · تخزين محلي خاص</div>
      <div className="mr-auto flex flex-wrap items-center gap-1.5">
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted" onClick={undo} disabled={historyPointer<=0} title="تراجع"><Undo2 className="h-4 w-4"/>تراجع</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted" onClick={redo} disabled={historyPointer>=historyStack.length-1} title="إعادة"><Redo2 className="h-4 w-4"/>إعادة</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted" onClick={()=>{setDesignTab("design");setShowDesign(true);}}><Palette className="h-4 w-4"/>الهوية</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted" onClick={()=>openTools("audits")}><ShieldCheck className="h-4 w-4"/>التدقيق</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted" onClick={openHistory}><History className="h-4 w-4"/>السجل</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted" onClick={exportJson}><FileDown className="h-4 w-4"/>تصدير</button>
        <label className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-lg border px-2.5 text-xs hover:bg-muted"><FileUp className="h-4 w-4"/>استيراد<input type="file" accept=".json,application/json" className="hidden" onChange={e=>{importJson(e.target.files?.[0]);e.target.value="";}}/></label>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold hover:bg-muted" onClick={()=>void discardDraft()} disabled={!unsaved}>تجاهل</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground shadow hover:bg-primary/90" onClick={()=>void saveDraft()}><Save className="h-4 w-4"/>{isSaving?"جارٍ الحفظ":"حفظ"}</button>
        <button className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-bold text-white shadow hover:bg-emerald-700" onClick={()=>void triggerPublish()}><UploadCloud className="h-4 w-4"/>نشر محلي</button>
      </div>
    </header>
    <div className="flex min-h-9 shrink-0 items-center justify-between border-b bg-muted/30 px-4 text-[10px] text-muted-foreground">
      <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500"/>{status==="loading"?"استعادة المسودة":status==="saving"?"حفظ تلقائي...":status==="unsaved"?"تعديلات غير محفوظة":status==="error"?"مشكلة في الحفظ":"كل التغييرات محفوظة محلياً"}<span className="mx-2 text-border">|</span>الإصدار المنشور محلياً #{published.revision}</div>
      <div className="flex items-center gap-3"><button className="hover:text-primary" onClick={()=>openTools("command")}>الأدوات الذكية Ctrl+K</button><span>آخر تعديل: {new Date(draft.updatedAt).toLocaleString("ar-EG")}</span></div>
    </div>
    <main className="relative min-h-0 flex-1 overflow-hidden">
      <LiveAppPreview
        route={activePage?.route || "/"}
        initialEdits={draft.domEdits || {}}
        publishedEdits={published.domEdits || {}}
        publishedRevision={published.revision}
        designSystem={draft.designSystem || DEFAULT_STUDIO_DESIGN_SYSTEM}
        pages={draft.pages}
        activePageId={activePage?.id}
        elements={draft.elements}
        reusableComponents={draft.reusableComponents || []}
        onEditsChange={(domEdits:Record<string,StudioDomEdit>)=>commitDraftChange({...draft,domEdits,hasUnpublishedChanges:true},"تعديل DOM مرئي")}
        onSelectPage={id=>{setActivePageId(id);setSelectedElementId(null);}}
        onAddPage={addPage}
        onDuplicatePage={duplicatePage}
        onDeletePage={deletePage}
        onUpdatePageMeta={updatePage}
        onAddElement={addElement}
        onSaveReusableComponent={saveReusableComponent}
        onOpenAssetPicker={openAssetPicker}
        onSelectedDomChange={setSelectedDomSelector}
        onOpenDrawer={()=>{setShowAdvanced(false);setShowHistory(false);setShowDesign(false);}}
        closeDrawersSignal={closeDrawersSignal}
        externalXRayMode={xRayMode}
        hasUnsavedChanges={unsaved}
        isSaving={isSaving}
        onSaveChanges={()=>void saveDraft()}
        onDiscardChanges={()=>void discardDraft()}
      />
    </main>

    {showDesign&&<StudioDesignAndAssetsModal
      isOpen={showDesign} initialTab={designTab} onClose={()=>{setShowDesign(false);setAssetPickerCallback(null);}}
      draft={draft} onUpdateDraft={next=>commitDraftChange(next,"تحديث التصميم والوسائط")}
      onApplyAssetToSelection={applyAssetToSelection} onSaveChanges={()=>void saveDraft()}
      onDiscardChanges={()=>void discardDraft()} isSaving={isSaving}
    />}
    {showAdvanced&&<StudioAdvancedToolsModal
      isOpen={showAdvanced} initialTab={advancedTab} onClose={()=>setShowAdvanced(false)}
      draft={draft} activePageId={activePage?.id || activePageId} selectedElementId={selectedElementId}
      selectedDomSelector={selectedDomSelector}
      onUpdateDraft={next=>commitDraftChange(next,"تعديل من الأدوات المتقدمة")}
      onSelectPage={id=>setActivePageId(id)} onSelectElement={setSelectedElementId}
      onTriggerSave={()=>void saveDraft()} onDiscardChanges={()=>void discardDraft()}
      isSaving={isSaving} onTriggerPublish={()=>void triggerPublish()} onToggleXRay={()=>setXRayMode(value=>!value)}
      onOpenDesignSystem={()=>{setShowAdvanced(false);setDesignTab("design");setShowDesign(true);}}
      onOpenAssets={()=>{setShowAdvanced(false);setDesignTab("assets");setShowDesign(true);}}
    />}
    {showHistory&&<HistoryRollbackModal
      isOpen={showHistory} onClose={()=>setShowHistory(false)} currentRevision={published.revision}
      draft={draft}
      onCreateCheckpoint={(name,note)=>{const result=studioService.createNamedSnapshot(draft,name,note);commitDraftChange(result.draft,"حفظ نقطة استعادة");}}
      onRestoreToDraft={restored=>{commitDraftChange(restored,"استعادة لقطة إلى المسودة");}}
      onSaveChanges={()=>void saveDraft()} onDiscardChanges={()=>void discardDraft()} isSaving={isSaving}
      onRollbackSuccess={revision=>void restoreHistory(revision)}
    />}
    {showPublish&&<PublishModal
      isOpen={showPublish} onClose={()=>setShowPublish(false)} draft={draft}
      onPublishSuccess={(revision,updated)=>{setShowPublish(false);void onPublished();}}
      onConflictDetected={info=>{setShowPublish(false);setConflicts(info.conflicts || []);setConflictRevision(info.serverRevision || published.revision);setShowConflict(true);}}
    />}
    {showConflict&&<ConflictResolutionModal
      isOpen={showConflict} onClose={()=>setShowConflict(false)} draft={draft}
      conflicts={conflicts} serverRevision={conflictRevision}
      onResolved={updated=>{commitDraftChange(updated,"حل تعارض المسودة");setShowConflict(false);}}
    />}
    <footer className="flex min-h-7 shrink-0 items-center justify-between border-t bg-slate-950 px-3 text-[9px] text-slate-300">
      <span className="flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400"/> Developer Studio مستقل · لا يستخدم قاعدة بيانات Juba أو حساباتها</span>
      <span>{Object.keys(draft.elements).length} عنصر · {Object.keys(draft.pages).length} صفحة · {draft.assets?.length || 0} وسيط</span>
      {notice&&<span className="max-w-[25vw] truncate">{notice}</span>}
    </footer>
  </div>;
}

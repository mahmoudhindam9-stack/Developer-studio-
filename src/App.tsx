import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Box,
  Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clipboard,
  Code2, Copy, Download, Eye, EyeOff, FileDown, FileImage, FilePlus2,
  FolderOpen, Gauge, Grid2X2, Image as ImageIcon, LayoutDashboard, Layers,
  Lock, Maximize2, Monitor, Moon, MoreHorizontal, Palette, Plus, Redo2,
  RefreshCw, Save, Search, Settings2, Smartphone, Sparkles, Tablet, Trash2,
  Type, Undo2, Upload, WandSparkles, X
} from 'lucide-react';

type ElementKind = 'heading' | 'text' | 'button' | 'card' | 'image' | 'input' | 'divider' | 'badge';
type ElementModel = {
  id: string;
  pageId: string;
  kind: ElementKind;
  name: string;
  content: { text: string; subtitle?: string; level?: string; label?: string; url?: string; alt?: string; placeholder?: string; };
  styles: Record<string, string>;
  visible: boolean;
  locked: boolean;
};
type PageModel = { id: string; name: string; route: string; description: string; };
type AssetModel = { id: string; name: string; url: string; type: string; size: number; createdAt: string; };
type DesignModel = { mode: 'light' | 'dark'; primary: string; secondary: string; accent: string; background: string; surface: string; text: string; muted: string; border: string; fontFamily: string; radius: string; };
type DraftModel = { schemaVersion: number; revision: number; savedRevision: number; updatedAt: string; pages: PageModel[]; elements: ElementModel[]; assets: AssetModel[]; design: DesignModel; };

const STORAGE_KEY = 'developer-studio-web-draft-v1';
const DB_NAME = 'developer-studio-web';
const DB_STORE = 'workspace';
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const makeId = (prefix: string) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const stamp = () => new Date().toISOString();

const DEFAULT_DESIGN: DesignModel = {
  mode: 'light', primary: '#5856d6', secondary: '#159b9a', accent: '#e59a43',
  background: '#f3f5fa', surface: '#ffffff', text: '#182338', muted: '#68758b',
  border: '#e2e7ef', fontFamily: 'Cairo, Inter, Segoe UI, sans-serif', radius: '16px'
};
const DEFAULT_DRAFT: DraftModel = {
  schemaVersion: 1, revision: 1, savedRevision: 1, updatedAt: stamp(),
  pages: [{ id: 'page_home', name: 'لوحة التحكم', route: '/', description: 'الصفحة الرئيسية للمشروع' }],
  design: DEFAULT_DESIGN, assets: [],
  elements: [
    { id: 'el_welcome', pageId: 'page_home', kind: 'card', name: 'بطاقة الترحيب',
      content: { text: 'مرحباً بك في مساحة عملك', subtitle: 'ابدأ تخصيص الواجهة بسحب العناصر وتعديل خصائصها من اللوحة الجانبية.' },
      styles: { backgroundColor: '#202d49', color: '#ffffff', padding: '30px', borderRadius: '20px', width: '100%', minHeight: '150px' }, visible: true, locked: false },
    { id: 'el_title', pageId: 'page_home', kind: 'heading', name: 'عنوان القسم',
      content: { text: 'نظرة عامة على الأداء', level: 'h2' },
      styles: { color: '#182338', fontSize: '25px', fontWeight: '800', textAlign: 'right', margin: '8px 0' }, visible: true, locked: false },
    { id: 'el_stat1', pageId: 'page_home', kind: 'card', name: 'بطاقة إحصائية ١',
      content: { text: 'إجمالي المبيعات', subtitle: '١٢٤٬٥٠٠ ج.م' },
      styles: { backgroundColor: '#ffffff', color: '#182338', border: '1px solid #e2e7ef', padding: '22px', borderRadius: '16px', width: '31%', minWidth: '170px' }, visible: true, locked: false },
    { id: 'el_stat2', pageId: 'page_home', kind: 'card', name: 'بطاقة إحصائية ٢',
      content: { text: 'الطلبات الجديدة', subtitle: '٣٨ طلباً' },
      styles: { backgroundColor: '#ffffff', color: '#182338', border: '1px solid #e2e7ef', padding: '22px', borderRadius: '16px', width: '31%', minWidth: '170px' }, visible: true, locked: false },
    { id: 'el_stat3', pageId: 'page_home', kind: 'card', name: 'بطاقة إحصائية ٣',
      content: { text: 'العملاء النشطون', subtitle: '٨٦٤ عميلاً' },
      styles: { backgroundColor: '#ffffff', color: '#182338', border: '1px solid #e2e7ef', padding: '22px', borderRadius: '16px', width: '31%', minWidth: '170px' }, visible: true, locked: false },
    { id: 'el_paragraph', pageId: 'page_home', kind: 'text', name: 'وصف توضيحي',
      content: { text: 'هذه معاينة مباشرة للمسودة الحالية. أي تعديل في المحتوى أو التنسيق يظهر هنا فوراً، ويتم حفظه في مساحة العمل المحلية.' },
      styles: { color: '#68758b', fontSize: '14px', lineHeight: '1.9', textAlign: 'right', width: '100%' }, visible: true, locked: false },
    { id: 'el_cta', pageId: 'page_home', kind: 'button', name: 'زر إجراء',
      content: { text: 'استكشف المزيد', label: 'استكشف المزيد' },
      styles: { backgroundColor: '#5856d6', color: '#ffffff', padding: '12px 22px', borderRadius: '12px', fontWeight: '700' }, visible: true, locked: false }
  ]
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB is unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Database open failed'));
  });
}
async function readDraft(): Promise<DraftModel | null> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const request = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get('draft');
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) as DraftModel : null;
    } catch { return null; }
  }
}
async function writeDraft(draft: DraftModel): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(DB_STORE, 'readwrite');
      transaction.objectStore(DB_STORE).put(draft, 'draft');
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onerror = () => { db.close(); reject(transaction.error); };
      transaction.onabort = () => { db.close(); reject(transaction.error); };
    });
  } catch (error) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(draft)); }
    catch { throw error; }
  }
}
function downloadFile(name: string, content: string, type: string) {
  const anchor = document.createElement('a');
  if (/^(https?:\/\/|\/|data:)/i.test(content) && type !== 'application/json') {
    anchor.href = content;
    anchor.download = name;
    anchor.rel = 'noopener';
    anchor.click();
    return;
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  anchor.href = url; anchor.download = name; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function elementDefaults(kind: ElementKind, pageId: string): ElementModel {
  const base: ElementModel = {
    id: makeId('element'), pageId, kind, name: 'عنصر جديد',
    content: { text: '' }, styles: { color: '#182338', fontSize: '15px', textAlign: 'right', margin: '8px 0' },
    visible: true, locked: false
  };
  if (kind === 'heading') { base.name = 'عنوان'; base.content.text = 'عنوان جديد'; base.styles.fontSize = '24px'; base.styles.fontWeight = '800'; }
  if (kind === 'text') { base.name = 'نص'; base.content.text = 'اكتب النص هنا...'; base.styles.lineHeight = '1.8'; }
  if (kind === 'button') { base.name = 'زر'; base.content.text = 'زر إجراء'; base.content.label = 'زر إجراء'; base.styles.backgroundColor = '#5856d6'; base.styles.color = '#ffffff'; base.styles.padding = '11px 20px'; base.styles.borderRadius = '10px'; }
  if (kind === 'card') { base.name = 'بطاقة'; base.content.text = 'عنوان البطاقة'; base.content.subtitle = 'أضف وصفاً أو قيمة هنا'; base.styles.backgroundColor = '#ffffff'; base.styles.padding = '22px'; base.styles.border = '1px solid #e2e7ef'; base.styles.borderRadius = '16px'; base.styles.width = '48%'; }
  if (kind === 'image') { base.name = 'صورة'; base.content.text = 'صورة توضيحية'; base.content.url = ''; base.content.alt = 'صورة'; base.styles.width = '100%'; base.styles.maxWidth = '560px'; base.styles.borderRadius = '14px'; }
  if (kind === 'input') { base.name = 'حقل إدخال'; base.content.placeholder = 'اكتب هنا...'; base.styles.backgroundColor = '#ffffff'; base.styles.border = '1px solid #d7deea'; base.styles.padding = '12px'; base.styles.borderRadius = '10px'; base.styles.width = '100%'; }
  if (kind === 'divider') { base.name = 'فاصل'; base.styles.width = '100%'; base.styles.borderTop = '1px solid #e2e7ef'; base.styles.margin = '16px 0'; }
  if (kind === 'badge') { base.name = 'شارة'; base.content.text = 'جديد'; base.styles.backgroundColor = '#e9e8ff'; base.styles.color = '#4b49b9'; base.styles.padding = '6px 12px'; base.styles.borderRadius = '999px'; base.styles.fontSize = '12px'; }
  return base;
}

function ElementPreview({ element, selected, editor, onSelect }: {
  element: ElementModel; selected?: boolean; editor?: boolean; onSelect?: () => void;
}) {
  const style = element.styles as React.CSSProperties;
  let content: React.ReactNode = null;
  if (element.kind === 'heading') content = <h2 style={style}>{element.content.text}</h2>;
  if (element.kind === 'text') content = <p style={style}>{element.content.text}</p>;
  if (element.kind === 'button') content = <button type="button" className="preview-button" style={style}>{element.content.label || element.content.text}</button>;
  if (element.kind === 'card') content = <article className="preview-card" style={style}><strong>{element.content.text}</strong>{element.content.subtitle && <p>{element.content.subtitle}</p>}</article>;
  if (element.kind === 'image') content = element.content.url
    ? <img src={element.content.url} alt={element.content.alt || ''} style={style} />
    : <div className="empty-image" style={style}><ImageIcon size={28}/><span>اختر صورة من مكتبة الوسائط</span></div>;
  if (element.kind === 'input') content = <input className="preview-input" placeholder={element.content.placeholder || 'اكتب هنا...'} style={style} readOnly />;
  if (element.kind === 'divider') content = <div className="preview-divider" style={style} />;
  if (element.kind === 'badge') content = <span className="preview-badge" style={style}>{element.content.text}</span>;
  return <div
    className={'element-wrap' + (selected && editor ? ' selected' : '') + (editor ? ' editor-element' : '')}
    onClick={editor ? (event) => { event.stopPropagation(); onSelect?.(); } : undefined}
    role={editor ? 'button' : undefined}
    tabIndex={editor ? 0 : undefined}
    onKeyDown={editor ? (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect?.(); } } : undefined}
    title={editor ? 'تحديد ' + element.name : undefined}
  >
    {content}
    {selected && editor && <span className="selection-chip"><Check size={11}/> محدد</span>}
  </div>;
}

export default function App() {
  const [draft, setDraft] = useState<DraftModel>(() => clone(DEFAULT_DRAFT));
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const [activePageId, setActivePageId] = useState('page_home');
  const [selectedId, setSelectedId] = useState<string | null>('el_title');
  const [leftTab, setLeftTab] = useState<'layers' | 'pages' | 'assets' | 'design'>('layers');
  const [rightTab, setRightTab] = useState<'content' | 'style' | 'layout'>('content');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [search, setSearch] = useState('');
  const [assetUrl, setAssetUrl] = useState('');
  const [assetName, setAssetName] = useState('');
  const [notice, setNotice] = useState('');
  const [previewKey, setPreviewKey] = useState(0);
  const [history, setHistory] = useState<DraftModel[]>([]);
  const [future, setFuture] = useState<DraftModel[]>([]);
  const [assetBusy, setAssetBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    readDraft().then(saved => {
      if (!alive) return;
      if (saved && Array.isArray(saved.pages) && Array.isArray(saved.elements) && saved.design && Array.isArray(saved.assets)) {
        setDraft(saved);
        setActivePageId(saved.pages[0]?.id || 'page_home');
        setSelectedId(saved.elements.find(el => el.pageId === (saved.pages[0]?.id || 'page_home'))?.id || null);
      }
      setReady(true);
      setSaveState('saved');
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (draft.savedRevision >= draft.revision) {
      setSaveState('saved');
      return;
    }
    setSaveState('saving');
    const snapshot = { ...draft, savedRevision: draft.revision };
    const timeout = window.setTimeout(() => {
      writeDraft(snapshot).then(() => {
        setDraft(current =>
          current.revision === snapshot.revision &&
          current.savedRevision !== snapshot.savedRevision
            ? snapshot
            : current
        );
        setSaveState('saved');
      }).catch(() => {
        setSaveState('error');
        setNotice('تعذر الحفظ المحلي. تحقق من مساحة التخزين في المتصفح.');
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [draft, ready]);

  const activePage = draft.pages.find(page => page.id === activePageId) || draft.pages[0];
  const pageElements = useMemo(
    () => draft.elements.filter(element => element.pageId === activePage?.id),
    [draft.elements, activePage?.id]
  );
  const visibleElements = pageElements.filter(element => element.visible);
  const selectedElement = draft.elements.find(element => element.id === selectedId) || null;
  const isDirty = draft.revision > draft.savedRevision;

  const mutate = (next: DraftModel) => {
    setHistory(items => [...items.slice(-39), clone(draft)]);
    setFuture([]);
    setDraft({ ...next, revision: draft.revision + 1, updatedAt: stamp() });
    setNotice('');
  };
  const saveNow = async () => {
    const next = { ...draft, savedRevision: draft.revision, updatedAt: stamp() };
    try {
      await writeDraft(next);
      setDraft(next);
      setSaveState('saved');
      setNotice('تم حفظ المسودة محلياً بنجاح.');
    } catch {
      setSaveState('error');
      setNotice('فشل الحفظ. مساحة تخزين المتصفح قد تكون ممتلئة.');
    }
  };
  const undo = () => {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setFuture(items => [...items, clone(draft)]);
    setHistory(items => items.slice(0, -1));
    setDraft({ ...previous, revision: draft.revision + 1, updatedAt: stamp() });
  };
  const redo = () => {
    if (!future.length) return;
    const next = future[future.length - 1];
    setHistory(items => [...items, clone(draft)]);
    setFuture(items => items.slice(0, -1));
    setDraft({ ...next, revision: draft.revision + 1, updatedAt: stamp() });
  };
  const patchElement = (id: string, patch: Partial<ElementModel>) => {
    const next = clone(draft);
    next.elements = next.elements.map(element => element.id === id ? { ...element, ...patch } : element);
    mutate(next);
  };
  const patchContent = (field: string, value: string) => {
    if (!selectedElement) return;
    patchElement(selectedElement.id, { content: { ...selectedElement.content, [field]: value } });
  };
  const patchStyle = (field: string, value: string) => {
    if (!selectedElement) return;
    patchElement(selectedElement.id, { styles: { ...selectedElement.styles, [field]: value } });
  };
  const addElement = (kind: ElementKind) => {
    if (!activePage) return;
    const element = elementDefaults(kind, activePage.id);
    const next = clone(draft);
    next.elements.push(element);
    mutate(next);
    setSelectedId(element.id);
    setLeftTab('layers');
    setRightTab('content');
  };
  const deleteElement = (id: string) => {
    const next = clone(draft);
    next.elements = next.elements.filter(element => element.id !== id);
    mutate(next);
    setSelectedId(null);
  };
  const moveElement = (id: string, delta: number) => {
    const list = pageElements.slice();
    const index = list.findIndex(item => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    const order = new Map(list.map((item, i) => [item.id, i]));
    const next = clone(draft);
    next.elements = next.elements.map(item => order.has(item.id) ? list[order.get(item.id)!] : item);
    mutate(next);
  };
  const addPage = () => {
    const number = draft.pages.length + 1;
    const page: PageModel = { id: makeId('page'), name: 'صفحة جديدة ' + number, route: '/page-' + number, description: 'صفحة قابلة للتخصيص' };
    const next = clone(draft);
    next.pages.push(page);
    mutate(next);
    setActivePageId(page.id);
    setSelectedId(null);
    setLeftTab('pages');
  };
  const patchPage = (patch: Partial<PageModel>) => {
    if (!activePage) return;
    const next = clone(draft);
    next.pages = next.pages.map(page => page.id === activePage.id ? { ...page, ...patch } : page);
    mutate(next);
  };
  const deletePage = (id: string) => {
    if (draft.pages.length < 2) { setNotice('يجب أن يحتوي المشروع على صفحة واحدة على الأقل.'); return; }
    if (!window.confirm('هل تريد حذف الصفحة وكل عناصرها؟')) return;
    const next = clone(draft);
    next.pages = next.pages.filter(page => page.id !== id);
    next.elements = next.elements.filter(element => element.pageId !== id);
    mutate(next);
    if (activePageId === id) { setActivePageId(next.pages[0].id); setSelectedId(null); }
  };
  const patchDesign = (patch: Partial<DesignModel>) => mutate({ ...clone(draft), design: { ...draft.design, ...patch } });
  const addAsset = (asset: AssetModel) => {
    const next = clone(draft);
    next.assets.unshift(asset);
    mutate(next);
    setAssetUrl('');
    setAssetName('');
    setNotice('تمت إضافة الوسيط إلى المكتبة.');
  };
  const handleUpload = (file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'].includes(file.type)) {
      setNotice('الصيغ المدعومة: PNG وJPG وWEBP وSVG وGIF فقط.'); return;
    }
    if (file.size > 2 * 1024 * 1024) { setNotice('الحد الأقصى لحجم الصورة الواحدة 2 ميجابايت.'); return; }
    setAssetBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      addAsset({ id: makeId('asset'), name: file.name.replace(/\.[^.]+$/, ''), url, type: file.type, size: file.size, createdAt: stamp() });
      setAssetBusy(false);
    };
    reader.onerror = () => { setAssetBusy(false); setNotice('تعذرت قراءة الملف.'); };
    reader.readAsDataURL(file);
  };
  const addExternalAsset = () => {
    const clean = assetUrl.trim();
    if (!/^https:\/\//i.test(clean) && !clean.startsWith('/') && !clean.startsWith('data:image/')) {
      setNotice('أدخل رابط HTTPS صحيحاً أو مساراً محلياً للصورة.'); return;
    }
    addAsset({ id: makeId('asset'), name: assetName.trim() || 'وسيط جديد', url: clean, type: 'image/external', size: clean.length, createdAt: stamp() });
  };
  const applyAsset = (asset: AssetModel) => {
    if (!selectedElement || selectedElement.kind !== 'image') { setNotice('حدد عنصر صورة أولاً ثم اختر الوسيط.'); return; }
    patchElement(selectedElement.id, { content: { ...selectedElement.content, url: asset.url, alt: asset.name } });
    setNotice('تم تطبيق الوسيط على عنصر الصورة المحدد.');
  };
  const exportDraft = () => downloadFile('developer-studio-project.json', JSON.stringify(draft, null, 2), 'application/json');
  const importDraft = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const value = JSON.parse(String(reader.result || '{}')) as DraftModel;
        if (!Array.isArray(value.pages) || !Array.isArray(value.elements) || !value.design) throw new Error('invalid');
        mutate({ ...value, assets: Array.isArray(value.assets) ? value.assets : [] });
        setActivePageId(value.pages[0]?.id || 'page_home');
        setSelectedId(null);
        setNotice('تم استيراد المشروع بنجاح.');
      } catch { setNotice('ملف المشروع غير صالح أو لا يحتوي على بنية الاستوديو المطلوبة.'); }
    };
    reader.readAsText(file);
  };
  const refreshPreview = () => setPreviewKey(value => value + 1);
  const selectedIndex = selectedElement ? pageElements.findIndex(item => item.id === selectedElement.id) : -1;

  if (!ready) return <div className="boot-screen"><div className="boot-mark"><Sparkles/></div><b>Developer Studio</b><span>جارٍ استعادة آخر مسودة محفوظة...</span></div>;

  return <div className="studio-shell" dir="rtl">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Layers size={19}/></div><div><b>DEVELOPER <em>STUDIO</em></b><small>VISUAL WORKSPACE · WEB</small></div></div>
      <div className="topbar-divider"/>
      <div className="project-meta"><span className="live-dot"/><span>مشروع مستقل</span><ChevronDown size={13}/></div>
      <div className="topbar-spacer"/>
      <button className="icon-action" title="تراجع" disabled={!history.length} onClick={undo}><Undo2 size={16}/></button>
      <button className="icon-action" title="إعادة" disabled={!future.length} onClick={redo}><Redo2 size={16}/></button>
      <button className="quiet-button" onClick={exportDraft}><FileDown size={15}/> تصدير</button>
      <label className="quiet-button import-button"><Upload size={15}/> استيراد<input type="file" accept=".json,application/json" onChange={event => importDraft(event.target.files?.[0])}/></label>
      <button className="save-button" onClick={() => void saveNow()} disabled={!isDirty && saveState === 'saved'}><Save size={15}/> حفظ المسودة</button>
    </header>

    <div className="workspace-toolbar">
      <div className="toolbar-tabs">
        <button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}><WandSparkles size={15}/> المحرر المرئي</button>
        <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}><Eye size={15}/> المعاينة</button>
      </div>
      <div className="toolbar-center">
        <span className="page-crumb">{activePage?.name || 'صفحة'}</span><ChevronLeft size={13}/><span>{activePage?.route || '/'}</span>
      </div>
      <div className="toolbar-right">
        <button className={viewport === 'desktop' ? 'device active' : 'device'} onClick={() => setViewport('desktop')} title="سطح المكتب"><Monitor size={16}/></button>
        <button className={viewport === 'tablet' ? 'device active' : 'device'} onClick={() => setViewport('tablet')} title="تابلت"><Tablet size={16}/></button>
        <button className={viewport === 'mobile' ? 'device active' : 'device'} onClick={() => setViewport('mobile')} title="هاتف"><Smartphone size={16}/></button>
        <span className="toolbar-separator"/>
        <button className="icon-action small" onClick={refreshPreview} title="تحديث المعاينة"><RefreshCw size={14}/></button>
      </div>
    </div>

    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-tabs">
          <button className={leftTab === 'layers' ? 'active' : ''} onClick={() => setLeftTab('layers')} title="العناصر"><Layers size={17}/></button>
          <button className={leftTab === 'pages' ? 'active' : ''} onClick={() => setLeftTab('pages')} title="الصفحات"><LayoutDashboard size={17}/></button>
          <button className={leftTab === 'assets' ? 'active' : ''} onClick={() => setLeftTab('assets')} title="الوسائط"><ImageIcon size={17}/></button>
          <button className={leftTab === 'design' ? 'active' : ''} onClick={() => setLeftTab('design')} title="نظام التصميم"><Palette size={17}/></button>
        </div>
        <div className="sidebar-content">
          {leftTab === 'layers' && <>
            <div className="panel-heading"><div><b>العناصر والطبقات</b><small>{pageElements.length} عنصر في الصفحة</small></div><button className="mini-icon" onClick={() => addElement('text')}><Plus size={16}/></button></div>
            <div className="searchbox"><Search size={14}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="بحث عن عنصر..."/></div>
            <div className="layer-list">
              {pageElements.filter(element => element.name.toLowerCase().includes(search.toLowerCase()) || element.kind.includes(search.toLowerCase())).map(element =>
                <div key={element.id} className={'layer-row' + (selectedId === element.id ? ' chosen' : '')}>
                  <button className="layer-main" onClick={() => { setSelectedId(element.id); setRightTab('content'); }}>
                    <span className="layer-icon">{element.kind === 'image' ? <ImageIcon size={14}/> : element.kind === 'heading' ? <Type size={14}/> : element.kind === 'card' ? <Box size={14}/> : <Layers size={14}/>}</span>
                    <span className="layer-name">{element.name}</span>
                    {element.locked && <Lock size={11}/>}
                  </button>
                  <button className="layer-visibility" title={element.visible ? 'إخفاء العنصر' : 'إظهار العنصر'} onClick={() => patchElement(element.id, { visible: !element.visible })}>{element.visible ? <Eye size={13}/> : <EyeOff size={13}/>}</button>
                </div>
              )}
              {!pageElements.length && <div className="empty-state">لا توجد عناصر بعد. أضف عنصراً لبدء التصميم.</div>}
            </div>
            <div className="add-block">
              <div className="subheading">إضافة عنصر</div>
              <div className="add-grid">
                {([
                  ['heading', 'عنوان', Type], ['text', 'نص', Clipboard], ['button', 'زر', Plus], ['card', 'بطاقة', Box],
                  ['image', 'صورة', ImageIcon], ['input', 'حقل', Settings2], ['divider', 'فاصل', MoreHorizontal], ['badge', 'شارة', Sparkles]
                ] as const).map(([kind, label, Icon]) => <button key={kind} onClick={() => addElement(kind)}><Icon size={14}/>{label}</button>)}
              </div>
            </div>
          </>}

          {leftTab === 'pages' && <>
            <div className="panel-heading"><div><b>صفحات المشروع</b><small>{draft.pages.length} صفحة</small></div><button className="mini-icon" onClick={addPage}><Plus size={16}/></button></div>
            <div className="page-list">
              {draft.pages.map(page => <button key={page.id} className={'page-row' + (activePageId === page.id ? ' chosen' : '')} onClick={() => { setActivePageId(page.id); setSelectedId(null); }}>
                <span className="page-icon"><LayoutDashboard size={15}/></span><span><b>{page.name}</b><small>{page.route}</small></span><ChevronLeft size={13}/>
              </button>)}
            </div>
            {activePage && <div className="page-settings"><div className="subheading">إعدادات الصفحة الحالية</div><label>اسم الصفحة<input value={activePage.name} onChange={event => patchPage({ name: event.target.value })}/></label><label>المسار<input value={activePage.route} onChange={event => patchPage({ route: event.target.value })}/></label><label>الوصف<textarea value={activePage.description} onChange={event => patchPage({ description: event.target.value })}/></label><button className="danger-button" onClick={() => deletePage(activePage.id)}><Trash2 size={14}/> حذف الصفحة</button></div>}
          </>}

          {leftTab === 'assets' && <>
            <div className="panel-heading"><div><b>مكتبة الوسائط</b><small>{draft.assets.length} ملف محفوظ</small></div><span className="count-badge">{draft.assets.length}</span></div>
            <div className="asset-upload">
              <label className="upload-zone"><Upload size={20}/><b>{assetBusy ? 'جارٍ رفع الملف...' : 'رفع صورة أو SVG'}</b><small>PNG · JPG · WEBP · SVG · GIF حتى 2MB</small><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" disabled={assetBusy} onChange={event => { handleUpload(event.target.files?.[0]); event.target.value = ''; }}/></label>
              <div className="asset-url"><input value={assetName} onChange={event => setAssetName(event.target.value)} placeholder="اسم الوسيط"/><input value={assetUrl} onChange={event => setAssetUrl(event.target.value)} placeholder="رابط HTTPS للصورة"/><button onClick={addExternalAsset} disabled={!assetUrl.trim()}><Plus size={14}/> إضافة رابط</button></div>
            </div>
            <div className="asset-grid">
              {draft.assets.map(asset => <div className="asset-card" key={asset.id}>
                <div className="asset-thumb">{asset.type.includes('svg') || asset.url.endsWith('.svg') ? <img src={asset.url} alt={asset.name}/> : <img src={asset.url} alt={asset.name}/>}</div>
                <div className="asset-info"><b title={asset.name}>{asset.name}</b><small>{(asset.size / 1024).toFixed(0)} KB</small></div>
                <div className="asset-actions"><button onClick={() => applyAsset(asset)} title="تطبيق على الصورة المحددة"><Check size={13}/></button><button onClick={() => downloadFile(asset.name, asset.url, asset.type)} title="تنزيل"><Download size={13}/></button><button onClick={() => { const next = clone(draft); next.assets = next.assets.filter(item => item.id !== asset.id); mutate(next); }} title="حذف"><Trash2 size={13}/></button></div>
              </div>)}
              {!draft.assets.length && <div className="empty-state">مكتبة الوسائط فارغة. ارفع صورة أو أضف رابطاً.</div>}
            </div>
          </>}

          {leftTab === 'design' && <>
            <div className="panel-heading"><div><b>نظام التصميم</b><small>إعدادات الهوية العامة</small></div><Palette size={17}/></div>
            <div className="design-settings">
              <div className="subheading">السمات الجاهزة</div>
              <div className="preset-row"><button onClick={() => patchDesign({ ...DEFAULT_DESIGN })}><span className="preset-dot pearl"/> لؤلؤي</button><button onClick={() => patchDesign({ mode: 'dark', background: '#0e1626', surface: '#172238', text: '#edf3ff', muted: '#a0aec4', border: '#2b3a52', primary: '#8b8af5' })}><span className="preset-dot night"/> ليلي</button><button onClick={() => patchDesign({ primary: '#0c9879', secondary: '#149b9a', accent: '#df994a', background: '#f0faf6', surface: '#ffffff', text: '#14362f', muted: '#56766d', border: '#d2e9df', mode: 'light' })}><span className="preset-dot green"/> زمردي</button></div>
              <div className="subheading">ألوان الهوية</div>
              {([['primary','اللون الأساسي'],['secondary','اللون الثانوي'],['accent','لون التمييز'],['background','خلفية الصفحة'],['surface','لون البطاقات'],['text','لون النص'],['muted','النص الثانوي'],['border','الحدود']] as const).map(([key, label]) => <label className="color-row" key={key}><span>{label}</span><input type="color" value={draft.design[key]} onChange={event => patchDesign({ [key]: event.target.value } as Partial<DesignModel>)}/><code>{draft.design[key]}</code></label>)}
              <label className="form-label">الخط المستخدم<select value={draft.design.fontFamily} onChange={event => patchDesign({ fontFamily: event.target.value })}><option value="Cairo, Inter, Segoe UI, sans-serif">Cairo</option><option value="Inter, Segoe UI, sans-serif">Inter</option><option value="Tahoma, Arial, sans-serif">Tahoma</option><option value="Georgia, serif">Georgia</option></select></label>
              <label className="form-label">استدارة الحواف<input value={draft.design.radius} onChange={event => patchDesign({ radius: event.target.value })}/></label>
            </div>
          </>}
        </div>
        <div className="sidebar-footer"><span className="storage-indicator"/><span>تخزين محلي خاص بهذا المتصفح</span></div>
      </aside>

      <main className="canvas-workspace">
        <div className="canvas-topline"><div><b>{view === 'edit' ? 'مساحة التصميم' : 'المعاينة الحية'}</b><span>{activePage?.name} · {visibleElements.length} عنصر ظاهر</span></div><div className="canvas-indicators"><span><i/> Auto layout</span><span><i/> Responsive</span><span><i/> Local draft</span></div></div>
        <div className={'canvas-stage ' + viewport}>
          <div className={'artboard ' + viewport} key={String(previewKey) + '-' + activePageId} style={{
            background: draft.design.background, color: draft.design.text, fontFamily: draft.design.fontFamily,
            borderRadius: viewport === 'mobile' ? '26px' : '10px'
          }} onClick={() => view === 'edit' && setSelectedId(null)}>
            <div className="artboard-top"><span className="artboard-brand"><span style={{ background: draft.design.primary }}><Activity size={13}/></span> مساحة العمل</span><span className="artboard-route">{activePage?.route}</span><span className="artboard-user">م</span></div>
            <div className="artboard-content" style={{ background: draft.design.background }}>
              {visibleElements.map(element => <ElementPreview key={element.id} element={element} selected={view === 'edit' && selectedId === element.id} editor={view === 'edit'} onSelect={() => setSelectedId(element.id)}/>)}
              {!visibleElements.length && <div className="canvas-empty"><Layers size={30}/><b>الصفحة فارغة</b><span>أضف عنصراً من اللوحة الجانبية لبدء البناء.</span></div>}
            </div>
            {view === 'preview' && <div className="preview-footer">معاينة من المسودة الحالية · {new Date(draft.updatedAt).toLocaleString('ar-EG')}</div>}
          </div>
        </div>
        <div className="canvas-statusline"><span>100%</span><span>•</span><span>{viewport === 'desktop' ? '1440 px' : viewport === 'tablet' ? '768 px' : '390 px'}</span><span className="status-spacer"/><span>آخر تعديل: {new Date(draft.updatedAt).toLocaleTimeString('ar-EG')}</span></div>
      </main>

      <aside className="inspector">
        <div className="inspector-head"><div><b>خصائص العنصر</b><small>{selectedElement ? selectedElement.name : 'لم يتم تحديد عنصر'}</small></div><Settings2 size={17}/></div>
        {selectedElement ? <>
          <div className="inspector-tabs"><button className={rightTab === 'content' ? 'active' : ''} onClick={() => setRightTab('content')}>المحتوى</button><button className={rightTab === 'style' ? 'active' : ''} onClick={() => setRightTab('style')}>التنسيق</button><button className={rightTab === 'layout' ? 'active' : ''} onClick={() => setRightTab('layout')}>الأبعاد</button></div>
          <div className="inspector-body">
            {rightTab === 'content' && <>
              <label className="form-label">اسم العنصر<input value={selectedElement.name} disabled={selectedElement.locked} onChange={event => patchElement(selectedElement.id, { name: event.target.value })}/></label>
              {(selectedElement.kind === 'heading' || selectedElement.kind === 'text' || selectedElement.kind === 'button' || selectedElement.kind === 'card' || selectedElement.kind === 'badge') && <label className="form-label">{selectedElement.kind === 'button' ? 'نص الزر' : selectedElement.kind === 'badge' ? 'نص الشارة' : 'النص'}<textarea rows={selectedElement.kind === 'text' || selectedElement.kind === 'card' ? 4 : 2} value={selectedElement.content.text} disabled={selectedElement.locked} onChange={event => patchContent('text', event.target.value)}/></label>}
              {selectedElement.kind === 'card' && <label className="form-label">النص الفرعي<input value={selectedElement.content.subtitle || ''} disabled={selectedElement.locked} onChange={event => patchContent('subtitle', event.target.value)}/></label>}
              {selectedElement.kind === 'button' && <label className="form-label">عنوان الزر<input value={selectedElement.content.label || ''} disabled={selectedElement.locked} onChange={event => patchContent('label', event.target.value)}/></label>}
              {selectedElement.kind === 'image' && <><label className="form-label">رابط الصورة<input value={selectedElement.content.url || ''} disabled={selectedElement.locked} onChange={event => patchContent('url', event.target.value)}/></label><label className="form-label">النص البديل<input value={selectedElement.content.alt || ''} onChange={event => patchContent('alt', event.target.value)}/></label><button className="outline-wide" onClick={() => setLeftTab('assets')}><ImageIcon size={14}/> فتح مكتبة الوسائط</button></>}
              {selectedElement.kind === 'input' && <label className="form-label">النص الإرشادي<input value={selectedElement.content.placeholder || ''} onChange={event => patchContent('placeholder', event.target.value)}/></label>}
              {selectedElement.kind === 'heading' && <label className="form-label">مستوى العنوان<select value={selectedElement.content.level || 'h2'} onChange={event => patchContent('level', event.target.value)}><option value="h1">H1</option><option value="h2">H2</option><option value="h3">H3</option></select></label>}
            </>}
            {rightTab === 'style' && <>
              <div className="subheading">الألوان والخط</div>
              <label className="color-row"><span>لون النص</span><input type="color" value={selectedElement.styles.color || '#182338'} onChange={event => patchStyle('color', event.target.value)}/><code>{selectedElement.styles.color || '#182338'}</code></label>
              {selectedElement.kind !== 'image' && selectedElement.kind !== 'divider' && <label className="color-row"><span>لون الخلفية</span><input type="color" value={selectedElement.styles.backgroundColor || '#ffffff'} onChange={event => patchStyle('backgroundColor', event.target.value)}/><code>{selectedElement.styles.backgroundColor || 'شفاف'}</code></label>}
              <label className="form-label">حجم الخط<input value={selectedElement.styles.fontSize || '15px'} onChange={event => patchStyle('fontSize', event.target.value)}/></label>
              <label className="form-label">وزن الخط<select value={selectedElement.styles.fontWeight || '500'} onChange={event => patchStyle('fontWeight', event.target.value)}><option value="400">عادي</option><option value="500">متوسط</option><option value="600">شبه عريض</option><option value="700">عريض</option><option value="800">ثقيل</option></select></label>
              <label className="form-label">محاذاة النص<div className="align-controls"><button className={selectedElement.styles.textAlign === 'right' ? 'active' : ''} onClick={() => patchStyle('textAlign','right')}><AlignRight size={14}/></button><button className={selectedElement.styles.textAlign === 'center' ? 'active' : ''} onClick={() => patchStyle('textAlign','center')}><AlignCenter size={14}/></button><button className={selectedElement.styles.textAlign === 'left' ? 'active' : ''} onClick={() => patchStyle('textAlign','left')}><AlignLeft size={14}/></button></div></label>
            </>}
            {rightTab === 'layout' && <>
              <div className="subheading">المسافات والأبعاد</div>
              <label className="form-label">العرض<input value={selectedElement.styles.width || 'auto'} onChange={event => patchStyle('width', event.target.value)}/></label>
              <label className="form-label">الارتفاع<input value={selectedElement.styles.height || 'auto'} onChange={event => patchStyle('height', event.target.value)}/></label>
              <label className="form-label">الحشو الداخلي<input value={selectedElement.styles.padding || '0px'} onChange={event => patchStyle('padding', event.target.value)}/></label>
              <label className="form-label">الهامش الخارجي<input value={selectedElement.styles.margin || '0px'} onChange={event => patchStyle('margin', event.target.value)}/></label>
              <label className="form-label">استدارة الحواف<input value={selectedElement.styles.borderRadius || '0px'} onChange={event => patchStyle('borderRadius', event.target.value)}/></label>
              <label className="form-label">الشفافية<input type="range" min="0.1" max="1" step="0.05" value={selectedElement.styles.opacity || '1'} onChange={event => patchStyle('opacity', event.target.value)}/></label>
            </>}
          </div>
          <div className="inspector-actions">
            <button className="tool-button" onClick={() => moveElement(selectedElement.id, -1)} disabled={selectedIndex <= 0}><ArrowUp size={14}/> للأعلى</button>
            <button className="tool-button" onClick={() => moveElement(selectedElement.id, 1)} disabled={selectedIndex < 0 || selectedIndex >= pageElements.length - 1}><ArrowDown size={14}/> للأسفل</button>
            <button className="tool-button" onClick={() => patchElement(selectedElement.id, { locked: !selectedElement.locked })}>{selectedElement.locked ? <><Lock size={14}/> فك القفل</> : <><Lock size={14}/> قفل</>}</button>
            <button className="tool-button danger" onClick={() => deleteElement(selectedElement.id)}><Trash2 size={14}/> حذف</button>
          </div>
        </> : <div className="inspector-empty"><div><MousePointerIcon/></div><b>اختر عنصراً من مساحة التصميم</b><span>ستظهر هنا أدوات المحتوى والتنسيق والأبعاد الخاصة به.</span></div>}
      </aside>
    </div>

    <footer className="bottom-bar"><div className="bottom-left"><span className="save-indicator"/><b>{saveState === 'loading' ? 'جارٍ التحميل' : saveState === 'saving' ? 'جارٍ حفظ المسودة...' : saveState === 'error' ? 'خطأ في الحفظ' : isDirty ? 'تعديلات غير محفوظة' : 'كل التغييرات محفوظة'}</b><span className="bottom-divider"/><span>الإصدار {draft.schemaVersion}.0 · مراجعة {draft.revision}</span></div><div className="bottom-right">{notice && <span className="notice">{notice}</span>}<span>Developer Studio Web · مستقل عن Juba</span></div></footer>
  </div>;
}

function MousePointerIcon() { return <Maximize2 size={22}/>; }

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Check, ChevronDown, ChevronLeft,
  ChevronRight, Code2, Download, File, FileCode2, FilePlus2, Folder, FolderOpen,
  Github, HardDrive, LoaderCircle, Play, RefreshCw, Rocket, Save, Search,
  ShieldCheck, Terminal, Upload, X, Zap
} from "lucide-react";
import { DeveloperStudioPro } from "../../../DeveloperStudioPro";

type ProjectOpen = { root: string; name: string; tree: StudioTreeItem[]; recentProjects: string[] };
type ViewMode = "home" | "import" | "workspace" | "visual";
type SaveMode = "existing" | "new";

function flattenFiles(items: StudioTreeItem[]): StudioTreeItem[] {
  return items.flatMap((item) => item.type === "directory" ? [item, ...flattenFiles(item.children || [])] : [item]);
}

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    mjs: "javascript", cjs: "javascript", json: "json", html: "html", css: "css",
    scss: "scss", md: "markdown", py: "python", java: "java", kt: "kotlin",
    dart: "dart", yml: "yaml", yaml: "yaml", xml: "xml", sh: "shell",
    bat: "bat", ps1: "powershell", sql: "sql", vue: "html", svelte: "html",
    toml: "ini", env: "ini", txt: "plaintext"
  };
  return map[ext || ""] || "plaintext";
}

function TreeNode({
  item, depth, selected, onOpen
}: {
  item: StudioTreeItem; depth: number; selected: string; onOpen: (item: StudioTreeItem) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDirectory = item.type === "directory";
  const active = selected === item.path;
  return (
    <div>
      <button
        className={"project-tree-row " + (active ? "active" : "")}
        style={{ paddingInlineStart: 12 + depth * 15 }}
        onClick={() => isDirectory ? setExpanded((value) => !value) : onOpen(item)}
        title={item.path}
      >
        {isDirectory ? (expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>) : <span className="tree-spacer"/>}
        {isDirectory ? (expanded ? <FolderOpen size={15}/> : <Folder size={15}/>) : <FileCode2 size={14}/>}
        <span>{item.name}</span>
      </button>
      {isDirectory && expanded && (item.children || []).map((child) => (
        <TreeNode key={child.path} item={child} depth={depth + 1} selected={selected} onOpen={onOpen}/>
      ))}
    </div>
  );
}

export function ProjectWorkspace() {
  const [view, setView] = useState<ViewMode>("home");
  const [project, setProject] = useState<ProjectOpen | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [previewUrl, setPreviewUrl] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveMode, setSaveMode] = useState<SaveMode>("existing");
  const [remoteUrl, setRemoteUrl] = useState("");
  const [repoName, setRepoName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [commitMessage, setCommitMessage] = useState("Update project from Developer Studio");
  const [treeQuery, setTreeQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const buildAfterInstall = useRef(false);
  const taskRunning = useRef(false);
  const editorRef = useRef<any>(null);
  const dirty = fileContent !== savedContent;
  const nativeAvailable = typeof window !== "undefined" && !!window.developerStudio;

  const filteredTree = useMemo(() => {
    if (!treeQuery.trim()) return project?.tree || [];
    const q = treeQuery.trim().toLowerCase();
    const all = flattenFiles(project?.tree || []);
    return all.filter((item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q));
  }, [project, treeQuery]);

  const appendLog = useCallback((line: string) => {
    setLogs((current) => [...current, line].slice(-500));
  }, []);

  const loadProject = useCallback(async (result: ProjectOpen | null) => {
    if (!result) return;
    setProject(result);
    setView("workspace");
    setSelectedPath("");
    setFileContent("");
    setSavedContent("");
    setLogs([]);
    setStatusMessage("تم فتح المشروع محلياً");
    const nextScripts: Record<string, string> = await window.developerStudio.getScripts().catch((): Record<string, string> => ({}));
    setScripts(nextScripts);
    const files = flattenFiles(result.tree).filter((item) => item.type === "file");
    const preferred = files.find((item) => item.path === "package.json")
      || files.find((item) => /^(readme|index)\./i.test(item.name))
      || files.find((item) => /\.(tsx?|jsx?|html|css|json|md)$/i.test(item.name));
    if (preferred) {
      try {
        const file = await window.developerStudio.readFile(preferred.path);
        setSelectedPath(file.path);
        setFileContent(file.content);
        setSavedContent(file.content);
      } catch (error: any) {
        appendLog("تعذر فتح الملف الأولي: " + (error?.message || String(error)));
      }
    }
    if (nextScripts.build && window.confirm("تم فتح المشروع. هل تريد تثبيت المتطلبات وتشغيل البناء الآن؟ يتم تنفيذ أوامر المشروع بعد موافقتك فقط؛ تابع مع الملفات التي تثق بمصدرها.")) {
      setLogs(["بدء تجهيز المشروع..."]);
      buildAfterInstall.current = true;
      try {
        await window.developerStudio.installDependencies();
      } catch (error: any) {
        buildAfterInstall.current = false;
        setBusy(false);
        setBusyLabel("");
        appendLog("تعذر بدء تثبيت المتطلبات: " + (error?.message || String(error)));
      }
    }
  }, [appendLog]);

  useEffect(() => {
    if (!nativeAvailable) return;
    return window.developerStudio.onEvent((event) => {
      if (event.type === "task:started") {
        taskRunning.current = true;
        setBusy(true);
        setBusyLabel(event.kind === "install" ? "تثبيت المتطلبات" : event.kind === "build" ? "بناء المشروع" : "تشغيل المشروع");
        appendLog("$ " + (event.command || event.kind));
      } else if (event.type === "task:output") {
        const lines = String(event.text || "").replace(/\r/g, "").split("\n").filter(Boolean);
        lines.forEach((line: string) => appendLog(line));
      } else if (event.type === "task:finished") {
        taskRunning.current = false;
        setBusy(false);
        setBusyLabel("");
        const success = Number(event.code) === 0;
        appendLog(success ? "✓ انتهت العملية بنجاح." : "✕ انتهت العملية بكود " + event.code + ".");
        if (event.error) appendLog(String(event.error));
        if (event.kind === "install") {
          const shouldBuild = success && buildAfterInstall.current;
          buildAfterInstall.current = false;
          if (shouldBuild) {
            void window.developerStudio.runTask("build").catch((error: any) => {
              setBusy(false);
              appendLog("تعذر بدء البناء: " + (error?.message || String(error)));
            });
          }
        }
        if (event.kind === "build" || event.kind === "install") {
          setStatusMessage(success ? "آخر عملية اكتملت بنجاح" : "آخر عملية انتهت بخطأ؛ راجع سجل العمليات");
        }
      } else if (event.type === "preview:url") {
        setPreviewUrl(String(event.url || ""));
        appendLog("رابط المعاينة: " + event.url);
      } else if (event.type === "file:saved") {
        setStatusMessage("تم حفظ " + event.path);
      }
    });
  }, [appendLog, nativeAvailable]);

  const openFile = async (item: StudioTreeItem) => {
    if (item.type !== "file" || !nativeAvailable) return;
    if (dirty && !window.confirm("هناك تعديلات غير محفوظة. هل تريد تجاهلها وفتح ملف آخر؟")) return;
    setLoadingFile(true);
    try {
      const result = await window.developerStudio.readFile(item.path);
      setSelectedPath(result.path);
      setFileContent(result.content);
      setSavedContent(result.content);
      setStatusMessage("تم فتح الملف");
    } catch (error: any) {
      appendLog("تعذر فتح الملف: " + (error?.message || String(error)));
    } finally {
      setLoadingFile(false);
    }
  };

  const saveFile = async () => {
    if (!selectedPath || !nativeAvailable || !dirty) return;
    setBusy(true);
    setBusyLabel("حفظ الملف");
    try {
      await window.developerStudio.writeFile(selectedPath, fileContent);
      setSavedContent(fileContent);
      setStatusMessage("تم حفظ الملف محلياً");
    } catch (error: any) {
      appendLog("فشل الحفظ: " + (error?.message || String(error)));
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveFile();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const chooseFolder = async () => {
    if (!nativeAvailable) {
      setStatusMessage("استيراد المجلدات وبناؤها يحتاج تطبيق سطح المكتب.");
      return;
    }
    setBusy(true);
    setBusyLabel("اختيار المشروع");
    try {
      const result = await window.developerStudio.chooseProject();
      await loadProject(result);
      if (result) setView("workspace");
    } catch (error: any) {
      appendLog("تعذر استيراد المجلد: " + (error?.message || String(error)));
    } finally {
      if (!taskRunning.current) {
        setBusy(false);
        setBusyLabel("");
      }
    }
  };

  const chooseArchive = async () => {
    if (!nativeAvailable) {
      setStatusMessage("استيراد ملفات ZIP محلياً يحتاج تطبيق سطح المكتب.");
      return;
    }
    setBusy(true);
    setBusyLabel("فك ضغط المشروع");
    try {
      const result = await window.developerStudio.importArchive();
      await loadProject(result);
      if (result) setView("workspace");
    } catch (error: any) {
      appendLog("تعذر استيراد الأرشيف: " + (error?.message || String(error)));
    } finally {
      if (!taskRunning.current) {
        setBusy(false);
        setBusyLabel("");
      }
    }
  };

  const buildProject = async () => {
    if (!nativeAvailable || !project) return;
    if (!scripts.build) {
      appendLog("لا يوجد أمر build في package.json لهذا المشروع.");
      setStatusMessage("لم يتم العثور على أمر بناء");
      return;
    }
    if (!window.confirm("سيتم تثبيت متطلبات المشروع ثم تشغيل أمر البناء الموجود في package.json. شغّل العملية فقط لمشروع تثق بمصدره. هل تتابع؟")) return;
    setLogs([]);
    buildAfterInstall.current = true;
    try {
      await window.developerStudio.installDependencies();
    } catch (error: any) {
      buildAfterInstall.current = false;
      setBusy(false);
      setBusyLabel("");
      appendLog("فشل بدء التثبيت: " + (error?.message || String(error)));
    }
  };

  const runProject = async () => {
    if (!nativeAvailable || !scripts.dev) {
      appendLog("لا يوجد أمر dev في package.json لهذا المشروع.");
      return;
    }
    try {
      await window.developerStudio.runTask("dev");
    } catch (error: any) {
      appendLog("تعذر تشغيل المشروع: " + (error?.message || String(error)));
    }
  };

  const exportLocal = async () => {
    try {
      const result = await window.developerStudio.exportArchive();
      if (result?.filePath) {
        setStatusMessage("تم تصدير نسخة محلية: " + result.filePath);
        appendLog("تم حفظ نسخة ZIP محلية.");
      }
    } catch (error: any) {
      appendLog("فشل التصدير المحلي: " + (error?.message || String(error)));
    }
  };

  const saveGitHub = async () => {
    setBusy(true);
    setBusyLabel("الحفظ على GitHub");
    try {
      let result;
      if (saveMode === "existing") {
        result = await window.developerStudio.saveToGitHub({ remoteUrl, message: commitMessage });
      } else {
        result = await window.developerStudio.createGitHubProject({ name: repoName, visibility, message: commitMessage });
      }
      setShowSaveDialog(false);
      setStatusMessage("تم رفع المشروع إلى GitHub");
      appendLog("GitHub: " + ("url" in result ? result.url : result.remoteUrl || "تم الرفع بنجاح"));
    } catch (error: any) {
      appendLog("تعذر الحفظ على GitHub: " + (error?.message || String(error)));
    } finally {
      setBusy(false);
      setBusyLabel("");
    }
  };

  if (view === "visual") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between border-b bg-card px-4">
          <span className="text-xs font-bold">المحرر المرئي المستقل</span>
          <button className="rounded-lg border px-3 py-1 text-xs hover:bg-muted" onClick={() => setView("workspace")}>العودة إلى ملفات المشروع</button>
        </div>
        <div className="min-h-0 flex-1"><DeveloperStudioPro/></div>
      </div>
    );
  }

  if (view === "home" || view === "import") {
    return (
      <div className="studio-shell min-h-screen h-screen w-screen overflow-hidden" dir="rtl">
        <header className="studio-home-header">
          <div className="studio-brand-mark"><Code2 size={22}/></div>
          <div>
            <div className="studio-brand-name">Developer Studio <span>Independent</span></div>
            <div className="studio-brand-subtitle">بيئة مستقلة لاستيراد المشاريع وتطويرها</div>
          </div>
        </header>
        <main className="studio-home-main">
          {view === "home" ? (
            <button className="studio-import-primary" onClick={() => setView("import")} disabled={busy}>
              <span className="studio-import-icon"><Upload size={23}/></span>
              <span>استيراد مشروع جديد</span>
              <span className="studio-import-arrow"><ArrowLeft size={18}/></span>
            </button>
          ) : (
            <section className="studio-import-options">
              <div className="studio-import-options-title">
                <button className="studio-back-icon" onClick={() => setView("home")} aria-label="رجوع"><ArrowLeft size={18}/></button>
                <div><h1>استيراد مشروع</h1><p>اختر مصدر ملفات المشروع من جهازك.</p></div>
              </div>
              <button className="studio-source-option" onClick={() => void chooseFolder()} disabled={busy}>
                <span className="studio-source-icon"><FolderOpen size={22}/></span>
                <span><strong>مجلد مشروع عادي</strong><small>اختر المجلد الذي يحتوي على ملفات التطبيق.</small></span>
                <ChevronLeft size={18}/>
              </button>
              <button className="studio-source-option" onClick={() => void chooseArchive()} disabled={busy}>
                <span className="studio-source-icon"><File size={22}/></span>
                <span><strong>ملف مضغوط ZIP</strong><small>استيراد الأرشيف وفك ضغطه في مجلد محلي.</small></span>
                <ChevronLeft size={18}/>
              </button>
              {!nativeAvailable && <p className="studio-import-note">لاستيراد مجلدات أو ملفات وبناءها محلياً، استخدم نسخة Windows من Developer Studio.</p>}
              {busy && <div className="studio-busy-line"><LoaderCircle size={16} className="animate-spin"/>{busyLabel}</div>}
              {statusMessage && <p className="studio-import-note">{statusMessage}</p>}
            </section>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="project-workspace" dir="rtl">
      <header className="project-topbar">
        <div className="project-topbar-brand">
          <div className="studio-brand-mark small"><Code2 size={18}/></div>
          <div><strong>{project?.name || "مشروع محلي"}</strong><small>{project?.root || "مساحة المشروع"}</small></div>
        </div>
        <div className="project-actions">
          <button className="project-action" onClick={() => void saveFile()} disabled={!dirty || busy}><Save size={15}/>حفظ الملف</button>
          <button className="project-action" onClick={() => void buildProject()} disabled={busy || !scripts.build}><Zap size={15}/>بناء</button>
          <button className="project-action" onClick={() => void runProject()} disabled={busy || !scripts.dev}><Play size={15}/>تشغيل</button>
          <button className="project-action" onClick={() => void exportLocal()} disabled={busy}><Download size={15}/>تصدير محلي</button>
          <button className="project-action github" onClick={() => setShowSaveDialog(true)} disabled={busy}><Github size={15}/>حفظ على GitHub</button>
          <button className="project-action" onClick={() => setView("visual")}><Code2 size={15}/>المحرر المرئي</button>
          <button className="project-icon-action" onClick={() => { if (dirty && !window.confirm("هناك تعديلات غير محفوظة. هل تريد الخروج؟")) return; setProject(null); setView("home"); }} title="العودة إلى البداية"><ArrowLeft size={17}/></button>
        </div>
      </header>

      <div className="project-body">
        <aside className="project-sidebar">
          <div className="project-sidebar-heading">
            <span>ملفات المشروع</span>
            <span className="project-file-count">{flattenFiles(project?.tree || []).filter((item) => item.type === "file").length}</span>
          </div>
          <div className="project-tree-search"><Search size={14}/><input value={treeQuery} onChange={(event) => setTreeQuery(event.target.value)} placeholder="بحث في الملفات..."/></div>
          <div className="project-tree">
            {filteredTree.map((item) => <TreeNode key={item.path} item={item} depth={0} selected={selectedPath} onOpen={openFile}/>)}
          </div>
          <div className="project-sidebar-footer"><HardDrive size={13}/> مشروع محلي على هذا الجهاز</div>
        </aside>

        <main className="project-editor-area">
          <div className="project-editor-tabs">
            <div className="project-file-tab">
              <FileCode2 size={14}/>
              <span>{selectedPath || "اختر ملفاً من القائمة"}</span>
              {dirty && <i/>}
            </div>
            <div className="project-editor-tab-actions">
              {loadingFile && <LoaderCircle size={14} className="animate-spin"/>}
              <span className="project-save-hint">Ctrl + S للحفظ</span>
            </div>
          </div>
          <div className="project-code-editor">
            {selectedPath ? (
              <Editor
                height="100%"
                path={selectedPath}
                language={languageFor(selectedPath)}
                value={fileContent}
                theme="vs-dark"
                onChange={(value) => setFileContent(value ?? "")}
                onMount={(editor) => { editorRef.current = editor; }}
                options={{
                  fontSize: 14, lineHeight: 22, minimap: { enabled: true },
                  automaticLayout: true, wordWrap: "on", tabSize: 2,
                  scrollBeyondLastLine: false, smoothScrolling: true,
                  padding: { top: 16, bottom: 16 }, renderWhitespace: "selection",
                  bracketPairColorization: { enabled: true }, glyphMargin: false
                }}
              />
            ) : (
              <div className="project-empty-editor"><FilePlus2 size={34}/><strong>ابدأ من ملفات مشروعك</strong><span>اختر ملفاً من مستكشف الملفات لعرضه وتعديله هنا.</span></div>
            )}
          </div>
          <section className="project-terminal">
            <div className="project-terminal-header"><div><Terminal size={14}/><strong>سجل البناء والتشغيل</strong></div><button onClick={() => setLogs([])} title="مسح السجل"><RefreshCw size={13}/></button></div>
            <div className="project-terminal-output">
              {logs.length ? logs.map((line, index) => <div key={index}>{line}</div>) : <span className="terminal-placeholder">سيظهر هنا سجل تثبيت الحزم والبناء وتشغيل المشروع.</span>}
            </div>
          </section>
        </main>
      </div>

      <footer className="project-statusbar">
        <span><span className={"status-dot " + (busy ? "working" : "ready")}/>{busy ? busyLabel : statusMessage || "جاهز"}</span>
        <span>{dirty ? "تعديلات غير محفوظة" : "كل الملفات المفتوحة محفوظة"}</span>
        {previewUrl && <button onClick={() => void window.developerStudio.openPreviewExternal()}><Rocket size={13}/>فتح المعاينة</button>}
      </footer>

      {showSaveDialog && (
        <div className="studio-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSaveDialog(false); }}>
          <section className="studio-save-dialog" dir="rtl">
            <div className="studio-dialog-heading"><div><h2>حفظ المشروع على GitHub</h2><p>استخدم مصادقة Git أو GitHub CLI الموجودة على جهازك.</p></div><button onClick={() => setShowSaveDialog(false)}><X size={18}/></button></div>
            <div className="studio-save-tabs">
              <button className={saveMode === "existing" ? "selected" : ""} onClick={() => setSaveMode("existing")}>نفس مستودع GitHub</button>
              <button className={saveMode === "new" ? "selected" : ""} onClick={() => setSaveMode("new")}>مستودع جديد</button>
            </div>
            {saveMode === "existing" ? (
              <label className="studio-field">رابط المستودع الحالي (اختياري إذا كان origin مضبوطاً)
                <input value={remoteUrl} onChange={(event) => setRemoteUrl(event.target.value)} placeholder="https://github.com/username/project.git"/>
              </label>
            ) : (
              <>
                <label className="studio-field">اسم المستودع الجديد
                  <input value={repoName} onChange={(event) => setRepoName(event.target.value)} placeholder="username/project-name"/>
                </label>
                <label className="studio-field">خصوصية المستودع
                  <select value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "public")}>
                    <option value="private">خاص Private</option><option value="public">عام Public</option>
                  </select>
                </label>
                <p className="studio-import-note">إنشاء مستودع جديد يتطلب تثبيت GitHub CLI وتسجيل الدخول إليه مسبقاً عبر gh auth login.</p>
              </>
            )}
            <label className="studio-field">رسالة الحفظ
              <input value={commitMessage} onChange={(event) => setCommitMessage(event.target.value)} maxLength={160}/>
            </label>
            <div className="studio-dialog-actions">
              <button className="studio-dialog-cancel" onClick={() => setShowSaveDialog(false)}>إلغاء</button>
              <button className="studio-dialog-confirm" onClick={() => void saveGitHub()} disabled={busy || !commitMessage.trim() || (saveMode === "new" && !repoName.trim())}><Github size={15}/>{busy ? "جارٍ الرفع..." : "حفظ ورفع"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

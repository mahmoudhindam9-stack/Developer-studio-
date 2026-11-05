import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  ArrowLeft, ArrowRight, Bot, Check, ChevronDown, ChevronLeft, ChevronRight, Code2, Copy,
  Download, Edit3, ExternalLink, FileArchive, FileCode2, FilePlus2, Folder, FolderOpen,
  GitBranch, Github, Globe, HardDrive, KeyRound, Link2, LoaderCircle, Lock,
  LogOut, Palette, Play, Plus, Power, RefreshCw, Save, Search, Settings2, Trash2, Upload, X, Zap
} from "lucide-react";
import { DeveloperStudioPro } from "../../../DeveloperStudioPro";
import { useToast } from "../../../hooks/use-toast";
import { GlobalNavigationBar } from "../../../components/GlobalNavigationBar";
import {
  type Language,
  type ThemeId,
  translations,
} from "../../../lib/translations";
import {
  type AIAgentConfig,
  type GitHubRepo,
  type GitHubUser,
  type LoadedProject,
  type VirtualFile,
  buildDirectGitHubAuthUrl,
  buildTreeFromVirtualFiles,
  downloadProjectAsZip,
  executeAgentsInParallel,
  exportProjectToGitHub,
  fetchGitHubCurrentUser,
  fetchGitHubOAuthUrl,
  fetchGitHubRepositories,
  getProjectChanges,
  getStoredGitHubOAuthKeys,
  importLocalFilesOrFolder,
  importProjectFromGitHub,
  importZipFileInBrowser,
  loadAIAgents,
  loadActiveProjectFromStorage,
  logoutGitHubAccount,
  markProjectSyncedWithGitHub,
  saveAIAgents,
  saveActiveProjectToStorage,
  setStoredGitHubOAuthKeys,
  setStoredGitHubToken,
} from "../services/projectWorkspaceService";

type ViewMode = "home" | "import" | "agents" | "workspace" | "visual";
type ImportStep = "choose-source" | "local" | "github";
type SaveModalChoice = "choose" | "github";
type GitHubTargetMode = "same" | "existing" | "new";

interface ConfirmDialogState {
  title: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

function flattenFiles(items: StudioTreeItem[]): StudioTreeItem[] {
  return items.flatMap((item) =>
    item.type === "directory" ? [item, ...flattenFiles(item.children || [])] : [item]
  );
}

function languageFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    md: "markdown",
    py: "python",
    java: "java",
    kt: "kotlin",
    dart: "dart",
    yml: "yaml",
    yaml: "yaml",
    xml: "xml",
    sh: "shell",
    bat: "bat",
    ps1: "powershell",
    sql: "sql",
    vue: "html",
    svelte: "html",
    toml: "ini",
    env: "ini",
    txt: "plaintext",
  };
  return map[ext || ""] || "plaintext";
}

function TreeNode({
  item,
  depth,
  selected,
  modifiedPaths,
  onOpen,
}: {
  item: StudioTreeItem;
  depth: number;
  selected: string;
  modifiedPaths: Set<string>;
  onOpen: (item: StudioTreeItem) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isDirectory = item.type === "directory";
  const active = selected === item.path;
  const isModified = !isDirectory && modifiedPaths.has(item.path);

  return (
    <div>
      <button
        className={"project-tree-row " + (active ? "active" : "")}
        style={{ paddingInlineStart: 12 + depth * 15 }}
        onClick={() => (isDirectory ? setExpanded((value) => !value) : onOpen(item))}
        title={item.path}
      >
        {isDirectory ? (
          expanded ? (
            <ChevronDown size={13} />
          ) : (
            <ChevronRight size={13} />
          )
        ) : (
          <span className="tree-spacer" />
        )}
        {isDirectory ? (
          expanded ? (
            <FolderOpen size={15} />
          ) : (
            <Folder size={15} />
          )
        ) : (
          <FileCode2 size={14} />
        )}
        <span className="flex-1 truncate text-right">{item.name}</span>
        {isModified && (
          <span
            className="ms-1 inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400"
            title="Modified file"
          />
        )}
      </button>
      {isDirectory &&
        expanded &&
        (item.children || []).map((child) => (
          <TreeNode
            key={child.path}
            item={child}
            depth={depth + 1}
            selected={selected}
            modifiedPaths={modifiedPaths}
            onOpen={onOpen}
          />
        ))}
    </div>
  );
}

export function ProjectWorkspace() {
  const { toast } = useToast();

  // Language & Theme state with localStorage persistence
  const [lang, setLang] = useState<Language>(() => {
    try {
      return (localStorage.getItem("developer-studio-pro:lang") as Language) || "ar";
    } catch {
      return "ar";
    }
  });

  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    try {
      return (localStorage.getItem("developer-studio-pro:theme") as ThemeId) || "pearl-4k";
    } catch {
      return "pearl-4k";
    }
  });

  const t = translations[lang];
  const isRtl = lang === "ar";

  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("developer-studio-pro:lang", lang);
    } catch {}
  }, [lang, isRtl]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", currentTheme);
    if (currentTheme === "obsidian-4k") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    try {
      localStorage.setItem("developer-studio-pro:theme", currentTheme);
    } catch {}
  }, [currentTheme]);

  const [view, setView] = useState<ViewMode>("home");
  const [returnView, setReturnView] = useState<ViewMode>("home");
  const [importStep, setImportStep] = useState<ImportStep>("choose-source");
  const [project, setProject] = useState<LoadedProject | null>(null);
  const [selectedPath, setSelectedPath] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [treeQuery, setTreeQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const requestConfirm = useCallback(
    (
      title: string,
      onConfirm: () => void | Promise<void>,
      options?: { confirmLabel?: string; destructive?: boolean }
    ) => {
      setConfirmDialog({
        title,
        confirmLabel: options?.confirmLabel || t.confirmActionBtn,
        destructive: options?.destructive,
        onConfirm,
      });
    },
    [t.confirmActionBtn]
  );

  // New file creation modal state
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFilePathInput, setNewFilePathInput] = useState("");

  // Save / Export modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveModalChoice, setSaveModalChoice] = useState<SaveModalChoice>("choose");
  const [ghTargetMode, setGhTargetMode] = useState<GitHubTargetMode>("same");
  const [selectedExportRepo, setSelectedExportRepo] = useState<string>("");
  const [exportBranch, setExportBranch] = useState<string>("main");
  const [newRepoName, setNewRepoName] = useState<string>("");
  const [newRepoVisibility, setNewRepoVisibility] = useState<"private" | "public">("private");
  const [commitMessage, setCommitMessage] = useState<string>("Update project from Developer Studio Pro");
  const [lastPushResult, setLastPushResult] = useState<{ commitUrl: string; repoUrl: string; fullName: string } | null>(null);

  // GitHub authentication state
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [ghLoadingUser, setGhLoadingUser] = useState(false);
  const [ghRepos, setGhRepos] = useState<GitHubRepo[]>([]);
  const [ghLoadingRepos, setGhLoadingRepos] = useState(false);
  const [ghRepoQuery, setGhRepoQuery] = useState("");
  const [ghRepoFilter, setGhRepoFilter] = useState<"all" | "public" | "private">("all");

  // Multi-Agent AI Hub state
  const [agents, setAgents] = useState<AIAgentConfig[]>(() => loadAIAgents());
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentNameInput, setAgentNameInput] = useState("");
  const [agentEndpointInput, setAgentEndpointInput] = useState("");
  const [agentApiKeyInput, setAgentApiKeyInput] = useState("");
  const [agentModelInput, setAgentModelInput] = useState("");
  const [agentActiveInput, setAgentActiveInput] = useState(true);
  const [multiAgentPrompt, setMultiAgentPrompt] = useState("");
  const [runningAllAgents, setRunningAllAgents] = useState(false);

  const fileOrZipInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<any>(null);

  const dirty = fileContent !== savedContent;

  const activeAgentsCount = useMemo(
    () => agents.filter((a) => a.active).length,
    [agents]
  );

  const appendLog = useCallback((line: string) => {
    const time = new Date().toLocaleTimeString(isRtl ? "ar-EG" : "en-US", { hour12: false });
    setLogs((current) => [...current, `[${time}] ${line}`].slice(-500));
  }, [isRtl]);

  const updateAgentsList = useCallback((updater: (prev: AIAgentConfig[]) => AIAgentConfig[]) => {
    setAgents((prev) => {
      const next = updater(prev);
      saveAIAgents(next);
      return next;
    });
  }, []);

  const pageTitle = useMemo(() => {
    if (view === "home") return t.pageHome;
    if (view === "import") return t.pageImport;
    if (view === "agents") return t.pageAgents;
    if (view === "workspace") return t.pageWorkspace;
    if (view === "visual") return t.pageVisual;
    return t.appName;
  }, [view, t]);

  const handleGoBackNav = useCallback(() => {
    if (view === "agents") {
      setView(returnView || "home");
    } else if (view === "import") {
      if (importStep !== "choose-source") {
        setImportStep("choose-source");
      } else {
        setView("home");
      }
    } else if (view === "visual") {
      setView("workspace");
    } else if (view === "workspace") {
      setView("home");
    } else {
      setView("home");
    }
  }, [view, returnView, importStep]);

  // Track modified files across the project
  const modifiedPaths = useMemo(() => {
    const set = new Set<string>();
    if (!project) return set;
    const { changedFiles } = getProjectChanges(project);
    for (const f of changedFiles) set.add(f.path);
    if (selectedPath && dirty) set.add(selectedPath);
    return set;
  }, [project, selectedPath, dirty]);

  const filteredTree = useMemo(() => {
    if (!treeQuery.trim()) return project?.tree || [];
    const q = treeQuery.trim().toLowerCase();
    const all = flattenFiles(project?.tree || []);
    return all.filter(
      (item) => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
    );
  }, [project, treeQuery]);

  const filteredGhRepos = useMemo(() => {
    return ghRepos.filter((repo) => {
      if (ghRepoFilter === "public" && repo.private) return false;
      if (ghRepoFilter === "private" && !repo.private) return false;
      if (!ghRepoQuery.trim()) return true;
      const q = ghRepoQuery.trim().toLowerCase();
      return (
        repo.name.toLowerCase().includes(q) ||
        repo.fullName.toLowerCase().includes(q) ||
        (repo.description || "").toLowerCase().includes(q)
      );
    });
  }, [ghRepos, ghRepoFilter, ghRepoQuery]);

  useEffect(() => {
    loadActiveProjectFromStorage().then((savedProj) => {
      if (savedProj && savedProj.files && Object.keys(savedProj.files).length > 0) {
        setProject(savedProj);
      }
    });
    void checkGitHubSession();
  }, []);

  const checkGitHubSession = useCallback(async () => {
    setGhLoadingUser(true);
    try {
      const userRes = await fetchGitHubCurrentUser();
      if (userRes.authenticated && userRes.user) {
        setGhUser(userRes.user);
        setGhLoadingRepos(true);
        try {
          const repos = await fetchGitHubRepositories();
          setGhRepos(repos);
        } catch (err: any) {
          appendLog("Error fetching repositories: " + (err?.message || String(err)));
        } finally {
          setGhLoadingRepos(false);
        }
      } else {
        setGhUser(null);
        setGhRepos([]);
      }
    } finally {
      setGhLoadingUser(false);
    }
  }, [appendLog]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        if (event.data.token && typeof event.data.token === "string") {
          setStoredGitHubToken(event.data.token);
        }
        toast({
          title: t.loginWithGitHub,
        });
        void checkGitHubSession();
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [checkGitHubSession, toast, t]);

  const openGitHubAuthorizationPopupNow = useCallback(() => {
    const authUrl = buildDirectGitHubAuthUrl();
    window.open(authUrl, "github_oauth_popup", "width=820,height=740");
    void fetchGitHubOAuthUrl().catch(() => undefined);
  }, []);

  const activateLoadedProject = useCallback(
    async (loaded: LoadedProject, message: string) => {
      setProject(loaded);
      await saveActiveProjectToStorage(loaded);
      setView("workspace");
      setLogs([
        `✓ ${message}`,
        `Project: ${loaded.name} (${Object.keys(loaded.files).length} files)`,
        ...(loaded.githubLink
          ? [`Linked GitHub Repo: ${loaded.githubLink.fullName} (${loaded.githubLink.branch})`]
          : ["Source: Local files"]),
      ]);
      setStatusMessage(message);
      setLastPushResult(null);

      if (loaded.githubLink) {
        setGhTargetMode("same");
        setExportBranch(loaded.githubLink.branch || "main");
        setSelectedExportRepo(loaded.githubLink.fullName);
      } else {
        setGhTargetMode("existing");
        setNewRepoName(loaded.name);
      }

      const allFiles = Object.values(loaded.files).filter((f) => !f.isBinary);
      const preferred =
        allFiles.find((f) => f.path === "src/App.tsx" || f.path === "App.tsx") ||
        allFiles.find((f) => f.path === "package.json") ||
        allFiles.find((f) => /^(readme|index)\./i.test(f.path.split("/").pop() || "")) ||
        allFiles.find((f) => /\.(tsx?|jsx?|html|css|json|md|py|js)$/i.test(f.path)) ||
        allFiles[0];

      if (preferred) {
        setSelectedPath(preferred.path);
        setFileContent(preferred.content);
        setSavedContent(preferred.content);
      } else {
        setSelectedPath("");
        setFileContent("");
        setSavedContent("");
      }
    },
    []
  );

  const syncCurrentBufferToProject = useCallback(
    (targetProject: LoadedProject | null = project): LoadedProject | null => {
      if (!targetProject) return null;
      if (!selectedPath || !targetProject.files[selectedPath]) return targetProject;
      const existing = targetProject.files[selectedPath];
      if (existing.isBinary || existing.content === fileContent) return targetProject;

      const updatedFile: VirtualFile = {
        ...existing,
        content: fileContent,
        size: new Blob([fileContent]).size,
        modified: true,
      };
      const nextFiles = {
        ...targetProject.files,
        [selectedPath]: updatedFile,
      };
      const updatedProject: LoadedProject = {
        ...targetProject,
        files: nextFiles,
        tree: buildTreeFromVirtualFiles(nextFiles),
      };
      return updatedProject;
    },
    [project, selectedPath, fileContent]
  );

  const openFile = async (item: StudioTreeItem) => {
    if (item.type !== "file" || !project) return;
    let currentProj = project;
    if (selectedPath && dirty) {
      const synced = syncCurrentBufferToProject(project);
      if (synced) {
        currentProj = synced;
        setProject(synced);
        void saveActiveProjectToStorage(synced);
      }
    }

    setLoadingFile(true);
    try {
      const vFile = currentProj.files[item.path];
      if (!vFile) return;
      if (vFile.isBinary) {
        toast({
          title: `Binary file (${item.name})`,
        });
        return;
      }
      setSelectedPath(vFile.path);
      setFileContent(vFile.content);
      setSavedContent(vFile.content);
      setStatusMessage(`${t.saved}: ${vFile.path}`);
    } finally {
      setLoadingFile(false);
    }
  };

  const saveFile = useCallback(async () => {
    if (!selectedPath || !project) return;
    const synced = syncCurrentBufferToProject(project);
    if (!synced) return;
    setProject(synced);
    setSavedContent(fileContent);
    await saveActiveProjectToStorage(synced);
    setStatusMessage(`${t.saved}: ${selectedPath}`);
    appendLog(`✓ ${t.saved}: ${selectedPath}`);
    toast({
      title: `${t.saved}: ${selectedPath}`,
    });
  }, [selectedPath, project, syncCurrentBufferToProject, fileContent, appendLog, toast, t.saved]);

  const handleCreateNewFile = () => {
    if (!project) return;
    const cleanPath = newFilePathInput.trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!cleanPath) return;
    if (project.files[cleanPath]) {
      toast({
        title: "File already exists",
        variant: "destructive",
      });
      return;
    }

    requestConfirm(`${t.newFile}: ${cleanPath}?`, async () => {
      const baseProj = syncCurrentBufferToProject(project) || project;
      const nextFiles: Record<string, VirtualFile> = {
        ...baseProj.files,
        [cleanPath]: {
          path: cleanPath,
          content: "",
          isBinary: false,
          size: 0,
          modified: true,
        },
      };
      const nextProj: LoadedProject = {
        ...baseProj,
        files: nextFiles,
        tree: buildTreeFromVirtualFiles(nextFiles),
      };
      setProject(nextProj);
      await saveActiveProjectToStorage(nextProj);
      setSelectedPath(cleanPath);
      setFileContent("");
      setSavedContent("");
      setNewFilePathInput("");
      setShowNewFileModal(false);
      appendLog(`+ ${t.newFile}: ${cleanPath}`);
      toast({ title: `${t.newFile}: ${cleanPath}` });
    });
  };

  const handleDeleteCurrentFile = () => {
    if (!project || !selectedPath) return;
    const target = selectedPath;
    requestConfirm(
      `${t.deleteFile}: ${target}?`,
      async () => {
        const nextFiles = { ...project.files };
        delete nextFiles[target];
        const nextProj: LoadedProject = {
          ...project,
          files: nextFiles,
          tree: buildTreeFromVirtualFiles(nextFiles),
        };
        setProject(nextProj);
        await saveActiveProjectToStorage(nextProj);
        const remaining = Object.values(nextFiles).filter((f) => !f.isBinary);
        if (remaining[0]) {
          setSelectedPath(remaining[0].path);
          setFileContent(remaining[0].content);
          setSavedContent(remaining[0].content);
        } else {
          setSelectedPath("");
          setFileContent("");
          setSavedContent("");
        }
        appendLog(`- ${t.deleteFile}: ${target}`);
        toast({ title: `${t.deleteFile}: ${target}` });
      },
      { confirmLabel: t.deleteAgent, destructive: true }
    );
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (view === "workspace") {
          void saveFile();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [view, saveFile]);

  const executeLocalImport = async (filesArray: File[]) => {
    if (!filesArray.length) return;
    setBusy(true);
    const isSingleZip = filesArray.length === 1 && /\.zip$/i.test(filesArray[0].name);
    setBusyLabel(isSingleZip ? t.zipOrFiles : t.uncompressedFolder);
    try {
      const loaded = isSingleZip
        ? await importZipFileInBrowser(filesArray[0])
        : await importLocalFilesOrFolder(filesArray);
      await activateLoadedProject(loaded, `${t.importNewProject} (${loaded.name})`);
      toast({
        title: `${t.importNewProject} (${loaded.name})`,
      });
    } catch (error: any) {
      const msg = error?.message || "Error reading files";
      setStatusMessage(msg);
      toast({ title: msg, variant: "destructive" });
    } finally {
      setBusy(false);
      setBusyLabel("");
      if (fileOrZipInputRef.current) fileOrZipInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  const handleLocalSelection = (fileList: FileList | File[] | null) => {
    if (!fileList || fileList.length === 0) return;
    const filesArray = Array.from(fileList);
    const label =
      filesArray.length === 1
        ? filesArray[0].name
        : `${filesArray.length} files`;
    requestConfirm(`${t.importNewProject} (${label})?`, () => executeLocalImport(filesArray));
  };

  const readEntryRecursively = async (entry: any, prefix = ""): Promise<File[]> => {
    if (!entry) return [];
    if (entry.isFile) {
      return new Promise<File[]>((resolve) => {
        entry.file(
          (file: File) => {
            const fullPath = prefix ? `${prefix}/${file.name}` : file.name;
            Object.defineProperty(file, "webkitRelativePath", {
              value: fullPath,
              configurable: true,
            });
            resolve([file]);
          },
          () => resolve([])
        );
      });
    }
    if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        const all: any[] = [];
        const readBatch = () => {
          reader.readEntries(
            (batch: any[]) => {
              if (!batch.length) resolve(all);
              else {
                all.push(...batch);
                readBatch();
              }
            },
            () => resolve(all)
          );
        };
        readBatch();
      });
      const nextPrefix = prefix ? `${prefix}/${entry.name}` : entry.name;
      const nested = await Promise.all(entries.map((child) => readEntryRecursively(child, nextPrefix)));
      return nested.flat();
    }
    return [];
  };

  const handleDropFilesOrFolder = async (event: React.DragEvent) => {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;

    const items = event.dataTransfer?.items;
    if (items && items.length > 0) {
      const entries: any[] = [];
      for (let i = 0; i < items.length; i++) {
        const webkitEntry = (items[i] as any).webkitGetAsEntry?.();
        if (webkitEntry) entries.push(webkitEntry);
      }
      if (entries.some((e) => e.isDirectory)) {
        const allFiles = (await Promise.all(entries.map((e) => readEntryRecursively(e)))).flat();
        handleLocalSelection(allFiles);
        return;
      }
    }

    if (event.dataTransfer?.files?.length) {
      handleLocalSelection(event.dataTransfer.files);
    }
  };

  const handleSelectGitHubOption = () => {
    setImportStep("github");
    if (!ghUser) {
      openGitHubAuthorizationPopupNow();
    }
    void checkGitHubSession();
  };

  const handleImportRepoFromGitHub = (repo: GitHubRepo) => {
    requestConfirm(`${t.importRepoBtn} (${repo.fullName})?`, async () => {
      setBusy(true);
      setBusyLabel(`${t.importRepoBtn} ${repo.fullName}...`);
      try {
        const loaded = await importProjectFromGitHub(repo.owner, repo.name, repo.defaultBranch);
        await activateLoadedProject(
          loaded,
          `${t.importRepoBtn} ${loaded.githubLink?.fullName}`
        );
        toast({
          title: `${t.importRepoBtn} ${repo.fullName}`,
        });
      } catch (error: any) {
        toast({
          title: error?.message || "Error importing repository",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        setBusyLabel("");
      }
    });
  };

  const handleLogoutGitHub = () => {
    requestConfirm(
      `${t.logout} GitHub?`,
      async () => {
        await logoutGitHubAccount();
        setGhUser(null);
        setGhRepos([]);
        toast({ title: t.logout });
      },
      { confirmLabel: t.logout, destructive: true }
    );
  };

  const handleSaveLocalZipImmediate = () => {
    if (!project) return;
    requestConfirm(`${t.saveLocalZip} (${project.name}.zip)?`, async () => {
      setBusy(true);
      setBusyLabel(t.working);
      try {
        const upToDate = syncCurrentBufferToProject(project) || project;
        setProject(upToDate);
        setSavedContent(fileContent);
        await saveActiveProjectToStorage(upToDate);

        const result = await downloadProjectAsZip(upToDate);
        setShowSaveModal(false);
        setStatusMessage(`${result.fileName}`);
        appendLog(`✓ ${result.fileName} (${result.fileCount} files)`);
        toast({
          title: `${result.fileName}`,
        });
      } catch (error: any) {
        appendLog("✕ " + (error?.message || String(error)));
        toast({
          title: error?.message || "Error",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        setBusyLabel("");
      }
    });
  };

  const handleExportToGitHubSubmit = () => {
    if (!project) return;
    const targetDesc =
      ghTargetMode === "same" && project.githubLink
        ? project.githubLink.fullName
        : ghTargetMode === "existing"
          ? selectedExportRepo
          : newRepoName.trim();

    requestConfirm(`${t.exportGitHub} (${targetDesc})?`, async () => {
      setBusy(true);
      setBusyLabel(t.publishing);
      try {
        const upToDate = syncCurrentBufferToProject(project) || project;
        setProject(upToDate);
        setSavedContent(fileContent);
        await saveActiveProjectToStorage(upToDate);

        let owner = "";
        let repo = "";
        let branch = exportBranch.trim() || "main";
        let createNew = false;

        if (ghTargetMode === "same" && upToDate.githubLink) {
          owner = upToDate.githubLink.owner;
          repo = upToDate.githubLink.repo;
          branch = exportBranch.trim() || upToDate.githubLink.branch || "main";
        } else if (ghTargetMode === "existing") {
          const parts = selectedExportRepo.trim().split("/").filter(Boolean);
          if (parts.length !== 2) return;
          owner = parts[0];
          repo = parts[1];
        } else if (ghTargetMode === "new") {
          createNew = true;
        }

        const result = await exportProjectToGitHub({
          project: upToDate,
          owner,
          repo,
          branch,
          message: commitMessage.trim() || "Update project from Developer Studio Pro",
          createNew,
          newRepoName: newRepoName.trim(),
          visibility: newRepoVisibility,
        });

        const syncedProj = markProjectSyncedWithGitHub(upToDate, result);
        setProject(syncedProj);
        await saveActiveProjectToStorage(syncedProj);
        setLastPushResult({
          commitUrl: result.commitUrl,
          repoUrl: result.repoUrl,
          fullName: result.fullName,
        });
        setStatusMessage(`GitHub: ${result.fullName}`);
        appendLog(`✓ GitHub (${result.fullName}@${result.branch}) — Commit: ${result.commitSha.slice(0, 7)}`);
        toast({
          title: `GitHub (${result.fullName})`,
        });
      } catch (error: any) {
        appendLog("✕ " + (error?.message || String(error)));
        toast({
          title: error?.message || "Error",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
        setBusyLabel("");
      }
    });
  };

  const openSaveProjectModal = (initialStep: SaveModalChoice = "choose") => {
    if (project && selectedPath && dirty) {
      const synced = syncCurrentBufferToProject(project);
      if (synced) {
        setProject(synced);
        setSavedContent(fileContent);
        void saveActiveProjectToStorage(synced);
      }
    }
    if (project?.githubLink) {
      setGhTargetMode("same");
      setExportBranch(project.githubLink.branch || "main");
      setSelectedExportRepo(project.githubLink.fullName);
    } else {
      setGhTargetMode(ghRepos.length > 0 ? "existing" : "new");
      if (ghRepos.length > 0 && !selectedExportRepo) {
        setSelectedExportRepo(ghRepos[0].fullName);
        setExportBranch(ghRepos[0].defaultBranch || "main");
      }
      if (!newRepoName && project?.name) {
        setNewRepoName(project.name);
      }
    }
    setLastPushResult(null);
    setSaveModalChoice(initialStep);
    setShowSaveModal(true);
    if (initialStep === "github" && !ghUser) {
      openGitHubAuthorizationPopupNow();
      void checkGitHubSession();
    }
  };

  const openAddAgentForm = () => {
    setEditingAgentId(null);
    setAgentNameInput(`Agent ${agents.length + 1}`);
    setAgentEndpointInput("");
    setAgentApiKeyInput("");
    setAgentModelInput("");
    setAgentActiveInput(true);
    setShowAgentForm(true);
  };

  const openEditAgentForm = (agent: AIAgentConfig) => {
    setEditingAgentId(agent.id);
    setAgentNameInput(agent.name);
    setAgentEndpointInput(agent.endpoint);
    setAgentApiKeyInput(agent.apiKey);
    setAgentModelInput(agent.model);
    setAgentActiveInput(agent.active);
    setShowAgentForm(true);
  };

  const handleSaveAgentSubmit = () => {
    const cleanName = agentNameInput.trim();
    const cleanEndpoint = agentEndpointInput.trim();
    const cleanKey = agentApiKeyInput.trim();
    const cleanModel = agentModelInput.trim();

    if (!cleanName || !cleanEndpoint) return;

    if (editingAgentId) {
      requestConfirm(`${t.saveAgent} (${cleanName})?`, () => {
        updateAgentsList((prev) =>
          prev.map((item) =>
            item.id === editingAgentId
              ? {
                  ...item,
                  name: cleanName,
                  endpoint: cleanEndpoint,
                  apiKey: cleanKey,
                  model: cleanModel,
                  active: agentActiveInput,
                }
              : item
          )
        );
        setShowAgentForm(false);
        setEditingAgentId(null);
        toast({ title: `${t.saved}: ${cleanName}` });
      });
    } else {
      requestConfirm(`${t.addAgent} (${cleanName})?`, () => {
        const newAgent: AIAgentConfig = {
          id: crypto.randomUUID(),
          name: cleanName,
          endpoint: cleanEndpoint,
          apiKey: cleanKey,
          model: cleanModel,
          active: agentActiveInput,
          createdAt: new Date().toISOString(),
          status: "idle",
        };
        updateAgentsList((prev) => [...prev, newAgent]);
        setShowAgentForm(false);
        toast({ title: `${t.addAgent}: ${cleanName}` });
      });
    }
  };

  const handleToggleAgentActive = (agent: AIAgentConfig) => {
    const nextState = !agent.active;
    requestConfirm(
      nextState
        ? `${t.agentActive} (${agent.name})?`
        : `${t.agentInactive} (${agent.name})?`,
      () => {
        updateAgentsList((prev) =>
          prev.map((item) =>
            item.id === agent.id ? { ...item, active: nextState } : item
          )
        );
        toast({
          title: nextState ? `${t.agentActive}: ${agent.name}` : `${t.agentInactive}: ${agent.name}`,
        });
      }
    );
  };

  const handleDeleteAgent = (agent: AIAgentConfig) => {
    requestConfirm(
      `${t.deleteAgent} (${agent.name})?`,
      () => {
        updateAgentsList((prev) => prev.filter((item) => item.id !== agent.id));
        if (editingAgentId === agent.id) {
          setShowAgentForm(false);
          setEditingAgentId(null);
        }
        toast({ title: `${t.deleteAgent}: ${agent.name}` });
      },
      { confirmLabel: t.deleteAgent, destructive: true }
    );
  };

  const handleRunAllActiveAgents = () => {
    const activeList = agents.filter((a) => a.active);
    if (activeList.length === 0) return;
    const promptToRun = multiAgentPrompt.trim() || "Ping / Health Check";

    requestConfirm(
      `${t.runActiveAgentsConcurrently} (${activeList.length})?`,
      async () => {
        setRunningAllAgents(true);
        appendLog(`⚡ ${t.runActiveAgentsConcurrently} (${activeList.length})...`);
        const fileContext =
          selectedPath && fileContent
            ? `File: ${selectedPath}\n${fileContent.slice(0, 4000)}`
            : undefined;

        try {
          const summary = await executeAgentsInParallel(
            agents,
            promptToRun,
            fileContext,
            (agentId, patch) => {
              setAgents((prev) => {
                const updated = prev.map((a) =>
                  a.id === agentId ? { ...a, ...patch } : a
                );
                saveAIAgents(updated);
                return updated;
              });
            }
          );
          appendLog(`✓ ${t.runActiveAgentsConcurrently} (${summary.succeeded} ok / ${summary.failed} err)`);
          toast({
            title: `${t.runActiveAgentsConcurrently} (${summary.succeeded} ok / ${summary.failed} err)`,
          });
        } finally {
          setRunningAllAgents(false);
        }
      }
    );
  };

  // Global Confirmation Dialog
  const confirmModalElement = confirmDialog ? (
    <div
      className="studio-dialog-backdrop"
      style={{ zIndex: 120 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setConfirmDialog(null);
      }}
    >
      <section
        className="studio-save-dialog"
        style={{ width: "min(400px, calc(100vw - 32px))" }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="studio-dialog-heading">
          <h2>{confirmDialog.title}</h2>
          <button onClick={() => setConfirmDialog(null)}>
            <X size={18} />
          </button>
        </div>
        <div className="studio-dialog-actions">
          <button
            className="studio-dialog-cancel"
            onClick={() => setConfirmDialog(null)}
          >
            {t.cancel}
          </button>
          <button
            className="studio-dialog-confirm"
            style={
              confirmDialog.destructive
                ? { background: "linear-gradient(135deg, #e11d48, #be123c)" }
                : undefined
            }
            onClick={() => {
              const action = confirmDialog.onConfirm;
              setConfirmDialog(null);
              void action();
            }}
          >
            <Check size={15} />
            {confirmDialog.confirmLabel || t.confirmActionBtn}
          </button>
        </div>
      </section>
    </div>
  ) : null;

  const renderGitHubUserAuthPanel = () => (
    <div className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-4 flex flex-col items-center justify-center gap-3 text-center">
      <button
        onClick={() => openGitHubAuthorizationPopupNow()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
      >
        <Github size={18} />
        {t.loginWithGitHub}
      </button>
    </div>
  );

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      {/* Global Navigation Bar rendered at the top of every page */}
      <GlobalNavigationBar
        currentView={view}
        pageTitle={pageTitle}
        canGoBack={view !== "home"}
        onGoBack={handleGoBackNav}
        lang={lang}
        onLanguageChange={(nl) => setLang(nl)}
        currentTheme={currentTheme}
        onThemeChange={(nt) => setCurrentTheme(nt)}
        activeAgentsCount={activeAgentsCount}
        activeProjectName={project?.name}
        activeProjectSource={project?.source}
        onOpenAgentsModal={() => {
          setReturnView(view === "agents" ? returnView : view);
          setView("agents");
        }}
      />

      <div className="min-h-0 flex-1 relative overflow-hidden">
        {/* VISUAL STUDIO VIEW */}
        {view === "visual" && (
          <div className="flex h-full min-h-0 w-full flex-col">
            <div className="min-h-0 flex-1">
              <DeveloperStudioPro />
            </div>
          </div>
        )}

        {/* HOME, IMPORT & AI AGENTS VIEWS */}
        {(view === "home" || view === "import" || view === "agents") && (
          <div className="studio-shell h-full w-full overflow-hidden">
            <input
              ref={fileOrZipInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleLocalSelection(e.target.files)}
            />
            <input
              ref={folderInputRef}
              type="file"
              {...({ webkitdirectory: "", directory: "" } as any)}
              multiple
              className="hidden"
              onChange={(e) => handleLocalSelection(e.target.files)}
            />

            <main className="studio-home-main h-full">
              {view === "home" && (
                <div className="flex w-full max-w-md flex-col items-center gap-3">
                  <button
                    className="studio-import-primary"
                    onClick={() => {
                      setImportStep("choose-source");
                      setView("import");
                    }}
                    disabled={busy}
                  >
                    <span className="studio-import-icon">
                      <Upload size={23} />
                    </span>
                    <span>{t.importNewProject}</span>
                    <span className="studio-import-arrow">
                      {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                    </span>
                  </button>

                  <button
                    className="studio-import-primary"
                    onClick={() => {
                      setReturnView("home");
                      setView("agents");
                    }}
                    disabled={busy}
                  >
                    <span className="studio-import-icon">
                      <Bot size={23} />
                    </span>
                    <span className="flex items-center justify-between gap-2 w-full">
                      <span>{t.aiAgentsHub}</span>
                      <span className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300">
                        {t.activeBadge}: {activeAgentsCount}
                      </span>
                    </span>
                    <span className="studio-import-arrow">
                      {isRtl ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                    </span>
                  </button>

                  {project && (
                    <button
                      onClick={() => setView("workspace")}
                      className="flex w-full items-center justify-between rounded-2xl border border-slate-700/70 bg-slate-900/70 px-5 py-3.5 text-sm font-bold text-white transition hover:border-emerald-500/50 hover:bg-slate-800/80"
                    >
                      <div className="flex items-center gap-3">
                        {project.githubLink ? (
                          <Github size={19} className="text-emerald-400" />
                        ) : (
                          <HardDrive size={19} className="text-emerald-400" />
                        )}
                        <span>{project.name}</span>
                      </div>
                      {isRtl ? <ArrowLeft size={16} className="text-emerald-400" /> : <ArrowRight size={16} className="text-emerald-400" />}
                    </button>
                  )}
                </div>
              )}

              {view === "import" && (
                <section className="studio-import-options" style={{ width: "min(600px, calc(100vw - 32px))" }}>
                  {importStep === "choose-source" && (
                    <>
                      <div className="studio-import-options-title">
                        <h1>{t.importNewProject}</h1>
                      </div>

                      <button
                        className="studio-source-option"
                        onClick={() => setImportStep("local")}
                        disabled={busy}
                      >
                        <span className="studio-source-icon">
                          <HardDrive size={22} />
                        </span>
                        <span>
                          <strong>{t.localSource}</strong>
                        </span>
                        {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                      </button>

                      <button
                        className="studio-source-option"
                        onClick={() => handleSelectGitHubOption()}
                        disabled={busy}
                      >
                        <span className="studio-source-icon">
                          <Github size={22} />
                        </span>
                        <span>
                          <strong>{t.githubSource}</strong>
                        </span>
                        {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                      </button>
                    </>
                  )}

                  {importStep === "local" && (
                    <>
                      <div className="studio-import-options-title">
                        <h1>{t.localSource}</h1>
                      </div>

                      <button
                        className="studio-source-option"
                        onClick={() => fileOrZipInputRef.current?.click()}
                        disabled={busy}
                      >
                        <span className="studio-source-icon">
                          <FileArchive size={22} />
                        </span>
                        <span>
                          <strong>{t.zipOrFiles}</strong>
                        </span>
                        {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                      </button>

                      <button
                        className="studio-source-option"
                        onClick={() => folderInputRef.current?.click()}
                        disabled={busy}
                      >
                        <span className="studio-source-icon">
                          <FolderOpen size={22} />
                        </span>
                        <span>
                          <strong>{t.uncompressedFolder}</strong>
                        </span>
                        {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                      </button>

                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragActive(true);
                        }}
                        onDragLeave={() => setDragActive(false)}
                        onDrop={(e) => void handleDropFilesOrFolder(e)}
                        onClick={() => fileOrZipInputRef.current?.click()}
                        className={
                          "mt-2.5 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-3.5 text-center transition " +
                          (dragActive
                            ? "border-emerald-400 bg-emerald-500/15"
                            : "border-slate-700/80 bg-slate-900/40 hover:border-emerald-500/50 hover:bg-slate-900/70")
                        }
                      >
                        <Upload size={18} className="text-emerald-400" />
                        <span className="text-xs font-bold text-slate-200">
                          {t.dragDropHint}
                        </span>
                      </div>
                    </>
                  )}

                  {importStep === "github" && (
                    <>
                      <div className="studio-import-options-title">
                        <h1>GitHub</h1>
                      </div>

                      {ghLoadingUser ? (
                        <div className="flex items-center justify-center gap-3 py-6 text-sm text-emerald-300">
                          <LoaderCircle size={20} className="animate-spin" />
                          <span>{t.connecting}</span>
                        </div>
                      ) : !ghUser ? (
                        renderGitHubUserAuthPanel()
                      ) : (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/25 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={ghUser.avatar_url}
                                alt={ghUser.login}
                                className="h-7 w-7 rounded-full border border-emerald-400/50"
                              />
                              <strong className="text-xs text-white">{ghUser.name}</strong>
                              <span className="font-mono text-xs text-emerald-300" dir="ltr">
                                @{ghUser.login}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => void checkGitHubSession()}
                                disabled={ghLoadingRepos || busy}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-700"
                              >
                                <RefreshCw size={12} className={ghLoadingRepos ? "animate-spin" : ""} />
                                {t.refreshRepos}
                              </button>
                              <button
                                onClick={() => handleLogoutGitHub()}
                                disabled={busy}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20"
                              >
                                <LogOut size={12} />
                                {t.logout}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-3">
                              <Search size={14} className="text-slate-400" />
                              <input
                                value={ghRepoQuery}
                                onChange={(e) => setGhRepoQuery(e.target.value)}
                                placeholder={t.searchReposPlaceholder}
                                className="w-full bg-transparent text-xs text-white outline-none placeholder:text-slate-500"
                              />
                            </div>
                            <div className="flex rounded-xl border border-slate-700 bg-slate-950/80 p-1 text-xs">
                              <button
                                onClick={() => setGhRepoFilter("all")}
                                className={
                                  "rounded-lg px-2 py-0.5 font-bold " +
                                  (ghRepoFilter === "all"
                                    ? "bg-emerald-600 text-white"
                                    : "text-slate-400 hover:text-white")
                                }
                              >
                                {t.filterAll} ({ghRepos.length})
                              </button>
                              <button
                                onClick={() => setGhRepoFilter("public")}
                                className={
                                  "rounded-lg px-2 py-0.5 font-bold " +
                                  (ghRepoFilter === "public"
                                    ? "bg-emerald-600 text-white"
                                    : "text-slate-400 hover:text-white")
                                }
                              >
                                {t.filterPublic}
                              </button>
                              <button
                                onClick={() => setGhRepoFilter("private")}
                                className={
                                  "rounded-lg px-2 py-0.5 font-bold " +
                                  (ghRepoFilter === "private"
                                    ? "bg-emerald-600 text-white"
                                    : "text-slate-400 hover:text-white")
                                }
                              >
                                {t.filterPrivate}
                              </button>
                            </div>
                          </div>

                          <div className="max-h-[230px] space-y-1.5 overflow-y-auto pe-1">
                            {ghLoadingRepos ? (
                              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
                                <LoaderCircle size={16} className="animate-spin text-emerald-400" />
                                <span>{t.connecting}</span>
                              </div>
                            ) : filteredGhRepos.length === 0 ? (
                              <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-5 text-center text-xs text-slate-400">
                                {t.noReposFound}
                              </div>
                            ) : (
                              filteredGhRepos.map((repo) => (
                                <div
                                  key={repo.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 transition hover:border-emerald-500/40 hover:bg-slate-900"
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <span
                                      className="truncate font-mono text-xs font-extrabold text-white"
                                      dir="ltr"
                                    >
                                      {repo.fullName}
                                    </span>
                                    <span
                                      className={
                                        "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold " +
                                        (repo.private
                                          ? "bg-amber-500/15 text-amber-300"
                                          : "bg-sky-500/15 text-sky-300")
                                      }
                                    >
                                      {repo.private ? <Lock size={10} /> : <Globe size={10} />}
                                      {repo.private ? "Private" : "Public"}
                                    </span>
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">
                                      <GitBranch size={10} />
                                      {repo.defaultBranch}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleImportRepoFromGitHub(repo)}
                                    disabled={busy}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                                  >
                                    <Download size={13} />
                                    {t.importRepoBtn}
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {busy && (
                    <div className="studio-busy-line">
                      <LoaderCircle size={16} className="animate-spin" />
                      <span>{busyLabel}</span>
                    </div>
                  )}
                </section>
              )}

              {/* VIEW: AI AGENTS HUB */}
              {view === "agents" && (
                <section
                  className="studio-import-options"
                  style={{ width: "min(680px, calc(100vw - 32px))" }}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <h1 className="text-lg font-extrabold text-white">{t.pageAgents}</h1>
                      <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-extrabold text-emerald-300">
                        {t.activeBadge}: {activeAgentsCount} / {agents.length}
                      </span>
                    </div>

                    <button
                      onClick={() => openAddAgentForm()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-emerald-500"
                    >
                      <Plus size={14} />
                      {t.addAgent}
                    </button>
                  </div>

                  {showAgentForm && (
                    <div className="mb-3 rounded-xl border border-emerald-500/40 bg-slate-950/90 p-3 space-y-2.5">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={agentNameInput}
                          onChange={(e) => setAgentNameInput(e.target.value)}
                          placeholder={t.agentName}
                          className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs text-white outline-none focus:border-emerald-500"
                        />
                        <input
                          value={agentEndpointInput}
                          onChange={(e) => setAgentEndpointInput(e.target.value)}
                          placeholder={t.agentEndpoint}
                          dir="ltr"
                          className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-white outline-none focus:border-emerald-500"
                        />
                        <input
                          type="password"
                          value={agentApiKeyInput}
                          onChange={(e) => setAgentApiKeyInput(e.target.value)}
                          placeholder={t.apiKey}
                          dir="ltr"
                          className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-white outline-none focus:border-emerald-500"
                        />
                        <input
                          value={agentModelInput}
                          onChange={(e) => setAgentModelInput(e.target.value)}
                          placeholder={t.agentModel}
                          dir="ltr"
                          className="h-9 rounded-lg border border-slate-700 bg-slate-900 px-3 font-mono text-xs text-white outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setAgentActiveInput((v) => !v)}
                          className={
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold " +
                            (agentActiveInput
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                              : "border-slate-700 bg-slate-800 text-slate-400")
                          }
                        >
                          <Power size={12} />
                          {agentActiveInput ? t.agentActive : t.agentInactive}
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setShowAgentForm(false);
                              setEditingAgentId(null);
                            }}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300"
                          >
                            {t.cancel}
                          </button>
                          <button
                            onClick={() => handleSaveAgentSubmit()}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1 text-xs font-extrabold text-white hover:bg-emerald-500"
                          >
                            <Check size={13} />
                            {t.saveAgent}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex gap-2">
                    <input
                      value={multiAgentPrompt}
                      onChange={(e) => setMultiAgentPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRunAllActiveAgents();
                      }}
                      placeholder={t.runAgentsPromptPlaceholder}
                      className="h-9 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 text-xs text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => handleRunAllActiveAgents()}
                      disabled={runningAllAgents || activeAgentsCount === 0}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-extrabold text-white transition hover:bg-emerald-500 disabled:opacity-40"
                    >
                      {runningAllAgents ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )}
                      {t.runActiveAgentsConcurrently} ({activeAgentsCount})
                    </button>
                  </div>

                  <div className="max-h-[250px] space-y-1.5 overflow-y-auto pe-1">
                    {agents.length === 0 ? (
                      <div className="rounded-xl border border-slate-800 bg-slate-900/40 py-6 text-center text-xs text-slate-400">
                        {t.noAgentsYet}
                      </div>
                    ) : (
                      agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 transition hover:border-emerald-500/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <button
                                onClick={() => handleToggleAgentActive(agent)}
                                className={
                                  "inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold transition " +
                                  (agent.active
                                    ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                                    : "border-slate-700 bg-slate-800 text-slate-400")
                                }
                              >
                                <Power size={11} />
                                {agent.active ? t.agentActive : t.agentInactive}
                              </button>

                              <strong className="truncate text-xs text-white">
                                {agent.name}
                              </strong>

                              <span
                                className="truncate font-mono text-[11px] text-slate-400"
                                dir="ltr"
                              >
                                {agent.endpoint}
                              </span>

                              {agent.model && (
                                <span
                                  className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300"
                                  dir="ltr"
                                >
                                  {agent.model}
                                </span>
                              )}

                              {agent.status === "running" && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                                  <LoaderCircle size={10} className="animate-spin" />
                                  {t.working}
                                </span>
                              )}
                              {agent.status === "success" && (
                                <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                  ✓ {agent.lastDurationMs ?? 0}ms
                                </span>
                              )}
                              {agent.status === "error" && (
                                <span className="shrink-0 rounded bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                                  ✕ Error
                                </span>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                onClick={() => openEditAgentForm(agent)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-slate-200 hover:border-emerald-500/40"
                              >
                                <Edit3 size={12} />
                                {t.editAgent}
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent)}
                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20"
                              >
                                <Trash2 size={12} />
                                {t.deleteAgent}
                              </button>
                            </div>
                          </div>

                          {agent.lastOutput && (
                            <div className="mt-1.5 truncate rounded-lg bg-slate-950/80 px-2.5 py-1 font-mono text-[11px] text-slate-300">
                              {agent.lastOutput}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              )}
            </main>
          </div>
        )}

        {/* ACTIVE WORKSPACE VIEW (CODE EDITOR, FILE TREE) */}
        {view === "workspace" && (
          <div className="project-workspace h-full w-full">
            <header className="project-topbar">
              <div className="project-topbar-brand">
                <div className="studio-brand-mark small">
                  <Code2 size={18} />
                </div>
                <div className="flex items-center gap-2">
                  <strong>{project?.name || "Project"}</strong>
                  {project?.githubLink ? (
                    <a
                      href={project.githubLink.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300 hover:bg-emerald-500/20"
                      dir="ltr"
                    >
                      <Github size={11} />
                      {project.githubLink.fullName}
                      <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                      <HardDrive size={11} />
                      Local
                    </span>
                  )}
                </div>
              </div>

              <div className="project-actions">
                <button
                  className="project-action"
                  onClick={() => void saveFile()}
                  disabled={!dirty || busy}
                >
                  <Save size={15} />
                  {t.saveFile}
                </button>

                <button
                  className="project-action"
                  onClick={() => setShowNewFileModal(true)}
                  disabled={busy}
                >
                  <Plus size={15} />
                  {t.newFile}
                </button>

                <button
                  className="project-action"
                  style={{
                    borderColor: "#10b981",
                    background: "linear-gradient(135deg, #059669, #0f766e)",
                    color: "#ffffff",
                  }}
                  onClick={() => openSaveProjectModal("choose")}
                  disabled={busy}
                >
                  <Save size={15} />
                  {t.saveProject}
                </button>

                <button
                  className="project-action"
                  onClick={() => handleSaveLocalZipImmediate()}
                  disabled={busy}
                >
                  <Download size={15} />
                  {t.saveLocalZip}
                </button>

                <button
                  className="project-action github"
                  onClick={() => openSaveProjectModal("github")}
                  disabled={busy}
                >
                  <Github size={15} />
                  {t.exportGitHub}
                  {modifiedPaths.size > 0 && (
                    <span className="rounded-full bg-emerald-400/20 px-1.5 py-0.2 text-[10px] text-emerald-300">
                      {modifiedPaths.size}
                    </span>
                  )}
                </button>

                <button className="project-action" onClick={() => setView("visual")}>
                  <Code2 size={15} />
                  {t.visualEditorBtn}
                </button>
              </div>
            </header>

            <div className="project-body">
              <aside className="project-sidebar">
                <div className="project-sidebar-heading">
                  <span>{t.projectFiles}</span>
                  <span className="project-file-count">
                    {Object.keys(project?.files || {}).length}
                  </span>
                </div>
                <div className="project-tree-search">
                  <Search size={14} />
                  <input
                    value={treeQuery}
                    onChange={(event) => setTreeQuery(event.target.value)}
                    placeholder={t.searchFilesPlaceholder}
                  />
                </div>
                <div className="project-tree">
                  {filteredTree.map((item) => (
                    <TreeNode
                      key={item.path}
                      item={item}
                      depth={0}
                      selected={selectedPath}
                      modifiedPaths={modifiedPaths}
                      onOpen={openFile}
                    />
                  ))}
                </div>
                <div className="project-sidebar-footer justify-between">
                  <span className="flex items-center gap-1.5 truncate">
                    {project?.githubLink ? <Github size={13} /> : <HardDrive size={13} />}
                    {project?.githubLink ? project.githubLink.fullName : "Local"}
                  </span>
                  {modifiedPaths.size > 0 && (
                    <span className="text-amber-400">{modifiedPaths.size}</span>
                  )}
                </div>
              </aside>

              <main className="project-editor-area">
                <div className="project-editor-tabs">
                  <div className="project-file-tab">
                    <FileCode2 size={14} />
                    <span>{selectedPath || t.noFileSelected}</span>
                    {dirty && <i />}
                  </div>
                  <div className="project-editor-tab-actions">
                    {loadingFile && <LoaderCircle size={14} className="animate-spin" />}
                    {selectedPath && (
                      <button
                        onClick={() => handleDeleteCurrentFile()}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-rose-400 hover:bg-rose-500/15"
                      >
                        <Trash2 size={13} />
                        {t.deleteFile}
                      </button>
                    )}
                    <span className="project-save-hint">Ctrl + S</span>
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
                      onChange={(value) => {
                        const nextVal = value ?? "";
                        setFileContent(nextVal);
                        if (project && project.files[selectedPath]) {
                          project.files[selectedPath] = {
                            ...project.files[selectedPath],
                            content: nextVal,
                            size: new Blob([nextVal]).size,
                            modified: true,
                          };
                        }
                      }}
                      onMount={(editor) => {
                        editorRef.current = editor;
                      }}
                      options={{
                        fontSize: 14,
                        lineHeight: 22,
                        minimap: { enabled: true },
                        automaticLayout: true,
                        wordWrap: "on",
                        tabSize: 2,
                        scrollBeyondLastLine: false,
                        smoothScrolling: true,
                        padding: { top: 16, bottom: 16 },
                        renderWhitespace: "selection",
                        bracketPairColorization: { enabled: true },
                        glyphMargin: false,
                      }}
                    />
                  ) : (
                    <div className="project-empty-editor">
                      <FilePlus2 size={34} />
                      <strong>{t.noFileSelected}</strong>
                    </div>
                  )}
                </div>

                <section className="project-terminal">
                  <div className="project-terminal-header">
                    <div>
                      <Zap size={14} />
                      <strong>{t.logsTerminal}</strong>
                    </div>
                    <button onClick={() => setLogs([])}>
                      <RefreshCw size={13} />
                    </button>
                  </div>
                  <div className="project-terminal-output">
                    {logs.length ? (
                      logs.map((line, index) => <div key={index}>{line}</div>)
                    ) : (
                      <span className="terminal-placeholder">—</span>
                    )}
                  </div>
                </section>
              </main>
            </div>

            <footer className="project-statusbar">
              <span>
                <span className={"status-dot " + (busy ? "working" : "ready")} />
                {busy ? busyLabel : statusMessage || t.ready}
              </span>
              <span>{dirty ? t.unsaved : t.saved}</span>
            </footer>
          </div>
        )}
      </div>

      {/* MODAL: CREATE NEW FILE */}
      {showNewFileModal && (
        <div
          className="studio-dialog-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowNewFileModal(false);
          }}
        >
          <section className="studio-save-dialog" dir={isRtl ? "rtl" : "ltr"}>
            <div className="studio-dialog-heading">
              <h2>{t.newFile}</h2>
              <button onClick={() => setShowNewFileModal(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="studio-field">
              {t.newFile}
              <input
                value={newFilePathInput}
                onChange={(e) => setNewFilePathInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateNewFile();
                }}
                placeholder="src/NewComponent.tsx"
                autoFocus
              />
            </label>
            <div className="studio-dialog-actions">
              <button className="studio-dialog-cancel" onClick={() => setShowNewFileModal(false)}>
                {t.cancel}
              </button>
              <button
                className="studio-dialog-confirm"
                onClick={() => handleCreateNewFile()}
                disabled={!newFilePathInput.trim()}
              >
                <Plus size={15} />
                {t.newFile}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL: SAVE PROJECT */}
      {showSaveModal && (
        <div
          className="studio-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSaveModal(false);
          }}
        >
          <section
            className="studio-save-dialog"
            style={{ width: "min(520px, calc(100vw - 32px))" }}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <div className="studio-dialog-heading">
              <h2>
                {saveModalChoice === "choose" ? t.saveProjectTitle : t.exportToGitHubTitle}
              </h2>
              <button onClick={() => setShowSaveModal(false)}>
                <X size={18} />
              </button>
            </div>

            {saveModalChoice === "choose" ? (
              <div className="space-y-2.5">
                <button
                  className="studio-source-option"
                  onClick={() => handleSaveLocalZipImmediate()}
                  disabled={busy}
                >
                  <span className="studio-source-icon">
                    <Download size={22} />
                  </span>
                  <span>
                    <strong>{t.saveLocalZip}</strong>
                  </span>
                  {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>

                <button
                  className="studio-source-option"
                  onClick={() => {
                    setSaveModalChoice("github");
                    if (!ghUser) {
                      openGitHubAuthorizationPopupNow();
                      void checkGitHubSession();
                    }
                  }}
                  disabled={busy}
                >
                  <span className="studio-source-icon">
                    <Github size={22} />
                  </span>
                  <span>
                    <strong>{t.exportGitHub}</strong>
                  </span>
                  {isRtl ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                </button>
              </div>
            ) : (
              <div>
                <button
                  onClick={() => setSaveModalChoice("choose")}
                  className="mb-3 inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:underline"
                >
                  {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
                  {t.back}
                </button>

                {!ghUser ? (
                  renderGitHubUserAuthPanel()
                ) : (
                  <>
                    <div
                      className="studio-save-tabs"
                      style={{
                        gridTemplateColumns: project?.githubLink
                          ? "1fr 1fr 1fr"
                          : "1fr 1fr",
                      }}
                    >
                      {project?.githubLink && (
                        <button
                          className={ghTargetMode === "same" ? "selected" : ""}
                          onClick={() => setGhTargetMode("same")}
                        >
                          {t.sameRepoOption} ({project.githubLink.repo})
                        </button>
                      )}
                      <button
                        className={ghTargetMode === "existing" ? "selected" : ""}
                        onClick={() => setGhTargetMode("existing")}
                      >
                        {t.existingRepoOption}
                      </button>
                      <button
                        className={ghTargetMode === "new" ? "selected" : ""}
                        onClick={() => setGhTargetMode("new")}
                      >
                        {t.newRepoOption}
                      </button>
                    </div>

                    {ghTargetMode === "same" && project?.githubLink && (
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs flex items-center justify-between">
                        <span className="text-slate-300">Repo:</span>
                        <strong className="font-mono text-emerald-300" dir="ltr">
                          {project.githubLink.fullName}
                        </strong>
                      </div>
                    )}

                    {ghTargetMode === "existing" && (
                      <label className="studio-field">
                        Repo
                        <select
                          value={selectedExportRepo}
                          onChange={(e) => {
                            setSelectedExportRepo(e.target.value);
                            const found = ghRepos.find(
                              (r) => r.fullName === e.target.value
                            );
                            if (found) setExportBranch(found.defaultBranch || "main");
                          }}
                        >
                          <option value="">-- Choose --</option>
                          {ghRepos.map((r) => (
                            <option key={r.id} value={r.fullName}>
                              {r.fullName}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {ghTargetMode === "new" && (
                      <>
                        <label className="studio-field">
                          {t.newRepoNameLabel}
                          <input
                            value={newRepoName}
                            onChange={(e) => setNewRepoName(e.target.value)}
                            placeholder="my-project"
                          />
                        </label>
                        <label className="studio-field">
                          {t.privacyLabel}
                          <select
                            value={newRepoVisibility}
                            onChange={(e) =>
                              setNewRepoVisibility(
                                e.target.value as "private" | "public"
                              )
                            }
                          >
                            <option value="private">Private</option>
                            <option value="public">Public</option>
                          </select>
                        </label>
                      </>
                    )}

                    {ghTargetMode !== "new" && (
                      <label className="studio-field">
                        {t.branchLabel}
                        <input
                          value={exportBranch}
                          onChange={(e) => setExportBranch(e.target.value)}
                          placeholder="main"
                        />
                      </label>
                    )}

                    <label className="studio-field">
                      {t.commitMessageLabel}
                      <input
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        maxLength={160}
                      />
                    </label>

                    {lastPushResult && (
                      <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/15 p-2.5 text-xs text-emerald-200 flex items-center justify-between">
                        <strong>✓ {t.saved}</strong>
                        <a
                          href={lastPushResult.commitUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-emerald-300 underline"
                        >
                          GitHub
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    )}

                    <div className="studio-dialog-actions">
                      <button
                        className="studio-dialog-cancel"
                        onClick={() => setShowSaveModal(false)}
                      >
                        {t.close}
                      </button>
                      <button
                        className="studio-dialog-confirm"
                        onClick={() => handleExportToGitHubSubmit()}
                        disabled={
                          busy ||
                          !commitMessage.trim() ||
                          (ghTargetMode === "existing" && !selectedExportRepo) ||
                          (ghTargetMode === "new" && !newRepoName.trim())
                        }
                      >
                        <Github size={15} />
                        {busy ? t.publishing : t.publishToGitHubBtn}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {confirmModalElement}
    </div>
  );
}

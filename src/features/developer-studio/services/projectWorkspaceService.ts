import JSZip from "jszip";

export interface VirtualFile {
  path: string;
  content: string;
  isBinary?: boolean;
  binaryBase64?: string;
  size: number;
  modified?: boolean;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
  language: string;
}

export interface GitHubRepoLink {
  owner: string;
  repo: string;
  fullName: string;
  branch: string;
  defaultBranch: string;
  commitSha?: string;
  htmlUrl: string;
  private: boolean;
}

export interface LoadedProject {
  name: string;
  root: string;
  source: "local" | "github";
  tree: StudioTreeItem[];
  files: Record<string, VirtualFile>;
  originalFiles: Record<string, string>; // path -> content or binaryBase64 for diff tracking
  githubLink?: GitHubRepoLink;
}

export interface GitHubUserOAuthKeys {
  clientId: string;
  clientSecret: string;
}

export interface AIAgentConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
  active: boolean;
  createdAt: string;
  status?: "idle" | "running" | "success" | "error";
  lastOutput?: string;
  lastDurationMs?: number;
}

const IGNORED_SEGMENTS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "coverage",
  ".venv",
  "venv",
  ".developer-studio",
  "release",
]);

const GITHUB_TOKEN_STORAGE_KEY = "developer-studio-pro:gh-token:v1";
const GITHUB_OAUTH_KEYS_STORAGE_KEY = "developer-studio-pro:gh-oauth-keys:v1";
const AI_AGENTS_STORAGE_KEY = "developer-studio-pro:ai-agents:v1";
const ACTIVE_PROJECT_DB = "developer-studio-pro-project-fs";
const ACTIVE_PROJECT_STORE = "active_project";

export function getStoredGitHubToken(): string {
  try {
    return localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredGitHubToken(token: string): void {
  try {
    if (token.trim()) {
      localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, token.trim());
    } else {
      localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getStoredGitHubOAuthKeys(): GitHubUserOAuthKeys {
  try {
    const raw = localStorage.getItem(GITHUB_OAUTH_KEYS_STORAGE_KEY);
    if (!raw) return { clientId: "", clientSecret: "" };
    const parsed = JSON.parse(raw);
    return {
      clientId: typeof parsed?.clientId === "string" ? parsed.clientId : "",
      clientSecret: typeof parsed?.clientSecret === "string" ? parsed.clientSecret : "",
    };
  } catch {
    return { clientId: "", clientSecret: "" };
  }
}

export function setStoredGitHubOAuthKeys(keys: GitHubUserOAuthKeys): void {
  try {
    const clientId = (keys.clientId || "").trim();
    const clientSecret = (keys.clientSecret || "").trim();
    if (clientId || clientSecret) {
      localStorage.setItem(
        GITHUB_OAUTH_KEYS_STORAGE_KEY,
        JSON.stringify({ clientId, clientSecret })
      );
    } else {
      localStorage.removeItem(GITHUB_OAUTH_KEYS_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

/**
 * Builds the immediate GitHub authorization / login URL for the current user.
 * If the user entered their own OAuth Client ID, uses GitHub OAuth authorize URL.
 * Otherwise opens GitHub Login directly with return_to token authorization page.
 */
export function buildDirectGitHubAuthUrl(customKeys?: Partial<GitHubUserOAuthKeys>): string {
  const stored = getStoredGitHubOAuthKeys();
  const clientId = (customKeys?.clientId ?? stored.clientId).trim();
  const clientSecret = (customKeys?.clientSecret ?? stored.clientSecret).trim();
  const redirectUri = `${window.location.origin}/auth/callback`;

  if (clientId) {
    const statePayload = btoa(
      JSON.stringify({
        redirectUri,
        clientId,
        clientSecret,
      })
    );
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
      state: statePayload,
      allow_signup: "true",
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  const returnTo = "/settings/tokens/new?scopes=repo,read:user&description=Developer+Studio+Pro";
  return `https://github.com/login?return_to=${encodeURIComponent(returnTo)}`;
}

function authHeaders(): Record<string, string> {
  const token = getStoredGitHubToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function buildTreeFromVirtualFiles(files: Record<string, VirtualFile>): StudioTreeItem[] {
  const root: StudioTreeItem[] = [];
  const dirMap = new Map<string, StudioTreeItem>();

  const ensureDir = (dirPath: string): StudioTreeItem[] => {
    if (!dirPath) return root;
    const existing = dirMap.get(dirPath);
    if (existing) {
      if (!existing.children) existing.children = [];
      return existing.children;
    }
    const parts = dirPath.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parentChildren = ensureDir(parentPath);
    const dirNode: StudioTreeItem = {
      name,
      path: dirPath,
      type: "directory",
      children: [],
    };
    parentChildren.push(dirNode);
    dirMap.set(dirPath, dirNode);
    return dirNode.children!;
  };

  for (const file of Object.values(files)) {
    const cleanPath = file.path.replace(/^\/+/, "");
    const parts = cleanPath.split("/").filter(Boolean);
    if (!parts.length) continue;
    const fileName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join("/");
    const parentChildren = ensureDir(dirPath);
    parentChildren.push({
      name: fileName,
      path: cleanPath,
      type: "file",
      size: file.size,
    });
  }

  const sortNodes = (nodes: StudioTreeItem[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
  };

  sortNodes(root);
  return root;
}

function isBinaryUint8(bytes: Uint8Array): boolean {
  const checkLen = Math.min(bytes.length, 4096);
  for (let i = 0; i < checkLen; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function snapshotOriginals(files: Record<string, VirtualFile>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [path, file] of Object.entries(files)) {
    map[path] = file.isBinary ? `base64:${file.binaryBase64 || ""}` : file.content;
  }
  return map;
}

/**
 * Extract a .zip File or Blob in the browser into a LoadedProject
 */
export async function importZipFileInBrowser(zipFile: File): Promise<LoadedProject> {
  const buffer = await zipFile.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const rawEntries: Array<{ parts: string[]; entry: JSZip.JSZipObject }> = [];

  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const normalized = entry.name.replace(/\\/g, "/").replace(/^\/+/, "");
    const parts = normalized.split("/").filter(Boolean);
    if (!parts.length) continue;
    if (parts.some((p) => p === "." || p === ".." || IGNORED_SEGMENTS.has(p) || p === ".DS_Store")) {
      continue;
    }
    rawEntries.push({ parts, entry });
  }

  const topFolders = new Set(rawEntries.filter((e) => e.parts.length > 1).map((e) => e.parts[0]));
  const hasRootLevelFile = rawEntries.some((e) => e.parts.length === 1);
  const stripFirstSegment = !hasRootLevelFile && topFolders.size === 1;

  const fallbackName = zipFile.name.replace(/\.zip$/i, "").trim() || "imported-project";
  const projectName = stripFirstSegment ? [...topFolders][0] : fallbackName;

  const files: Record<string, VirtualFile> = {};
  for (const { parts, entry } of rawEntries) {
    const relParts = stripFirstSegment ? parts.slice(1) : parts;
    if (!relParts.length) continue;
    const relPath = relParts.join("/");
    const bytes = await entry.async("uint8array");
    if (bytes.byteLength > 4 * 1024 * 1024) continue;

    if (isBinaryUint8(bytes)) {
      files[relPath] = {
        path: relPath,
        content: "",
        isBinary: true,
        binaryBase64: uint8ToBase64(bytes),
        size: bytes.byteLength,
      };
    } else {
      const content = new TextDecoder("utf-8").decode(bytes);
      files[relPath] = {
        path: relPath,
        content,
        isBinary: false,
        size: bytes.byteLength,
      };
    }
  }

  if (Object.keys(files).length === 0) {
    throw new Error("الملف المضغوط لا يحتوي على ملفات مشروع صالحة للقراءة.");
  }

  const tree = buildTreeFromVirtualFiles(files);
  return {
    name: projectName,
    root: `local://${projectName}`,
    source: "local",
    tree,
    files,
    originalFiles: snapshotOriginals(files),
  };
}

/**
 * Import uncompressed files or folder from FileList / File[] (supports both .zip and uncompressed files/folders!)
 */
export async function importLocalFilesOrFolder(fileList: FileList | File[]): Promise<LoadedProject> {
  const arr = Array.from(fileList);
  if (arr.length === 0) {
    throw new Error("لم يتم اختيار أي ملفات.");
  }

  if (arr.length === 1 && /\.zip$/i.test(arr[0].name)) {
    return importZipFileInBrowser(arr[0]);
  }

  const withRelPath = arr.map((file) => {
    const raw = (file.webkitRelativePath || file.name || "").replace(/\\/g, "/").replace(/^\/+/, "");
    return { file, parts: raw.split("/").filter(Boolean) };
  });

  const topFolders = new Set(withRelPath.filter((x) => x.parts.length > 1).map((x) => x.parts[0]));
  const hasRootFile = withRelPath.some((x) => x.parts.length === 1);
  const stripFirst = !hasRootFile && topFolders.size === 1;

  const projectName = stripFirst
    ? [...topFolders][0]
    : arr.length === 1
      ? arr[0].name.replace(/\.[^.]+$/, "") || "local-project"
      : "local-project";

  const files: Record<string, VirtualFile> = {};

  for (const { file, parts } of withRelPath) {
    if (parts.some((p) => IGNORED_SEGMENTS.has(p) || p === ".DS_Store")) continue;
    const relParts = stripFirst ? parts.slice(1) : parts;
    if (!relParts.length) continue;
    const relPath = relParts.join("/");
    if (file.size > 4 * 1024 * 1024) continue;

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    if (isBinaryUint8(bytes)) {
      files[relPath] = {
        path: relPath,
        content: "",
        isBinary: true,
        binaryBase64: uint8ToBase64(bytes),
        size: bytes.byteLength,
      };
    } else {
      const content = new TextDecoder("utf-8").decode(bytes);
      files[relPath] = {
        path: relPath,
        content,
        isBinary: false,
        size: bytes.byteLength,
      };
    }
  }

  if (Object.keys(files).length === 0) {
    throw new Error("لم يتم العثور على ملفات قابلة للفتح في الاختيار المحدد.");
  }

  const tree = buildTreeFromVirtualFiles(files);
  return {
    name: projectName,
    root: `local://${projectName}`,
    source: "local",
    tree,
    files,
    originalFiles: snapshotOriginals(files),
  };
}

/**
 * Compress the entire project into a ZIP Blob and trigger an immediate download in the browser
 */
export async function downloadProjectAsZip(project: LoadedProject): Promise<{ fileName: string; fileCount: number; bytes: number }> {
  const zip = new JSZip();
  let fileCount = 0;

  for (const [relPath, file] of Object.entries(project.files)) {
    const cleanPath = relPath.replace(/^\/+/, "");
    if (!cleanPath) continue;
    fileCount++;
    if (file.isBinary && file.binaryBase64) {
      zip.file(cleanPath, base64ToUint8(file.binaryBase64));
    } else {
      zip.file(cleanPath, file.content ?? "");
    }
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const safeName = (project.name || "project").replace(/[^a-zA-Z0-9._-]/g, "-") || "project";
  const fileName = `${safeName}.zip`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);

  return { fileName, fileCount, bytes: blob.size };
}

/**
 * Compute changed, added, and deleted files compared to original snapshot
 */
export function getProjectChanges(project: LoadedProject): {
  changedFiles: VirtualFile[];
  deletedPaths: string[];
  totalChangedCount: number;
} {
  const changedFiles: VirtualFile[] = [];
  const deletedPaths: string[] = [];

  for (const [path, file] of Object.entries(project.files)) {
    const currentSig = file.isBinary ? `base64:${file.binaryBase64 || ""}` : file.content;
    const origSig = project.originalFiles[path];
    if (origSig === undefined || origSig !== currentSig || file.modified) {
      changedFiles.push(file);
    }
  }

  for (const origPath of Object.keys(project.originalFiles)) {
    if (!project.files[origPath]) {
      deletedPaths.push(origPath);
    }
  }

  return {
    changedFiles,
    deletedPaths,
    totalChangedCount: changedFiles.length + deletedPaths.length,
  };
}

/**
 * GitHub API Calls via Express Backend Proxy
 */
export async function fetchGitHubOAuthUrl(customKeys?: Partial<GitHubUserOAuthKeys>): Promise<{
  configured: boolean;
  url: string;
  directLoginUrl?: string;
  redirectUri: string;
}> {
  const stored = getStoredGitHubOAuthKeys();
  const clientId = (customKeys?.clientId ?? stored.clientId).trim();
  const clientSecret = (customKeys?.clientSecret ?? stored.clientSecret).trim();
  const redirectUri = `${window.location.origin}/auth/callback`;
  const params = new URLSearchParams({
    redirectUri,
    ...(clientId ? { clientId } : {}),
    ...(clientSecret ? { clientSecret } : {}),
  });

  const res = await fetch(`/api/auth/github/url?${params.toString()}`, {
    headers: authHeaders(),
    credentials: "include",
  });
  return res.json();
}

export async function fetchGitHubCurrentUser(): Promise<{ authenticated: boolean; user: GitHubUser | null }> {
  const res = await fetch("/api/github/user", {
    headers: authHeaders(),
    credentials: "include",
  });
  if (!res.ok) return { authenticated: false, user: null };
  return res.json();
}

export async function logoutGitHubAccount(): Promise<void> {
  setStoredGitHubToken("");
  await fetch("/api/github/logout", {
    method: "POST",
    credentials: "include",
  }).catch(() => undefined);
}

export async function fetchGitHubRepositories(): Promise<GitHubRepo[]> {
  const res = await fetch("/api/github/repos", {
    headers: authHeaders(),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "تعذر جلب قائمة المستودعات من GitHub.");
  }
  return data.repos || [];
}

export async function importProjectFromGitHub(owner: string, repo: string, branch?: string): Promise<LoadedProject> {
  const res = await fetch("/api/github/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ owner, repo, branch }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "تعذر استيراد المستودع من GitHub.");
  }

  const files: Record<string, VirtualFile> = data.files || {};
  const tree: StudioTreeItem[] = data.tree || buildTreeFromVirtualFiles(files);

  return {
    name: data.name || repo,
    root: `github://${data.fullName || `${owner}/${repo}`}#${data.branch || "main"}`,
    source: "github",
    tree,
    files,
    originalFiles: snapshotOriginals(files),
    githubLink: {
      owner: data.owner || owner,
      repo: data.repo || repo,
      fullName: data.fullName || `${owner}/${repo}`,
      branch: data.branch || "main",
      defaultBranch: data.defaultBranch || data.branch || "main",
      commitSha: data.commitSha || "",
      htmlUrl: data.htmlUrl || `https://github.com/${owner}/${repo}`,
      private: Boolean(data.private),
    },
  };
}

export async function exportProjectToGitHub(options: {
  project: LoadedProject;
  owner?: string;
  repo?: string;
  branch?: string;
  message: string;
  createNew?: boolean;
  newRepoName?: string;
  visibility?: "private" | "public";
  pushAllFiles?: boolean;
}): Promise<{
  success: boolean;
  owner: string;
  repo: string;
  fullName: string;
  branch: string;
  commitSha: string;
  commitUrl: string;
  repoUrl: string;
}> {
  const { project, message, createNew, newRepoName, visibility } = options;
  const targetOwner = options.owner || project.githubLink?.owner || "";
  const targetRepo = options.repo || project.githubLink?.repo || "";
  const targetBranch = options.branch || project.githubLink?.branch || "main";

  const isSameRepo =
    !createNew &&
    project.githubLink &&
    project.githubLink.owner.toLowerCase() === targetOwner.toLowerCase() &&
    project.githubLink.repo.toLowerCase() === targetRepo.toLowerCase();

  const { changedFiles, deletedPaths } = getProjectChanges(project);
  const filesToPush =
    options.pushAllFiles || !isSameRepo || (changedFiles.length === 0 && deletedPaths.length === 0)
      ? Object.values(project.files)
      : changedFiles;

  const res = await fetch("/api/github/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({
      owner: targetOwner,
      repo: targetRepo,
      branch: targetBranch,
      message,
      createNew,
      newRepoName,
      visibility,
      files: filesToPush,
      deletedPaths: isSameRepo ? deletedPaths : [],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "فشل نشر التحديثات على GitHub.");
  }
  return data;
}

export function markProjectSyncedWithGitHub(
  project: LoadedProject,
  syncResult: { owner: string; repo: string; fullName: string; branch: string; commitSha: string; repoUrl: string }
): LoadedProject {
  const cleanFiles: Record<string, VirtualFile> = {};
  for (const [k, v] of Object.entries(project.files)) {
    cleanFiles[k] = { ...v, modified: false };
  }
  return {
    ...project,
    root: `github://${syncResult.fullName}#${syncResult.branch}`,
    files: cleanFiles,
    originalFiles: snapshotOriginals(cleanFiles),
    githubLink: {
      owner: syncResult.owner,
      repo: syncResult.repo,
      fullName: syncResult.fullName,
      branch: syncResult.branch,
      defaultBranch: project.githubLink?.defaultBranch || syncResult.branch,
      commitSha: syncResult.commitSha,
      htmlUrl: syncResult.repoUrl,
      private: project.githubLink?.private ?? false,
    },
  };
}

export const DEFAULT_BUILTIN_AGENT: AIAgentConfig = {
  id: "builtin-developer-studio-assistant",
  name: "مساعد الذكاء الاصطناعي المدمج (Developer Studio AI Assistant)",
  endpoint: "/api/studio-assist",
  apiKey: "",
  model: "gemini-2.5-flash",
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  status: "idle",
};

/**
 * Multi-Agent AI Hub: Storage & Concurrent Execution
 */
export function loadAIAgents(): AIAgentConfig[] {
  let list: AIAgentConfig[] = [];
  try {
    const raw = localStorage.getItem(AI_AGENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        list = parsed.map((item) => ({
          id: String(item.id || crypto.randomUUID()),
          name: String(item.name || "Agent"),
          endpoint: String(item.endpoint || ""),
          apiKey: String(item.apiKey || ""),
          model: String(item.model || ""),
          active: Boolean(item.active ?? true),
          createdAt: String(item.createdAt || new Date().toISOString()),
          status: "idle",
          lastOutput: item.lastOutput ? String(item.lastOutput) : undefined,
          lastDurationMs: typeof item.lastDurationMs === "number" ? item.lastDurationMs : undefined,
        }));
      }
    }
  } catch {
    list = [];
  }

  const hasBuiltin = list.some(
    (a) => a.id === DEFAULT_BUILTIN_AGENT.id || a.endpoint.includes("studio-assist")
  );
  if (!hasBuiltin) {
    list.unshift({ ...DEFAULT_BUILTIN_AGENT });
  } else {
    // Make sure built-in assistant is enabled and active
    list = list.map((a) =>
      a.id === DEFAULT_BUILTIN_AGENT.id || a.endpoint.includes("studio-assist")
        ? { ...a, active: true }
        : a
    );
  }
  return list;
}

export function saveAIAgents(agents: AIAgentConfig[]): void {
  try {
    const serializable = agents.map(({ status, ...rest }) => ({
      ...rest,
      status: "idle",
    }));
    localStorage.setItem(AI_AGENTS_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // ignore storage errors
  }
}

export async function executeSingleAgent(
  agent: AIAgentConfig,
  prompt: string,
  fileContext?: string
): Promise<{ success: boolean; output: string; durationMs: number }> {
  const fullPrompt = fileContext
    ? `${prompt}\n\n---\n${fileContext}`
    : prompt;

  const res = await fetch("/api/agents/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: agent.id,
      name: agent.name,
      endpoint: agent.endpoint,
      apiKey: agent.apiKey,
      model: agent.model,
      prompt: fullPrompt,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data?.error || `HTTP ${res.status}`);
  }
  return {
    success: true,
    output: String(data.output || ""),
    durationMs: Number(data.durationMs || 0),
  };
}

/**
 * Executes all active AI agents concurrently in parallel (`Promise.allSettled`)
 */
export async function executeAgentsInParallel(
  agents: AIAgentConfig[],
  prompt: string,
  fileContext: string | undefined,
  onAgentStatus: (agentId: string, patch: Partial<AIAgentConfig>) => void
): Promise<{ succeeded: number; failed: number }> {
  const activeAgents = agents.filter((a) => a.active);
  for (const agent of activeAgents) {
    onAgentStatus(agent.id, { status: "running" });
  }

  const results = await Promise.allSettled(
    activeAgents.map(async (agent) => {
      try {
        const res = await executeSingleAgent(agent, prompt, fileContext);
        onAgentStatus(agent.id, {
          status: "success",
          lastOutput: res.output,
          lastDurationMs: res.durationMs,
        });
        return true;
      } catch (err: any) {
        onAgentStatus(agent.id, {
          status: "error",
          lastOutput: err?.message || "فشل الاتصال بالوكيل",
        });
        throw err;
      }
    })
  );

  let succeeded = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") succeeded++;
    else failed++;
  }
  return { succeeded, failed };
}

/**
 * Persist and restore active project in IndexedDB so reloads don't lose work
 */
function openProjectDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(ACTIVE_PROJECT_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(ACTIVE_PROJECT_STORE)) {
        req.result.createObjectStore(ACTIVE_PROJECT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveActiveProjectToStorage(project: LoadedProject | null): Promise<void> {
  try {
    const db = await openProjectDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACTIVE_PROJECT_STORE, "readwrite");
      const store = tx.objectStore(ACTIVE_PROJECT_STORE);
      if (project) {
        store.put(project, "current");
      } else {
        store.delete("current");
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    // ignore storage errors
  }
}

export async function loadActiveProjectFromStorage(): Promise<LoadedProject | null> {
  try {
    const db = await openProjectDb();
    return await new Promise<LoadedProject | null>((resolve, reject) => {
      const tx = db.transaction(ACTIVE_PROJECT_STORE, "readonly");
      const req = tx.objectStore(ACTIVE_PROJECT_STORE).get("current");
      req.onsuccess = () => {
        db.close();
        resolve((req.result as LoadedProject) || null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch {
    return null;
  }
}

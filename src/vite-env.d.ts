declare global {
  type StudioTreeItem = { name: string; path: string; type: 'file' | 'directory'; size?: number; children?: StudioTreeItem[] };
  type StudioEvent = { type: string; [key: string]: any };
  interface Window {
    developerStudio: {
      chooseProject(): Promise<{ root: string; name: string; tree: StudioTreeItem[]; recentProjects: string[] } | null>;
      openRecentProject(path: string): Promise<{ root: string; name: string; tree: StudioTreeItem[]; recentProjects: string[] }>;
      getProjectTree(): Promise<StudioTreeItem[]>;
      readFile(path: string): Promise<{ path: string; content: string; size: number }>;
      writeFile(path: string, content: string): Promise<{ success: boolean; path: string }>;
      getProjectInfo(): Promise<{ root: string | null; name: string | null; recentProjects: string[]; goosePath: string }>;
      setGoosePath(path: string): Promise<{ goosePath: string }>;
      chooseGoosePath(): Promise<{ goosePath: string } | null>;
      getScripts(): Promise<Record<string, string>>;
      runTask(kind: string): Promise<{ id: string; kind: string }>;
      stopTask(): Promise<{ stopped: boolean }>;
      startPreview(): Promise<{ id: string; kind: string; url: string }>;
      openPreviewExternal(): Promise<void>;
      gitStatus(): Promise<string>;
      gitDiff(): Promise<string>;
      gitCommit(message: string): Promise<string>;
      connectAgent(): Promise<{ connected: boolean; pid?: number }>;
      sendAgentPrompt(prompt: string): Promise<{ queued: boolean }>;
      decideAgentPermission(id: string, optionId: string): Promise<{ accepted: boolean }>;
      decideAgentWrite(id: string, allowed: boolean): Promise<{ accepted: boolean }>;
      disconnectAgent(): Promise<{ disconnected: boolean }>;
      openExternal(url: string): Promise<{ opened: boolean }>;
      getVersion(): Promise<string>;
      onEvent(listener: (event: StudioEvent) => void): () => void;
    };
  }
}
export {};

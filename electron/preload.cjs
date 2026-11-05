const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
const listeners = new Set();
ipcRenderer.on('studio:event', (_event, payload) => {
  for (const listener of listeners) {
    try { listener(payload); } catch (error) { console.error('Studio event listener failed', error); }
  }
});

contextBridge.exposeInMainWorld('developerStudio', Object.freeze({
  chooseProject: invoke('project:choose'),
  importArchive: invoke('project:importArchive'),
  exportArchive: invoke('project:exportArchive'),
  installDependencies: invoke('project:installDependencies'),
  saveToGitHub: invoke('git:saveToGitHub'),
  createGitHubProject: invoke('git:createGitHubProject'),
  openRecentProject: invoke('project:openRecent'),
  getProjectTree: invoke('project:tree'),
  readFile: invoke('project:readFile'),
  writeFile: invoke('project:writeFile'),
  getProjectInfo: invoke('project:info'),
  setGoosePath: invoke('settings:setGoosePath'),
  chooseGoosePath: invoke('settings:chooseGoose'),
  getScripts: invoke('tasks:scripts'),
  runTask: invoke('tasks:run'),
  stopTask: invoke('tasks:stop'),
  startPreview: invoke('preview:start'),
  openPreviewExternal: invoke('preview:openExternal'),
  gitStatus: invoke('git:status'),
  gitDiff: invoke('git:diff'),
  gitCommit: invoke('git:commit'),
  connectAgent: invoke('agent:connect'),
  sendAgentPrompt: invoke('agent:prompt'),
  decideAgentPermission: invoke('agent:permissionDecision'),
  decideAgentWrite: invoke('agent:writeDecision'),
  disconnectAgent: invoke('agent:disconnect'),
  openExternal: invoke('app:openExternal'),
  getVersion: invoke('app:version'),
  onEvent(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
}));

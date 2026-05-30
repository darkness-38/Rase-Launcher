import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window Control
  windowControl: (action: 'minimize' | 'close') => ipcRenderer.invoke('window-control', action),

  // External Links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Game Launching
  launchGame: (username: string, version: string, type: 'vanilla' | 'fabric' | 'forge', options: { ram: number; javaPath?: string }) =>
    ipcRenderer.invoke('launch-game', { username, version, type, options }),

  // Install custom loaders
  installLoader: (version: string, loaderType: 'fabric' | 'forge') =>
    ipcRenderer.invoke('install-loader', { version, loaderType }),

  // Version Manifest Queries
  getAvailableVersions: () => ipcRenderer.invoke('get-available-versions'),
  getInstalledVersions: () => ipcRenderer.invoke('get-installed-versions'),

  // Directories & Settings
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('save-settings', settings),
  getSystemRam: () => ipcRenderer.invoke('get-system-ram'),
  getStats: () => ipcRenderer.invoke('get-stats'),

  // Mod & Resource Pack Management
  getModsAndPacks: (version?: string, loaderType?: string) =>
    ipcRenderer.invoke('get-mods-and-packs', { version, loaderType }),
  deleteModOrPack: (fileName: string, type: 'mods' | 'resourcepacks' | 'shaderpacks', version?: string, loaderType?: string) =>
    ipcRenderer.invoke('delete-mod-or-pack', { fileName, type, version, loaderType }),
  openFolder: (type: 'mods' | 'resourcepacks' | 'shaderpacks' | 'root', version?: string, loaderType?: string) =>
    ipcRenderer.invoke('open-folder', { type, version, loaderType }),
  installModOrPack: (filePath: string, version?: string, loaderType?: string) =>
    ipcRenderer.invoke('install-mod-or-pack', { filePath, version, loaderType }),
  selectModsOrPacks: () =>
    ipcRenderer.invoke('select-mods-or-packs'),

  // Event Listeners for Progress and Status (Forwarding IPC events to React)
  onLaunchProgress: (callback: (progress: { type: string; task: string; current: number; total: number }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('launch-progress', subscription);
    return () => {
      ipcRenderer.removeListener('launch-progress', subscription);
    };
  },
  onLaunchStatus: (callback: (status: { state: string; details?: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('launch-status', subscription);
    return () => {
      ipcRenderer.removeListener('launch-status', subscription);
    };
  },
  onLaunchLog: (callback: (log: string) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('launch-log', subscription);
    return () => {
      ipcRenderer.removeListener('launch-log', subscription);
    };
  },
  onInstallProgress: (callback: (progress: { state: string; percent: number; message: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('install-progress', subscription);
    return () => {
      ipcRenderer.removeListener('install-progress', subscription);
    };
  }
});

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronInstaller', {
  closeWindow: () => ipcRenderer.invoke('close-window'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  getInstallerInfo: () => ipcRenderer.invoke('get-installer-info'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  startInstall: (options: {
    installDir: string;
    createDesktop: boolean;
    createStartMenu: boolean;
    isOffline: boolean;
    offlinePath: string | null;
  }) => ipcRenderer.invoke('start-install', options),
  launchLauncher: (options: { installDir: string }) => ipcRenderer.invoke('launch-launcher', options),
  onInstallProgress: (callback: (progress: { state: string; percent: number; details: string }) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('install-progress', subscription);
    return () => {
      ipcRenderer.removeListener('install-progress', subscription);
    };
  }
});

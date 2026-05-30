export {};

declare global {
  interface ElectronAPI {
    // Window control actions
    // @ts-ignore
    windowControl?: (action: 'minimize' | 'close') => Promise<void>;

    // External links
    openExternal?: (url: string) => Promise<{ success: boolean }>;

    // Core Launching IPCs
    launchGame: (
      username: string,
      version: string,
      type: 'vanilla' | 'fabric' | 'forge',
      options: { ram: number; javaPath?: string }
    ) => Promise<{ success: boolean }>;

    // Installer IPCs
    installLoader: (
      version: string,
      loaderType: 'fabric' | 'forge'
    ) => Promise<{ success: boolean; versionName: string }>;

    // Version queries
    getAvailableVersions: () => Promise<{ id: string; type: string }[]>;
    getInstalledVersions: () => Promise<string[]>;

    // Settings IPCs
    selectDirectory: () => Promise<string | null>;
    getSettings: () => Promise<{
      ram: number;
      javaPath: string;
      gameDir: string;
      lastUsername: string;
      savedUsernames?: string[];
      latestFabricLoader?: string;
      lastVersion?: string;
      lastLoader?: string;
      showSnapshots?: boolean;
      showHistorical?: boolean;
      showOnlyInstalled?: boolean;
      showModded?: boolean;
      profiles?: any[];
      activeProfileId?: string | null;
      themeColor?: 'default' | 'forest' | 'ocean' | 'obsidian';
      themeLayout?: 'classic' | 'dashboard';
    }>;
    downloadModpack: (profileId: string, downloadUrl: string) => Promise<{ success: boolean; minecraftVersion: string; loaderType: 'fabric' | 'forge' | 'vanilla'; error?: string }>;
    downloadModOrPack: (downloadUrl: string, fileName: string, projectType: string, version?: string, loaderType?: string) => Promise<{ success: boolean; error?: string }>;
    saveSettings: (settings: {
      ram: number;
      javaPath: string;
      gameDir: string;
      lastUsername: string;
      savedUsernames?: string[];
      latestFabricLoader?: string;
      lastVersion?: string;
      lastLoader?: string;
      showSnapshots?: boolean;
      showHistorical?: boolean;
      showOnlyInstalled?: boolean;
      showModded?: boolean;
      profiles?: any[];
      activeProfileId?: string | null;
      themeColor?: 'default' | 'forest' | 'ocean' | 'obsidian';
      themeLayout?: 'classic' | 'dashboard';
    }) => Promise<any>;
    getSystemRam: () => Promise<number>;
    getStats: () => Promise<{
      totalPlayTimeMs: number;
      lastPlayedVersion: string | null;
      lastPlayedAt: number | null;
    }>;

    // File managers
    getModsAndPacks: (version?: string, loaderType?: string, activeProfileId?: string | null) => Promise<{ mods: string[]; packs: string[]; shaders: string[] }>;
    deleteModOrPack: (fileName: string, type: 'mods' | 'resourcepacks' | 'shaderpacks', version?: string, loaderType?: string, activeProfileId?: string | null) => Promise<{ success: boolean; error?: string }>;
    openFolder: (type: 'mods' | 'resourcepacks' | 'shaderpacks' | 'root', version?: string, loaderType?: string, activeProfileId?: string | null) => Promise<{ success: boolean }>;
    installModOrPack: (filePath: string, version?: string, loaderType?: string, activeProfileId?: string | null) => Promise<{ success: boolean; fileName: string; type: 'mods' | 'resourcepacks' | 'shaderpacks' }>;
    selectModsOrPacks: () => Promise<string[]>;
    getScreenshots: (activeProfileId?: string | null, version?: string, loaderType?: string) => Promise<{ path: string; name: string; created: number; profileName: string }[]>;
    deleteScreenshot: (filePath: string) => Promise<{ success: boolean; error?: string }>;

    // Launch/Install Event Listeners
    onLaunchProgress: (
      callback: (progress: { type: string; task: string; current: number; total: number }) => void
    ) => () => void;
    onLaunchStatus: (
      callback: (status: { state: string; details?: string }) => void
    ) => () => void;
    onLaunchLog: (callback: (log: string) => void) => () => void;
    onInstallProgress: (
      callback: (progress: { state: string; percent: number; message: string }) => void
    ) => () => void;
  }

  interface Window {
    electronAPI: ElectronAPI;
  }
}

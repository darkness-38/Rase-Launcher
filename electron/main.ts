import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn, execSync } from 'child_process';
import AdmZip from 'adm-zip';
// @ts-ignore
import { Client, Authenticator } from 'minecraft-launcher-core';
// @ts-ignore
import DiscordRPC from 'discord-rpc';

let mainWindow: BrowserWindow | null = null;

// ==========================================
// DISCORD RICH PRESENCE (RPC) SERVICE
// ==========================================
const discordClientId = '1507680892745941012';
let rpcClient: any = null;
let rpcConnected = false;

function updateDiscordPresence(details: string, state?: string, showTime = false) {
  if (!rpcConnected || !rpcClient) return;
  try {
    const activity: any = {
      details: details,
      largeImageKey: 'rase_logo',
      largeImageText: 'Rase Launcher',
      instance: false
    };
    if (state) {
      activity.state = state;
    }
    if (showTime) {
      activity.startTimestamp = Date.now();
    }
    rpcClient.setActivity(activity).catch(() => {});
  } catch (e) {
    console.error('Failed to set Discord activity', e);
  }
}

function initializeDiscordRPC() {
  try {
    rpcClient = new DiscordRPC.Client({ transport: 'ipc' });
    
    rpcClient.on('ready', () => {
      rpcConnected = true;
      console.log('Discord Rich Presence is connected and ready!');
      updateDiscordPresence('Ana Sayfada Geziniyor');
    });

    rpcClient.on('disconnected', () => {
      rpcConnected = false;
      console.log('Discord Rich Presence disconnected. Retrying in 15s...');
      setTimeout(initializeDiscordRPC, 15000);
    });

    rpcClient.login({ clientId: discordClientId }).catch((err: any) => {
      console.warn('Discord login failed (Discord might not be running). Retrying in 20s...', err.message);
      rpcConnected = false;
      setTimeout(initializeDiscordRPC, 20000);
    });
  } catch (e) {
    console.error('Failed to initialize Discord RPC module', e);
  }
}

// Determine Platform & Default Game Directory
const isWindows = process.platform === 'win32';
const homeDir = app.getPath('home');
const defaultGameDir = isWindows
  ? path.join(process.env.APPDATA || homeDir, '.minecraft-rase')
  : path.join(homeDir, '.minecraft-rase');

// Create game directories if they do not exist
if (!fs.existsSync(defaultGameDir)) {
  fs.mkdirSync(defaultGameDir, { recursive: true });
}

// Settings initialization
const settingsPath = path.join(defaultGameDir, 'rase-settings.json');
interface Settings {
  ram: number;
  javaPath: string;
  gameDir: string;
  lastUsername: string;
  savedUsernames?: string[];   // Multiple saved offline accounts
  latestFabricLoader?: string;
  totalPlayTimeMs?: number;    // Accumulated play time in ms
  lastPlayedVersion?: string;  // e.g. "1.21.1 (Fabric)"
  lastPlayedAt?: number;       // Unix timestamp ms
  lastVersion?: string;        // Last active version selection
  lastLoader?: string;         // Last active loader selection
  showSnapshots?: boolean;
  showHistorical?: boolean;
  showOnlyInstalled?: boolean;
  showModded?: boolean;
  profiles?: any[];
  activeProfileId?: string | null;
}

let settings: Settings = {
  ram: 4,
  javaPath: 'java',
  gameDir: defaultGameDir,
  lastUsername: '',
  savedUsernames: [],
  totalPlayTimeMs: 0,
  lastVersion: '1.20.4',
  lastLoader: 'vanilla',
  showSnapshots: false,
  showHistorical: false,
  showOnlyInstalled: false,
  showModded: true
};

if (fs.existsSync(settingsPath)) {
  try {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
    
    // Normalize savedUsernames
    if (!settings.savedUsernames) {
      settings.savedUsernames = settings.lastUsername ? [settings.lastUsername] : [];
    } else {
      settings.savedUsernames = Array.from(new Set(settings.savedUsernames.filter(Boolean)));
      if (settings.lastUsername && !settings.savedUsernames.includes(settings.lastUsername)) {
        settings.savedUsernames.unshift(settings.lastUsername);
      }
    }
  } catch (e) {
    console.error('Failed to parse settings.json', e);
  }
}

function saveSettingsData(newSettings: Settings) {
  settings = newSettings;
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
}

// Window creation
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 620,
    frame: false, // Custom frameless window for premium design
    resizable: false, // Lock aspect ratio for precise visual composition
    backgroundColor: '#07080f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Load front-end dev server or production index.html
  if (!app.isPackaged || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173');
    // mainWindow.webContents.openDevTools({ mode: 'detach' }); // Geliştirme aşamasında konsol loglarını görmek isterseniz bu satırın yorumunu kaldırabilirsiniz.
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  initializeDiscordRPC();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// IPC HANDLERS
// ==========================================

// Handle App Window Controls (Min, Close)
ipcMain.handle('window-control', (_event, action: 'minimize' | 'close') => {
  if (!mainWindow) return;
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'close') mainWindow.close();
});

// Handle Opening External URLs in default browser
ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
  return { success: true };
});

// Fetch Available Mojang Versions (With type metadata)
ipcMain.handle('get-available-versions', async () => {
  try {
    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    const data = (await res.json()) as any;
    const allVersions = data.versions.map((v: any) => ({
      id: v.id,
      type: v.type // 'release', 'snapshot', 'old_beta', 'old_alpha'
    }));
    return allVersions;
  } catch (e) {
    console.error('Failed to fetch Mojang versions, using fallback.', e);
    return [
      { id: '1.21.1', type: 'release' },
      { id: '1.20.4', type: 'release' },
      { id: '1.20.1', type: 'release' },
      { id: '1.19.4', type: 'release' },
      { id: '1.19.2', type: 'release' },
      { id: '1.18.2', type: 'release' },
      { id: '1.16.5', type: 'release' },
      { id: '1.12.2', type: 'release' },
      { id: '1.8.9', type: 'release' },
      { id: '1.7.10', type: 'release' }
    ];
  }
});

// Fetch Installed Versions in Local Directory
ipcMain.handle('get-installed-versions', () => {
  const root = settings.gameDir || defaultGameDir;
  const versionsDir = path.join(root, 'versions');
  if (!fs.existsSync(versionsDir)) return [];

  try {
    const folders = fs.readdirSync(versionsDir);
    return folders.filter((f) => {
      const jsonPath = path.join(versionsDir, f, `${f}.json`);
      const jarPath = path.join(versionsDir, f, `${f}.jar`);
      
      // JSON metadata file must exist
      if (!fs.existsSync(jsonPath)) return false;
      
      // JAR executable file must exist
      if (!fs.existsSync(jarPath)) return false;
      
      const stat = fs.statSync(jarPath);
      
      // If it's a Fabric instance, the JAR is a dummy file (minimum 22 bytes empty zip)
      if (f.toLowerCase().includes('fabric')) {
        return stat.size >= 22;
      }
      
      // For Vanilla and Forge, the JAR is the full client and must be valid (> 10KB to support classic old versions)
      return stat.size > 10 * 1024;
    });
  } catch (e) {
    return [];
  }
});

// Settings Management IPCs
ipcMain.handle('get-settings', () => settings);
ipcMain.handle('save-settings', (_event, newSettings: Settings) => {
  saveSettingsData(newSettings);
  return settings;
});
ipcMain.handle('get-system-ram', () => {
  return Math.round(os.totalmem() / (1024 * 1024 * 1024));
});

// Stats IPC — returns aggregated real play data
ipcMain.handle('get-stats', () => ({
  totalPlayTimeMs: settings.totalPlayTimeMs || 0,
  lastPlayedVersion: settings.lastPlayedVersion || null,
  lastPlayedAt: settings.lastPlayedAt || null,
}));

// Select Game Directory Dialog
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Select Mod or Pack Files Dialog
ipcMain.handle('select-mods-or-packs', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Minecraft Files (*.jar, *.zip)', extensions: ['jar', 'zip'] },
      { name: 'Mods (*.jar)', extensions: ['jar'] },
      { name: 'Texture/Shader Packs (*.zip)', extensions: ['zip'] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

// Auto Java Downloader - Version Mapping Helper
function getRequiredJavaVersion(mcVersion: string): number {
  if (mcVersion.startsWith('1.21') || mcVersion.startsWith('1.20.5') || mcVersion.startsWith('1.20.6')) {
    return 21;
  }
  if (mcVersion.startsWith('1.17') || mcVersion.startsWith('1.18') || mcVersion.startsWith('1.19') || mcVersion.startsWith('1.20')) {
    return 17;
  }
  return 8;
}

// Auto Java Downloader - Recursive Executable Finder
function findJavaExecutable(dir: string, execName: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (_) {
      continue;
    }
    if (stat.isDirectory()) {
      const found = findJavaExecutable(fullPath, execName);
      if (found) return found;
    } else if (file === execName) {
      return fullPath;
    }
  }
  return null;
}

// Auto Java Downloader - Streaming JRE Downloader and Unpacker
async function ensureJavaRuntime(mcVersion: string): Promise<string> {
  const javaMajor = getRequiredJavaVersion(mcVersion);
  const runtimeBaseDir = path.join(defaultGameDir, 'runtime');
  const destDir = path.join(runtimeBaseDir, `java-${javaMajor}`);
  
  const execName = isWindows ? 'java.exe' : 'java';
  let execPath = findJavaExecutable(destDir, execName);
  
  if (execPath) {
    console.log(`[Rase Launcher] Java ${javaMajor} JRE already exists at: ${execPath}`);
    return execPath;
  }
  
  // Make sure directories exist
  fs.mkdirSync(destDir, { recursive: true });
  
  const osName = isWindows ? 'windows' : 'linux';
  let arch = 'x64';
  if (process.arch === 'arm64') arch = 'aarch64';
  else if (process.arch === 'ia32') arch = 'x32';
  
  const downloadUrl = `https://api.adoptium.net/v3/binary/latest/${javaMajor}/ga/${osName}/${arch}/jre/hotspot/normal/eclipse`;
  
  mainWindow?.webContents.send('launch-status', { 
    state: 'preparing', 
    details: `Java ${javaMajor} JRE indiriliyor (Adoptium)...` 
  });
  
  mainWindow?.webContents.send('launch-log', `[Rase Launcher] Downloading Java ${javaMajor} runtime JRE from: ${downloadUrl}`);
  
  const archiveExt = isWindows ? '.zip' : '.tar.gz';
  const tempArchivePath = path.join(runtimeBaseDir, `temp-java-${javaMajor}${archiveExt}`);
  
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Adoptium API returned HTTP ${res.status}`);
  
  const contentLength = parseInt(res.headers.get('content-length') || '0');
  const chunks: Buffer[] = [];
  let downloaded = 0;
  
  const reader = res.body!.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    downloaded += value.length;
    
    if (contentLength > 0 && mainWindow) {
      const pct = Math.round((downloaded / contentLength) * 100);
      mainWindow.webContents.send('launch-status', {
        state: 'preparing',
        details: `Java ${javaMajor} indiriliyor: ${Math.round(downloaded / 1024 / 1024)} / ${Math.round(contentLength / 1024 / 1024)} MB (${pct}%)`
      });
      mainWindow.webContents.send('launch-progress', {
        type: 'download',
        task: `java-${javaMajor}-jre`,
        current: downloaded,
        total: contentLength
      });
    }
  }
  
  const buffer = Buffer.concat(chunks);
  fs.writeFileSync(tempArchivePath, buffer);
  
  mainWindow?.webContents.send('launch-status', { 
    state: 'preparing', 
    details: `Java ${javaMajor} dosyaları ayıklanıyor...` 
  });
  
  mainWindow?.webContents.send('launch-log', `[Rase Launcher] Extracting JRE archive to: ${destDir}`);
  
  if (isWindows) {
    try {
      const zip = new AdmZip(tempArchivePath);
      zip.extractAllTo(destDir, true);
    } catch (zipErr: any) {
      throw new Error(`ZIP extraction failed: ${zipErr.message}`);
    }
  } else {
    try {
      execSync(`tar -xzf "${tempArchivePath}" -C "${destDir}"`);
    } catch (tarErr: any) {
      throw new Error(`TAR extraction failed: ${tarErr.message}`);
    }
  }
  
  // Clean up temporary JRE archive file
  try {
    fs.unlinkSync(tempArchivePath);
  } catch (_) {}
  
  execPath = findJavaExecutable(destDir, execName);
  if (!execPath) {
    throw new Error(`Java executable not found in ${destDir} after extraction.`);
  }
  
  // Grant executable permissions on Linux
  if (!isWindows) {
    try {
      fs.chmodSync(execPath, 0o755);
      const binDir = path.dirname(execPath);
      const binFiles = fs.readdirSync(binDir);
      for (const file of binFiles) {
        fs.chmodSync(path.join(binDir, file), 0o755);
      }
    } catch (chmodErr: any) {
      mainWindow?.webContents.send('launch-log', `[Rase Launcher] [WARNING] Failed to chmod binaries: ${chmodErr.message}`);
    }
  }
  
  mainWindow?.webContents.send('launch-status', { 
    state: 'preparing', 
    details: `Java ${javaMajor} kurulumu tamamlandı!` 
  });
  
  mainWindow?.webContents.send('launch-log', `[Rase Launcher] Successfully set Java path to: ${execPath}`);
  return execPath;
}

// Helper to resolve and create isolated version instances game directory
function getInstanceDirectory(version?: string, loaderType?: string): string {
  const root = settings.gameDir || defaultGameDir;

  // Route to the active isolated custom profile's directory if one is set active
  if (settings.activeProfileId) {
    const profileDir = path.join(root, 'profiles', settings.activeProfileId);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    return profileDir;
  }

  if (!version || !loaderType) return root;
  const instanceDir = path.join(root, 'instances', `${loaderType}-${version}`);
  if (!fs.existsSync(instanceDir)) {
    fs.mkdirSync(instanceDir, { recursive: true });
  }
  return instanceDir;
}

// Open Game/Mods Folders in System File Explorer
ipcMain.handle('open-folder', (_event, { type, version, loaderType }) => {
  const instanceDir = getInstanceDirectory(version, loaderType);
  let targetPath = instanceDir;
  if (type === 'mods') targetPath = path.join(instanceDir, 'mods');
  else if (type === 'resourcepacks') targetPath = path.join(instanceDir, 'resourcepacks');
  else if (type === 'shaderpacks') targetPath = path.join(instanceDir, 'shaderpacks');

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }

  shell.openPath(targetPath);
  return { success: true };
});

// Read Installed Mods and Packs
ipcMain.handle('get-mods-and-packs', (_event, { version, loaderType }) => {
  const instanceDir = getInstanceDirectory(version, loaderType);
  const modsDir = path.join(instanceDir, 'mods');
  const packsDir = path.join(instanceDir, 'resourcepacks');
  const shadersDir = path.join(instanceDir, 'shaderpacks');

  const mods: string[] = [];
  const packs: string[] = [];
  const shaders: string[] = [];

  if (fs.existsSync(modsDir)) {
    try {
      mods.push(...fs.readdirSync(modsDir).filter((f) => f.endsWith('.jar')));
    } catch (e) {}
  }
  if (fs.existsSync(packsDir)) {
    try {
      packs.push(...fs.readdirSync(packsDir).filter((f) => f.endsWith('.zip')));
    } catch (e) {}
  }
  if (fs.existsSync(shadersDir)) {
    try {
      shaders.push(...fs.readdirSync(shadersDir).filter((f) => f.endsWith('.zip')));
    } catch (e) {}
  }

  return { mods, packs, shaders };
});

// Delete Installed Mod or Pack
ipcMain.handle('delete-mod-or-pack', (_event, { fileName, type, version, loaderType }) => {
  const instanceDir = getInstanceDirectory(version, loaderType);
  const filePath = path.join(instanceDir, type, fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return { success: true };
  }
  return { success: false, error: 'File not found' };
});

// Install Dropped Jar or Zip File
ipcMain.handle('install-mod-or-pack', (_event, { filePath, version, loaderType }) => {
  const instanceDir = getInstanceDirectory(version, loaderType);
  const extension = path.extname(filePath).toLowerCase();
  let type: 'mods' | 'resourcepacks' | 'shaderpacks' | null = null;

  if (extension === '.jar') {
    type = 'mods';
  } else if (extension === '.zip') {
    try {
      const zip = new AdmZip(filePath);
      const hasPackMcMeta = zip.getEntry('pack.mcmeta') !== null;
      const entries = zip.getEntries();
      const hasShadersDir = entries.some((entry) => entry.entryName.startsWith('shaders/'));

      if (hasShadersDir && !hasPackMcMeta) {
        type = 'shaderpacks';
      } else {
        type = 'resourcepacks';
      }
    } catch (e) {
      console.error('Failed to parse zip with adm-zip, defaulting to resourcepacks', e);
      type = 'resourcepacks';
    }
  }

  if (!type) {
    throw new Error('Unsupported format. Please drag only .jar files (mods) or .zip files (texture/shader packs).');
  }

  const targetDir = path.join(instanceDir, type);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const destPath = path.join(targetDir, path.basename(filePath));
  fs.copyFileSync(filePath, destPath);
  return { success: true, fileName: path.basename(filePath), type };
});

// Install Custom Loader (Fabric & Forge)
ipcMain.handle('install-loader', async (_event, { version, loaderType }) => {
  if (!mainWindow) return { success: false };

  const root = settings.gameDir || defaultGameDir;

  if (loaderType === 'fabric') {
    try {
      mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 5, message: 'Fetching Fabric metadata...' });

      // 1. Fetch Fabric loader list
      const loadersResponse = await fetch('https://meta.fabricmc.net/v2/versions/loader');
      const loaders = (await loadersResponse.json()) as any[];
      const stableLoader = loaders.find((l) => l.stable === true);
      if (!stableLoader) throw new Error('No stable Fabric loader version found.');
      const loaderVersion = stableLoader.version;

      mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 15, message: `Downloading Fabric Profile JSON for ${loaderVersion}...` });

      // 2. Fetch profile json
      const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVersion}/profile/json`;
      const profileResponse = await fetch(profileUrl);
      if (!profileResponse.ok) {
        throw new Error(`Fabric profile JSON is not available for Minecraft ${version}`);
      }
      const profileJson = await profileResponse.json();

      // 3. Create fabric version directory
      const versionName = `fabric-loader-${loaderVersion}-${version}`;
      const versionDir = path.join(root, 'versions', versionName);
      fs.mkdirSync(versionDir, { recursive: true });

      // 4. Save version JSON and write a valid 22-byte empty zip to satisfy launcher core & Fabric's zip validator
      const emptyZip = Buffer.from([
        0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      fs.writeFileSync(path.join(versionDir, `${versionName}.json`), JSON.stringify(profileJson, null, 2), 'utf8');
      fs.writeFileSync(path.join(versionDir, `${versionName}.jar`), emptyZip);

      // Cache Fabric version in settings for launchers
      settings.latestFabricLoader = loaderVersion;
      saveSettingsData(settings);

      // 5. CRITICAL: Download the vanilla Minecraft client JAR for this version.
      //    Fabric's KnotClient needs it in the classpath at root/versions/{mc}/{mc}.jar
      const vanillaJarPath = path.join(root, 'versions', version, `${version}.jar`);
      const vanillaJsonPath = path.join(root, 'versions', version, `${version}.json`);

      if (!fs.existsSync(vanillaJarPath) || fs.statSync(vanillaJarPath).size < 1024) {
        mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 25, message: `Fetching Minecraft ${version} version manifest...` });

        const manifestResponse = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        if (!manifestResponse.ok) throw new Error('Failed to fetch Mojang version manifest');
        const manifest = (await manifestResponse.json()) as any;

        const versionInfo = manifest.versions.find((v: any) => v.id === version);
        if (!versionInfo) throw new Error(`Minecraft version ${version} not found in manifest`);

        mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 30, message: `Downloading Minecraft ${version} version JSON...` });

        const vanillaJsonResponse = await fetch(versionInfo.url);
        if (!vanillaJsonResponse.ok) throw new Error('Failed to fetch version JSON');
        const vanillaJson = (await vanillaJsonResponse.json()) as any;

        // Save vanilla version JSON
        fs.mkdirSync(path.join(root, 'versions', version), { recursive: true });
        fs.writeFileSync(vanillaJsonPath, JSON.stringify(vanillaJson, null, 2), 'utf8');

        // Download the actual vanilla client .jar with progress reporting
        const clientUrl = vanillaJson?.downloads?.client?.url;
        const clientSize = vanillaJson?.downloads?.client?.size || 0;
        if (!clientUrl) throw new Error(`No client download URL found for Minecraft ${version}`);

        mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 35, message: `Downloading Minecraft ${version} client jar...` });

        const clientResponse = await fetch(clientUrl);
        if (!clientResponse.ok) throw new Error(`Failed to download Minecraft ${version} client jar`);

        // Stream download with progress tracking
        const chunks: Buffer[] = [];
        let downloadedBytes = 0;
        const reader = clientResponse.body!.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(Buffer.from(value));
          downloadedBytes += value.length;

          if (clientSize > 0) {
            const pct = Math.round(35 + (downloadedBytes / clientSize) * 55); // 35-90%
            mainWindow?.webContents.send('install-progress', {
              state: 'downloading',
              percent: Math.min(pct, 90),
              message: `Downloading Minecraft ${version} client: ${Math.round(downloadedBytes / 1024 / 1024)} MB / ${Math.round(clientSize / 1024 / 1024)} MB`
            });
          }
        }

        fs.writeFileSync(vanillaJarPath, Buffer.concat(chunks));
        mainWindow.webContents.send('install-progress', { state: 'installing', percent: 92, message: `Minecraft ${version} client jar downloaded!` });
      } else {
        mainWindow.webContents.send('install-progress', { state: 'installing', percent: 92, message: `Minecraft ${version} client jar already present.` });
      }

      mainWindow.webContents.send('install-progress', { state: 'completed', percent: 100, message: `Fabric ${loaderVersion} + Minecraft ${version} ready!` });
      return { success: true, versionName };
    } catch (e: any) {
      mainWindow.webContents.send('install-progress', { state: 'error', percent: 0, message: e.message });
      throw e;
    }
  } else if (loaderType === 'forge') {
    // Forge custom silent installer execution
    const recommendedForge: Record<string, string> = {
      '1.20.4': '49.0.38',
      '1.20.1': '47.2.0',
      '1.19.4': '45.1.0',
      '1.19.2': '43.2.0',
      '1.18.2': '40.2.0',
      '1.16.5': '36.2.39'
    };

    const forgeVer = recommendedForge[version];
    if (!forgeVer) {
      throw new Error(`Auto-installation for Forge on Minecraft ${version} is not pre-configured.`);
    }

    try {
      mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 15, message: `Downloading Forge installer ${version}-${forgeVer}...` });

      const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}-${forgeVer}/forge-${version}-${forgeVer}-installer.jar`;
      const tempDir = path.join(app.getPath('temp'), 'rase-launcher');
      fs.mkdirSync(tempDir, { recursive: true });
      const installerPath = path.join(tempDir, `forge-${version}-${forgeVer}-installer.jar`);

      const response = await fetch(installerUrl);
      if (!response.ok) {
        throw new Error(`Failed to download Forge installer. Ensure you have an active internet connection.`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(installerPath, buffer);

      mainWindow.webContents.send('install-progress', { state: 'installing', percent: 50, message: 'Extracting and installing libraries (takes 1-3 mins)...' });

      const javaCmd = settings.javaPath || 'java';

      return new Promise((resolve, reject) => {
        const child = spawn(javaCmd, ['-jar', installerPath, '--installClient', root], {
          cwd: tempDir
        });

        let logBuffer = '';

        child.stdout.on('data', (data) => {
          const text = data.toString();
          logBuffer += text;

          if (text.includes('Extracting:')) {
            mainWindow?.webContents.send('install-progress', { state: 'installing', percent: 70, message: 'Forge Installer: Extracting libraries...' });
          } else if (text.includes('Processing:')) {
            mainWindow?.webContents.send('install-progress', { state: 'installing', percent: 85, message: 'Forge Installer: Running post-processors...' });
          }
        });

        child.on('close', (code) => {
          try {
            fs.unlinkSync(installerPath);
          } catch (e) {}

          const expectedVersionFolder = `${version}-forge-${forgeVer}`;
          const finalFolderExists = fs.existsSync(path.join(root, 'versions', expectedVersionFolder)) || 
                                     fs.existsSync(path.join(root, 'versions', `${version}-Forge-${forgeVer}`));

          if (code === 0 && (logBuffer.includes('Successfully installed') || finalFolderExists)) {
            mainWindow?.webContents.send('install-progress', { state: 'completed', percent: 100, message: 'Forge successfully installed!' });
            resolve({ success: true, versionName: expectedVersionFolder });
          } else {
            const errText = `Forge installer failed with code ${code}. Please make sure you have Java installed on your PATH and try again.`;
            mainWindow?.webContents.send('install-progress', { state: 'error', percent: 0, message: errText });
            reject(new Error(errText));
          }
        });
      });
    } catch (e: any) {
      mainWindow.webContents.send('install-progress', { state: 'error', percent: 0, message: e.message });
      throw e;
    }
  }
});

// Launch Minecraft IPC Handle
ipcMain.handle('launch-game', async (_event, { username, version, type, options }) => {
  if (!mainWindow) return { success: false };

  const root = settings.gameDir || defaultGameDir;
  const launcher = new Client();

  // Forward launch logs and debugging directly to React
  launcher.on('debug', (e: string) => {
    mainWindow?.webContents.send('launch-log', `[DEBUG] ${e}`);
  });
  launcher.on('data', (e: string) => {
    mainWindow?.webContents.send('launch-log', e);

    // ---- Discord RPC: Real-time log parsing ----
    // Singleplayer: Minecraft logs when an integrated server starts
    if (/Starting integrated connection|Starting internal server/i.test(e)) {
      updateDiscordPresence('Tek Oyunculu', currentGameLabel, false);
    }
    // Multiplayer: Minecraft logs when connecting to a remote server
    const mpMatch = e.match(/Connecting to ([\w.-]+)(?:,\s*(\d+))?/);
    if (mpMatch) {
      const serverIp = mpMatch[1];
      updateDiscordPresence(`Çok Oyunculu (${serverIp})`, currentGameLabel, false);
    }
    // Return to game menu when disconnecting
    if (/Stopping integrated connection|Disconnecting|Returning to main menu|disconnect\.disconnected/i.test(e)) {
      updateDiscordPresence(currentGameLabel, undefined, false);
    }
  });
  launcher.on('arguments', (e: string[]) => {
    mainWindow?.webContents.send('launch-log', `[LAUNCH COMMAND] ${e.join(' ')}`);
  });
  launcher.on('progress', (e: any) => {
    mainWindow?.webContents.send('launch-progress', e);
  });

  mainWindow.webContents.send('launch-status', { state: 'preparing', details: 'Checking files and assets...' });

  // ---- Auto Java Downloader integration ----
  let resolvedJavaPath: string | undefined = undefined;
  if (!options.javaPath || options.javaPath === 'java' || options.javaPath.trim() === '') {
    try {
      resolvedJavaPath = await ensureJavaRuntime(version);
    } catch (javaErr: any) {
      mainWindow?.webContents.send('launch-log', `[Rase Launcher] [WARNING] Auto JRE download failed: ${javaErr.message}. Falling back to default system JRE.`);
    }
  } else {
    resolvedJavaPath = options.javaPath;
  }

  // Get Offline Authentication session object
  const auth = Authenticator.getAuth(username);

  // Save last username and add to savedUsernames list
  settings.lastUsername = username;
  if (!settings.savedUsernames) {
    settings.savedUsernames = [username];
  } else if (!settings.savedUsernames.includes(username)) {
    settings.savedUsernames.push(username);
  }
  saveSettingsData(settings);

  // Verify and download/repair Vanilla files (Required for both Vanilla and Fabric launchers)
  if (type === 'vanilla' || type === 'fabric') {
    const vanillaJarPath = path.join(root, 'versions', version, `${version}.jar`);
    const vanillaJsonPath = path.join(root, 'versions', version, `${version}.json`);
    
    let needsVanillaDownload = false;
    try {
      if (!fs.existsSync(vanillaJarPath) || !fs.existsSync(vanillaJsonPath) || fs.statSync(vanillaJarPath).size < 10 * 1024) {
        needsVanillaDownload = true;
      }
    } catch (e) {
      needsVanillaDownload = true;
    }

    if (needsVanillaDownload) {
      mainWindow?.webContents.send('launch-status', { state: 'preparing', details: `Minecraft ${version} istemci dosyaları indiriliyor...` });
      mainWindow?.webContents.send('launch-log', `[Rase Launcher] Minecraft ${version} files missing or incomplete — downloading...`);
      try {
        const manifestRes = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        const manifest = (await manifestRes.json()) as any;
        const versionInfo = manifest.versions.find((v: any) => v.id === version);
        if (!versionInfo) throw new Error(`Minecraft version ${version} not in manifest`);

        const vanillaJsonRes = await fetch(versionInfo.url);
        const vanillaJson = (await vanillaJsonRes.json()) as any;
        fs.mkdirSync(path.join(root, 'versions', version), { recursive: true });
        fs.writeFileSync(vanillaJsonPath, JSON.stringify(vanillaJson, null, 2), 'utf8');

        const clientUrl = vanillaJson?.downloads?.client?.url;
        if (!clientUrl) throw new Error(`No client download URL for Minecraft ${version}`);

        const clientRes = await fetch(clientUrl);
        if (!clientRes.ok) throw new Error(`HTTP ${clientRes.status} downloading vanilla jar`);

        // Stream download with progress so the UI shows real percentage
        const contentLength = parseInt(clientRes.headers.get('content-length') || '0');
        const chunks2: Buffer[] = [];
        let downloaded2 = 0;
        const reader2 = clientRes.body!.getReader();
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          chunks2.push(Buffer.from(value));
          downloaded2 += value.length;
          if (contentLength > 0) {
            const pct2 = Math.round((downloaded2 / contentLength) * 100);
            mainWindow?.webContents.send('launch-status', {
              state: 'preparing',
              details: `Minecraft ${version} istemci indiriliyor: ${Math.round(downloaded2 / 1024 / 1024)} / ${Math.round(contentLength / 1024 / 1024)} MB (${pct2}%)`
            });
            mainWindow?.webContents.send('launch-progress', {
              type: 'download', task: `minecraft-${version}.jar`, current: downloaded2, total: contentLength
            });
          }
        }
        const clientBuffer = Buffer.concat(chunks2);
        fs.writeFileSync(vanillaJarPath, clientBuffer);
        mainWindow?.webContents.send('launch-log', `[Rase Launcher] Minecraft ${version} client jar downloaded: ${clientBuffer.length} bytes`);
      } catch (dlErr: any) {
        throw new Error(`Minecraft ${version} dosyaları indirilirken hata oluştu: ${dlErr.message}`);
      }
    }
  }

  // Determine Custom Version identifier
  let versionName = version;
  if (type === 'fabric') {
    const loader = settings.latestFabricLoader || '0.15.11';
    versionName = `fabric-loader-${loader}-${version}`;
    const fabricVersionsDir = path.join(root, 'versions', versionName);
    const fabricJarPath = path.join(fabricVersionsDir, `${versionName}.jar`);
    const fabricJsonPath = path.join(fabricVersionsDir, `${versionName}.json`);

    if (!fs.existsSync(fabricVersionsDir) || !fs.existsSync(fabricJsonPath)) {
      throw new Error(`Fabric sürüm dosyaları mevcut değil. Lütfen önce Fabric kurulumunu yapın!`);
    }

    // Auto-repair 0-byte or corrupted dummy jar files to prevent Knot client ZipExceptions
    let needsRepair = false;
    try {
      if (!fs.existsSync(fabricJarPath) || fs.statSync(fabricJarPath).size < 22) {
        needsRepair = true;
      }
    } catch (e) {
      needsRepair = true;
    }

    if (needsRepair) {
      const emptyZip = Buffer.from([
        0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ]);
      try {
        fs.mkdirSync(fabricVersionsDir, { recursive: true });
        fs.writeFileSync(fabricJarPath, emptyZip);
        mainWindow?.webContents.send('launch-log', `[Rase Launcher] Repaired empty/missing Fabric jar at: ${fabricJarPath}`);
      } catch (err: any) {
        mainWindow?.webContents.send('launch-log', `[Rase Launcher] [WARNING] Failed to repair Fabric jar: ${err.message}`);
      }
    }
  } else if (type === 'forge') {
    const versionsDir = path.join(root, 'versions');
    let forgeMatch = '';
    if (fs.existsSync(versionsDir)) {
      const folders = fs.readdirSync(versionsDir);
      const matched = folders.find((f) => f.includes(version) && f.toLowerCase().includes('forge'));
      if (matched) {
        forgeMatch = matched;
      }
    }

    if (!forgeMatch) {
      throw new Error(`Minecraft ${version} için Forge kurulu değil. Lütfen önce Forge kurun!`);
    }

    versionName = forgeMatch;
    const forgeJarPath = path.join(versionsDir, versionName, `${versionName}.jar`);
    const forgeJsonPath = path.join(versionsDir, versionName, `${versionName}.json`);

    if (!fs.existsSync(forgeJarPath) || !fs.existsSync(forgeJsonPath) || fs.statSync(forgeJarPath).size < 10 * 1024) {
      throw new Error(`Forge dosyaları eksik veya bozuk. Lütfen Forge kurulumunu tekrar yapın!`);
    }
  }

  const instanceDir = getInstanceDirectory(version, type);

  const launchOptions = {
    clientPackage: undefined,
    authorization: auth,
    root: root,
    overrides: {
      gameDirectory: instanceDir,
      // Force MCLC to include the actual vanilla Minecraft client jar on the classpath for custom loaders
      minecraftJar: type !== 'vanilla'
        ? path.join(root, 'versions', version, `${version}.jar`)
        : undefined
    },
    version: {
      number: version,
      type: 'release',
      custom: type !== 'vanilla' ? versionName : undefined
    },
    memory: {
      max: `${options.ram || 4}G`,
      min: '1G'
    },
    javaPath: resolvedJavaPath,
    customArgs: [
      "-XX:+UseG1GC",
      "-XX:+ParallelRefProcEnabled",
      "-XX:MaxGCPauseMillis=200",
      "-XX:+UnlockExperimentalVMOptions",
      "-XX:+DisableExplicitGC",
      "-XX:+AlwaysPreTouch",
      "-XX:G1NewSizePercent=30",
      "-XX:G1MaxNewSizePercent=40",
      "-XX:G1ReservePercent=20",
      "-XX:G1HeapWastePercent=5",
      "-XX:G1MixedGCCountTarget=4",
      "-XX:InitiatingHeapOccupancyPercent=15",
      "-XX:G1MixedGCLiveThresholdPercent=90",
      "-XX:G1RSetUpdatingPauseTimePercent=5",
      "-XX:SurvivorRatio=32",
      "-XX:+PerfDisableSharedMem",
      "-XX:MaxTenuringThreshold=1"
    ]
  };

  // Track play session start
  const sessionStart = Date.now();
  const playedVersionLabel = type === 'fabric'
    ? `${version} (Fabric)`
    : type === 'forge'
    ? `${version} (Forge)`
    : `${version} (Vanilla)`;

  // Discord RPC: label used for "in-game" state and when returning from server/world
  const currentGameLabel = playedVersionLabel;

  try {
    // Listen to MCLC close event so we can accumulate play time
    launcher.on('close', () => {
      const duration = Date.now() - sessionStart;
      settings.totalPlayTimeMs = (settings.totalPlayTimeMs || 0) + duration;
      settings.lastPlayedAt = Date.now();
      saveSettingsData(settings);
      mainWindow?.webContents.send('launch-status', { state: 'closed' });
      // Discord RPC: revert to launcher browsing state when game closes
      updateDiscordPresence('Ana Sayfada Geziniyor');
    });

    launcher.launch(launchOptions);

    // Discord RPC: show version label once game has launched
    updateDiscordPresence(playedVersionLabel, undefined, true);

    // Record which version was last played
    settings.lastPlayedVersion = playedVersionLabel;
    settings.lastPlayedAt = Date.now();
    saveSettingsData(settings);

    mainWindow.webContents.send('launch-status', { state: 'launched' });

    // Minimize launcher to tray or background while playing
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.minimize();
      }
    }, 2000);

    return { success: true };
  } catch (e: any) {
    // Discord RPC: revert to launcher state if launch fails
    updateDiscordPresence('Ana Sayfada Geziniyor');
    mainWindow.webContents.send('launch-status', { state: 'error', details: e.message });
    throw e;
  }
});

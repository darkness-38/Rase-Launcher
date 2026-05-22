import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import AdmZip from 'adm-zip';
// @ts-ignore
import { Client, Authenticator } from 'minecraft-launcher-core';

let mainWindow: BrowserWindow | null = null;

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
}

let settings: Settings = {
  ram: 4,
  javaPath: 'java',
  gameDir: defaultGameDir,
  lastUsername: '',
  savedUsernames: [],
  totalPlayTimeMs: 0
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
      nodeIntegration: false
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

// Fetch Available Mojang Versions (Filtered from 1.7+ releases)
ipcMain.handle('get-available-versions', async () => {
  try {
    const res = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
    const data = (await res.json()) as any;
    const releases = data.versions
      .filter((v: any) => v.type === 'release')
      .map((v: any) => v.id)
      .filter((v: string) => {
        const parts = v.split('.');
        if (parts[0] !== '1') return false;
        const major = parseInt(parts[1], 10);
        return major >= 7; // Support classic PvP & modding versions (1.7.10, 1.8.9, 1.12.2+)
      });
    return releases;
  } catch (e) {
    console.error('Failed to fetch Mojang versions, using fallback.', e);
    return ['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9', '1.7.10'];
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
      return fs.existsSync(jsonPath);
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

// Helper to resolve and create isolated version instances game directory
function getInstanceDirectory(version?: string, loaderType?: string): string {
  const root = settings.gameDir || defaultGameDir;
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
  });
  launcher.on('progress', (e: any) => {
    mainWindow?.webContents.send('launch-progress', e);
  });

  mainWindow.webContents.send('launch-status', { state: 'preparing', details: 'Checking files and assets...' });

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

  // Determine Custom Version identifier
  let versionName = version;
  if (type === 'fabric') {
    const loader = settings.latestFabricLoader || '0.15.11';
    versionName = `fabric-loader-${loader}-${version}`;
    const versionsDir = path.join(root, 'versions', versionName);
    if (!fs.existsSync(versionsDir)) {
      throw new Error(`Fabric version files do not exist. Please click install on Fabric first!`);
    }

    // Auto-repair 0-byte or corrupted dummy jar files to prevent Knot client ZipExceptions
    const jarPath = path.join(versionsDir, `${versionName}.jar`);
    let needsRepair = false;
    try {
      if (!fs.existsSync(jarPath) || fs.statSync(jarPath).size < 22) {
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
        fs.mkdirSync(versionsDir, { recursive: true });
        fs.writeFileSync(jarPath, emptyZip);
        mainWindow?.webContents.send('launch-log', `[Rase Launcher] Repaired empty/missing Fabric jar at: ${jarPath}`);
      } catch (err: any) {
        mainWindow?.webContents.send('launch-log', `[Rase Launcher] [WARNING] Failed to repair Fabric jar: ${err.message}`);
      }
    }

    // CRITICAL: Ensure the vanilla Minecraft client jar exists for Fabric KnotClient
    // Without this, Fabric throws "Minecraft game provider couldn't locate the game!"
    const vanillaJarPath = path.join(root, 'versions', version, `${version}.jar`);
    const vanillaJsonPath = path.join(root, 'versions', version, `${version}.json`);
    if (!fs.existsSync(vanillaJarPath) || fs.statSync(vanillaJarPath).size < 1024) {
      mainWindow?.webContents.send('launch-status', { state: 'preparing', details: `Downloading Minecraft ${version} client jar (required by Fabric)...` });
      mainWindow?.webContents.send('launch-log', `[Rase Launcher] Vanilla client jar missing — downloading for Fabric...`);
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
            // Also send launch-progress so the progress bar updates
            mainWindow?.webContents.send('launch-progress', {
              type: 'download', task: `minecraft-${version}.jar`, current: downloaded2, total: contentLength
            });
          }
        }
        const clientBuffer = Buffer.concat(chunks2);
        fs.writeFileSync(vanillaJarPath, clientBuffer);
        mainWindow?.webContents.send('launch-log', `[Rase Launcher] Vanilla client jar downloaded: ${clientBuffer.length} bytes`);
      } catch (dlErr: any) {
        throw new Error(`Failed to download vanilla client for Fabric: ${dlErr.message}`);
      }
    }
  } else if (type === 'forge') {
    const versionsDir = path.join(root, 'versions');
    if (fs.existsSync(versionsDir)) {
      const folders = fs.readdirSync(versionsDir);
      const forgeMatch = folders.find((f) => f.includes(version) && f.toLowerCase().includes('forge'));
      if (forgeMatch) {
        versionName = forgeMatch;
      } else {
        throw new Error(`Forge is not installed for ${version}. Please click install on Forge first!`);
      }
    } else {
      throw new Error(`No versions found. Please click install on Forge first!`);
    }
  }

  const instanceDir = getInstanceDirectory(version, type);

  const launchOptions = {
    clientPackage: undefined,
    authorization: auth,
    root: root,
    overrides: {
      gameDirectory: instanceDir
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
    javaPath: options.javaPath && options.javaPath !== 'java' ? options.javaPath : undefined,
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

  try {
    // Listen to MCLC close event so we can accumulate play time
    launcher.on('close', () => {
      const duration = Date.now() - sessionStart;
      settings.totalPlayTimeMs = (settings.totalPlayTimeMs || 0) + duration;
      settings.lastPlayedAt = Date.now();
      saveSettingsData(settings);
      mainWindow?.webContents.send('launch-status', { state: 'closed' });
    });

    launcher.launch(launchOptions);

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
    mainWindow.webContents.send('launch-status', { state: 'error', details: e.message });
    throw e;
  }
});

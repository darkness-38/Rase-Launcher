import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, globalShortcut } from 'electron';

// Register media-file as a privileged scheme to safely stream screenshots to React
protocol.registerSchemesAsPrivileged([
  { scheme: 'media-file', privileges: { secure: true, bypassCSP: true, supportFetchAPI: true } }
]);
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as http from 'http';
import { spawn, execSync, exec } from 'child_process';
import AdmZip from 'adm-zip';
// @ts-ignore
import { Client, Authenticator } from 'minecraft-launcher-core';
// @ts-ignore
import DiscordRPC from 'discord-rpc';
// @ts-ignore
import express from 'express';
// @ts-ignore
import { WebSocketServer } from 'ws';
// @ts-ignore
import QRCode from 'qrcode';
import si from 'systeminformation';

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
  themeColor?: string;
  themeLayout?: string;
  borderlessFullscreen?: boolean;
  webDashboardEnabled?: boolean;
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
  showModded: true,
  borderlessFullscreen: true,
  webDashboardEnabled: true
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

// ==========================================
// WEB DASHBOARD STATE
// ==========================================
let webDashboardServer: http.Server | null = null;
let gameStartTime: number | null = null;
let currentFPS = 0; // Parsed from Minecraft log output

// ==========================================
// AUDIO SESSION TYPE
// ==========================================
interface AudioSession {
  id: string;
  name: string;
  volume: number;  // 0.0 - 1.0
  muted: boolean;
}

// Friendly name map for common process names
const PROCESS_FRIENDLY_NAMES: Record<string, string> = {
  'javaw.exe': 'Minecraft',
  'java': 'Minecraft',
  'spotify.exe': 'Spotify',
  'spotify': 'Spotify',
  'chrome.exe': 'Chrome',
  'chromium': 'Chrome',
  'firefox.exe': 'Firefox',
  'firefox': 'Firefox',
  'discord.exe': 'Discord',
  'discord': 'Discord',
  'vlc.exe': 'VLC',
  'vlc': 'VLC',
  'msedge.exe': 'Edge',
};

function getFriendlyName(rawName: string): string {
  const lower = rawName.toLowerCase();
  for (const [key, friendly] of Object.entries(PROCESS_FRIENDLY_NAMES)) {
    if (lower.includes(key.toLowerCase())) return friendly;
  }
  // Capitalize first letter of each word
  return rawName.replace(/\.exe$/i, '').replace(/\b\w/g, c => c.toUpperCase());
}

// ==========================================
// AUDIO SESSION MANAGEMENT (Cross-Platform)
// ==========================================
async function getAudioSessions(): Promise<AudioSession[]> {
  if (isWindows) {
    return getWindowsAudioSessions();
  } else {
    return getLinuxAudioSessions();
  }
}

async function getWindowsAudioSessions(): Promise<AudioSession[]> {
  try {
    // Use PowerShell to enumerate audio sessions via COM
    const ps = `
      Add-Type -TypeDefinition @"
      using System;
      using System.Runtime.InteropServices;
      [Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D")]
      [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
      interface IAudioSessionControl2 {
        void GetState();
        void GetDisplayName();
        void SetDisplayName();
        void GetIconPath();
        void SetIconPath();
        void GetGroupingParam();
        void SetGroupingParam();
        void RegisterAudioSessionNotification();
        void UnregisterAudioSessionNotification();
        uint GetSessionIdentifier([Out, MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
      }
"@
      # Fallback: list running processes with audio activity via Get-Process
      $procs = Get-Process | Where-Object { $_.MainWindowTitle -ne '' -or $_.Name -match 'java|spotify|chrome|firefox|discord|vlc|msedge' } | Select-Object Id, Name
      $procs | ConvertTo-Json -Depth 1
    `;
    const result = execSync(`powershell -NoProfile -NonInteractive -Command "${ps.replace(/"/g, "'").replace(/\n/g, ' ')}"`, { timeout: 3000 }).toString();
    let procs: any[] = [];
    try { procs = JSON.parse(result); } catch { return []; }
    if (!Array.isArray(procs)) procs = [procs];
    return procs.slice(0, 12).map((p: any) => ({
      id: String(p.Id || p.id || Math.random()),
      name: getFriendlyName(String(p.Name || p.name || 'Unknown')),
      volume: 1.0,
      muted: false
    }));
  } catch {
    return [];
  }
}

async function getLinuxAudioSessions(): Promise<AudioSession[]> {
  try {
    // Try pactl -f json (PulseAudio 15+ / PipeWire)
    const raw = execSync('pactl -f json list sink-inputs 2>/dev/null', { timeout: 3000 }).toString().trim();
    if (!raw || raw === 'null') return [];
    const inputs: any[] = JSON.parse(raw);
    if (!Array.isArray(inputs)) return [];
    return inputs.map((inp: any) => {
      const appName = inp.properties?.['application.name']
        || inp.properties?.['media.name']
        || 'Bilinmeyen Uygulama';
      const volObj = inp.volume?.['front-left'] || inp.volume?.['mono'];
      const volPct = volObj?.value_percent ? parseInt(volObj.value_percent) / 100 : 1.0;
      return {
        id: String(inp.index),
        name: getFriendlyName(appName),
        volume: Math.min(1, Math.max(0, volPct)),
        muted: inp.mute === true
      };
    });
  } catch {
    return [];
  }
}

function setAudioSessionVolume(appId: string, volume: number) {
  if (isWindows) {
    // Windows: PowerShell nircmd approach (best effort)
    try {
      execSync(`nircmd.exe setappvolume ${appId} ${volume.toFixed(2)}`, { timeout: 2000 });
    } catch { /* silently ignore if nircmd not present */ }
  } else {
    // Linux: pactl
    const pct = Math.round(volume * 100);
    exec(`pactl set-sink-input-volume ${appId} ${pct}%`);
  }
}

function setAudioSessionMute(appId: string, muted: boolean) {
  if (isWindows) {
    try {
      execSync(`nircmd.exe mutesysvolume ${muted ? 1 : 0}`, { timeout: 2000 });
    } catch { /* silently ignore */ }
  } else {
    exec(`pactl set-sink-input-mute ${appId} ${muted ? '1' : '0'}`);
  }
}

// ==========================================
// SYSTEM MEDIA CONTROL (Cross-Platform)
// ==========================================
function handleMediaCommand(action: 'play' | 'pause' | 'next' | 'prev') {
  if (isWindows) {
    // Windows: use PowerShell SendMessage to media keys
    const keyMap: Record<string, number> = {
      play: 0xB3,   // VK_MEDIA_PLAY_PAUSE
      pause: 0xB3,
      next: 0xB0,   // VK_MEDIA_NEXT_TRACK
      prev: 0xB1    // VK_MEDIA_PREV_TRACK
    };
    const vk = keyMap[action] || 0xB3;
    try {
      execSync(`powershell -NoProfile -Command "[void][System.Windows.Forms.SendKeys]"`, { timeout: 1000 });
    } catch {}
    try {
      // Use keybd_event approach via PowerShell
      execSync(
        `powershell -NoProfile -NonInteractive -Command "$wsh = New-Object -ComObject WScript.Shell; $wsh.SendKeys([char]${vk})"`,
        { timeout: 2000 }
      );
    } catch { /* ignore */ }
  } else {
    // Linux: playerctl (MPRIS)
    const cmdMap: Record<string, string> = {
      play: 'playerctl play',
      pause: 'playerctl pause',
      next: 'playerctl next',
      prev: 'playerctl previous'
    };
    exec(cmdMap[action] || 'playerctl play-pause');
  }
}

// ==========================================
// WEB DASHBOARD SERVER
// ==========================================
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return '127.0.0.1';
}

function getDashboardHTML(): string {
  // Check multiple fail-safe paths in sequence to support packaged app.asar, unpacked, and dev modes
  const paths = [
    path.join(app.getAppPath(), 'dist', 'dashboard.html'),
    path.join(__dirname, '..', 'dist', 'dashboard.html'),
    path.join(__dirname, '..', 'public', 'dashboard.html'),
    path.join(process.resourcesPath, 'public', 'dashboard.html')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  }
  // Minimal fallback
  return '<html><body><h1>Rase Launcher Dashboard</h1><p>dashboard.html not found</p></body></html>';
}

async function startWebDashboard(): Promise<void> {
  if (webDashboardServer) return; // Already running

  const expressApp = express();
  const server = http.createServer(expressApp);
  const wss = new WebSocketServer({ server });

  // Serve the phone dashboard HTML
  expressApp.get('/', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(getDashboardHTML());
  });

  wss.on('connection', (ws: any) => {
    console.log('[WebDashboard] Phone connected');

    // Send stats every second
    const statsInterval = setInterval(async () => {
      if (ws.readyState !== 1 /* OPEN */) return;
      try {
        const cpuLoad = await si.currentLoad();
        const memInfo = await si.mem();
        const playedMs = gameStartTime ? Date.now() - gameStartTime : 0;

        const statsMsg = JSON.stringify({
          type: 'stats',
          data: {
            ram: {
              used: Math.round(memInfo.active / 1024 / 1024 / 1024 * 10) / 10,
              total: Math.round(memInfo.total / 1024 / 1024 / 1024 * 10) / 10
            },
            cpu: Math.round(cpuLoad.currentLoad),
            fps: currentFPS,
            playTimeMs: playedMs
          }
        });
        ws.send(statsMsg);

        // Also send audio sessions every 2 ticks (every 2s)
        const audioSessions = await getAudioSessions();
        ws.send(JSON.stringify({ type: 'audio', data: audioSessions }));
      } catch { /* ignore */ }
    }, 1000);

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'media') handleMediaCommand(msg.action);
        if (msg.type === 'volume') setAudioSessionVolume(String(msg.appId), Number(msg.volume));
        if (msg.type === 'mute') setAudioSessionMute(String(msg.appId), Boolean(msg.muted));
      } catch { /* ignore malformed */ }
    });

    ws.on('close', () => {
      clearInterval(statsInterval);
      console.log('[WebDashboard] Phone disconnected');
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(7823, '0.0.0.0', () => {
      console.log('[WebDashboard] Server started on port 7823');
      resolve();
    });
    server.on('error', reject);
  });

  webDashboardServer = server;

  // Generate QR code and send to launcher window
  const localIP = getLocalIP();
  const dashboardURL = `http://${localIP}:7823`;
  try {
    const qrDataURL = await QRCode.toDataURL(dashboardURL, {
      color: { dark: '#e8553a', light: '#07080f' },
      width: 256,
      margin: 2
    });
    mainWindow?.webContents.send('show-qr-popup', { qrDataURL, ipAddress: dashboardURL });
  } catch (e) {
    console.error('[WebDashboard] QR generation failed:', e);
  }
}

function stopWebDashboard() {
  if (webDashboardServer) {
    webDashboardServer.close();
    webDashboardServer = null;
    console.log('[WebDashboard] Server stopped');
  }
}

// ==========================================
// BORDERLESS FULLSCREEN
// ==========================================
async function ensureBorderlessMode(instanceDir: string, _version: string, _loaderType: string): Promise<void> {
  // Step 1: Try options.txt manipulation
  const optionsPath = path.join(instanceDir, 'options.txt');
  try {
    let content = '';
    if (fs.existsSync(optionsPath)) {
      content = fs.readFileSync(optionsPath, 'utf8');
      // Replace fullscreen:true with fullscreen:false
      if (content.includes('fullscreen:true')) {
        content = content.replace(/^fullscreen:true$/m, 'fullscreen:false');
        fs.writeFileSync(optionsPath, content, 'utf8');
        mainWindow?.webContents.send('launch-log', '[Rase Launcher] Borderless: options.txt updated (fullscreen:false)');
        return;
      } else if (content.includes('fullscreen:false')) {
        mainWindow?.webContents.send('launch-log', '[Rase Launcher] Borderless: Already set to windowed mode in options.txt');
        return;
      } else {
        // Add fullscreen:false
        content += '\nfullscreen:false';
        fs.writeFileSync(optionsPath, content, 'utf8');
        mainWindow?.webContents.send('launch-log', '[Rase Launcher] Borderless: Added fullscreen:false to options.txt');
        return;
      }
    } else {
      // Create a minimal options.txt
      fs.mkdirSync(path.dirname(optionsPath), { recursive: true });
      fs.writeFileSync(optionsPath, 'fullscreen:false\n', 'utf8');
      mainWindow?.webContents.send('launch-log', '[Rase Launcher] Borderless: Created options.txt with fullscreen:false');
      return;
    }
  } catch (e: any) {
    mainWindow?.webContents.send('launch-log', `[Rase Launcher] Borderless options.txt failed: ${e.message}. Using JVM arg fallback.`);
  }

  // Step 2: JVM arg fallback — will be injected into customArgs by caller
  mainWindow?.webContents.send('launch-log', '[Rase Launcher] Borderless: JVM arg fallback active');
}

async function ensureBorderlessFabricMod(instanceDir: string, mcVersion: string): Promise<void> {
  const modsDir = path.join(instanceDir, 'mods');
  if (!fs.existsSync(modsDir)) {
    fs.mkdirSync(modsDir, { recursive: true });
  }

  // Check if borderless mod is already installed
  const existingMods = fs.readdirSync(modsDir);
  if (existingMods.some(f => f.toLowerCase().includes('borderless'))) {
    mainWindow?.webContents.send('launch-log', '[Rase Launcher] Borderless Fabric mod already installed');
    return;
  }

  try {
    mainWindow?.webContents.send('launch-log', `[Rase Launcher] Fetching Borderless Fullscreen mod for MC ${mcVersion}...`);
    // Modrinth API: get versions for 'borderless-fullscreen' project, filtered by fabric + mc version
    const apiUrl = `https://api.modrinth.com/v2/project/borderless-fullscreen/version?loaders=["fabric"]&game_versions=["${mcVersion}"]`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`Modrinth API error: HTTP ${res.status}`);
    const versions: any[] = await res.json();
    if (!versions || versions.length === 0) {
      // Try without version filter
      const res2 = await fetch('https://api.modrinth.com/v2/project/borderless-fullscreen/version?loaders=["fabric"]');
      const vers2: any[] = await res2.json();
      if (!vers2 || vers2.length === 0) throw new Error('No compatible Fabric version found');
      versions.push(...vers2.slice(0, 1));
    }

    const latestVer = versions[0];
    const file = latestVer.files?.find((f: any) => f.primary) || latestVer.files?.[0];
    if (!file?.url) throw new Error('No download URL found');

    mainWindow?.webContents.send('launch-log', `[Rase Launcher] Downloading ${file.filename}...`);
    const fileRes = await fetch(file.url);
    if (!fileRes.ok) throw new Error(`Download failed: HTTP ${fileRes.status}`);
    const buf = Buffer.from(await fileRes.arrayBuffer());
    fs.writeFileSync(path.join(modsDir, file.filename), buf);
    mainWindow?.webContents.send('launch-log', `[Rase Launcher] Borderless Fullscreen mod installed: ${file.filename}`);
  } catch (e: any) {
    mainWindow?.webContents.send('launch-log', `[Rase Launcher] [WARN] Could not install Borderless mod: ${e.message}. Falling back to options.txt.`);
    // Fall back to options.txt
    await ensureBorderlessMode(instanceDir, mcVersion, 'fabric');
  }
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
  // Register custom media-file handler to stream screenshots
  protocol.handle('media-file', (req) => {
    try {
      const filePath = decodeURIComponent(req.url.slice('media-file://'.length));
      return net.fetch('file://' + path.normalize(filePath));
    } catch (e) {
      console.error('Failed to handle media-file protocol request:', e);
      return new Response('File not found', { status: 404 });
    }
  });

  createWindow();
  initializeDiscordRPC();

  // Register Shift+F8 global shortcut to toggle/show phone connection panel (QR code) at any time
  globalShortcut.register('Shift+F8', () => {
    if (webDashboardServer) {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      
      const localIP = getLocalIP();
      const dashboardURL = `http://${localIP}:7823`;
      QRCode.toDataURL(dashboardURL, {
        color: { dark: '#e8553a', light: '#07080f' },
        width: 256,
        margin: 2
      }).then(qrDataURL => {
        mainWindow?.webContents.send('show-qr-popup', { qrDataURL, ipAddress: dashboardURL });
      }).catch(e => {
        console.error('[WebDashboard] QR generation failed on Shift+F8 shortcut:', e);
      });
    }
  });

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
function getInstanceDirectory(version?: string, loaderType?: string, activeProfileId?: string | null): string {
  const root = settings.gameDir || defaultGameDir;

  const resolvedProfileId = activeProfileId !== undefined ? activeProfileId : settings.activeProfileId;

  // Route to the active isolated custom profile's directory if one is set active
  if (resolvedProfileId) {
    const profileDir = path.join(root, 'profiles', resolvedProfileId);
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
ipcMain.handle('open-folder', (_event, { type, version, loaderType, activeProfileId }) => {
  const instanceDir = getInstanceDirectory(version, loaderType, activeProfileId);
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
ipcMain.handle('get-mods-and-packs', (_event, { version, loaderType, activeProfileId }) => {
  const instanceDir = getInstanceDirectory(version, loaderType, activeProfileId);
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
ipcMain.handle('delete-mod-or-pack', (_event, { fileName, type, version, loaderType, activeProfileId }) => {
  const instanceDir = getInstanceDirectory(version, loaderType, activeProfileId);
  const filePath = path.join(instanceDir, type, fileName);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return { success: true };
  }
  return { success: false, error: 'File not found' };
});

// Install Dropped Jar or Zip File
ipcMain.handle('install-mod-or-pack', (_event, { filePath, version, loaderType, activeProfileId }) => {
  const instanceDir = getInstanceDirectory(version, loaderType, activeProfileId);
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

    // ---- FPS Parsing for Web Dashboard ----
    // Minecraft logs FPS in title bar format: "X fps"
    const fpsMatch = e.match(/(\d+)\s*fps/i);
    if (fpsMatch) {
      currentFPS = parseInt(fpsMatch[1], 10);
    }

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

  // ---- Borderless Fullscreen enforcement ----
  if (settings.borderlessFullscreen !== false) {
    if (type === 'fabric') {
      // For Fabric: install the dedicated Borderless Fullscreen mod from Modrinth
      await ensureBorderlessFabricMod(instanceDir, version);
    } else {
      // For Vanilla & Forge: options.txt manipulation + JVM arg fallback
      await ensureBorderlessMode(instanceDir, version, type);
    }
  }

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
  gameStartTime = sessionStart;  // Web Dashboard timer reference
  currentFPS = 0;
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
      // Stop web dashboard server when game closes
      stopWebDashboard();
      gameStartTime = null;
      currentFPS = 0;
    });

    launcher.launch(launchOptions);

    // ---- Start Web Dashboard if enabled ----
    if (settings.webDashboardEnabled !== false) {
      startWebDashboard().catch((e) => {
        console.error('[WebDashboard] Failed to start:', e.message);
      });
    }

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

// Download and Install Modrinth Modpack (.mrpack)
ipcMain.handle('download-modpack', async (_event, { profileId, downloadUrl }) => {
  if (!mainWindow) return { success: false, error: 'Main window not available' };
  
  try {
    mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 5, message: 'Mod paketi arşivi indiriliyor...' });
    
    // Construct the destination profiles directory
    const root = settings.gameDir || defaultGameDir;
    const profileDir = path.join(root, 'profiles', profileId);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    
    // Download the .mrpack file as a buffer
    const mrpackRes = await fetch(downloadUrl);
    if (!mrpackRes.ok) {
      throw new Error(`Modpack dosyası indirilemedi (HTTP ${mrpackRes.status})`);
    }
    const arrayBuffer = await mrpackRes.arrayBuffer();
    const mrpackBuffer = Buffer.from(arrayBuffer);
    
    mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 15, message: 'Mod paketi arşivi açılıyor...' });
    
    // Load ZIP
    const zip = new AdmZip(mrpackBuffer);
    const indexEntry = zip.getEntry('modrinth.index.json');
    if (!indexEntry) {
      throw new Error('Geçersiz Modrinth paketi: modrinth.index.json bulunamadı.');
    }
    
    const indexJson = JSON.parse(indexEntry.getData().toString('utf8'));
    
    // 1. Resolve loader and Minecraft versions
    const deps = indexJson.dependencies || {};
    const minecraftVersion = deps.minecraft || '1.20.1';
    let loaderType: 'fabric' | 'forge' | 'vanilla' = 'vanilla';
    if (deps['fabric-loader']) {
      loaderType = 'fabric';
    } else if (deps['forge']) {
      loaderType = 'forge';
    }
    
    mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 20, message: 'Özel ayarlar ve dosyalar çıkarılıyor...' });
    
    // 2. Extract overrides & client-overrides
    const entries = zip.getEntries();
    for (const entry of entries) {
      if (entry.entryName.startsWith('overrides/')) {
        const relativePath = entry.entryName.substring('overrides/'.length);
        if (relativePath) {
          const destPath = path.join(profileDir, relativePath);
          if (entry.isDirectory) {
            fs.mkdirSync(destPath, { recursive: true });
          } else {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, entry.getData());
          }
        }
      } else if (entry.entryName.startsWith('client-overrides/')) {
        const relativePath = entry.entryName.substring('client-overrides/'.length);
        if (relativePath) {
          const destPath = path.join(profileDir, relativePath);
          if (entry.isDirectory) {
            fs.mkdirSync(destPath, { recursive: true });
          } else {
            fs.mkdirSync(path.dirname(destPath), { recursive: true });
            fs.writeFileSync(destPath, entry.getData());
          }
        }
      }
    }
    
    // 3. Download mod files
    const files = indexJson.files || [];
    const totalFiles = files.length;
    let completedFiles = 0;
    
    if (totalFiles > 0) {
      // Chunked downloader (5 concurrent streams)
      const limit = 5;
      for (let i = 0; i < files.length; i += limit) {
        const chunk = files.slice(i, i + limit);
        await Promise.all(chunk.map(async (file: any) => {
          const fileDest = path.join(profileDir, file.path);
          fs.mkdirSync(path.dirname(fileDest), { recursive: true });
          
          const fileUrl = file.downloads[0];
          if (!fileUrl) return;
          
          let success = false;
          let retries = 3;
          while (!success && retries > 0) {
            try {
              const fileRes = await fetch(fileUrl);
              if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
              const fBuffer = await fileRes.arrayBuffer();
              fs.writeFileSync(fileDest, Buffer.from(fBuffer));
              success = true;
            } catch (err) {
              retries--;
              if (retries === 0) throw new Error(`Mod dosyası indirilemedi: ${file.path}. Detay: ${(err as any).message}`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s before retry
            }
          }
          
          completedFiles++;
          const percent = Math.round(20 + (completedFiles / totalFiles) * 75); // 20% to 95%
          mainWindow?.webContents.send('install-progress', {
            state: 'downloading',
            percent,
            message: `Modlar indiriliyor: ${completedFiles}/${totalFiles} dosya...`
          });
        }));
      }
    }
    
    mainWindow?.webContents.send('install-progress', {
      state: 'downloading',
      percent: 98,
      message: 'Mod yükleyici altyapısı hazırlanıyor...'
    });
    
    return {
      success: true,
      minecraftVersion,
      loaderType
    };
  } catch (err: any) {
    console.error('Modpack download failed:', err);
    mainWindow?.webContents.send('install-progress', {
      state: 'error',
      message: `Mod paketi kurulum hatası: ${err.message}`
    });
    return {
      success: false,
      minecraftVersion: '1.20.1',
      loaderType: 'vanilla',
      error: err.message
    };
  }
});

// Download individual Mod, Resource Pack, or Shader Pack
ipcMain.handle('download-mod-or-pack', async (_event, { downloadUrl, fileName, projectType, version, loaderType }) => {
  if (!mainWindow) return { success: false, error: 'Main window not available' };
  
  try {
    mainWindow.webContents.send('install-progress', { state: 'downloading', percent: 10, message: `${fileName} indiriliyor...` });
    
    const instanceDir = getInstanceDirectory(version, loaderType);
    
    let type: 'mods' | 'resourcepacks' | 'shaderpacks' | null = null;
    if (projectType === 'mod') {
      type = 'mods';
    } else if (projectType === 'resourcepack') {
      type = 'resourcepacks';
    } else if (projectType === 'shader') {
      type = 'shaderpacks';
    } else {
      // Fallback detection based on filename extension
      const extension = path.extname(fileName).toLowerCase();
      if (extension === '.jar') {
        type = 'mods';
      } else {
        type = 'resourcepacks';
      }
    }
    
    const targetDir = path.join(instanceDir, type);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const destPath = path.join(targetDir, fileName);
    
    // Stream Download
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const buffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(buffer));
    
    mainWindow.webContents.send('install-progress', { state: 'completed', percent: 100, message: `${fileName} başarıyla kuruldu!` });
    
    return { success: true };
  } catch (err: any) {
    console.error('Download mod or pack failed:', err);
    mainWindow.webContents.send('install-progress', { state: 'error', message: `Kurulum hatası: ${err.message}` });
    return { success: false, error: err.message };
  }
});

// Fetch Screenshots taken in-game
ipcMain.handle('get-screenshots', async (_event, { activeProfileId, version, loaderType }) => {
  const root = settings.gameDir || defaultGameDir;
  const screenshots: { path: string; name: string; created: number; profileName: string }[] = [];

  const scanDir = (dirPath: string, profileName: string) => {
    if (fs.existsSync(dirPath)) {
      try {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);
            screenshots.push({
              path: filePath,
              name: file,
              created: stat.mtimeMs,
              profileName
            });
          }
        }
      } catch (e) {
        console.error(`Failed to scan screenshots in ${dirPath}:`, e);
      }
    }
  };

  if (activeProfileId === 'all') {
    // Scan root screenshots
    scanDir(path.join(root, 'screenshots'), 'Genel (Vanilla)');
    
    // Scan all isolated profile folders
    const profilesDir = path.join(root, 'profiles');
    if (fs.existsSync(profilesDir)) {
      try {
        const dirs = fs.readdirSync(profilesDir);
        for (const d of dirs) {
          const profilePath = path.join(profilesDir, d);
          if (fs.statSync(profilePath).isDirectory()) {
            const profObj = (settings.profiles || []).find((p: any) => p.id === d);
            const name = profObj ? profObj.name : d;
            scanDir(path.join(profilePath, 'screenshots'), name);
          }
        }
      } catch (e) {}
    }
    
    // Scan all isolated instances folders
    const instancesDir = path.join(root, 'instances');
    if (fs.existsSync(instancesDir)) {
      try {
        const dirs = fs.readdirSync(instancesDir);
        for (const d of dirs) {
          const instancePath = path.join(instancesDir, d);
          if (fs.statSync(instancePath).isDirectory()) {
            scanDir(path.join(instancePath, 'screenshots'), `İnstance: ${d}`);
          }
        }
      } catch (e) {}
    }
  } else {
    // Scan specific directory
    let targetDir = root;
    let label = 'Genel (Vanilla)';
    
    if (activeProfileId) {
      targetDir = path.join(root, 'profiles', activeProfileId);
      const profObj = (settings.profiles || []).find((p: any) => p.id === activeProfileId);
      label = profObj ? profObj.name : 'Özel Profil';
    } else if (version && loaderType) {
      targetDir = path.join(root, 'instances', `${loaderType}-${version}`);
      label = `${loaderType}-${version}`;
    }
    
    scanDir(path.join(targetDir, 'screenshots'), label);
  }

  // Sort by created time descending (newest first)
  return screenshots.sort((a, b) => b.created - a.created);
});

// Delete Screenshot File
ipcMain.handle('delete-screenshot', async (_event, { filePath }) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (err: any) {
    console.error('Failed to delete screenshot:', err);
    return { success: false, error: err.message };
  }
});

// ==========================================
// MEDIA CONTROL IPC (from Renderer / QrPopup)
// ==========================================
ipcMain.handle('media-control', (_event, action: 'play' | 'pause' | 'next' | 'prev') => {
  handleMediaCommand(action);
  return { success: true };
});

// Cleanup on app quit
app.on('before-quit', () => {
  stopWebDashboard();
  globalShortcut.unregisterAll();
});

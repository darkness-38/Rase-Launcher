import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';

declare const __dirname: string;

let mainWindow: BrowserWindow | null = null;

// Default installation directory: AppData/Local/RaseLauncher
const defaultInstallDir = path.join(
  process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'),
  'RaseLauncher'
);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 580,
    height: 400,
    frame: false,
    resizable: false,
    backgroundColor: '#07080f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Load from dev server or production index.html
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
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
// IPC HANDLERS FOR INSTALLER LOGIC
// ==========================================

// Close window
ipcMain.handle('close-window', () => {
  app.quit();
});

// Minimize window
ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

// Get default installation path and mode info
ipcMain.handle('get-installer-info', async () => {
  // Check if offline bundle is present in resources/app.asar.unpacked/bundle or adjacent bundle/
  const appPath = app.getAppPath();
  const bundledZipPaths = [
    path.join(appPath, 'bundle', 'rase-launcher.zip'),
    path.join(path.dirname(appPath), 'bundle', 'rase-launcher.zip'),
    path.join(app.getPath('userData'), 'bundle', 'rase-launcher.zip'),
    path.join(__dirname, '..', 'bundle', 'rase-launcher.zip')
  ];

  let offlineZipPath: string | null = null;
  for (const zPath of bundledZipPaths) {
    if (fs.existsSync(zPath)) {
      offlineZipPath = zPath;
      break;
    }
  }

  return {
    defaultPath: defaultInstallDir,
    isOffline: offlineZipPath !== null,
    offlinePath: offlineZipPath
  };
});

// Custom Directory Picker
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

// Helper to create Windows shortcut using visual basic script (VBS)
function createWindowsShortcut(targetExe: string, linkPath: string, workingDir: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const tempVbsPath = path.join(app.getPath('temp'), `create-shortcut-${Date.now()}.vbs`);
      const vbsContent = [
        'Set oWS = WScript.CreateObject("WScript.Shell")',
        `sLinkFile = "${linkPath.replace(/\\/g, '\\\\')}"`,
        'Set oLink = oWS.CreateShortcut(sLinkFile)',
        `oLink.TargetPath = "${targetExe.replace(/\\/g, '\\\\')}"`,
        `oLink.WorkingDirectory = "${workingDir.replace(/\\/g, '\\\\')}"`,
        'oLink.Save'
      ].join('\r\n');

      fs.writeFileSync(tempVbsPath, vbsContent, 'utf-8');

      exec(`cscript //NoLogo "${tempVbsPath}"`, (error) => {
        try {
          fs.unlinkSync(tempVbsPath);
        } catch (_) {}
        if (error) {
          console.error('Failed to create shortcut:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    } catch (err) {
      console.error('Error creating shortcut VBS:', err);
      resolve(false);
    }
  });
}

// Perform Installation IPC
ipcMain.handle('start-install', async (_event, { installDir, createDesktop, createStartMenu, isOffline, offlinePath }) => {
  try {
    // 1. Ensure target directory exists
    if (!fs.existsSync(installDir)) {
      fs.mkdirSync(installDir, { recursive: true });
    }

    const zipTempPath = path.join(app.getPath('temp'), 'rase-launcher-install.zip');

    if (isOffline && offlinePath && fs.existsSync(offlinePath)) {
      // Offline mode: Copy bundled zip to temp path
      mainWindow?.webContents.send('install-progress', { state: 'copying', percent: 10, details: 'Offline paket hazırlanıyor...' });
      fs.copyFileSync(offlinePath, zipTempPath);
    } else {
      // Online mode: Download latest Rase Launcher release package
      mainWindow?.webContents.send('install-progress', { state: 'downloading', percent: 5, details: 'Sunucuyla bağlantı kuruluyor...' });
      
      const downloadUrl = 'https://github.com/darkness-38/Rase-Launcher/releases/latest/download/Rase-Launcher-win32-x64.zip';
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Download failed with status: ${response.status}`);
      }

      const contentLength = parseInt(response.headers.get('content-length') || '0');
      const chunks: Buffer[] = [];
      let downloaded = 0;

      const reader = response.body!.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
        downloaded += value.length;

        if (contentLength > 0 && mainWindow) {
          const pct = Math.round((downloaded / contentLength) * 100);
          mainWindow.webContents.send('install-progress', {
            state: 'downloading',
            percent: Math.round(pct * 0.8), // scale download to represent 80% of process
            details: `Rase Launcher indiriliyor: ${Math.round(downloaded / 1024 / 1024)}MB / ${Math.round(contentLength / 1024 / 1024)}MB`
          });
        }
      }

      fs.writeFileSync(zipTempPath, Buffer.concat(chunks));
    }

    // 2. Extract files
    mainWindow?.webContents.send('install-progress', { state: 'extracting', percent: 80, details: 'Dosyalar ayıklanıyor...' });
    
    try {
      const zip = new AdmZip(zipTempPath);
      zip.extractAllTo(installDir, true);
    } catch (zipErr: any) {
      throw new Error(`ZIP Extraction failed: ${zipErr.message}`);
    } finally {
      // Clean up temporary download file
      try {
        if (fs.existsSync(zipTempPath)) {
          fs.unlinkSync(zipTempPath);
        }
      } catch (_) {}
    }

    // 3. Create Shortcuts (Only applicable on Windows platform)
    mainWindow?.webContents.send('install-progress', { state: 'shortcuts', percent: 90, details: 'Kısayollar oluşturuluyor...' });
    
    const targetExe = path.join(installDir, 'Rase Launcher.exe');
    if (process.platform === 'win32') {
      if (createDesktop) {
        const desktopPath = path.join(app.getPath('desktop'), 'Rase Launcher.lnk');
        await createWindowsShortcut(targetExe, desktopPath, installDir);
      }
      if (createStartMenu) {
        const startMenuDir = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
        if (fs.existsSync(startMenuDir)) {
          const startMenuPath = path.join(startMenuDir, 'Rase Launcher.lnk');
          await createWindowsShortcut(targetExe, startMenuPath, installDir);
        }
      }
    }

    mainWindow?.webContents.send('install-progress', { state: 'completed', percent: 100, details: 'Kurulum başarıyla tamamlandı!' });
    return { success: true };
  } catch (err: any) {
    console.error('Setup failed:', err);
    mainWindow?.webContents.send('install-progress', { state: 'error', percent: 0, details: `Hata: ${err.message}` });
    return { success: false, error: err.message };
  }
});

// Launch Game on Complete
ipcMain.handle('launch-launcher', (_event, { installDir }) => {
  const targetExe = path.join(installDir, 'Rase Launcher.exe');
  if (fs.existsSync(targetExe)) {
    exec(`"${targetExe}"`, { cwd: installDir });
    setTimeout(() => {
      app.quit();
    }, 1000);
    return { success: true };
  }
  return { success: false, error: 'Launcher executable not found' };
});

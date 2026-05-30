// Custom Type definition for the Preload API exposed on window
interface ElectronInstaller {
  closeWindow: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  getInstallerInfo: () => Promise<{ defaultPath: string; isOffline: boolean; offlinePath: string | null }>;
  selectDirectory: () => Promise<string | null>;
  startInstall: (options: {
    installDir: string;
    createDesktop: boolean;
    createStartMenu: boolean;
    isOffline: boolean;
    offlinePath: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
  launchLauncher: (options: { installDir: string }) => Promise<{ success: boolean; error?: string }>;
  onInstallProgress: (callback: (progress: { state: string; percent: number; details: string }) => void) => () => void;
}

declare global {
  interface Window {
    electronInstaller: ElectronInstaller;
  }
}

// UI State Elements
const screenWelcome = document.getElementById('screen-welcome') as HTMLDivElement;
const screenProgress = document.getElementById('screen-progress') as HTMLDivElement;
const screenSuccess = document.getElementById('screen-success') as HTMLDivElement;

const advancedPanel = document.getElementById('advanced-panel') as HTMLDivElement;
const inputInstallDir = document.getElementById('input-install-dir') as HTMLInputElement;
const modeText = document.getElementById('mode-text') as HTMLParagraphElement;

// Checkboxes
const chkDesktop = document.getElementById('chk-desktop') as HTMLInputElement;
const chkStartmenu = document.getElementById('chk-startmenu') as HTMLInputElement;

// Buttons
const btnMinimize = document.getElementById('btn-minimize') as HTMLButtonElement;
const btnClose = document.getElementById('btn-close') as HTMLButtonElement;
const btnToggleAdvanced = document.getElementById('btn-toggle-advanced') as HTMLButtonElement;
const btnBrowse = document.getElementById('btn-browse') as HTMLButtonElement;
const btnQuickInstall = document.getElementById('btn-quick-install') as HTMLButtonElement;
const btnStartInstallAdvanced = document.getElementById('btn-start-install-advanced') as HTMLButtonElement;
const btnLaunch = document.getElementById('btn-launch') as HTMLButtonElement;
const btnExit = document.getElementById('btn-exit') as HTMLButtonElement;

// Progress UI
const progressBarFill = document.getElementById('progress-bar-fill') as HTMLDivElement;
const progressPercentText = document.getElementById('progress-percent-text') as HTMLSpanElement;
const progressDetails = document.getElementById('progress-details') as HTMLParagraphElement;
const progressTitle = document.getElementById('progress-title') as HTMLHeadingElement;

// Confetti Canvas
const confettiCanvas = document.getElementById('confetti-canvas') as HTMLCanvasElement;

// Runtime State Variables
let targetInstallDir = '';
let isOfflineMode = false;
let offlineBundlePath: string | null = null;
let animationFrameId: number | null = null;

// Initialize setup state on startup
async function init() {
  if (!window.electronInstaller) {
    console.warn('System API not available (Browser mode)');
    inputInstallDir.value = 'C:\\Program Files\\RaseLauncher';
    return;
  }

  // Hook Titlebar controls
  btnMinimize.addEventListener('click', () => window.electronInstaller.minimizeWindow());
  btnClose.addEventListener('click', () => window.electronInstaller.closeWindow());

  // Get configuration info from main process
  try {
    const info = await window.electronInstaller.getInstallerInfo();
    targetInstallDir = info.defaultPath;
    inputInstallDir.value = targetInstallDir;
    isOfflineMode = info.isOffline;
    offlineBundlePath = info.offlinePath;

    if (isOfflineMode) {
      modeText.innerHTML = '<i class="ti ti-wifi-off" style="color:var(--color-terracotta)"></i> Çevrimdışı kurulum algılandı. İnternetsiz anında kurulabilir.';
    } else {
      modeText.innerHTML = '<i class="ti ti-wifi" style="color:var(--color-success)"></i> Çevrimiçi yükleyici. En güncel launcher paketleri otomatik indirilecek.';
    }
  } catch (err) {
    console.error('Failed to get installer info:', err);
  }

  // Advanced toggles
  btnToggleAdvanced.addEventListener('click', () => {
    const isVisible = advancedPanel.style.display === 'flex';
    advancedPanel.style.display = isVisible ? 'none' : 'flex';
  });

  // Browse button folder selector
  btnBrowse.addEventListener('click', async () => {
    const chosen = await window.electronInstaller.selectDirectory();
    if (chosen) {
      targetInstallDir = chosen;
      inputInstallDir.value = targetInstallDir;
    }
  });

  // Start installations
  btnQuickInstall.addEventListener('click', () => triggerInstallation(true));
  btnStartInstallAdvanced.addEventListener('click', () => triggerInstallation(false));

  // Exit & Launch triggers
  btnExit.addEventListener('click', () => window.electronInstaller.closeWindow());
  btnLaunch.addEventListener('click', () => {
    window.electronInstaller.launchLauncher({ installDir: targetInstallDir });
  });
}

// Trigger installation workflow
async function triggerInstallation(isQuick: boolean) {
  // Screen transition: Welcome -> Progress
  screenWelcome.classList.remove('active');
  screenProgress.classList.add('active');

  const createDesktop = isQuick ? true : chkDesktop.checked;
  const createStartMenu = isQuick ? true : chkStartmenu.checked;

  // Listen to IPC install-progress updates
  const unsubscribe = window.electronInstaller.onInstallProgress((data) => {
    progressBarFill.style.width = `${data.percent}%`;
    progressPercentText.textContent = String(data.percent);
    progressDetails.textContent = data.details;

    if (data.state === 'error') {
      progressTitle.textContent = 'Kurulum Hatası!';
      progressTitle.style.color = '#dc2626';
    }
  });

  // Invoke main install execution
  const res = await window.electronInstaller.startInstall({
    installDir: targetInstallDir,
    createDesktop,
    createStartMenu,
    isOffline: isOfflineMode,
    offlinePath: offlineBundlePath
  });

  unsubscribe(); // clean listener

  if (res.success) {
    // Screen transition: Progress -> Success
    screenProgress.classList.remove('active');
    screenSuccess.classList.add('active');
    
    // Launch dynamic canvas confetti particles!
    startConfetti();
  } else {
    // Keep error visible or show dialog
    alert(`Kurulum başarısız oldu: ${res.error}`);
  }
}

// ==========================================
// HIGH PERFORMANCE CANVAS CONFETTI ENGINE
// ==========================================
interface Particle {
  x: number;
  y: number;
  r: number;
  d: number;
  color: string;
  tilt: number;
  tiltAngleIncremental: number;
  tiltAngle: number;
}

function startConfetti() {
  const ctx = confettiCanvas.getContext('2d');
  if (!ctx) return;

  confettiCanvas.width = screenSuccess.clientWidth;
  confettiCanvas.height = screenSuccess.clientHeight;

  const maxParticles = 120;
  const colors = ['#e8553a', '#d44530', '#f5f0e8', '#8a8990', '#5aa85c', '#e8a84a'];
  const particles: Particle[] = [];

  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 4 + 2,
      d: Math.random() * maxParticles,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  function draw() {
    ctx!.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];
      ctx!.beginPath();
      ctx!.lineWidth = p.r * 2;
      ctx!.strokeStyle = p.color;
      ctx!.moveTo(p.x + p.tilt + p.r, p.y);
      ctx!.lineTo(p.x + p.tilt, p.y + p.tilt + p.r);
      ctx!.stroke();
    }

    update();
  }

  function update() {
    let remaining = 0;
    for (let i = 0; i < maxParticles; i++) {
      const p = particles[i];

      p.tiltAngle += p.tiltAngleIncremental;
      p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
      p.tilt = Math.sin(p.tiltAngle - i / 3) * 15;

      if (p.y <= confettiCanvas.height) {
        remaining++;
      }

      // Loop particles back to top if desired, or let them disappear
      if (p.y > confettiCanvas.height) {
        p.x = Math.random() * confettiCanvas.width;
        p.y = -10;
        p.tilt = Math.random() * 10 - 5;
      }
    }

    if (remaining > 0) {
      animationFrameId = requestAnimationFrame(draw);
    }
  }

  draw();
}

// Clean up animations on exit
window.addEventListener('unload', () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
});

// Run Init
document.addEventListener('DOMContentLoaded', init);

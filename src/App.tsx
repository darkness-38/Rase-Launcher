import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { TitleBar } from './components/TitleBar';
import { VersionDropdown } from './components/VersionDropdown';
import { ModsTab } from './components/ModsTab';
import { SettingsTab } from './components/SettingsTab';

export default function App() {
  // Navigation & User State
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'play' | 'mods' | 'settings'>('play');
  const [savedUsernames, setSavedUsernames] = useState<string[]>([]);
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [newAccountInput, setNewAccountInput] = useState('');

  // Minecraft Launching & Downloading States
  const [selectedVersion, setSelectedVersion] = useState('1.20.4');
  const [selectedLoader, setSelectedLoader] = useState<'vanilla' | 'fabric' | 'forge'>('vanilla');
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [installedVersions, setInstalledVersions] = useState<string[]>([]);
  const [launchState, setLaunchState] = useState<'idle' | 'installing' | 'preparing' | 'launched' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  
  // Custom Log Drawer States
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Dynamic Statistics States
  const [modsCount, setModsCount] = useState(0);
  const [packsCount, setPacksCount] = useState(0);
  const [shadersCount, setShadersCount] = useState(0);

  // Real play statistics
  const [totalPlayHours, setTotalPlayHours] = useState(0);
  const [lastPlayedVersion, setLastPlayedVersion] = useState<string | null>(null);
  const [lastPlayedAt, setLastPlayedAt] = useState<number | null>(null);


  // Sync initial settings and version info
  const loadSystemInfo = async () => {
    if (!window.electronAPI) {
      console.warn('System API not available (Browser mode)');
      setAvailableVersions(['1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9', '1.7.10']);
      setInstalledVersions(['1.21.1', 'fabric-loader-0.15.11-1.20.4']);
      return;
    }
    try {
      const settings = await window.electronAPI.getSettings();
      if (settings.lastUsername) {
        setUsername(settings.lastUsername);
        setIsLoggedIn(true); // Automatically log in if there's a saved session
      }
      if (settings.savedUsernames) {
        setSavedUsernames(settings.savedUsernames);
      } else if (settings.lastUsername) {
        setSavedUsernames([settings.lastUsername]);
      }
      // RAM is read directly from settings at launch time — no need to track in state
      
      const available = await window.electronAPI.getAvailableVersions();
      setAvailableVersions(available);
      if (available.length > 0 && !available.includes(selectedVersion)) {
        setSelectedVersion(available[0]);
      }

      const installed = await window.electronAPI.getInstalledVersions();
      setInstalledVersions(installed);

      // Load real play statistics
      try {
        const stats = await window.electronAPI.getStats();
        const hours = Math.floor((stats.totalPlayTimeMs || 0) / 3600000);
        setTotalPlayHours(hours);
        setLastPlayedVersion(stats.lastPlayedVersion);
        setLastPlayedAt(stats.lastPlayedAt);
      } catch (_) {}
    } catch (e) {
      console.error('System API connection failed.', e);
    }
  };

  // Fetch dynamic counts for statistics card
  const fetchStatsCounts = async () => {
    if (!window.electronAPI) return;
    try {
      const data = await window.electronAPI.getModsAndPacks(selectedVersion, selectedLoader);
      setModsCount((data.mods || []).length);
      setPacksCount((data.packs || []).length);
      setShadersCount((data.shaders || []).length);
    } catch (e) {
      console.error('Failed to read stats counts', e);
    }
  };

  useEffect(() => {
    loadSystemInfo();
  }, []);

  useEffect(() => {
    fetchStatsCounts();
  }, [selectedVersion, selectedLoader, activeTab]);

  // Listen to IPC event streams from Electron
  useEffect(() => {
    if (!window.electronAPI) return;

    // 1. Launch Progress Listener (Assets/libraries downloads + vanilla jar streaming)
    const unsubProgress = window.electronAPI.onLaunchProgress((data) => {
      if (data.total > 0) {
        const percent = Math.round((data.current / data.total) * 100);
        setProgress(percent);
      }
      // Show clean task label: e.g. "DOWNLOAD: 1.21.1.jar (23/25 MB)"
      const taskLabel = data.task.length > 40 ? '...' + data.task.slice(-37) : data.task;
      setStatusMessage(`${data.type.toUpperCase()}: ${taskLabel} (${data.current}/${data.total})`);
    });

    // 2. Launch Status Listener
    const unsubStatus = window.electronAPI.onLaunchStatus((status) => {
      if (status.state === 'preparing') {
        setLaunchState('preparing');
        // Only reset progress if we haven't started downloading yet
        setProgress((prev) => (prev > 0 ? prev : 0));
        setStatusMessage(status.details || 'Dosyalar kontrol ediliyor...');
      } else if (status.state === 'launched') {
        setLaunchState('launched');
        setProgress(100);
        setStatusMessage('Oyun başarıyla başlatıldı!');
        
        // Explode beautiful reward confetti!
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });

        // Refresh installed versions
        loadSystemInfo();

        // Reset to idle after a brief timeout
        setTimeout(() => {
          setLaunchState('idle');
          setProgress(0);
          setStatusMessage('');
        }, 5000);
      } else if (status.state === 'error') {
        setLaunchState('error');
        setErrorDetails(status.details || 'Bilinmeyen bir başlatma hatası oluştu.');
      } else if (status.state === 'closed') {
        setLaunchState('idle');
        setProgress(0);
        setStatusMessage('');
        // Refresh play stats so hours + last played update
        if (window.electronAPI) {
          window.electronAPI.getStats().then((stats) => {
            setTotalPlayHours(Math.floor((stats.totalPlayTimeMs || 0) / 3600000));
            setLastPlayedVersion(stats.lastPlayedVersion);
            setLastPlayedAt(stats.lastPlayedAt);
          }).catch(() => {});
        }
      }
    });

    // 3. Install Loader (Fabric/Forge) Progress Listener
    const unsubInstall = window.electronAPI.onInstallProgress((data) => {
      if (data.state === 'downloading' || data.state === 'installing') {
        setLaunchState('installing');
        setProgress(data.percent);
        setStatusMessage(data.message);
      } else if (data.state === 'completed') {
        setStatusMessage(data.message);
        setProgress(100);
        // Refresh installed versions
        window.electronAPI.getInstalledVersions().then(setInstalledVersions);
        setTimeout(() => {
          setLaunchState('idle');
          setProgress(0);
        }, 2000);
      } else if (data.state === 'error') {
        setLaunchState('error');
        setErrorDetails(data.message || 'Yükleyici çalışırken hata verdi.');
      }
    });

    // 4. Console Log Listener
    const unsubLog = window.electronAPI.onLaunchLog((logLine) => {
      setLogs((prev) => [...prev.slice(-300), logLine]); // Cache last 300 lines
    });

    return () => {
      unsubProgress();
      unsubStatus();
      unsubInstall();
      unsubLog();
    };
  }, [selectedVersion, selectedLoader]);

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Check if active selection is installed
  const isSelectedInstalled = () => {
    if (selectedLoader === 'vanilla') {
      return installedVersions.includes(selectedVersion);
    }
    const searchKey = selectedLoader === 'fabric' ? 'fabric' : 'forge';
    return installedVersions.some(
      (v) => v.toLowerCase().includes(selectedVersion) && v.toLowerCase().includes(searchKey)
    );
  };

  // Launch or Install Button Trigger
  const handleLaunchOrInstall = async () => {
    if (!username.trim()) {
      alert('Lütfen geçerli bir kullanıcı adı girin.');
      return;
    }

    if (launchState !== 'idle') return; // Debounce triggers
    setLogs([]); // Clear previous log buffer

    try {
      const isInstalled = isSelectedInstalled();

      if (!isInstalled) {
        if (selectedLoader === 'vanilla') {
          // Direct game launch since MCLC will download all vanilla assets and launch
          setLaunchState('preparing');
          setProgress(0);
          setStatusMessage('Oyun dosyaları indiriliyor ve kuruluyor...');
          
          if (window.electronAPI) {
            const settings = await window.electronAPI.getSettings();
            await window.electronAPI.launchGame(username, selectedVersion, selectedLoader, {
              ram: settings.ram,
              javaPath: settings.javaPath
            });
          } else {
            // Mock download in browser mode
            let pct = 0;
            const interval = setInterval(() => {
              pct += 10;
              setProgress(pct);
              setStatusMessage(`İndiriliyor: minecraft-${selectedVersion}.jar (${pct}%)`);
              if (pct >= 100) {
                clearInterval(interval);
                setLaunchState('launched');
                confetti({
                  particleCount: 150,
                  spread: 80,
                  origin: { y: 0.6 }
                });
                setInstalledVersions((prev) => [...prev, selectedVersion]);
                setTimeout(() => {
                  setLaunchState('idle');
                  setProgress(0);
                  setStatusMessage('');
                }, 3000);
              }
            }, 200);
          }
        } else {
          // Execute loader auto-installation first
          setLaunchState('installing');
          setProgress(5);
          setStatusMessage('Kurulum başlatılıyor...');
          if (window.electronAPI) {
            await window.electronAPI.installLoader(selectedVersion, selectedLoader as 'fabric' | 'forge');
          } else {
            // Mock installation in browser mode
            let pct = 0;
            const interval = setInterval(() => {
              pct += 15;
              if (pct > 100) pct = 100;
              setProgress(pct);
              setStatusMessage(`${selectedLoader.toUpperCase()} kuruluyor... ${pct}%`);
              if (pct >= 100) {
                clearInterval(interval);
                const searchKey = selectedLoader === 'fabric' ? 'fabric' : 'forge';
                setInstalledVersions((prev) => [...prev, `${selectedVersion}-${searchKey}`]);
                setLaunchState('idle');
                setProgress(0);
                setStatusMessage('');
              }
            }, 300);
          }
        }
      } else {
        // Direct game launch
        setLaunchState('preparing');
        setProgress(0);
        setStatusMessage('Oyun dosyaları taranıyor...');
        
        if (window.electronAPI) {
          const settings = await window.electronAPI.getSettings();
          await window.electronAPI.launchGame(username, selectedVersion, selectedLoader, {
            ram: settings.ram,
            javaPath: settings.javaPath
          });
        } else {
          // Mock launch in browser mode
          setTimeout(() => {
            setLaunchState('launched');
            confetti({
              particleCount: 150,
              spread: 80,
              origin: { y: 0.6 }
            });
            setTimeout(() => {
              setLaunchState('idle');
              setProgress(0);
              setStatusMessage('');
            }, 3000);
          }, 2000);
        }
      }
    } catch (e: any) {
      setLaunchState('error');
      setErrorDetails(e.message || 'Bilinmeyen bir hata meydana geldi.');
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim();
    if (cleanUsername) {
      if (window.electronAPI) {
        // Save last username to config and add to list
        window.electronAPI.getSettings().then((current) => {
          const updatedUsernames = Array.from(new Set([...(current.savedUsernames || []), cleanUsername]));
          window.electronAPI.saveSettings({
            ...current,
            lastUsername: cleanUsername,
            savedUsernames: updatedUsernames
          });
          setSavedUsernames(updatedUsernames);
        });
      } else {
        setSavedUsernames((prev) => Array.from(new Set([...prev, cleanUsername])));
      }
      setIsLoggedIn(true);
    }
  };

  const handleSwitchAccount = async (targetUsername: string) => {
    if (window.electronAPI) {
      const current = await window.electronAPI.getSettings();
      const updated = {
        ...current,
        lastUsername: targetUsername
      };
      await window.electronAPI.saveSettings(updated);
    }
    setUsername(targetUsername);
    setIsLoggedIn(true);
    setShowAccountSwitcher(false);
  };

  const handleDeleteAccount = async (targetUsername: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering switch
    const newSaved = savedUsernames.filter((u) => u !== targetUsername);
    setSavedUsernames(newSaved);

    if (window.electronAPI) {
      const current = await window.electronAPI.getSettings();
      const nextUsername = username === targetUsername
        ? (newSaved.length > 0 ? newSaved[0] : '')
        : current.lastUsername;

      const updated = {
        ...current,
        lastUsername: nextUsername,
        savedUsernames: newSaved
      };
      await window.electronAPI.saveSettings(updated);

      if (username === targetUsername) {
        if (nextUsername) {
          setUsername(nextUsername);
        } else {
          setUsername('');
          setIsLoggedIn(false);
          setShowAccountSwitcher(false);
        }
      }
    } else {
      if (username === targetUsername) {
        if (newSaved.length > 0) {
          setUsername(newSaved[0]);
        } else {
          setUsername('');
          setIsLoggedIn(false);
          setShowAccountSwitcher(false);
        }
      }
    }
  };

  const handleAddNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newAccountInput.trim();
    if (!cleanName) return;

    if (!/^[a-zA-Z0-9_]+$/.test(cleanName)) {
      alert('Sadece harf, rakam ve alt çizgi kullanabilirsiniz.');
      return;
    }

    if (cleanName.length > 16) {
      alert('Kullanıcı adı en fazla 16 karakter olabilir.');
      return;
    }

    const updatedUsernames = Array.from(new Set([...savedUsernames, cleanName]));
    setSavedUsernames(updatedUsernames);
    setNewAccountInput('');

    if (window.electronAPI) {
      const current = await window.electronAPI.getSettings();
      const updated = {
        ...current,
        lastUsername: cleanName,
        savedUsernames: updatedUsernames
      };
      await window.electronAPI.saveSettings(updated);
    }

    setUsername(cleanName);
    setIsLoggedIn(true);
    setShowAccountSwitcher(false);
  };

  const handleGlobalLogout = async () => {
    setSavedUsernames([]);
    setUsername('');
    setIsLoggedIn(false);
    setShowAccountSwitcher(false);

    if (window.electronAPI) {
      const current = await window.electronAPI.getSettings();
      const updated = {
        ...current,
        lastUsername: '',
        savedUsernames: []
      };
      await window.electronAPI.saveSettings(updated);
    }
  };

  // Localized Date Helper
  const getTurkishDate = () => {
    const date = new Date();
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    const months = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
  };

  // Helper: format last played time
  const formatLastPlayed = (): string => {
    if (!lastPlayedAt) return 'Hiç oynanmadı';
    const diff = Date.now() - lastPlayedAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'az önce';
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} sa önce`;
    return `${days} gün önce`;
  };



  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', userSelect: 'none', backgroundColor: '#f0ece3' }}>
      
      {/* Dynamic Native Divider TitleBar */}
      <TitleBar />

      {/* Content Layer */}
      <div style={{ flex: 1, width: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          
          {/* LOGIN SCREEN */}
          {!isLoggedIn ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="login-wrap"
            >
              <form 
                onSubmit={handleLoginSubmit}
                className="login-card"
              >
                {/* Terracotta Top Ribbon */}
                <div className="login-ribbon"></div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div className="login-logo">
                    <i className="ti ti-sparkles text-[#e8553a]" style={{ fontSize: '22px' }} />
                  </div>
                  <h1 className="login-title">
                    RASE LAUNCHER
                  </h1>
                  <p className="login-subtitle">
                    Offline Minecraft Giriş Paneli
                  </p>
                </div>

                <div className="login-field">
                  <label className="login-label">
                    Kullanıcı Adı
                  </label>
                  <div className="login-input-container">
                    <i className="ti ti-user login-input-icon" style={{ fontSize: '14px' }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      required
                      maxLength={16}
                      pattern="^[a-zA-Z0-9_]+$"
                      title="Sadece harf, rakam ve alt çizgi kullanabilirsiniz."
                      className="login-input"
                    />
                  </div>
                  <p className="login-note">
                    * Microsoft veya Premium doğrulaması yapılmaz. Çevrimdışı (offline) profil oluşturur.
                  </p>
                </div>

                <button
                  type="submit"
                  className="login-btn"
                >
                  <span>Devam Et</span>
                  <i className="ti ti-chevron-right" style={{ fontSize: '14px' }} />
                </button>
              </form>
            </motion.div>
          ) : (
            
            // MAIN DASHBOARD SCREEN (Mockup layout matching '.wrap')
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="wrap"
              style={{ display: 'flex', flexDirection: 'row', height: '100%', flex: 1, overflow: 'hidden', background: '#f0ece3', fontFamily: "'Outfit', sans-serif" }}
            >
              
              {/* Sidebar Navigation (Dark Charcoal `#1c1917`) */}
              <div className="side" style={{ width: '220px', background: '#1c1917', display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%', minHeight: 0 }}>
                  
                  {/* Dashboard Logo */}
                  <div className="side-top">
                    <div className="logo-mark">
                      <i className="ti ti-diamond text-white" style={{ fontSize: '18px' }} />
                    </div>
                    <div className="logo-name">Rase Launcher</div>
                    <div className="logo-ver">v2.4.1-stable</div>
                  </div>

                  {/* Nav Links */}
                  <nav className="side-nav" style={{ flex: 1 }}>
                    <div className="nav-section">
                      Menü
                    </div>

                    {[
                      { id: 'play', name: 'Ana Sayfa', iconClass: 'ti ti-home' },
                      { id: 'mods', name: 'Paketler & Modlar', iconClass: 'ti ti-box' },
                    ].map((tab) => {
                      const isActive = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                          <span className="nav-pip"></span>
                          <i className={tab.iconClass} style={{ fontSize: '15px' }} />
                          <span>{tab.name}</span>
                        </button>
                      );
                    })}

                    <div className="nav-section">
                      Sistem
                    </div>
                    
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                    >
                      <span className="nav-pip"></span>
                      <i className="ti ti-settings" style={{ fontSize: '15px' }} />
                      <span>Ayarlar</span>
                    </button>

                    <button
                      onClick={() => setShowAccountSwitcher(true)}
                      className="nav-item"
                    >
                      <span className="nav-pip"></span>
                      <i className="ti ti-users" style={{ fontSize: '15px' }} />
                      <span>Hesap Değiştir</span>
                    </button>
                  </nav>

                {/* Profile Card & Offline User Row */}
                <div className="side-user">
                  <div className="user-row">
                    {/* Retro Skin head block */}
                    <div className="user-skin">
                      <img 
                        src={`https://crafatar.com/avatars/${username || 'Steve'}?size=30&overlay`} 
                        alt="skin" 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://minotar.net/avatar/${username || 'Steve'}/30`;
                        }}
                      />
                    </div>
                    <div>
                      <div className="user-name" title={username}>
                        {username}
                      </div>
                      <div className="user-status">
                        <span className="user-dot"></span>
                        çevrimiçi
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Main Content Area (Warm Sand `#f0ece3`) */}
              <div className="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%', minHeight: 0, minWidth: 0 }}>
                
                {/* Sand TopBar Header */}
                <div className="topbar">
                  <div className="page-title">
                    {activeTab === 'play' && 'Ana Sayfa'}
                    {activeTab === 'mods' && 'Paketler & Modlar'}
                    {activeTab === 'settings' && 'Ayarlar'}
                  </div>
                  <div className="topbar-right">
                    <div className="chip">{getTurkishDate()}</div>
                  </div>
                </div>

                {/* Sub-Panel Layouts Container */}
                <div className="content">
                  <AnimatePresence mode="wait">
                    
                    {/* TAB 1: PLAY VIEW */}
                    {activeTab === 'play' && (
                      <motion.div
                        key="play-view"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}
                      >
                        {/* Play Card (Retro Charcoal Card) */}
                        <div className="play-card">
                          <div className="play-icon">
                            <i className="ti ti-player-play" style={{ fontSize: '24px', color: '#ffffff' }} />
                          </div>
                          
                          <div className="play-info">
                            <div className="play-label">Son Seçilen Sürüm</div>
                            <div className="play-version">
                              Minecraft {selectedVersion}
                              {selectedLoader === 'fabric' && <span className="fabric-tag">Fabric</span>}
                              {selectedLoader === 'forge' && <span className="fabric-tag" style={{ background: '#3d2b1f', color: '#e88d4a' }}>Forge</span>}
                              {selectedLoader === 'vanilla' && <span className="fabric-tag" style={{ background: '#213523', color: '#5aa85c' }}>Vanilla</span>}
                            </div>
                            <div className="play-sub" style={{ color: '#6b6560' }}>
                              Dilediğin modu veya shaderı yükle, doğrudan başlat.
                            </div>
                          </div>

                          <button 
                            onClick={handleLaunchOrInstall}
                            disabled={launchState !== 'idle'}
                            className="play-btn"
                          >
                            {launchState !== 'idle' ? (
                              <>
                              <i className="animate-spin" style={{ display: 'inline-block' }}>
                                <i className="ti ti-refresh" style={{ fontSize: '16px' }} />
                              </i>
                                <span>Yükleniyor...</span>
                              </>
                            ) : isSelectedInstalled() ? (
                              <>
                                <i className="ti ti-player-play" style={{ fontSize: '16px' }} />
                                <span>Oyna</span>
                              </>
                            ) : (
                              <>
                                <i className="ti ti-refresh" style={{ fontSize: '16px' }} />
                                <span>Kur ve Oyna</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Middle Settings: Version Selection Area inside an Info Card */}
                        <div className="info-card">
                          <div className="card-head" style={{ borderBottom: '1px solid var(--border-sand)', paddingBottom: '10px', marginBottom: '16px' }}>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <i className="ti ti-pulse" style={{ fontSize: '14px', color: 'var(--color-terracotta)' }} />
                              <span>Oyun Hazırlığı</span>
                            </div>
                          </div>

                          <VersionDropdown
                            selectedVersion={selectedVersion}
                            setSelectedVersion={setSelectedVersion}
                            selectedLoader={selectedLoader}
                            setSelectedLoader={setSelectedLoader}
                            availableVersions={availableVersions}
                            installedVersions={installedVersions}
                          />
                        </div>

                        {/* Error Notification Panel */}
                        {launchState === 'error' && (
                          <div className="info-card" style={{ borderColor: '#f8b4b4', backgroundColor: '#fdf2f2', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#e8553a' }}></div>
                            <div className="card-head" style={{ marginBottom: '4px' }}>
                              <span className="card-title" style={{ color: '#9b1c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-alert-triangle" style={{ fontSize: '14px' }} /> Hata Oluştu
                              </span>
                              <button 
                                onClick={() => setLaunchState('idle')}
                                style={{ fontSize: '10px', backgroundColor: '#fde2e2', border: 'none', color: '#9b1c1c', padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}
                              >
                                Kapat
                              </button>
                            </div>
                            <p className="font-mono-tech" style={{ fontSize: '11px', color: '#9b1c1c', lineHeight: '1.4', maxHeight: '80px', overflowY: 'auto', userSelect: 'text' }}>
                              {errorDetails}
                            </p>
                          </div>
                        )}

                        {/* Interactive Task progress overlay */}
                        {launchState !== 'idle' && launchState !== 'error' && (
                          <div className="info-card" style={{ borderColor: 'var(--border-badge-orange)', backgroundColor: 'var(--bg-badge-orange)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div className="card-head" style={{ marginBottom: '0' }}>
                              <span className="card-title" style={{ color: 'var(--text-badge-orange)', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Space Mono, monospace' }}>
                                <span className="animate-spin" style={{ display: 'inline-flex', fontSize: '12px', color: 'var(--color-terracotta)' }}>
                                  <i className="ti ti-refresh" />
                                </span>
                                {statusMessage || 'İşlem yapılıyor...'}
                              </span>
                              <span className="font-mono-tech" style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--color-terracotta)' }}>{progress}%</span>
                            </div>
                            {/* Progress bar */}
                            <div style={{ background: '#d8d2c6', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                              <div
                                style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--color-terracotta)', transition: 'width 0.25s ease', borderRadius: '4px' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Two-Column Grid: Son Sürümler & İstatistikler */}
                        <div className="row2">
                          {/* Son Sürümler Card */}
                          <div className="info-card">
                            <div className="card-head">
                              <div className="card-title">Son Sürümler</div>
                            </div>
                            <div className="ver-list">
                              {availableVersions.slice(0, 3).map((ver, idx) => {
                                const isInstalled = installedVersions.includes(ver) || 
                                  installedVersions.some(v => v.includes(ver));
                                return (
                                  <div key={ver} className="ver-row">
                                    <div className={`ver-dot ${isInstalled ? 'active' : 'idle'}`}></div>
                                    <div className="ver-name">{ver}</div>
                                    <div className="ver-loader">{idx === 0 ? 'Fabric' : idx === 1 ? 'Forge' : 'Vanilla'}</div>
                                    <i className="ti ti-chevron-right ver-arrow" style={{ fontSize: '14px' }} />
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* İstatistikler Card */}
                          <div className="info-card">
                            <div className="card-head">
                              <div className="card-title">İstatistikler</div>
                            </div>
                            <div className="stats-grid">
                              <div className="stat-box">
                                <div className="stat-n">{totalPlayHours}</div>
                                <div className="stat-l">toplam saat</div>
                              </div>
                              <div className="stat-box">
                                <div className="stat-n">{installedVersions.length}</div>
                                <div className="stat-l">kurulu sürüm</div>
                              </div>
                              <div className="stat-box">
                                <div className="stat-n">{modsCount}</div>
                                <div className="stat-l">aktif mod</div>
                              </div>
                              <div className="stat-box">
                                <div className="stat-n">{packsCount + shadersCount}</div>
                                <div className="stat-l">paket &amp; shader</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Console Logs drawer */}
                        {showLogs && (
                          <div className="logs-drawer">
                            <div className="logs-drawer-header">
                              <span className="logs-drawer-title">
                                <i className="ti ti-terminal" style={{ fontSize: '12px' }} /> Konsol Çıktısı (Canlı)
                              </span>
                              <button 
                                onClick={() => setShowLogs(false)} 
                                className="logs-drawer-close"
                              >
                                Kapat
                              </button>
                            </div>
                            <div 
                              ref={logTerminalRef}
                              className="logs-drawer-terminal"
                              style={{ overflowY: 'auto', maxHeight: '200px' }}
                            >
                              {logs.length === 0 ? (
                                <span className="logs-empty">Log çıktısı bekleniyor... Oyunu başlattığınızda konsol burada görünecektir.</span>
                              ) : (
                                logs.map((log, idx) => (
                                  <div key={idx} className="logs-line">{log}</div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {/* Console Toggle Button */}
                        <div className="logs-toggle-row">
                          <button
                            onClick={() => setShowLogs(!showLogs)}
                            className={`logs-toggle-btn ${showLogs ? 'active' : ''}`}
                          >
                            <i className="ti ti-terminal" style={{ fontSize: '14px' }} />
                            <span>{showLogs ? 'Konsolu Gizle' : 'Konsolu Göster'}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {/* TAB 2: MODS & PACKS VIEW */}
                    {activeTab === 'mods' && (
                      <motion.div
                        key="mods-view"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                      >
                        <ModsTab selectedVersion={selectedVersion} selectedLoader={selectedLoader} />
                      </motion.div>
                    )}

                    {/* TAB 3: SETTINGS VIEW */}
                    {activeTab === 'settings' && (
                      <motion.div
                        key="settings-view"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
                      >
                        <SettingsTab onSettingsSaved={loadSystemInfo} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Bar */}
                <div className="bottom">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    {lastPlayedVersion ? (
                      <>
                        <span className="ram-label" style={{ flexShrink: 0 }}>Son:</span>
                        <span className="ram-val" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {lastPlayedVersion}
                        </span>
                        <span className="ram-label" style={{ flexShrink: 0 }}>·</span>
                        <span className="ram-val" style={{ flexShrink: 0 }}>{formatLastPlayed()}</span>
                      </>
                    ) : (
                      <span className="ram-label">Henüz oynanmadı</span>
                    )}
                  </div>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* ACCOUNT SWITCHER MODAL */}
        <AnimatePresence>
          {showAccountSwitcher && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 100,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)'
              }}
              className="titlebar-no-drag"
            >
              <motion.div
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                style={{
                  width: '420px',
                  backgroundColor: '#1c1917',
                  border: '1px solid #e8553a',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                  position: 'relative'
                }}
              >
                {/* Terracotta Top Ribbon */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#e8553a', borderTopLeftRadius: '11px', borderTopRightRadius: '11px' }} />

                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: 'rgba(232, 85, 58, 0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-users text-[#e8553a]" style={{ fontSize: '18px' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#f5f0e8', margin: 0, lineHeight: 1.2 }}>Hesap Değiştir</h3>
                      <p style={{ fontSize: '11px', color: '#8b857f', margin: 0 }}>Minecraft Çevrimdışı Oturumları</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAccountSwitcher(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8b857f',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#f5f0e8';
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#8b857f';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <i className="ti ti-x" style={{ fontSize: '18px' }} />
                  </button>
                </div>

                {/* Saved Accounts list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Space Mono', monospace" }}>
                    Kayıtlı Hesaplar
                  </div>
                  
                  <div 
                    style={{ 
                      maxHeight: '180px', 
                      overflowY: 'auto', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px',
                      paddingRight: '4px'
                    }}
                    className="custom-scroll"
                  >
                    {savedUsernames.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#6b6560', fontSize: '12px', border: '1px dashed #3d3733', borderRadius: '8px' }}>
                        Kayıtlı hesap bulunamadı.
                      </div>
                    ) : (
                      savedUsernames.map((acc) => {
                        const isActive = acc === username;
                        return (
                          <div
                            key={acc}
                            onClick={() => handleSwitchAccount(acc)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              backgroundColor: isActive ? 'rgba(232, 85, 58, 0.1)' : '#262220',
                              border: isActive ? '1px solid #e8553a' : '1px solid #3d3733',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = '#2d2825';
                                e.currentTarget.style.borderColor = '#4a433f';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isActive) {
                                e.currentTarget.style.backgroundColor = '#262220';
                                e.currentTarget.style.borderColor = '#3d3733';
                              }
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <img
                                src={`https://crafatar.com/avatars/${acc}?size=24&overlay`}
                                alt={acc}
                                style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #4a433f' }}
                                onError={(ev) => {
                                  (ev.target as HTMLImageElement).src = `https://minotar.net/avatar/${acc}/24`;
                                }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#f5f0e8' }}>{acc}</span>
                                {isActive && (
                                  <span style={{ fontSize: '10px', color: '#5aa85c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#5aa85c', display: 'inline-block' }}></span>
                                    aktif profil
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <button
                              onClick={(e) => handleDeleteAccount(acc, e)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#6b6560',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#e8553a';
                                e.currentTarget.style.backgroundColor = 'rgba(232, 85, 58, 0.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#6b6560';
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                              title="Hesabı Sil"
                            >
                              <i className="ti ti-trash" style={{ fontSize: '14px' }} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Add new account form */}
                <form onSubmit={handleAddNewAccount} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#6b6560', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Space Mono', monospace" }}>
                    Yeni Hesap Ekle
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      flex: 1,
                      backgroundColor: '#262220',
                      border: '1px solid #3d3733',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      height: '38px',
                      transition: 'border-color 0.2s'
                    }}>
                      <i className="ti ti-user" style={{ fontSize: '13px', color: '#8b857f', marginRight: '8px' }} />
                      <input
                        type="text"
                        value={newAccountInput}
                        onChange={(e) => setNewAccountInput(e.target.value)}
                        placeholder="Kullanıcı adı"
                        maxLength={16}
                        pattern="^[a-zA-Z0-9_]+$"
                        title="Sadece harf, rakam ve alt çizgi kullanabilirsiniz."
                        style={{
                          flex: 1,
                          background: 'none',
                          border: 'none',
                          outline: 'none',
                          color: '#f5f0e8',
                          fontSize: '12px'
                        }}
                      />
                    </div>
                    <button
                      type="submit"
                      style={{
                        backgroundColor: '#e8553a',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d44530'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8553a'}
                      title="Giriş yap & Listeye ekle"
                    >
                      <i className="ti ti-plus" style={{ fontSize: '16px' }} />
                    </button>
                  </div>
                </form>

                {/* Footer buttons */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', borderTop: '1px solid #262220', paddingTop: '14px' }}>
                  <button
                    type="button"
                    onClick={handleGlobalLogout}
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(232, 85, 58, 0.05)',
                      border: '1px solid rgba(232, 85, 58, 0.2)',
                      borderRadius: '8px',
                      color: '#e8553a',
                      fontSize: '12px',
                      fontWeight: '600',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(232, 85, 58, 0.1)';
                      e.currentTarget.style.borderColor = '#e8553a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(232, 85, 58, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(232, 85, 58, 0.2)';
                    }}
                  >
                    <i className="ti ti-logout" style={{ fontSize: '13px' }} />
                    <span>Tüm Oturumları Kapat</span>
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}

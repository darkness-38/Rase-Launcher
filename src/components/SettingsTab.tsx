import React, { useState, useEffect } from 'react';

interface SettingsTabProps {
  onSettingsSaved?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onSettingsSaved }) => {
  const [ram, setRam] = useState(4);
  const [systemRam, setSystemRam] = useState(16);
  const [gameDir, setGameDir] = useState('');
  const [javaPath, setJavaPath] = useState('java');
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showHistorical, setShowHistorical] = useState(false);
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false);
  const [showModded, setShowModded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [borderlessFullscreen, setBorderlessFullscreen] = useState(true);
  const [webDashboardEnabled, setWebDashboardEnabled] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      const clamp = (val: number, minVal: number, maxVal: number) => 
        Math.min(Math.max(val, minVal), maxVal);

      if (!window.electronAPI) {
        console.warn('System API not available (Browser mode)');
        setSystemRam(16);
        setRam(clamp(4, 1, 15));
        setGameDir('/home/hamza/.minecraft-rase');
        setJavaPath('java');
        setShowSnapshots(false);
        setShowHistorical(false);
        setShowOnlyInstalled(false);
        setShowModded(true);
        return;
      }
      try {
        const current = await window.electronAPI.getSettings();
        const sysRam = await window.electronAPI.getSystemRam();
        setSystemRam(sysRam);
        const maxSelectableRam = Math.max(1, sysRam - 1);
        setRam(clamp(current.ram, 1, maxSelectableRam));
        setGameDir(current.gameDir);
        setJavaPath(current.javaPath || 'java');
        setShowSnapshots(current.showSnapshots ?? false);
        setShowHistorical(current.showHistorical ?? false);
        setShowOnlyInstalled(current.showOnlyInstalled ?? false);
        setShowModded(current.showModded ?? true);
        setBorderlessFullscreen(current.borderlessFullscreen ?? true);
        setWebDashboardEnabled(current.webDashboardEnabled ?? true);
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    };
    fetchSettings();
  }, []);

  const handleBrowseDir = async () => {
    if (!window.electronAPI) {
      setGameDir('/home/hamza/Documents/MockMinecraftDir');
      return;
    }
    try {
      const selected = await window.electronAPI.selectDirectory();
      if (selected) {
        setGameDir(selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (!window.electronAPI) {
        // Mock save
        setTimeout(() => {
          setShowSavedToast(true);
          if (onSettingsSaved) onSettingsSaved();
          setTimeout(() => setShowSavedToast(false), 2000);
          setIsSaving(false);
        }, 800);
        return;
      }
      const current = await window.electronAPI.getSettings();
      const updated = {
        ...current,
        ram,
        gameDir,
        javaPath,
        showSnapshots,
        showHistorical,
        showOnlyInstalled,
        showModded,
        borderlessFullscreen,
        webDashboardEnabled
      };
      await window.electronAPI.saveSettings(updated);
      setShowSavedToast(true);
      if (onSettingsSaved) onSettingsSaved();
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (e) {
      console.error('Failed to save settings', e);
    } finally {
      if (window.electronAPI) {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="settings-wrap">
      {/* Toast Notification */}
      {showSavedToast && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-[#bee3bc] bg-[#eef7ed] text-[#3a7d3c] shadow-md animate-in fade-in slide-in-from-top-2 duration-120 font-mono-tech" style={{ fontSize: '12px' }}>
          <i className="ti ti-circle-check" style={{ fontSize: '16px' }} />
          <span>Ayarlar başarıyla kaydedildi!</span>
        </div>
      )}

      {/* Main Container */}
      <div className="settings-scroll">
        
        {/* RAM Selector Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <i className="ti ti-sliders settings-card-icon" style={{ fontSize: '16px' }} />
            <h3 className="settings-card-title">Sistem Belleği (RAM)</h3>
          </div>

          <div className="settings-field">
            <div className="settings-field-row">
              <span className="settings-field-label">Maksimum RAM Miktarı</span>
              <span className="settings-field-val">
                {ram} GB
              </span>
            </div>
            
            <input
              type="range"
              min="1"
              max={Math.max(1, systemRam - 1)}
              step="1"
              value={ram}
              onChange={(e) => setRam(parseInt(e.target.value))}
              className="settings-slider"
            />
            
            <div className="settings-slider-ticks">
              <span>1 GB</span>
              {systemRam - 1 > 4 && <span>4 GB</span>}
              {systemRam - 1 > 8 && <span>8 GB</span>}
              <span>{Math.max(1, systemRam - 1)} GB (Maks)</span>
            </div>
          </div>
        </div>

        {/* Game Directory Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <i className="ti ti-folder settings-card-icon" style={{ fontSize: '16px' }} />
            <h3 className="settings-card-title">Oyun Dizini</h3>
          </div>

          <div className="settings-field">
            <span className="settings-field-label">Minecraft Veri Yolu</span>
            <div className="settings-dir-input-wrap">
              <input
                type="text"
                value={gameDir}
                onChange={(e) => setGameDir(e.target.value)}
                className="settings-dir-input"
                placeholder="Örn: /home/.minecraft"
              />
              <button
                onClick={handleBrowseDir}
                className="settings-dir-btn"
              >
                Gözat
              </button>
            </div>
            <p className="settings-card-desc">
              Değiştirilmediği sürece varsayılan gizli <code className="text-[#e8553a]">.minecraft-rase</code> dizini kullanılır.
            </p>
          </div>
        </div>

        {/* Java Configuration Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <i className="ti ti-server settings-card-icon" style={{ fontSize: '16px' }} />
            <h3 className="settings-card-title">Java Ayarı</h3>
          </div>

          <div className="settings-field">
            <span className="settings-field-label">Java Yol Belirteci (Binary Path)</span>
            <input
              type="text"
              value={javaPath}
              onChange={(e) => setJavaPath(e.target.value)}
              className="settings-dir-input"
              placeholder="Varsayılan: java"
            />
            <p className="settings-card-desc">
              Sisteminizde yüklü olan Java çalıştırıcısını otomatik bulmak için varsayılan olarak <code className="text-[#e8553a]">java</code> yazılı bırakın. Hata alırsanız kendi Java binary yolunu tam olarak girin.
            </p>
          </div>
        </div>

        {/* Version Visibility Card */}
        <div className="settings-card">
          <div className="settings-card-header">
            <i className="ti ti-eye settings-card-icon" style={{ fontSize: '16px' }} />
            <h3 className="settings-card-title">Sürüm Görünürlük Ayarları</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showSnapshots}
                onChange={(e) => setShowSnapshots(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--color-terracotta)',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#1c1917' }}>Snapshot Sürümleri Göster</span>
                <span style={{ fontSize: '11px', color: '#8a857e' }}>Geliştirme aşamasındaki test (snapshot) sürümlerini listeler.</span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showHistorical}
                onChange={(e) => setShowHistorical(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--color-terracotta)',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#1c1917' }}>Eski &amp; Tarihi Sürümleri Göster</span>
                <span style={{ fontSize: '11px', color: '#8a857e' }}>Klasik eski Alfa ve Beta (old_alpha/old_beta) sürümlerini dahil eder.</span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showOnlyInstalled}
                onChange={(e) => setShowOnlyInstalled(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--color-terracotta)',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Sadece Yüklü Sürümleri Göster</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Yalnızca yerel cihazınızda indirilmiş sürümleri listeler.</span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={showModded}
                onChange={(e) => setShowModded(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: 'var(--color-terracotta)',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Modlu (Forge/Fabric) Sürümleri Göster</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sürümler listesinde Forge ve Fabric mod motoru seçeneklerini aktif eder.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Oyun Deneyimi Kartı */}
        <div className="settings-card">
          <div className="settings-card-header">
            <i className="ti ti-layout-dashboard settings-card-icon" style={{ fontSize: '16px' }} />
            <h3 className="settings-card-title">Oyun Deneyimi</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            {/* Borderless toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={borderlessFullscreen} onChange={(e) => setBorderlessFullscreen(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-terracotta)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Çerçevesiz Tam Ekran (Borderless)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Oyunu çerçevesiz pencerede başlatır. Overlay ve telefon kumandası için gereklidir.</span>
              </div>
            </label>
            {/* Web dashboard toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={webDashboardEnabled} onChange={(e) => setWebDashboardEnabled(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--color-terracotta)', cursor: 'pointer' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)' }}>Telefon Kumandası (Web Dashboard)</span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Oyun başladığında LAN üzerinden telefona bağlanılabilir panel açar. Port: 7823</span>
              </div>
            </label>
          </div>
        </div>

      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="settings-save-btn"
      >
        <i className={`ti ti-device-floppy ${isSaving ? 'animate-spin' : ''}`} style={{ fontSize: '16px' }} />
        <span>{isSaving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
        <i className="ti ti-chevron-right" style={{ fontSize: '14px' }} />
      </button>
    </div>
  );
};

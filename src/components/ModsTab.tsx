import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModsTabProps {
  selectedVersion: string;
  selectedLoader: 'vanilla' | 'fabric' | 'forge';
  activeProfileId: string | null;
}

export const ModsTab: React.FC<ModsTabProps> = ({
  selectedVersion,
  selectedLoader,
  activeProfileId,
}) => {
  const [mods, setMods] = useState<string[]>([]);
  const [packs, setPacks] = useState<string[]>([]);
  const [shaders, setShaders] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch installed mods, packs, and shaders from the backend
  const fetchFiles = async () => {
    if (!window.electronAPI) {
      console.warn('System API not available (Browser mode)');
      return;
    }
    try {
      const data = await window.electronAPI.getModsAndPacks(selectedVersion, selectedLoader, activeProfileId);
      setMods(data.mods || []);
      setPacks(data.packs || []);
      setShaders(data.shaders || []);
    } catch (e) {
      console.error('Failed to read mods, packs, and shaders', e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [selectedVersion, selectedLoader, activeProfileId]);

  // Show a notification toast
  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Drag over handler
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Drag leave handler
  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Drop handler
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let lastErrorMessage = '';

    for (const file of files) {
      const absolutePath = (file as any).path || file.name;
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext !== 'jar' && ext !== 'zip') {
        failCount++;
        lastErrorMessage = `Desteklenmeyen dosya formatı: ${file.name}. Sadece .jar ve .zip dosyaları.`;
        continue;
      }

      if (window.electronAPI && absolutePath === file.name) {
        failCount++;
        lastErrorMessage = "Dosya tam yolu okunamadı. Lütfen bu alana tıklayıp dosya seçici ile yükleyin.";
        continue;
      }

      try {
        if (!window.electronAPI) {
          // Mock install in browser mode
          successCount++;
          if (ext === 'jar') {
            setMods((prev) => [...prev, file.name]);
          } else {
            if (file.name.toLowerCase().includes('shader')) {
              setShaders((prev) => [...prev, file.name]);
            } else {
              setPacks((prev) => [...prev, file.name]);
            }
          }
          continue;
        }
        await window.electronAPI.installModOrPack(absolutePath, selectedVersion, selectedLoader, activeProfileId);
        successCount++;
      } catch (err: any) {
        failCount++;
        lastErrorMessage = err.message || 'Dosya taşınırken hata oluştu.';
      }
    }

    // Refresh view after installations
    await fetchFiles();

    if (successCount > 0 && failCount === 0) {
      triggerNotification('success', `${successCount} dosya başarıyla kuruldu!`);
    } else if (successCount > 0 && failCount > 0) {
      triggerNotification('success', `${successCount} dosya kuruldu, ${failCount} dosya başarısız.`);
    } else if (failCount > 0) {
      triggerNotification('error', lastErrorMessage || 'Dosyalar kurulamadı.');
    }
  };

  // Click to Select Files handler
  const handleSelectFilesClick = async () => {
    try {
      if (!window.electronAPI) {
        triggerNotification('error', 'Tarayıcı önizleme modunda dosya seçimi yapılamaz.');
        return;
      }

      const filePaths = await window.electronAPI.selectModsOrPacks();
      if (!filePaths || filePaths.length === 0) return; // Cancelled

      let successCount = 0;
      let failCount = 0;
      let lastErrorMessage = '';

      for (const filePath of filePaths) {
        try {
          await window.electronAPI.installModOrPack(filePath, selectedVersion, selectedLoader, activeProfileId);
          successCount++;
        } catch (err: any) {
          failCount++;
          lastErrorMessage = err.message || 'Dosya kurulurken hata oluştu.';
        }
      }

      await fetchFiles();

      if (successCount > 0 && failCount === 0) {
        triggerNotification('success', `${successCount} dosya başarıyla kuruldu!`);
      } else if (successCount > 0 && failCount > 0) {
        triggerNotification('success', `${successCount} dosya kuruldu, ${failCount} dosya başarısız.`);
      } else if (failCount > 0) {
        triggerNotification('error', lastErrorMessage || 'Dosyalar kurulamadı.');
      }
    } catch (err: any) {
      triggerNotification('error', 'Dosya seçilirken hata oluştu.');
    }
  };

  // Delete file handler
  const handleDelete = async (fileName: string, type: 'mods' | 'resourcepacks' | 'shaderpacks') => {
    try {
      if (!window.electronAPI) {
        // Mock delete in browser mode
        triggerNotification('success', `${fileName} silindi.`);
        if (type === 'mods') {
          setMods((prev) => prev.filter((m) => m !== fileName));
        } else if (type === 'resourcepacks') {
          setPacks((prev) => prev.filter((p) => p !== fileName));
        } else {
          setShaders((prev) => prev.filter((s) => s !== fileName));
        }
        return;
      }
      const res = await window.electronAPI.deleteModOrPack(fileName, type, selectedVersion, selectedLoader, activeProfileId);
      if (res.success) {
        triggerNotification('success', `${fileName} silindi.`);
        fetchFiles();
      } else {
        triggerNotification('error', `Silme başarısız: ${res.error}`);
      }
    } catch (err) {
      triggerNotification('error', 'Dosya silinirken hata oluştu.');
    }
  };

  // Open directory in native explorer
  const handleOpenDir = async (type: 'mods' | 'resourcepacks' | 'shaderpacks' | 'root') => {
    try {
      if (!window.electronAPI) {
        triggerNotification('success', `Browser: ${type} klasörü açıldı.`);
        return;
      }
      await window.electronAPI.openFolder(type, selectedVersion, selectedLoader, activeProfileId);
    } catch (e) {
      triggerNotification('error', 'Klasör açılamadı.');
    }
  };

  // Format file name for clean display
  const truncateName = (name: string, maxLen = 18) => {
    if (name.length <= maxLen) return name;
    const ext = name.split('.').pop() || '';
    const base = name.substring(0, name.lastIndexOf('.'));
    return base.substring(0, maxLen - ext.length - 3) + '...' + '.' + ext;
  };

  return (
    <div className="mods-wrap">
      {/* Dynamic Header Badge showing selected version and loader from main page */}
      <div className="info-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderLeft: '4px solid var(--color-terracotta)', background: '#ffffff', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-badge-orange)' }}>
            <i className="ti ti-versions" style={{ fontSize: '14px', color: 'var(--color-terracotta)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--bg-charcoal)' }}>
                Minecraft {selectedVersion}
              </span>
              <span className="fabric-tag" style={{ textTransform: 'capitalize', fontSize: '10px', margin: 0 }}>
                {selectedLoader}
              </span>
            </div>
            <div style={{ fontSize: '10.5px', color: '#8a857e', marginTop: '2px' }}>
              Aşağıdaki dosyalar ana sayfada seçtiğiniz bu sürüme özel olarak saklanmakta ve kurulmaktadır.
            </div>
          </div>
        </div>
        <button
          onClick={() => handleOpenDir('root')}
          className="mods-col-btn"
          style={{ padding: '6px 12px', border: '1px solid var(--border-sand)', borderRadius: '6px', background: '#faf8f5', gap: '6px' }}
        >
          <i className="ti ti-folder-open" style={{ fontSize: '12px' }} />
          Sürüm Klasörünü Aç
        </button>
      </div>
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-12 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-lg border shadow-md ${
              notification.type === 'success'
                ? 'bg-[#eef7ed] border-[#bee3bc] text-[#3a7d3c]'
                : 'bg-[#fdf2f2] border-[#f8b4b4] text-[#9b1c1c]'
            }`}
          >
            {notification.type === 'success' ? (
              <i className="ti ti-circle-check" style={{ fontSize: '16px' }} />
            ) : (
              <i className="ti ti-alert-circle" style={{ fontSize: '16px' }} />
            )}
            <span className="text-xs font-semibold tracking-wide font-mono-tech">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag & Drop Main Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFilesClick}
        className={`drag-zone ${isDragging ? 'active' : ''}`}
        style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
      >
        <i className="ti ti-cloud-upload drag-zone-icon" style={{ fontSize: '32px' }} />
        <div>
          <div className="drag-zone-title">
            Mod, Doku veya Shader Paketlerini Sürükle, Bırak veya Tıkla
          </div>
          <div className="drag-zone-sub">
            Modlar için <code className="text-[#e8553a]">.jar</code>, Doku & Shaderlar için <code className="text-[#e8553a]">.zip</code> dosyalarını atın veya **tıklayıp seçin**.
          </div>
        </div>
      </div>

      {/* Columns: Mods, Resource Packs, and Shaders */}
      <div className="mods-grid">
        {/* Mods Column */}
        <div className="mods-col">
          <div className="mods-col-header">
            <div className="mods-col-title-wrap">
              <i className="ti ti-shield mods-col-icon" style={{ fontSize: '14px' }} />
              <h3 className="mods-col-title">Modlar</h3>
              <span className="mods-col-count">
                {mods.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenDir('mods')}
              className="mods-col-btn"
            >
              <i className="ti ti-folder-open" style={{ fontSize: '12px' }} />
              Aç
            </button>
          </div>

          {/* List */}
          <div className="mods-col-list">
            <AnimatePresence initial={false}>
              {mods.length === 0 ? (
                <div className="mods-empty">
                  <i className="ti ti-file mods-empty-icon" style={{ fontSize: '24px' }} />
                  <p className="mods-empty-text">Mod bulunamadı.</p>
                </div>
              ) : (
                mods.map((mod) => (
                  <motion.div
                    key={mod}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="mod-row"
                  >
                    <div className="mod-row-left">
                      <i className="ti ti-file mod-row-icon" style={{ fontSize: '14px' }} />
                      <span className="mod-row-name" title={mod}>
                        {truncateName(mod)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(mod, 'mods')}
                      className="mod-row-btn"
                      title="Sil"
                    >
                      <i className="ti ti-trash" style={{ fontSize: '12px' }} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Texture Packs Column */}
        <div className="mods-col">
          <div className="mods-col-header">
            <div className="mods-col-title-wrap">
              <i className="ti ti-cloud-upload mods-col-icon" style={{ fontSize: '14px' }} />
              <h3 className="mods-col-title">Dokular</h3>
              <span className="mods-col-count">
                {packs.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenDir('resourcepacks')}
              className="mods-col-btn"
            >
              <i className="ti ti-folder-open" style={{ fontSize: '12px' }} />
              Aç
            </button>
          </div>

          {/* List */}
          <div className="mods-col-list">
            <AnimatePresence initial={false}>
              {packs.length === 0 ? (
                <div className="mods-empty">
                  <i className="ti ti-file mods-empty-icon" style={{ fontSize: '24px' }} />
                  <p className="mods-empty-text">Doku bulunamadı.</p>
                </div>
              ) : (
                packs.map((pack) => (
                  <motion.div
                    key={pack}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="mod-row"
                  >
                    <div className="mod-row-left">
                      <i className="ti ti-file mod-row-icon" style={{ fontSize: '14px' }} />
                      <span className="mod-row-name" title={pack}>
                        {truncateName(pack)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(pack, 'resourcepacks')}
                      className="mod-row-btn"
                      title="Sil"
                    >
                      <i className="ti ti-trash" style={{ fontSize: '12px' }} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Shader Packs Column */}
        <div className="mods-col">
          <div className="mods-col-header">
            <div className="mods-col-title-wrap">
              <i className="ti ti-sparkles mods-col-icon" style={{ fontSize: '14px' }} />
              <h3 className="mods-col-title">Shaderlar</h3>
              <span className="mods-col-count">
                {shaders.length}
              </span>
            </div>
            <button
              onClick={() => handleOpenDir('shaderpacks')}
              className="mods-col-btn"
            >
              <i className="ti ti-folder-open" style={{ fontSize: '12px' }} />
              Aç
            </button>
          </div>

          {/* List */}
          <div className="mods-col-list">
            <AnimatePresence initial={false}>
              {shaders.length === 0 ? (
                <div className="mods-empty">
                  <i className="ti ti-file mods-empty-icon" style={{ fontSize: '24px' }} />
                  <p className="mods-empty-text">Shader bulunamadı.</p>
                </div>
              ) : (
                shaders.map((shader) => (
                  <motion.div
                    key={shader}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="mod-row"
                  >
                    <div className="mod-row-left">
                      <i className="ti ti-file mod-row-icon" style={{ fontSize: '14px' }} />
                      <span className="mod-row-name" title={shader}>
                        {truncateName(shader)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(shader, 'shaderpacks')}
                      className="mod-row-btn"
                      title="Sil"
                    >
                      <i className="ti ti-trash" style={{ fontSize: '12px' }} />
                    </button>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
    </div>
    </div>
  );
};

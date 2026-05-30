import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Profile {
  id: string;
  name: string;
  version: string;
  loader: 'vanilla' | 'fabric' | 'forge';
}

interface GalleryTabProps {
  profiles: Profile[];
  activeProfileId: string | null;
  selectedVersion: string;
  selectedLoader: 'vanilla' | 'fabric' | 'forge';
}

interface Screenshot {
  path: string;
  name: string;
  created: number;
  profileName: string;
}

export const GalleryTab: React.FC<GalleryTabProps> = ({
  profiles,
  activeProfileId,
  selectedVersion,
  selectedLoader
}) => {
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [filterMode, setFilterMode] = useState<string>('all'); // 'all', 'active', 'vanilla', or specific profile ID
  const [loading, setLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch screenshots from Electron Main Process
  const fetchScreenshots = async () => {
    if (!window.electronAPI) {
      console.warn('System API not available (Browser mode)');
      return;
    }
    setLoading(true);
    try {
      let activeIdParam: string | null = null;
      let versionParam: string | undefined = undefined;
      let loaderParam: string | undefined = undefined;

      if (filterMode === 'all') {
        activeIdParam = 'all';
      } else if (filterMode === 'vanilla') {
        activeIdParam = null;
        versionParam = undefined;
        loaderParam = undefined;
      } else if (filterMode === 'active') {
        activeIdParam = activeProfileId;
        versionParam = selectedVersion;
        loaderParam = selectedLoader;
      } else {
        // Specific profile ID
        activeIdParam = filterMode;
        const prof = profiles.find(p => p.id === filterMode);
        if (prof) {
          versionParam = prof.version;
          loaderParam = prof.loader;
        }
      }

      const list = await window.electronAPI.getScreenshots(activeIdParam, versionParam, loaderParam);
      setScreenshots(list || []);
    } catch (e) {
      console.error('Failed to get screenshots:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenshots();
  }, [filterMode, activeProfileId, selectedVersion, selectedLoader]);

  // Show toast notification
  const triggerNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Delete screenshot file
  const handleDelete = async (filePath: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Avoid opening Lightbox
    if (!confirm('Bu ekran görüntüsünü kalıcı olarak silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      if (!window.electronAPI) {
        // Mock delete in browser
        setScreenshots(prev => prev.filter(s => s.path !== filePath));
        triggerNotification('success', 'Görsel silindi (Tarayıcı Modu).');
        return;
      }

      const res = await window.electronAPI.deleteScreenshot(filePath);
      if (res.success) {
        triggerNotification('success', 'Ekran görüntüsü silindi.');
        // If the deleted image was active in the lightbox, close it or shift index
        if (selectedImageIndex !== null) {
          setSelectedImageIndex(null);
        }
        fetchScreenshots();
      } else {
        triggerNotification('error', `Silme başarısız: ${res.error}`);
      }
    } catch (err: any) {
      triggerNotification('error', `Hata: ${err.message}`);
    }
  };

  // Navigate inside Lightbox
  const handlePrevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedImageIndex === null || screenshots.length === 0) return;
    const nextIdx = (selectedImageIndex - 1 + screenshots.length) % screenshots.length;
    setSelectedImageIndex(nextIdx);
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedImageIndex === null || screenshots.length === 0) return;
    const nextIdx = (selectedImageIndex + 1) % screenshots.length;
    setSelectedImageIndex(nextIdx);
  };

  // Keyboard navigation inside lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === 'ArrowLeft') handlePrevImage();
      if (e.key === 'ArrowRight') handleNextImage();
      if (e.key === 'Escape') setSelectedImageIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, screenshots]);

  const formatDate = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }} className="gallery-tab-container">
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

      {/* Top filter Card */}
      <div className="info-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--color-accent-muted-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-camera" style={{ fontSize: '20px', color: 'var(--color-terracotta)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-play-version)', margin: 0 }}>Görsel Galerisi</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Minecraft'ta F2 ile aldığınız tüm oyun içi ekran görüntülerini inceleyin.</p>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Filtre:</span>
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-sand)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '12.5px',
              outline: 'none',
              cursor: 'pointer'
            }}
            className="dropdown-trigger"
          >
            <option value="all">Tüm Görseller</option>
            <option value="vanilla">Genel Sürümler (Vanilla)</option>
            <option value="active">Seçili Sürüm/Profil</option>
            {profiles.length > 0 && <optgroup label="Özel Profiller">
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>}
          </select>
        </div>
      </div>

      {/* Grid container */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div className="loader-spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border-sand)', borderTopColor: 'var(--color-terracotta)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Görseller yükleniyor...</span>
          </div>
        ) : screenshots.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', gap: '8px' }}>
            <i className="ti ti-photo-off" style={{ fontSize: '32px' }} />
            <span style={{ fontSize: '13px' }}>Bu klasörde henüz hiç ekran görüntüsü alınmamış.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px', paddingBottom: '16px' }}>
            {screenshots.map((s, idx) => (
              <div
                key={s.path}
                onClick={() => setSelectedImageIndex(idx)}
                className="settings-card hover-bright"
                style={{
                  position: 'relative',
                  padding: '8px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-sand)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  overflow: 'hidden',
                  transition: 'all 0.18s'
                }}
              >
                {/* Image display */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', borderRadius: '6px', overflow: 'hidden', background: '#000' }}>
                  <img
                    src={`media-file://${s.path}`}
                    alt={s.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/darkness-38/Rase-Launcher/main/assets/icon.png';
                    }}
                  />
                  {/* Image hovering actions overlay */}
                  <div 
                    className="image-overlay"
                    style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, bottom: 0, 
                      background: 'rgba(0,0,0,0.3)', 
                      opacity: 0, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '12px',
                      transition: 'opacity 0.2s ease'
                    }}
                  >
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <i className="ti ti-zoom-in" style={{ fontSize: '15px' }} />
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={s.name}>
                    {s.name}
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9.5px', color: 'var(--text-muted)' }}>
                    <span>{formatDate(s.created)}</span>
                    <span 
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        padding: '1px 5px', 
                        borderRadius: '3px', 
                        fontSize: '9px',
                        border: '1px solid var(--border-sand)',
                        maxWidth: '90px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={`Profil: ${s.profileName}`}
                    >
                      {s.profileName}
                    </span>
                  </div>
                </div>

                {/* Delete trash button directly on card corner */}
                <button
                  onClick={(e) => handleDelete(s.path, e)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(220, 38, 38, 0.85)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 5,
                    transition: 'all 0.15s'
                  }}
                  className="hover-bright"
                  title="Sil"
                >
                  <i className="ti ti-trash" style={{ fontSize: '12px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX DIALOG */}
      {selectedImageIndex !== null && screenshots[selectedImageIndex] && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            userSelect: 'none'
          }}
          onClick={() => setSelectedImageIndex(null)}
        >
          {/* Lightbox container */}
          <div 
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '90vw', maxHeight: '85vh', gap: '16px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Display active large image */}
            <img
              src={`media-file://${screenshots[selectedImageIndex].path}`}
              alt={screenshots[selectedImageIndex].name}
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
            />

            {/* Image Meta Bar */}
            <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', width: '100%', color: '#fff', fontSize: '12px', padding: '0 4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontWeight: 'bold' }}>{screenshots[selectedImageIndex].name}</span>
                <span style={{ fontSize: '10.5px', color: '#bbb' }}>{formatDate(screenshots[selectedImageIndex].created)} • Profil: {screenshots[selectedImageIndex].profileName}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button
                  onClick={() => handleDelete(screenshots[selectedImageIndex].path)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  className="hover-bright"
                >
                  <i className="ti ti-trash" />
                  Kalıcı Olarak Sil
                </button>
                <button
                  onClick={() => setSelectedImageIndex(null)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  className="hover-bright"
                >
                  Kapat
                </button>
              </div>
            </div>

            {/* Left and Right navigation buttons */}
            <button
              onClick={handlePrevImage}
              style={{
                position: 'fixed',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              className="hover-bright"
            >
              <i className="ti ti-chevron-left" />
            </button>
            <button
              onClick={handleNextImage}
              style={{
                position: 'fixed',
                right: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50%',
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              className="hover-bright"
            >
              <i className="ti ti-chevron-right" />
            </button>
          </div>
        </div>
      )}

      {/* CSS overrides for gallery thumbnail hover actions */}
      <style dangerouslySetInnerHTML={{__html: `
        .settings-card:hover .image-overlay {
          opacity: 1 !important;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

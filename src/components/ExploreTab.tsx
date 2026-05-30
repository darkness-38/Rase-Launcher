import React, { useState, useEffect } from 'react';

interface ExploreTabProps {
  onInstallModpack: (modpackName: string, downloadUrl: string) => void;
  isInstalling: boolean;
}

interface ModpackItem {
  project_id: string;
  slug: string;
  author: string;
  title: string;
  description: string;
  categories: string[];
  display_categories: string[];
  versions: string[];
  downloads: number;
  follows: number;
  icon_url: string;
  latest_version?: string;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({ onInstallModpack, isInstalling }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [modpacks, setModpacks] = useState<ModpackItem[]>([]);
  const [selectedPack, setSelectedPack] = useState<ModpackItem | null>(null);
  const [packVersions, setPackVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersionFilter, setSelectedVersionFilter] = useState<string>('all');

  const supportedVersions = ['all', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.8.9', '1.7.10'];

  // Search Modpacks from Modrinth
  const fetchModpacks = async (query = '', version = 'all') => {
    setLoading(true);
    try {
      let facets = '[["project_type:modpack"]]';
      if (version !== 'all') {
        facets = `[["project_type:modpack"],["versions:${version}"]]`;
      }
      
      const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&limit=24&index=relevance`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setModpacks(data.hits || []);
      }
    } catch (e) {
      console.error('Failed to search Modrinth modpacks:', e);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on mount and when filter changes
  useEffect(() => {
    fetchModpacks(searchQuery, selectedVersionFilter);
  }, [selectedVersionFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchModpacks(searchQuery, selectedVersionFilter);
  };

  const handlePackClick = async (pack: ModpackItem) => {
    setSelectedPack(pack);
    setLoadingVersions(true);
    try {
      const res = await fetch(`https://api.modrinth.com/v2/project/${pack.project_id}/version`);
      if (res.ok) {
        const data = await res.json();
        setPackVersions(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch pack versions:', e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }} className="explore-tab-container">
      {/* Search and Filters Header */}
      <div className="info-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--color-accent-muted-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-planet" style={{ fontSize: '20px', color: 'var(--color-terracotta)' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-play-version)', margin: 0 }}>Modrinth Modpack Keşfet</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>En popüler Minecraft mod paketlerini doğrudan launcher içinden tek tıkla kurun.</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i className="ti ti-search" style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)', fontSize: '16px' }} />
            <input
              type="text"
              placeholder="Mod paketi ara... (örn: Fabulously Optimized, Simply Optimized)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border-sand)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              className="settings-dir-input"
            />
          </div>

          {/* Minecraft Version filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sürüm:</span>
            <select
              value={selectedVersionFilter}
              onChange={(e) => setSelectedVersionFilter(e.target.value)}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-sand)',
                backgroundColor: 'var(--bg-input)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
              className="dropdown-trigger"
            >
              {supportedVersions.map(v => (
                <option key={v} value={v}>{v === 'all' ? 'Tümü' : v}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--color-terracotta)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background-color 0.2s'
            }}
            className="play-btn"
          >
            <i className="ti ti-search" />
            Ara
          </button>
        </form>
      </div>

      {/* Grid container */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
            <div className="loader-spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--border-sand)', borderTopColor: 'var(--color-terracotta)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Modrinth kataloğu aranıyor...</span>
          </div>
        ) : modpacks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)', gap: '8px' }}>
            <i className="ti ti-box" style={{ fontSize: '32px' }} />
            <span style={{ fontSize: '13px' }}>Aramanıza uygun hiçbir mod paketi bulunamadı.</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', paddingBottom: '16px' }}>
            {modpacks.map((pack) => (
              <div
                key={pack.project_id}
                onClick={() => handlePackClick(pack)}
                className="settings-card hover-bright"
                style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-sand)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                  transition: 'all 0.18s'
                }}
              >
                <img
                  src={pack.icon_url || 'https://raw.githubusercontent.com/darkness-38/Rase-Launcher/main/assets/icon.png'}
                  alt={pack.title}
                  style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/darkness-38/Rase-Launcher/main/assets/icon.png';
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={pack.title}>
                      {pack.title}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: '30px', lineHeight: '1.3' }}>
                    {pack.description}
                  </span>
                  
                  {/* Badges / Info */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <i className="ti ti-download" />
                      {formatNumber(pack.downloads)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <i className="ti ti-heart" />
                      {formatNumber(pack.follows)}
                    </span>
                    <span 
                      style={{ 
                        backgroundColor: 'var(--bg-tertiary)', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        fontSize: '9px',
                        border: '1px solid var(--border-sand)',
                        color: 'var(--text-primary)',
                        maxWidth: '90px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {pack.author}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODPACK DETAILS DRAWER/MODAL */}
      {selectedPack && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedPack(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-sand)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', gap: '16px', padding: '20px', borderBottom: '1px solid var(--border-sand)', backgroundColor: 'var(--bg-tertiary)', alignItems: 'center' }}>
              <img
                src={selectedPack.icon_url || 'https://raw.githubusercontent.com/darkness-38/Rase-Launcher/main/assets/icon.png'}
                alt={selectedPack.title}
                style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', border: '1px solid rgba(0,0,0,0.06)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://raw.githubusercontent.com/darkness-38/Rase-Launcher/main/assets/icon.png';
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-play-version)', margin: 0 }}>{selectedPack.title}</h4>
                <div style={{ display: 'flex', gap: '10px', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', alignItems: 'center' }}>
                  <span>Yazar: <strong>{selectedPack.author}</strong></span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}><i className="ti ti-download" /> {formatNumber(selectedPack.downloads)} İndirme</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPack(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                className="hover-bright"
              >
                <i className="ti ti-x" />
              </button>
            </div>

            {/* Scrollable details */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }} className="custom-scrollbar">
              <div>
                <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Paket Açıklaması</h5>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{selectedPack.description}</p>
              </div>

              <div>
                <h5 style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>Mevcut Sürümler & Kurulum</h5>
                
                {loadingVersions ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div className="loader-spinner" style={{ width: '16px', height: '16px', border: '2px solid var(--border-sand)', borderTopColor: 'var(--color-terracotta)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Sürümler yükleniyor...
                  </div>
                ) : packVersions.length === 0 ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bu paket için uyumlu sürüm bulunamadı.</span>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
                    {packVersions.slice(0, 10).map((v: any) => {
                      const fileObj = v.files?.find((f: any) => f.primary) || v.files?.[0];
                      if (!fileObj) return null;

                      // Extract client required loaders
                      const gameVer = v.game_versions?.[0] || '1.20.1';
                      const loaderName = v.loaders?.[0] || 'fabric';

                      return (
                        <div
                          key={v.id}
                          style={{
                            padding: '10px 14px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-sand)',
                            backgroundColor: 'var(--bg-card)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px'
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{v.name}</span>
                            <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: 'var(--text-muted)' }}>
                              <span style={{ backgroundColor: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: '3px' }}>{gameVer}</span>
                              <span style={{ backgroundColor: 'var(--color-accent-muted-bg)', color: 'var(--color-terracotta)', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>{loaderName}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              onInstallModpack(selectedPack.title, fileObj.url);
                              setSelectedPack(null);
                            }}
                            disabled={isInstalling}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'var(--color-terracotta)',
                              color: 'var(--text-on-accent)',
                              border: 'none',
                              borderRadius: '6px',
                              fontWeight: 'bold',
                              fontSize: '11px',
                              cursor: 'pointer',
                              opacity: isInstalling ? 0.6 : 1,
                              pointerEvents: isInstalling ? 'none' : 'auto',
                              transition: 'opacity 0.2s'
                            }}
                            className="play-btn"
                          >
                            {isInstalling ? 'Yükleniyor' : 'Yükle'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Keyframes for Spinner */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
};

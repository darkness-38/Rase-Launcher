import React, { useState } from 'react';

interface Profile {
  id: string;
  name: string;
  version: string;
  loader: 'vanilla' | 'fabric' | 'forge';
  created: number;
  lastPlayed?: number;
}

interface ProfilesTabProps {
  profiles: Profile[];
  activeProfileId: string | null;
  availableVersions: { id: string; type: string }[];
  onProfilesChanged: (newProfiles: Profile[], activeId: string | null) => void;
}

export const ProfilesTab: React.FC<ProfilesTabProps> = ({
  profiles,
  activeProfileId,
  availableVersions,
  onProfilesChanged
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [loader, setLoader] = useState<'vanilla' | 'fabric' | 'forge'>('vanilla');

  // Filter versions list to only releases to keep it extremely tidy
  const cleanVersions = availableVersions.filter(v => v.type === 'release');

  // If no version is selected yet, default to the latest release
  React.useEffect(() => {
    if (cleanVersions.length > 0 && !version) {
      setVersion(cleanVersions[0].id);
    }
  }, [cleanVersions, version]);

  const handleCreateProfile = () => {
    if (!name.trim()) {
      alert('Lütfen profil ismi girin!');
      return;
    }
    const newProfile: Profile = {
      id: Date.now().toString(),
      name: name.trim(),
      version: version || '1.21.1',
      loader,
      created: Date.now()
    };
    const updatedProfiles = [...profiles, newProfile];
    onProfilesChanged(updatedProfiles, newProfile.id);
    
    // Reset form
    setName('');
    setShowAddForm(false);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent choosing the profile when deleting
    if (!confirm('Bu profili silmek istediğinizden emin misiniz? Tüm dünya kayıtları ve modları silinecektir!')) {
      return;
    }
    const updatedProfiles = profiles.filter(p => p.id !== id);
    const newActiveId = activeProfileId === id ? null : activeProfileId;
    onProfilesChanged(updatedProfiles, newActiveId);
  };

  const handleSelectProfile = (id: string) => {
    onProfilesChanged(profiles, id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
      {/* Top Header Card */}
      <div className="info-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--color-accent-muted-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-folder" style={{ fontSize: '20px', color: 'var(--color-terracotta)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-play-version)', margin: 0 }}>Özel Profil Yöneticisi</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Kendine has dünyaları, modları ve ayarları olan bağımsız profiller oluşturun.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {activeProfileId && (
            <button
              onClick={() => onProfilesChanged(profiles, null)}
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-muted)',
                border: '1px solid var(--border-sand)',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '12.5px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                marginRight: '10px'
              }}
              className="hover-bright"
            >
              <i className="ti ti-power" style={{ fontSize: '14px' }} />
              Varsayılan Mod
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              backgroundColor: showAddForm ? 'var(--color-accent-muted-bg)' : 'var(--color-terracotta)',
              color: showAddForm ? 'var(--color-terracotta)' : 'var(--text-on-accent)',
              border: showAddForm ? '1px solid var(--color-accent-muted-border)' : 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12.5px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
            className="hover-bright"
          >
            <i className={`ti ti-${showAddForm ? 'x' : 'plus'}`} style={{ fontSize: '14px' }} />
            {showAddForm ? 'Vazgeç' : 'Yeni Profil'}
          </button>
        </div>
      </div>

      {/* Profile Creation Form */}
      {showAddForm && (
        <div className="info-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', border: '1px dashed var(--color-terracotta)' }}>
          <div className="card-head" style={{ marginBottom: '4px' }}>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <i className="ti ti-plus" style={{ color: 'var(--color-terracotta)' }} />
              <span>Yeni Minecraft Profili Oluştur</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="settings-field">
              <span className="settings-field-label">Profil Adı</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="settings-dir-input"
                placeholder="Örn: Modlu Hayatta Kalma veya 1.8.9 PvP"
                style={{ width: '100%' }}
              />
            </div>
            
            <div className="settings-field">
              <span className="settings-field-label">Minecraft Sürümü</span>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="settings-dir-input"
                style={{ width: '100%', background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-sand)' }}
              >
                {cleanVersions.map(v => (
                  <option key={v.id} value={v.id}>{v.id}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="settings-field">
            <span className="settings-field-label">Yükleyici Türü (Loader Type)</span>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {(['vanilla', 'fabric', 'forge'] as const).map(type => {
                const isSel = loader === type;
                return (
                  <button
                    key={type}
                    onClick={() => setLoader(type)}
                    style={{
                      flex: 1,
                      backgroundColor: isSel ? 'var(--color-accent-muted-bg)' : 'var(--bg-tertiary)',
                      color: isSel ? 'var(--color-terracotta)' : 'var(--text-muted)',
                      border: isSel ? '1px solid var(--color-terracotta)' : '1px solid var(--border-sand)',
                      borderRadius: '6px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.15s'
                    }}
                    className="hover-bright"
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleCreateProfile}
            style={{
              backgroundColor: 'var(--color-terracotta)',
              color: 'var(--text-on-accent)',
              border: 'none',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '13px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            className="hover-bright"
          >
            <i className="ti ti-check" style={{ fontSize: '15px' }} />
            Profili Kaydet ve Seç
          </button>
        </div>
      )}

      {/* Profiles Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        {profiles.map(profile => {
          const isActive = activeProfileId === profile.id;
          return (
            <div
              key={profile.id}
              onClick={() => handleSelectProfile(profile.id)}
              style={{
                background: isActive ? 'var(--color-accent-muted-bg)' : 'var(--bg-sidebar)',
                border: isActive ? '1.5px solid var(--color-terracotta)' : '1px solid var(--border-sand)',
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                transition: 'all 0.15s'
              }}
              className="hover-bright"
            >
              {/* Active Badge indicator in top-right */}
              {isActive && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'var(--color-terracotta)',
                  color: 'var(--text-on-accent)',
                  fontSize: '9px',
                  fontFamily: 'Space Mono, monospace',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '4px'
                }}>
                  AKTİF
                </div>
              )}

              {/* Title & metadata */}
              <div>
                <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold', color: 'var(--text-play-version)', maxWidth: '80%' }}>
                  {profile.name}
                </h4>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="fabric-tag" style={
                    profile.loader === 'fabric' 
                      ? { margin: 0 } 
                      : profile.loader === 'forge' 
                      ? { margin: 0, background: 'var(--color-fabric-bg)', color: 'var(--color-fabric-text)' } 
                      : { margin: 0, background: 'var(--bg-active-dark)', color: 'var(--color-success)' }
                  }>
                    {profile.loader}
                  </span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{profile.version}</span>
                </div>
              </div>

              {/* Bottom line: Dates and actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', marginTop: 'auto' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted-alt)' }}>
                  Oluşturulma: {new Date(profile.created).toLocaleDateString('tr-TR')}
                </span>
                
                <button
                  onClick={(e) => handleDeleteProfile(profile.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-delete-hover-text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  title="Profili Sil"
                >
                  <i className="ti ti-trash" style={{ fontSize: '14px' }} />
                </button>
              </div>
            </div>
          );
        })}

        {profiles.length === 0 && !showAddForm && (
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '40px 0', border: '1.5px dashed var(--border-sand)', borderRadius: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
            <i className="ti ti-folder" style={{ fontSize: '32px', color: 'var(--color-idle)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Henüz özel bir profiliniz yok.</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px' }}>Kendi izole oyun dünyalarınızı yaratmak için "Yeni Profil" butonunu kullanın.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

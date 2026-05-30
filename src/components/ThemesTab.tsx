import React from 'react';

interface ThemesTabProps {
  currentThemeColor: 'default' | 'forest' | 'ocean' | 'obsidian';
  currentThemeLayout: 'classic' | 'dashboard' | 'retro';
  onThemeColorChanged: (color: 'default' | 'forest' | 'ocean' | 'obsidian') => void;
  onThemeLayoutChanged: (layout: 'classic' | 'dashboard' | 'retro') => void;
}

export const ThemesTab: React.FC<ThemesTabProps> = ({
  currentThemeColor,
  currentThemeLayout,
  onThemeColorChanged,
  onThemeLayoutChanged
}) => {
  const colorThemesList = [
    { id: 'default' as const, name: 'Desert Terracotta', colors: ['#f0ece3', '#e8553a', '#1c1917'], desc: 'Sıcak kum tonları ve premium toprak kırmızısı detaylar.' },
    { id: 'forest' as const, name: 'Deep Forest', colors: ['#eef1ea', '#3e6b5c', '#1a2e25'], desc: 'Zümrüt yeşili ve dinlendirici adaçayı tonları.' },
    { id: 'ocean' as const, name: 'Midnight Ocean', colors: ['#eaf0f3', '#2c7a9b', '#0d2233'], desc: 'Derin okyanus mavisi ve soğuk gri rüzgar esintisi.' },
    { id: 'obsidian' as const, name: 'Obsidian Twilight', colors: ['#0e0c0b', '#e0a96d', '#161412'], desc: 'Siyah obsidyen karanlık mod ve altın amber detaylar.' }
  ];

  const layoutThemesList = [
    {
      id: 'classic' as const,
      name: 'Klasik Sol Menü',
      iconClass: 'ti ti-layout-sidebar',
      desc: 'Sol tarafta şık, minimal ve koyu bir kontrol menüsü olan klasik düzen.'
    },
    {
      id: 'dashboard' as const,
      name: 'Yatay Dashboard',
      iconClass: 'ti ti-layout-navbar',
      desc: 'Menünün yukarıya yatay yerleştiği, modern, akıcı ve geniş ekran düzeni.'
    },
    {
      id: 'retro' as const,
      name: 'Retro Arcade Grid',
      iconClass: 'ti ti-device-gamepad',
      desc: 'Köşeli hatlar, Space Mono pikselli yazı tipi ve nostaljik CRT çerçeveler.'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
      
      {/* Dynamic Swatch Header */}
      <div className="info-card" style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ width: '38px', height: '38px', backgroundColor: 'var(--color-accent-muted-bg)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-palette" style={{ fontSize: '22px', color: 'var(--color-terracotta)' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-play-version)', margin: 0 }}>Görsel Arayüz Özelleştirme</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Hem renkleri hem de arayüz yerleşimini (layout) bağımsız olarak dilediğiniz gibi birleştirin.</p>
        </div>
      </div>

      {/* SECTION 1: COLOR PALETTES */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <i className="ti ti-color-swatch" style={{ fontSize: '15px', color: 'var(--color-terracotta)' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Renk Paletleri</h4>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {colorThemesList.map((t) => {
            const isSelected = currentThemeColor === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onThemeColorChanged(t.id)}
                style={{
                  background: isSelected ? 'var(--color-accent-muted-bg)' : 'var(--bg-card)',
                  border: isSelected ? '1.5px solid var(--color-terracotta)' : '1px solid var(--border-sand)',
                  borderRadius: '10px',
                  padding: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'all 0.15s'
                }}
                className="hover-bright"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{t.name}</span>
                  {isSelected && (
                    <span style={{
                      backgroundColor: 'var(--color-terracotta)',
                      color: 'var(--text-on-accent)',
                      fontSize: '8px',
                      fontFamily: 'Space Mono, monospace',
                      fontWeight: 'bold',
                      padding: '1px 6px',
                      borderRadius: '3px'
                    }}>
                      SEÇİLİ
                    </span>
                  )}
                </div>

                {/* Color preview bars - these legitimately show the palette's own colors */}
                <div style={{ display: 'flex', gap: '4px' }}>
                  {t.colors.map((c, idx) => (
                    <div 
                      key={idx} 
                      style={{ 
                        flex: 1, 
                        height: '14px', 
                        borderRadius: '3px', 
                        backgroundColor: c, 
                        border: '1px solid rgba(0,0,0,0.06)' 
                      }} 
                    />
                  ))}
                </div>

                <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.3' }}>{t.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: STRUCTURAL LAYOUTS */}
      <div style={{ marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <i className="ti ti-layout-grid" style={{ fontSize: '15px', color: 'var(--color-terracotta)' }} />
          <h4 style={{ fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Arayüz Tasarımları &amp; Düzenleri</h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {layoutThemesList.map((t) => {
            const isSelected = currentThemeLayout === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onThemeLayoutChanged(t.id)}
                style={{
                  background: isSelected ? 'var(--color-accent-muted-bg)' : 'var(--bg-card)',
                  border: isSelected ? '1.5px solid var(--color-terracotta)' : '1px solid var(--border-sand)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  transition: 'all 0.15s'
                }}
                className="hover-bright"
              >
                <div style={{ 
                  width: '38px', 
                  height: '38px', 
                  backgroundColor: isSelected ? 'var(--color-accent-muted-bg)' : 'var(--bg-tertiary)', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i 
                    className={t.iconClass} 
                    style={{ fontSize: '20px', color: isSelected ? 'var(--color-terracotta)' : 'var(--text-muted)' }} 
                  />
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{t.name}</span>
                    {isSelected && (
                      <span style={{
                        backgroundColor: 'var(--color-terracotta)',
                        color: 'var(--text-on-accent)',
                        fontSize: '8px',
                        fontFamily: 'Space Mono, monospace',
                        fontWeight: 'bold',
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}>
                        AKTİF DÜZEN
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: '1.4' }}>{t.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

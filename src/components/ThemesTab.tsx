import React from 'react';

interface ThemesTabProps {
  currentTheme: 'default' | 'forest' | 'ocean' | 'obsidian';
  onThemeChanged: (theme: 'default' | 'forest' | 'ocean' | 'obsidian') => void;
}

export const ThemesTab: React.FC<ThemesTabProps> = ({ currentTheme, onThemeChanged }) => {
  const themesList = [
    { id: 'default' as const, name: 'Desert Terracotta', colors: ['#f0ece3', '#e8553a', '#1c1917'], desc: 'Varsayılan sıcak kum tonları ve pişmiş toprak kırmızısı' },
    { id: 'forest' as const, name: 'Deep Forest', colors: ['#eef1ea', '#3e6b5c', '#1c1917'], desc: 'Organik zümrüt yeşili ve dinlendirici adaçayı tonları' },
    { id: 'ocean' as const, name: 'Midnight Ocean', colors: ['#eaf0f3', '#2c7a9b', '#1c1917'], desc: 'Derin okyanus mavisi ve soğuk gri kum esintisi' },
    { id: 'obsidian' as const, name: 'Obsidian Twilight', colors: ['#161412', '#e0a96d', '#211e1c'], desc: 'Siyah obsidyen karanlık mod ve altın kehribar detaylar' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, overflowY: 'auto' }} className="custom-scrollbar">
      {/* Top Header Card */}
      <div className="info-card" style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ width: '36px', height: '36px', backgroundColor: 'rgba(232, 85, 58, 0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-palette text-[#e8553a]" style={{ fontSize: '20px' }} />
        </div>
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: '#f5f0e8', margin: 0 }}>Dinamik Arayüz Temaları</h3>
          <p style={{ fontSize: '11px', color: '#8b857f', margin: 0 }}>Launcher görünümünü dilediğiniz premium renk paletiyle anında kişiselleştirin.</p>
        </div>
      </div>

      {/* Grid selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
        {themesList.map((t) => {
          const isSelected = currentTheme === t.id;
          return (
            <div
              key={t.id}
              onClick={() => onThemeChanged(t.id)}
              style={{
                background: isSelected ? 'rgba(232, 85, 58, 0.04)' : 'var(--bg-card)',
                border: isSelected ? '1.5px solid var(--color-terracotta)' : '1px solid var(--border-sand)',
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'all 0.15s'
              }}
              className="hover-bright"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }} className="page-title">{t.name}</span>
                {isSelected && (
                  <span style={{
                    backgroundColor: 'var(--color-terracotta)',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontFamily: 'Space Mono, monospace',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '4px'
                  }}>
                    AKTİF
                  </span>
                )}
              </div>

              {/* Color Swatches */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {t.colors.map((c, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      flex: 1, 
                      height: '20px', 
                      borderRadius: '4px', 
                      backgroundColor: c, 
                      border: '1px solid rgba(0,0,0,0.06)' 
                    }} 
                  />
                ))}
              </div>

              <span style={{ fontSize: '11.5px', color: '#8a857e', lineHeight: '1.4' }}>{t.desc}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

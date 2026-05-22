import React, { useState } from 'react';

interface VersionDropdownProps {
  selectedVersion: string;
  setSelectedVersion: (v: string) => void;
  selectedLoader: 'vanilla' | 'fabric' | 'forge';
  setSelectedLoader: (l: 'vanilla' | 'fabric' | 'forge') => void;
  availableVersions: string[];
  installedVersions: string[];
}

export const VersionDropdown: React.FC<VersionDropdownProps> = ({
  selectedVersion,
  setSelectedVersion,
  selectedLoader,
  setSelectedLoader,
  availableVersions,
  installedVersions,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check if Fabric or Forge is installed for the selected Minecraft version
  const isLoaderInstalled = (loader: 'vanilla' | 'fabric' | 'forge') => {
    if (loader === 'vanilla') return true; // Vanilla downloads automatically via MCLC on launch

    const searchKey = loader === 'fabric' ? 'fabric' : 'forge';
    return installedVersions.some(
      (v) => v.toLowerCase().includes(selectedVersion) && v.toLowerCase().includes(searchKey)
    );
  };

  const handleVersionSelect = (ver: string) => {
    setSelectedVersion(ver);
    setIsOpen(false);
  };

  const loaderConfig = [
    { id: 'vanilla', name: 'Vanilla', iconClass: 'ti ti-sparkles' },
    { id: 'fabric', name: 'Fabric', iconClass: 'ti ti-cpu' },
    { id: 'forge', name: 'Forge', iconClass: 'ti ti-hammer' },
  ] as const;

  return (
    <div className="dropdown-wrap">
      {/* Minecraft Core Version Selector */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <div className="dropdown-label">Minecraft Sürümü</div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="dropdown-trigger"
        >
          <div className="dropdown-trigger-left">
            <span className="dropdown-trigger-dot"></span>
            <span className="dropdown-trigger-text">Minecraft {selectedVersion}</span>
          </div>
          <i
            className="ti ti-chevron-down dropdown-trigger-icon"
            style={{ fontSize: '16px', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.12s' }}
          />
        </button>

        {/* Dropdown Options */}
        {isOpen && (
          <>
            {/* Backdrop to close */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }} onClick={() => setIsOpen(false)}></div>
            
            <div className="dropdown-menu">
              {availableVersions.map((ver) => (
                <button
                  key={ver}
                  onClick={() => handleVersionSelect(ver)}
                  className={`dropdown-item ${selectedVersion === ver ? 'active' : ''}`}
                >
                  <span>Minecraft {ver}</span>
                  {selectedVersion === ver && <i className="ti ti-check" style={{ fontSize: '14px' }} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Game Loader (Vanilla/Fabric/Forge) Pills */}
      <div>
        <div className="dropdown-label">Oyun Motoru (Loader)</div>
        <div className="loader-grid">
          {loaderConfig.map((loader) => {
            const isInstalled = isLoaderInstalled(loader.id);
            const isSelected = selectedLoader === loader.id;

            return (
              <button
                key={loader.id}
                onClick={() => setSelectedLoader(loader.id)}
                className={`loader-btn ${isSelected ? 'active' : ''}`}
              >
                <i className={`${loader.iconClass} loader-btn-icon`} style={{ fontSize: '18px' }} />
                <span className="loader-btn-text">{loader.name}</span>
                
                {/* Installed Indicator Dot */}
                <div className={`loader-dot ${isInstalled ? 'active' : 'idle'}`} title={isInstalled ? "Yüklü" : "Yüklü Değil"}></div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};


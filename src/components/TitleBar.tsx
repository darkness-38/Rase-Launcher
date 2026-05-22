import React from 'react';

export const TitleBar: React.FC = () => {
  const handleMinimize = () => {
    window.electronAPI.windowControl?.('minimize');
  };

  const handleClose = () => {
    window.electronAPI.windowControl?.('close');
  };

  return (
    <div className="titlebar-drag titlebar-container">
      {/* Left part: matching dark charcoal sidebar */}
      <div className="titlebar-left">
        <div className="titlebar-logo-wrap">
          <div className="titlebar-logo">
            <span className="titlebar-logo-letter">R</span>
          </div>
          <span className="titlebar-logo-title">RASE</span>
          <span className="titlebar-logo-subtitle">Launcher</span>
        </div>
      </div>
      {/* Right part: matching warm sand content */}
      <div className="titlebar-right">
        <div className="titlebar-no-drag titlebar-controls">
          <button
            onClick={handleMinimize}
            className="titlebar-btn"
            title="Küçült"
          >
            <i className="ti ti-minus" style={{ fontSize: '12px' }} />
          </button>
          <button
            onClick={handleClose}
            className="titlebar-btn close"
            title="Kapat"
          >
            <i className="ti ti-x" style={{ fontSize: '12px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};


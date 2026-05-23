import { Component, StrictMode } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Rase Launcher Render Error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#f0ece3',
          color: '#1c1917',
          fontFamily: 'Outfit, sans-serif',
          padding: '24px',
          boxSizing: 'border-box',
          textAlign: 'center',
          userSelect: 'text'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#e8553a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(232, 85, 58, 0.2)'
            }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '24px', color: '#ffffff' }} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '8px 0 0 0', color: '#1c1917' }}>Uygulama Hatası</h1>
            <p style={{ fontSize: '12px', color: '#8a857e', margin: '4px 0 0 0' }}>Yükleme veya render sırasında beklenmeyen bir hata oluştu.</p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #d8d2c6',
            borderRadius: '8px',
            padding: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '260px',
            overflowY: 'auto',
            textAlign: 'left',
            fontFamily: 'monospace',
            fontSize: '11px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            color: '#9b1c1c',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)'
          }}>
            {this.state.error && this.state.error.toString()}
            {this.state.errorInfo && `\n\nComponent Stack:\n${this.state.errorInfo.componentStack}`}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#e8553a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d44530'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8553a'}
            >
              Yeniden Başlat
            </button>
            <button
              onClick={async () => {
                try {
                  // Fallback to clearing active session settings if corrupted
                  const current = await window.electronAPI.getSettings();
                  await window.electronAPI.saveSettings({
                    ...current,
                    lastVersion: '1.20.4',
                    lastLoader: 'vanilla',
                    showSnapshots: false,
                    showHistorical: false,
                    showOnlyInstalled: false
                  });
                  window.location.reload();
                } catch (e) {
                  window.location.reload();
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: '#8a857e',
                border: '1px solid #d8d2c6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                transition: 'all 0.15s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#1c1917';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#8a857e';
              }}
            >
              Ayarları Sıfırla &amp; Başlat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

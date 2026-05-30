import React, { useState, useEffect, useRef } from 'react';

interface QrPopupProps {
  qrDataURL: string;
  ipAddress: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_SECONDS = 15;

export const QrPopup: React.FC<QrPopupProps> = ({ qrDataURL, ipAddress, onDismiss }) => {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState(AUTO_DISMISS_SECONDS);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Entry animation trigger
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Countdown timer
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 200);
  };

  const handleCopyIp = () => {
    navigator.clipboard.writeText(ipAddress).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const progressPercent = (timeLeft / AUTO_DISMISS_SECONDS) * 100;

  return (
    <>
      <style>{`
        @keyframes qr-phone-pulse {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 8px rgba(232,85,58,0.6)); }
          50% { transform: translateY(-4px) scale(1.08); filter: drop-shadow(0 0 16px rgba(232,85,58,0.9)); }
        }
        @keyframes qr-dot-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          50% { opacity: 0.8; box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
        @keyframes qr-progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.2s ease',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            maxWidth: '360px',
            width: '90%',
            background: 'rgba(12,13,22,0.92)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '28px 24px 0 24px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s ease',
            transform: visible ? 'scale(1)' : 'scale(0.82)',
            opacity: visible ? 1 : 0,
          }}
        >
          {/* Phone Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <i
              className="ti ti-device-mobile"
              style={{
                fontSize: '40px',
                color: '#e8553a',
                animation: 'qr-phone-pulse 2.4s ease-in-out infinite',
                display: 'block',
              }}
            />
          </div>

          {/* Title */}
          <h2
            style={{
              margin: '0 0 6px 0',
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}
          >
            Telefon Kumandasını Bağla
          </h2>

          {/* Subtitle */}
          <p
            style={{
              margin: '0 0 20px 0',
              textAlign: 'center',
              fontSize: '11.5px',
              color: '#9a9490',
              lineHeight: '1.5',
            }}
          >
            Telefon ve bilgisayarın aynı Wi-Fi ağında olduğundan emin ol
          </p>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
            >
              <img
                src={qrDataURL}
                alt="QR Code"
                style={{
                  width: '180px',
                  height: '180px',
                  display: 'block',
                  borderRadius: '6px',
                  imageRendering: 'pixelated',
                }}
              />
            </div>
          </div>

          {/* IP Address */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <button
              onClick={handleCopyIp}
              title="Kopyala"
              style={{
                background: 'rgba(232,85,58,0.1)',
                border: '1px solid rgba(232,85,58,0.25)',
                borderRadius: '8px',
                padding: '7px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
                  fontSize: '12.5px',
                  fontWeight: '600',
                  color: '#e8553a',
                  letterSpacing: '0.02em',
                }}
              >
                {copied ? 'Kopyalandı!' : ipAddress}
              </span>
              <i
                className={copied ? 'ti ti-check' : 'ti ti-copy'}
                style={{ fontSize: '13px', color: copied ? '#22c55e' : '#e8553a' }}
              />
            </button>
          </div>

          {/* Server status indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                display: 'inline-block',
                animation: 'qr-dot-pulse 1.8s ease-in-out infinite',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: '11px', color: '#9a9490', letterSpacing: '0.02em' }}>
              Sunucu Aktif · Port 7823
            </span>
          </div>

          {/* Dismiss button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <button
              onClick={handleDismiss}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '8px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#9a9490',
                fontSize: '12px',
                fontWeight: '500',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)';
                (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLButtonElement).style.color = '#9a9490';
              }}
            >
              <i className="ti ti-x" style={{ fontSize: '13px' }} />
              <span>Kapat ({timeLeft}s)</span>
            </button>
          </div>

          {/* Progress bar at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, #e8553a, #f47055)',
                borderRadius: '0 2px 2px 0',
                transition: 'width 1s linear',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
};

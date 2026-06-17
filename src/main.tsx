// 统一入口：根据路径路由到 pad / space / logs / new space 四个子应用
import React, { Suspense, lazy, useEffect, useCallback, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './apps/pad/index.css';

const preloadOnce = <T,>(loader: () => Promise<T>) => {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) promise = loader();
    return promise;
  };
};

const preloadPadApp = preloadOnce(() => import('./apps/pad/App'));
const preloadSpaceApp = preloadOnce(() => import('./apps/space/App'));
const preloadLogsApp = preloadOnce(() => import('./apps/logs/App'));
const preloadNewSpaceApp = preloadOnce(() => import('./apps/new space/App'));

const PadApp = lazy(() => preloadPadApp());
const SpaceApp = lazy(() => preloadSpaceApp());
const LogsApp = lazy(() => preloadLogsApp());
const NewSpaceApp = lazy(() => preloadNewSpaceApp());

const AppRouteFallback = () => (
  <div style={{ 
    background: '#0a1020', 
    color: '#00dcc8', 
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif', 
    display: 'grid', 
    placeItems: 'center', 
    height: '100vh',
    backgroundImage: `
      radial-gradient(ellipse at 20% 10%, rgba(0,220,200,0.12) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 90%, rgba(139,92,246,0.08) 0%, transparent 50%)
    `,
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px', height: '40px',
        border: '2px solid rgba(0,220,200,0.15)',
        borderTopColor: '#00dcc8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto 16px'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '1px' }}>加载中...</div>
    </div>
  </div>
);

interface ShortcutConfig {
  space: string;
  pad: string;
  logs: string;
  newSpace: string;
}

const STORAGE_KEY = 'iobs-shortcut-config';

const defaultShortcuts: ShortcutConfig = {
  space: '1',
  pad: '2',
  logs: '3',
  newSpace: '4',
};

const loadShortcuts = (): ShortcutConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultShortcuts, ...JSON.parse(saved) };
    }
  } catch {}
  return defaultShortcuts;
};

const saveShortcuts = (config: ShortcutConfig) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
};

const ShortcutSettingsModal: React.FC<{
  shortcuts: ShortcutConfig;
  onSave: (config: ShortcutConfig) => void;
  onClose: () => void;
}> = ({ shortcuts, onSave, onClose }) => {
  const [config, setConfig] = useState(shortcuts);
  const [activeInput, setActiveInput] = useState<keyof ShortcutConfig | null>(null);

  const handleKeyCapture = (e: React.KeyboardEvent, key: keyof ShortcutConfig) => {
    e.preventDefault();
    if (e.key === 'Escape') {
      setActiveInput(null);
      return;
    }
    if (e.key.length === 1 || e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4' || e.key === 'F5' || e.key === 'F6' || e.key === 'F7' || e.key === 'F8' || e.key === 'F9' || e.key === 'F10' || e.key === 'F11' || e.key === 'F12') {
      setConfig(prev => ({ ...prev, [key]: e.key }));
      setActiveInput(null);
    }
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleReset = () => {
    setConfig(defaultShortcuts);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #111a2e 0%, #0c1424 100%)',
        border: '1px solid rgba(0,220,200,0.25)',
        borderRadius: '16px',
        padding: '28px',
        minWidth: '420px',
        maxWidth: '90vw',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(0,220,200,0.08)',
      }}>
        <h2 style={{ color: '#00dcc8', margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '1px' }}>⚙️ 快捷键设置</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[
            { key: 'space' as const, label: '手术床空间站系统', color: '#00ffff' },
            { key: 'pad' as const, label: 'Pad 控制系统', color: '#7af7df' },
            { key: 'logs' as const, label: '监控日志系统', color: '#44aadd' },
            { key: 'newSpace' as const, label: '新界面系统', color: '#7af7df' },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.88rem', fontWeight: 500 }}>{label}</span>
              <div
                tabIndex={0}
                onClick={() => setActiveInput(key)}
                onKeyDown={(e) => handleKeyCapture(e, key)}
                style={{
                  width: '80px',
                  height: '38px',
                  background: activeInput === key ? 'rgba(0,220,200,0.12)' : 'rgba(10,21,32,0.8)',
                  border: activeInput === key ? `2px solid ${color}` : `1px solid ${color}40`,
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color,
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: activeInput === key ? `0 0 16px ${color}30` : 'none',
                }}
              >
                {activeInput === key ? '按下按键...' : config[key].toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '28px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleReset}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#475569'; e.currentTarget.style.color = '#94a3b8'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#64748b'; }}
          >
            恢复默认
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: 'transparent',
              border: '1px solid rgba(0,220,200,0.35)',
              borderRadius: '8px',
              color: '#00dcc8',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(0,220,200,0.6)'; e.currentTarget.style.background = 'rgba(0,220,200,0.08)'; }}
            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(0,220,200,0.35)'; e.currentTarget.style.background = 'transparent'; }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '9px 22px',
              background: 'linear-gradient(135deg, #00dcc8 0%, #00b5a8 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#0a1628',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: '0 4px 15px rgba(0,220,200,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(0,220,200,0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,220,200,0.3)'; }}
          >
            保存
          </button>
        </div>

        <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '18px', marginBottom: 0 }}>
          提示：点击输入框后按下想要设置的按键，支持字母、数字和F1-F12功能键
        </p>
      </div>
    </div>
  );
};

const NavigationPage = () => {
  const navigate = useNavigate();
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(loadShortcuts);
  const [showSettings, setShowSettings] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = e.key.toLowerCase();
    if (key === shortcuts.space.toLowerCase()) {
      navigate('/shoushuchuang');
    } else if (key === shortcuts.pad.toLowerCase()) {
      navigate('/pad');
    } else if (key === shortcuts.logs.toLowerCase()) {
      navigate('/logs');
    } else if (key === shortcuts.newSpace.toLowerCase()) {
      navigate('/new-space');
    }
  }, [navigate, shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSaveShortcuts = (config: ShortcutConfig) => {
    setShortcuts(config);
    saveShortcuts(config);
  };

  const shortcutHint = `[${shortcuts.space.toUpperCase()}] 空间站 | [${shortcuts.pad.toUpperCase()}] Pad | [${shortcuts.logs.toUpperCase()}] 日志 | [${shortcuts.newSpace.toUpperCase()}] 新界面`;

  const cardStyle = (borderColor: string, bgColor: string, glowColor: string) => ({
    padding: '36px',
    border: `1.5px solid ${borderColor}`,
    color: borderColor,
    textDecoration: 'none' as const,
    borderRadius: '18px',
    textAlign: 'center' as const,
    transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
    background: bgColor,
    position: 'relative' as const,
    overflow: 'hidden',
    cursor: 'pointer',
  });

  return (
    <div style={{
      background: '#0a1020',
      color: '#e2e8f0',
      fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(ellipse at 20% 10%, rgba(0,220,200,0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 90%, rgba(139,92,246,0.1) 0%, transparent 50%),
          radial-gradient(ellipse at 60% 40%, rgba(59,130,246,0.08) 0%, transparent 55%)
        `,
        pointerEvents: 'none',
        animation: 'bgShift 12s ease-in-out infinite alternate',
      }} />

      <style>{`
        @keyframes bgShift {
          0% { opacity: 0.85; transform: scale(1); }
          100% { opacity: 1; transform: scale(1.03); }
        }
        @keyframes floatIn {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,220,200,0); }
          50% { box-shadow: 0 0 0 8px rgba(0,220,200,0); }
        }
      `}</style>

      <button
        onClick={() => setShowSettings(true)}
        style={{
          position: 'absolute',
          top: '20px',
          right: '24px',
          background: 'rgba(22,38,56,0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px',
          color: '#64748b',
          padding: '9px 16px',
          cursor: 'pointer',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          transition: 'all 0.25s',
          zIndex: 10,
        }}
        onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(0,220,200,0.3)'; e.currentTarget.style.color = '#00dcc8'; }}
        onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#64748b'; }}
      >
        <span>⚙️</span> 快捷键设置
      </button>

      <div style={{ zIndex: 1, animation: 'floatIn 0.6s ease-out', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: 'clamp(1.8rem,3.5vw,2.8rem)', 
          marginBottom: '8px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1.2,
        }}>
          IOBS Unified Control Center
        </h1>
        <p style={{ color: '#00dcc8', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px', letterSpacing: '2px' }}>统一控制台</p>
        <p style={{ color: '#475569', fontSize: '0.78rem', marginBottom: '32px', fontFamily: '"JetBrains Mono", monospace' }}>PORT 3001 · {shortcutHint}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '820px', width: '92%', zIndex: 1 }}>
        <a
          href="/new-space"
          onMouseEnter={preloadNewSpaceApp}
          onFocus={preloadNewSpaceApp}
          onTouchStart={preloadNewSpaceApp}
          {...{
            style: cardStyle('rgba(122,247,223,0.5)', 'rgba(122,247,223,0.06)', 'rgba(122,247,223,0.15)'),
            onMouseOver: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = '#7af7df';
              el.style.background = 'rgba(122,247,223,0.12)';
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 12px 40px rgba(122,247,223,0.15), 0 0 0 1px rgba(122,247,223,0.1)';
            },
            onMouseOut: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(122,247,223,0.5)';
              el.style.background = 'rgba(122,247,223,0.06)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            },
          }}
        >
          <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'linear-gradient(135deg, rgba(122,247,223,0.25), rgba(122,247,223,0.08))', border: '1px solid rgba(122,247,223,0.25)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.5px' }}>按 {shortcuts.newSpace.toUpperCase()}</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px', letterSpacing: '-0.3px' }}>新界面系统</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '6px', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>New Space Dashboard</div>
        </a>

        <a
          href="/shoushuchuang"
          onMouseEnter={preloadSpaceApp}
          onFocus={preloadSpaceApp}
          onTouchStart={preloadSpaceApp}
          {...{
            style: cardStyle('rgba(0,255,255,0.45)', 'rgba(0,255,255,0.04)', 'rgba(0,255,255,0.12)'),
            onMouseOver: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = '#00ffff';
              el.style.background = 'rgba(0,255,255,0.1)';
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 12px 40px rgba(0,255,255,0.12), 0 0 0 1px rgba(0,255,255,0.08)';
            },
            onMouseOut: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(0,255,255,0.45)';
              el.style.background = 'rgba(0,255,255,0.04)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            },
          }}
        >
          <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(0,255,255,0.06))', border: '1px solid rgba(0,255,255,0.2)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.5px' }}>按 {shortcuts.space.toUpperCase()}</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px', letterSpacing: '-0.3px' }}>手术床空间站系统</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '6px', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Station System</div>
        </a>

        <a
          href="/pad"
          onMouseEnter={preloadPadApp}
          onFocus={preloadPadApp}
          onTouchStart={preloadPadApp}
          {...{
            style: cardStyle('rgba(0,255,255,0.4)', 'rgba(0,255,255,0.04)', 'rgba(0,255,255,0.1)'),
            onMouseOver: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = '#00e5ff';
              el.style.background = 'rgba(0,255,255,0.09)';
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 12px 40px rgba(0,229,255,0.1), 0 0 0 1px rgba(0,229,255,0.07)';
            },
            onMouseOut: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(0,255,255,0.4)';
              el.style.background = 'rgba(0,255,255,0.04)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            },
          }}
        >
          <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'linear-gradient(135deg, rgba(0,255,255,0.18), rgba(0,255,255,0.05))', border: '1px solid rgba(0,255,255,0.18)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.5px' }}>按 {shortcuts.pad.toUpperCase()}</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px', letterSpacing: '-0.3px' }}>Pad 控制系统</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '6px', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>iPad Control</div>
        </a>

        <a
          href="/logs"
          onMouseEnter={preloadLogsApp}
          onFocus={preloadLogsApp}
          onTouchStart={preloadLogsApp}
          {...{
            style: cardStyle('rgba(68,170,221,0.5)', 'rgba(68,170,221,0.06)', 'rgba(68,170,221,0.12)'),
            onMouseOver: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = '#44aadd';
              el.style.background = 'rgba(68,170,221,0.12)';
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 12px 40px rgba(68,170,221,0.15), 0 0 0 1px rgba(68,170,221,0.1)';
            },
            onMouseOut: (e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(68,170,221,0.5)';
              el.style.background = 'rgba(68,170,221,0.06)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            },
          }}
        >
          <div style={{ position: 'absolute', top: '12px', left: '14px', background: 'linear-gradient(135deg, rgba(68,170,221,0.25), rgba(68,170,221,0.08))', border: '1px solid rgba(68,170,221,0.25)', padding: '3px 10px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.5px' }}>按 {shortcuts.logs.toUpperCase()}</div>
          <div style={{ fontSize: '1.35rem', fontWeight: 700, marginTop: '8px', letterSpacing: '-0.3px' }}>监控日志系统</div>
          <div style={{ fontSize: '0.78rem', opacity: 0.5, marginTop: '6px', fontFamily: '"JetBrains Mono", monospace', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Monitoring Logs</div>
        </a>
      </div>

      <div style={{ 
        position: 'absolute', bottom: '28px', left: 0, right: 0, textAlign: 'center', zIndex: 1,
        color: '#334155', fontSize: '0.72rem', letterSpacing: '1px'
      }}>
        © IOBS Intelligent Operating Bed System
      </div>

      {showSettings && (
        <ShortcutSettingsModal
          shortcuts={shortcuts}
          onSave={handleSaveShortcuts}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Suspense fallback={<AppRouteFallback />}>
        <Routes>
          <Route path="/" element={<NavigationPage />} />
          <Route path="/pad/*" element={<PadApp />} />
          <Route path="/shoushuchuang/*" element={<SpaceApp />} />
          <Route path="/new-space/*" element={<NewSpaceApp />} />
          <Route path="/logs/*" element={<LogsApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </React.StrictMode>
);
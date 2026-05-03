import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { auth } from './firebase';
import { CheckCircleFilled, CloseCircleFilled, LoadingOutlined, ReloadOutlined } from '@ant-design/icons';
import Chat from './components/Chat';
import Therapy from './components/Therapy';
import './index.css';

type SystemStatus = 'checking' | 'online' | 'error' | 'retrying';

const App: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<SystemStatus>('checking');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [retryCount, setRetryCount] = useState(0);
  const [connError, setConnError] = useState(false);
  const [blockerDismissed, setBlockerDismissed] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const isDevMode = localStorage.getItem('devMode') === 'true';

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [darkMode]);

  // Listen for dark mode changes from other components
  useEffect(() => {
    const handleDarkModeChange = (e: any) => {
      setDarkMode(e.detail);
    };
    window.addEventListener('darkModeChanged', handleDarkModeChange);
    return () => window.removeEventListener('darkModeChanged', handleDarkModeChange);
  }, []);

  // Listen for CONN ERROR events from child components
  useEffect(() => {
    const handleServerError = () => {
      setServerStatus('error');
      setStatusMessage('Connection lost to AI server');
    };
    window.addEventListener('nanochat-server-error', handleServerError);
    return () => window.removeEventListener('nanochat-server-error', handleServerError);
  }, []);

  // Auth listener
  useEffect(() => {
    console.log("App: Initializing auth listener...");
    if (!auth || !auth.onAuthStateChanged) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      console.log("App: Auth state changed. User:", user ? user.uid : "None");
      setAuthLoading(false);
    });

    const timer = setTimeout(() => {
      console.warn("App: Auth initialization timed out after 5s.");
      setAuthLoading(false);
    }, 5000);

    if (isDevMode) {
      console.log("App: Dev mode detected, bypassing auth loading.");
      setAuthLoading(false);
    }
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isDevMode]);

  // Server health check
  useEffect(() => {
    let cancelled = false;
    const apiUrl = localStorage.getItem('apiUrl') || import.meta.env.VITE_OLLAMA_ENDPOINT || 'https://necessitative-freeda-serologically.ngrok-free.dev';

    const checkHealth = async (attempt: number) => {
      if (cancelled) return;

      if (!apiUrl || apiUrl === 'undefined' || apiUrl === 'null') {
        setServerStatus('error');
        setStatusMessage('No AI mode found!');
        return;
      }

      setStatusMessage(attempt > 0 ? `Reconnecting to server (attempt ${attempt + 1})...` : 'Connecting to AI server...');
      setServerStatus(attempt > 0 ? 'retrying' : 'checking');

      try {
        const baseUrl = apiUrl.replace(/\/api\/chat$/, '');
        const healthUrl = `${baseUrl}/api/health`;
        const response = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: AbortSignal.timeout(8000),
        });

        if (!cancelled) {
          if (response.ok) {
            setServerStatus('online');
            setStatusMessage('Systems online');
          } else {
            throw new Error(`Server returned ${response.status}`);
          }
        }
      } catch (e) {
        if (cancelled) return;
        console.error(`Health check attempt ${attempt + 1} failed:`, e);

        if (attempt < 2) {
          setRetryCount(attempt + 1);
          setTimeout(() => checkHealth(attempt + 1), 3000);
        } else {
          setServerStatus('error');
          setStatusMessage('Unable to reach AI server');
        }
      }
    };

    checkHealth(0);
    return () => { cancelled = true; };
  }, []);

  const isSystemReady = !authLoading && serverStatus === 'online';
  const showBlocker = !isSystemReady && !blockerDismissed;

  const handleRetry = () => {
    setRetryCount(0);
    setConnError(false);
    setServerStatus('checking');
    setStatusMessage('Reconnecting...');

    const apiUrl = localStorage.getItem('apiUrl') || import.meta.env.VITE_OLLAMA_ENDPOINT || 'https://necessitative-freeda-serologically.ngrok-free.dev';
    const baseUrl = apiUrl?.replace(/\/api\/chat$/, '') || '';
    const healthUrl = `${baseUrl}/api/health`;

    fetch(healthUrl, {
      method: 'GET',
      headers: { 'ngrok-skip-browser-warning': 'true' },
      signal: AbortSignal.timeout(8000),
    })
      .then(res => {
        if (res.ok) {
          setServerStatus('online');
          setStatusMessage('Systems online');
        } else {
          throw new Error('Server error');
        }
      })
      .catch(() => {
        setServerStatus('error');
        setStatusMessage('Unable to reach AI server');
      });
  };

  return (
    <>
      {/* Always render the app behind the overlay */}
      <Router>
        <Routes>
          <Route path="/therapy" element={<Therapy />} />
          <Route path="/*" element={<Chat />} />
        </Routes>
      </Router>

      {/* Blocking overlay on top of the app */}
      {showBlocker && (
        <div style={{
          ...overlayStyle,
          background: darkMode ? 'rgba(11, 12, 16, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}>
          <div style={dialogStyle}>
            {/* Animated logo */}
            <div style={logoContainerStyle}>
              <div style={logoOrbStyle}>
                <div style={orbInnerStyle} />
              </div>
            </div>

            <h1 style={{ ...titleStyle, color: darkMode ? '#ffffff' : '#111827' }}>Nanochat</h1>
            <p style={{ ...subtitleStyle, color: darkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>Firing on all pistons...</p>

            {/* Status steps */}
            <div style={stepsContainerStyle}>
              <StatusStep
                label="Authentication"
                status={authLoading ? 'loading' : 'done'}
                darkMode={darkMode}
              />
              <StatusStep
                label="AI Server"
                status={
                  serverStatus === 'checking' || serverStatus === 'retrying'
                    ? 'loading'
                    : serverStatus === 'online'
                      ? 'done'
                      : 'error'
                }
                darkMode={darkMode}
              />
            </div>

            <p style={{ ...messageStyle, color: darkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.5)' }}>{statusMessage}</p>

            {/* Progress bar */}
            <div style={progressTrackStyle}>
              <div
                style={{
                  ...progressBarStyle,
                  width: serverStatus === 'online' && !authLoading ? '100%' :
                    serverStatus === 'error' ? '100%' :
                      retryCount > 0 ? `${30 + retryCount * 25}%` : '40%',
                  background: serverStatus === 'error'
                    ? 'linear-gradient(90deg, #ff4d4f, #ff7875)'
                    : 'linear-gradient(90deg, #ff8c42, #ffb347, #ff8c42)',
                  backgroundSize: '200% 100%',
                  animation: serverStatus !== 'online' && serverStatus !== 'error'
                    ? 'shimmer 1.5s ease-in-out infinite' : 'none',
                }}
              />
            </div>

            {serverStatus === 'online' && !authLoading && (
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <div style={{
                  fontSize: 13, color: '#52c41a', fontWeight: 600,
                  margin: '0 0 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <CheckCircleFilled style={{ fontSize: 18 }} />
                  Model loaded and ready!
                </div>
                <button
                  style={{ ...retryBtnStyle, background: 'linear-gradient(135deg, #52c41a, #73d13d)' }}
                  onClick={() => setBlockerDismissed(true)}
                >
                  Proceed to Chat
                </button>
              </div>
            )}

            {serverStatus === 'error' && (
              <div style={{ marginTop: 20 }}>
                <p style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.7, margin: '0 0 8px', textAlign: 'center',
                }}>
                  {connError
                    ? 'We run a tight ship and sometimes we are unable to serve the model. Please try again later.'
                    : 'We run a tight ship and sometimes we are unable to serve the model. Please try again later.'}
                </p>
                <p style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.35)',
                  margin: '0 0 20px', textAlign: 'center',
                }}>
                  For more info, reach out at{' '}
                  <a
                    href="mailto:dixontheworldvsy@gmail.com"
                    style={{ color: '#ff8c42', textDecoration: 'none' }}
                  >
                    dixontheworldvsy@gmail.com
                  </a>
                </p>
                <div style={errorActionsStyle}>
                  <button
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
                      fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                    onClick={() => {
                      setServerStatus('online');
                      setBlockerDismissed(true);
                    }}
                  >
                    Proceed Anyway
                  </button>
                  <button style={{ ...retryBtnStyle, background: 'rgba(255,255,255,0.08)' }} onClick={handleRetry}>
                    <ReloadOutlined style={{ marginRight: 6 }} />
                    Retry Connection
                  </button>
                </div>
              </div>
            )}
          </div>

          <style>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            @keyframes pulse-orb {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.15); opacity: 1; }
            }
            @keyframes spin-slow {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes fade-in-overlay {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slide-up {
              from { opacity: 0; transform: translateY(30px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </>
  );
};

/* --- Sub-component --- */

const StatusStep: React.FC<{ label: string; status: 'loading' | 'done' | 'error'; darkMode: boolean }> = ({ label, status, darkMode }) => (
  <div style={stepRowStyle}>
    <div style={{
      width: 22, height: 22,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: 16,
      transition: 'all 0.4s ease',
    }}>
      {status === 'done' && <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />}
      {status === 'error' && <CloseCircleFilled style={{ color: '#ff4d4f', fontSize: 16 }} />}
      {status === 'loading' && <LoadingOutlined style={{ color: '#ff8c42', fontSize: 16 }} spin />}
    </div>
    <span style={{
      fontSize: 13, fontWeight: 500,
      color: status === 'done' ? (darkMode ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)') :
        status === 'error' ? '#ff7875' : (darkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'),
      transition: 'color 0.4s ease',
    }}>
      {label}
    </span>
  </div>
);

/* --- Styles --- */

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 99999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  animation: 'fade-in-overlay 0.4s ease-out',
};

const dialogStyle: React.CSSProperties = {
  textAlign: 'center', padding: '48px 40px',
  borderRadius: 24, maxWidth: 380, width: '90%',
  background: 'transparent',
  border: 'none',
  animation: 'slide-up 0.5s ease-out',
};

const logoContainerStyle: React.CSSProperties = {
  marginBottom: 24, display: 'flex', justifyContent: 'center',
};

const logoOrbStyle: React.CSSProperties = {
  width: 64, height: 64, borderRadius: '50%',
  background: 'linear-gradient(135deg, #ff8c42 0%, #ffb347 50%, #ff6b35 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 0 40px rgba(255, 140, 66, 0.3), 0 0 80px rgba(255, 140, 66, 0.1)',
};

const orbInnerStyle: React.CSSProperties = {
  width: 28, height: 28, borderRadius: '50%',
  border: '2.5px solid rgba(255,255,255,0.9)',
  borderTopColor: 'transparent',
  animation: 'spin-slow 1.2s linear infinite',
};

const titleStyle: React.CSSProperties = {
  margin: 0, fontSize: 28, fontWeight: 700,
  color: '#fff', letterSpacing: '-0.5px',
  fontFamily: "'Inter', -apple-system, sans-serif",
};

const subtitleStyle: React.CSSProperties = {
  margin: '6px 0 28px', fontSize: 13,
  color: 'rgba(255,255,255,0.4)', fontWeight: 400,
};

const stepsContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 10,
  marginBottom: 24, padding: '0 12px',
};

const stepRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
};

const messageStyle: React.CSSProperties = {
  fontSize: 12, color: 'rgba(255,255,255,0.35)',
  margin: '0 0 20px', fontWeight: 400,
};

const progressTrackStyle: React.CSSProperties = {
  height: 3, borderRadius: 3, overflow: 'hidden',
  background: 'rgba(255,255,255,0.06)', marginBottom: 0,
};

const progressBarStyle: React.CSSProperties = {
  height: '100%', borderRadius: 3,
  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
};

const errorActionsStyle: React.CSSProperties = {
  display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20,
};

const retryBtnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #ff8c42, #ff6b35)',
  color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', transition: 'transform 0.2s',
  display: 'flex', alignItems: 'center',
};

export default App;

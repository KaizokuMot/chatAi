import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Spin, Popover } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { auth } from '../firebase';
import LoginModal from './LoginModal';
import Sidebar from './Sidebar';
import Settings from './Settings';
import Orb from './Orb';
import { useMossVoice } from '../hooks/useMossVoice';
import { SYSTEM_PROMPTS } from '../config/aiPersonality';
import './Therapy.css';

const Therapy: React.FC = () => {
  const apiUrl = localStorage.getItem('apiUrl') || import.meta.env.VITE_OLLAMA_ENDPOINT;
  const isDevMode = localStorage.getItem('devMode') === 'true';

  const [userName, setUserName] = useState<string | null>(localStorage.getItem('therapy_user_name'));
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [lastUserTranscript, setLastUserTranscript] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { 
    speakText, 
    isSpeaking, 
    isGeneratingVoice,
    engineStatus, 
    progress, 
    chunkCount,
    normalizedText,
    forceReset
  } = useMossVoice();


  const [isListening, setIsListening] = useState(false);
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(true);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [ttsStatus, setTtsStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [isStarted, setIsStarted] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [adminSettingsVisible, setAdminSettingsVisible] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState(apiUrl);
  const hasWarmedUp = useRef(false);
  const lastErrorRef = useRef<{ time: number; type: string } | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  const checkSystemHealth = async () => {
    // Check Microphone permissions
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicStatus(result.state);
        result.onchange = () => setMicStatus(result.state);
      } catch (e) {
        // Fallback for browsers that don't support mic query
        navigator.mediaDevices.getUserMedia({ audio: true }).then(() => setMicStatus('granted')).catch(() => setMicStatus('denied'));
      }
    }

    try {
      const baseUrl = apiUrl.replace(/\/api\/chat$/, '');
      const healthUrl = `${baseUrl}/api/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true'
        }
      });

      if (response.ok || response.status === 404) setServerStatus('online');
      else setServerStatus('error');
    } catch (e) {
      setServerStatus('error');
    }

    try {
      const ttsUrl = localStorage.getItem('ttsUrl') || 'https://mdx.tail299d7f.ts.net';
      if (!ttsUrl) {
        setTtsStatus('error');
      } else {
        const response = await fetch(`${ttsUrl}/health`, {
          method: 'GET',
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (response.ok) {
          const data = await response.json();
          console.log("[Therapy] Health check success:", data);
          setTtsStatus('online');
          // Trigger silent warmup in background (ONLY ONCE)
          if (!hasWarmedUp.current) {
            hasWarmedUp.current = true;
            console.log("[Therapy] Triggering background TTS warmup...");
            fetch(`${ttsUrl}/api/tts/warmup`, { 
              method: 'POST', 
              headers: { 'ngrok-skip-browser-warning': 'true' } 
            }).catch(() => {});
          }
        } else {
          setTtsStatus('error');
        }
      }
    } catch (e) {
      console.error("Failed to connect to MOSS-TTS API:", e);
      setTtsStatus('error');
    }
  };

  useEffect(() => {
    checkSystemHealth();
    initSpeechRecognition();
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  useEffect(() => {
    // Auto-start greeting once everything is ready
    if (serverStatus === 'online' && ttsStatus === 'online' && !isStarted) {
      setIsStarted(true);
      // greetUser() will be triggered by the next effect
    }
  }, [serverStatus, ttsStatus, isStarted]);

  useEffect(() => {
    if (serverStatus === 'online' && ttsStatus === 'online' && isStarted && messages.length === 0) {
      greetUser();
    }
    if (serverStatus === 'error' || ttsStatus === 'error') {
      message.error("One or more systems are offline. Dela might not be able to talk properly.");
    }
  }, [serverStatus, ttsStatus, isStarted]);


  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        console.log("Speech Recognition started");
      };

      recognition.onend = () => {
        setIsListening(false);
        console.log("Speech Recognition ended");
      };

      recognition.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        
        if (event.error === 'network') {
          console.warn("Network error detected, disabling auto-restart safety.");
          lastErrorRef.current = { time: Date.now(), type: 'network' };
          setIsListening(false);
          try { recognition.stop(); } catch(e) {}
        } else if (event.error === 'audio-capture') {
          message.error("Could not access microphone. Please check your system settings.");
          setIsListening(false);
          // Do NOT auto-restart on capture error
        } else {
          setIsListening(false);
        }
      };
      
      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }
        if (final) {
          setInterimTranscript('');
          handleReceiveVoice(final);
        }
      };
    } else {
      message.warning("Your browser does not support Speech Recognition. Try using Chrome.");
    }
  };

  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<any>(null);


  useEffect(() => {
    if (isListening || isSpeaking) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
  }, [isListening, isSpeaking]); 
  
  const logout = () => {
    if (isDevMode) {
      localStorage.removeItem('devMode');
      window.location.reload();
    } else {
      auth.signOut();
      window.location.reload();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening, isSpeaking]); // Reverting to 2 dependencies to match previous stable state and avoid HMR errors, isGeneratingVoice is handled by the generation loop state

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startListening = () => {
    // Cooldown check for network errors
    if (lastErrorRef.current?.type === 'network' && Date.now() - lastErrorRef.current.time < 3000) {
      message.warning("Waiting for connection to stabilize...");
      return;
    }

    if (recognitionRef.current && !isListening && !isSpeaking && !isGenerating && !isGeneratingVoice) {
      try {
        setInterimTranscript('');
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech Recognition start error:", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    // If we're generating or speaking, a tap acts as a 'Force Reset'
    if (isGenerating || isGeneratingVoice || isSpeaking) {
      forceReset();
      setIsGenerating(false);
      return;
    }
    
    if (isListening) stopListening();
    else startListening();
  };



  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Secret Shortcut: Ctrl + S (or Alt + S) to open Admin Settings
      if ((e.ctrlKey || e.altKey) && e.key === 's') {
        e.preventDefault();
        setAdminSettingsVisible(prev => !prev);
        message.info("Admin Controls toggled");
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const greetUser = async () => {
    const greeting = "Hey! My name is Dela. It's a pleasure to meet you. To get started, may I ask your name?";
    setMessages([{ role: 'assistant', content: greeting }]);
    speakText(greeting);
  };



  const handleReceiveVoice = async (transcript: string) => {
    if (isGenerating || !transcript) return;

    const userMsg = transcript.trim();
    setLastUserTranscript(userMsg);
    // Hide transcript after 3 seconds
    setTimeout(() => setLastUserTranscript(null), 3000);

    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setIsGenerating(true);

    if (!userName) {
      setUserName(userMsg);
      localStorage.setItem('therapy_user_name', userMsg);
    }

    try {
      abortControllerRef.current = new AbortController();
      const modelName = localStorage.getItem('modelName') || 'gemma3:1b';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: "system", content: SYSTEM_PROMPTS.THERAPY },
            ...newMessages
          ],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = data.message?.content || "I am here to listen.";
        setMessages(prev => [...prev, { role: 'assistant', content: botResponse }]);
        speakText(botResponse);
      }
    } catch (err) {
      if (!(err instanceof Error && err.name === 'AbortError')) {
        console.error("API Error:", err);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const stopAndClear = async () => {
    setIsGenerating(false);
    setIsListening(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    if (recognitionRef.current) recognitionRef.current.stop();

    setMessages([]);
    setUserName(null);
    localStorage.removeItem('therapy_user_name');

    message.info("Session reset. No data kept.");
    greetUser();
  };

  const handleTestVoice = () => {
    const testMsg = "Hello. I am ready to assist you today. How are you feeling?";
    speakText(testMsg);
    message.success("Test voice triggered.");
  };





  const statusContent = (
    <>
      <div className="system-status-group">
        <div className={`status-badge ${serverStatus}`}>BRAIN</div>
        <div className={`status-badge ${ttsStatus}`}>MOSS</div>
        <div className={`status-badge ${micStatus === 'granted' ? 'online' : micStatus === 'denied' ? 'error' : 'checking'}`}>
          MIC: {micStatus.toUpperCase()}
        </div>
        <Button 
          size="small" 
          type="primary" 
          ghost 
          onClick={handleTestVoice} 
          style={{ fontSize: '9px', height: '20px', borderRadius: '10px' }}
        >
          TEST VOICE
        </Button>
      </div>
      <div className="privacy-badge">Private Session</div>
    </>
  );

  return (
    <div className={`therapy-container app-container ${darkMode ? 'dark' : 'light'}`}>
      <Sidebar
        mobileMenuOpen={sidebarOpen}
        setMobileMenuOpen={setSidebarOpen}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        logout={logout}
        setLoginModalVisible={setLoginModalVisible}
        isDevMode={isDevMode}
        hiddenByDefault={isSidebarHidden}
      />

      {/* Premium Warmup Blocker */}
      {(!hasWarmedUp.current || ttsStatus === 'checking') && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: darkMode ? 'rgba(11, 12, 16, 0.98)' : 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          color: darkMode ? '#fff' : '#000'
        }}>
          <div className="orb-main pulsing" style={{ width: 100, height: 100 }}>
             <div className="orb-inner"></div>
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: '1px' }}>
             Waking up Dela...
          </div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
             Engines warming up in the background
          </div>
        </div>
      )}

      <div className="therapy-main">
        {/* Floating Controls */}
        <div className="therapy-controls">
          <Button
            type="text"
            icon={isSidebarHidden ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => {
              setIsSidebarHidden(!isSidebarHidden);
              setSidebarOpen(!sidebarOpen);
            }}
            className="sidebar-toggle-btn"
          />

          <div className="desktop-status-group">
            {statusContent}
          </div>

          <div className="mobile-status-trigger">
            <Popover
              content={<div className="mobile-popover-content">{statusContent}</div>}
              trigger="click"
              placement="bottomRight"
              overlayClassName={darkMode ? 'dark-popover' : 'light-popover'}
            >
              <Button type="text" icon={<InfoCircleOutlined />} className="sidebar-toggle-btn" />
            </Popover>
          </div>
        </div>
        {/* AI Message Overlay Removed as requested for Voice-only experience */}

        {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && isSpeaking && (
          <div className="floating-msg-area">
            <div className="dixon-msg">
              {messages[messages.length - 1].content}
            </div>
          </div>
        )}

        {/* User Transcript Overlay */}
        {lastUserTranscript && (
          <div className="floating-msg-area user-transcript-area">
            <div className="user-msg-bubble">
              "{lastUserTranscript}"
            </div>
          </div>
        )}

        {/* Live Interim Transcript Bubble */}
        {interimTranscript && (
          <div className="floating-msg-area interim-transcript-area">
            <div className="interim-msg-bubble">
              {interimTranscript}
            </div>
          </div>
        )}

        {/* Hero Center - The Orb */}
        <div className="orb-wrapper">
          {serverStatus === 'checking' || ttsStatus === 'checking' ? (
            <div className="warming-up">
              <Spin size="large" />
              <div>warming up engines...</div>
            </div>
          ) : (
            <Orb
              isStarted={isStarted}
              isPlaying={isSpeaking}
              isGenerating={isGenerating || isGeneratingVoice}
              isListening={isListening}
              status={engineStatus}
              progress={progress}
              chunkCount={chunkCount}
              duration={formatDuration(recordingDuration)}
              normalizedText={normalizedText}
              onToggle={() => {
                if (isSpeaking || isGenerating || isGeneratingVoice) {
                  // Block tap during speech as requested
                  return;
                }

                if (!isStarted) {
                  setIsStarted(true);
                } else {
                  toggleListening();
                }
              }}
            />
          )}
        </div>

        {/* Status Indicator instead of Input Overlay */}
        <div className="hero-input-overlay" style={{ border: 'none', background: 'transparent', pointerEvents: 'none' }}>
          {/* <div className={`orb-label ${isListening ? 'listening-active' : ''}`} style={{ fontSize: 14, color: isListening ? '#00ffcc' : 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            {isListening && !interimTranscript

              ? 'Listening...'
              : isSpeaking
                ? engineStatus
                : isGenerating
                  ? 'Thinking...'
                  : 'a ghost in the shell...'}
          </div> */}
        </div>

        {/* Reset Action */}
        <Button
          className="clear-session-btn"
          icon={<CloseOutlined />}
          onClick={stopAndClear}
        >
          Reset Session
        </Button>
      </div>

      <Settings
        visible={adminSettingsVisible}
        onClose={() => setAdminSettingsVisible(false)}
        apiUrl={currentApiUrl}
        setApiUrl={setCurrentApiUrl}
      />
      <LoginModal 
        visible={loginModalVisible} 
        onClose={() => setLoginModalVisible(false)} 
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
};

export default Therapy;

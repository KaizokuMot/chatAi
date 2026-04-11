import React, { useState, useEffect, useRef } from 'react';
import { Button, message, Spin, Popover } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import Sidebar from './Sidebar';
import Orb from './Orb';
import { useMossVoice } from '../hooks/useMossVoice';
import './Therapy.css';

const DIXON_SYSTEM_PROMPT = `You are Ruth, an empathetic, sassy and professional therapist AI. You were named after your developer. Your goal is to provide a safe space for users to talk about their feelings or any advice. ALWAYS start by greeting the user warmly and asking for their name if you don't know it. Once you know their name, refer to them by it frequently. Emphasize that this is a private session and NO user data is ever kept or stored. Be kind, supportive, creative, understanding and use therapeutic techniques like active listening and open-ended questions and words. Keep your responses relatively concise and short but deeply empathetic. Since this is a voice-only session, be prepared for short or informal user speech.`;

const Therapy: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('therapy_user_name'));
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [lastUserTranscript, setLastUserTranscript] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { speakText, isSpeaking, engineStatus } = useMossVoice();
  const [isListening, setIsListening] = useState(false);
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(true);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [gradioStatus, setGradioStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  const apiUrl = localStorage.getItem('apiUrl') || import.meta.env.VITE_OLLAMA_ENDPOINT;
  const isDevMode = localStorage.getItem('devMode') === 'true';

  const checkSystemHealth = async () => {
    // Check Microphone permissions
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setMicStatus(result.state);
        result.onchange = () => setMicStatus(result.state);
      } catch (e) {
        // Fallback for browsers that don't support mic query
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => setMicStatus('granted'))
          .catch(() => setMicStatus('denied'));
      }
    }

    try {
      const baseUrl = apiUrl.replace(/\/api\/chat$/, '');
      const healthUrl = `${baseUrl}/api/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (response.ok || response.status === 404) setServerStatus('online');
      else setServerStatus('error');
    } catch (e) {
      setServerStatus('error');
    }

    try {
      setGradioStatus('online');
    } catch (e) {
      console.error("Failed to connect to Gradio API:", e);
      setGradioStatus('error');
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
    if (serverStatus === 'online' && messages.length === 0) {
      greetUser();
    }
    if (serverStatus === 'error' || gradioStatus === 'error') {
      message.error("One or more systems are offline. Dixon might not be able to talk properly.");
    }
  }, [serverStatus, gradioStatus]);

  useEffect(() => {
    if (!isSpeaking && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      // Automatically start listening after Dixon speaks
      const timer = setTimeout(() => startListening(), 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking]);

  const initSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };
      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
        setInterimTranscript('');
      };
      recognitionRef.current.onresult = (event: any) => {
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

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isSpeaking && !isGenerating) {
      try {
        setInterimTranscript('');
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech Recognition start error:", e);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
    } else {
      startListening();
    }
  };

  const greetUser = async () => {
    const greeting = "Hello! I am Dixon, your therapist. It's a pleasure to meet you. To get started, may I ask your name?";
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
            { role: "system", content: DIXON_SYSTEM_PROMPT },
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
        console.error("Dixon API Error:", err);
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




  const statusContent = (
    <>
      <div className="system-status-group">
        <div className={`status-badge ${serverStatus}`}>BRAIN</div>
        <div className={`status-badge ${gradioStatus}`}>VOICE</div>
        <div className={`status-badge ${micStatus === 'granted' ? 'online' : micStatus === 'denied' ? 'error' : 'checking'}`}>
          HEARING: {micStatus.toUpperCase()}
        </div>
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
        logout={() => { }}
        setLoginModalVisible={() => { }}
        isDevMode={isDevMode}
        hiddenByDefault={isSidebarHidden}
      />

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
          {serverStatus === 'checking' || gradioStatus === 'checking' ? (
            <div className="warming-up">
              <Spin size="large" />
              <div>warming up engines...</div>
            </div>
          ) : (
            <Orb
              isPlaying={isSpeaking}
              isGenerating={isGenerating}
              isListening={isListening}
              onClick={toggleListening}
            />
          )}
        </div>

        {/* Status Indicator instead of Input Overlay */}
        <div className="hero-input-overlay" style={{ border: 'none', background: 'transparent' }}>
          <div className={`orb-label ${isListening ? 'listening-active' : ''}`} style={{ fontSize: 10, color: isListening ? '#00ffcc' : 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            {isListening && !interimTranscript
              ? 'Ruth is listening...'
              : isSpeaking
                ? engineStatus
                : isGenerating
                  ? 'Ruth is thinking...'
                  : 'a ghost in the shell...'}
          </div>
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

    </div>
  );
};

export default Therapy;

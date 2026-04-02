import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, message, Spin } from 'antd';
import { MenuFoldOutlined, SendOutlined, CloseOutlined } from '@ant-design/icons';
import { Client } from "@gradio/client";
import Sidebar from './Sidebar';
import Orb from './Orb';
import './Therapy.css';

const DIXON_SYSTEM_PROMPT = `You are Dixon, an empathetic and professional therapist AI. You were named after your developer. Your goal is to provide a safe space for users to talk about their feelings. ALWAYS start by greeting the user warmly and asking for their name if you don't know it. Once you know their name, refer to them by it frequently. Emphasize that this is a private session and NO user data is ever kept or stored. Be kind, supportive, and use therapeutic techniques like active listening and open-ended questions. Keep your responses relatively concise but deeply empathetic.`;

const Therapy: React.FC = () => {
  const [userName, setUserName] = useState<string | null>(localStorage.getItem('therapy_user_name'));
  const [messages, setMessages] = useState<{ role: string, content: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [isSidebarHidden, setIsSidebarHidden] = useState(true);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'error'>('checking');
  const [gradioStatus, setGradioStatus] = useState<'checking' | 'online' | 'error'>('checking');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gradioClientRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const apiUrl = localStorage.getItem('apiUrl') || import.meta.env.VITE_OLLAMA_ENDPOINT;
  const isDevMode = localStorage.getItem('devMode') === 'true';

  const checkSystemHealth = async () => {
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
      if (!gradioClientRef.current) {
        gradioClientRef.current = await Client.connect("https://47701b72e17b35743f.gradio.live/");
      }
      setGradioStatus('online');
    } catch (e) {
      setGradioStatus('error');
    }
  };

  useEffect(() => {
    checkSystemHealth();
  }, []);

  useEffect(() => {
    if (serverStatus === 'online' && messages.length === 0) {
      greetUser();
    }
    if (serverStatus === 'error' || gradioStatus === 'error') {
      message.error("One or more systems are offline. Dixon might not be able to talk properly.");
    }
  }, [serverStatus, gradioStatus]);

  const greetUser = async () => {
    const greeting = "Hello! I am Dixon, your therapist. It's a pleasure to meet you. To get started, may I ask your name?";
    setMessages([{ role: 'assistant', content: greeting }]);
    playSpeech(greeting);
  };

  const playSpeech = async (text: string) => {
    if (!gradioClientRef.current) return;
    setIsPlaying(true);
    try {
      const response = await fetch("https://github.com/kaizoku010/TTS/training.wav");
      const refAudio = await response.blob();
      const result: any = await gradioClientRef.current.predict("/generate_speech", {
        text: text,
        reference_audio: refAudio,
        max_new_tokens: 500,
        speed: 1,
        text_temp: 0.7,
        audio_temp: 0.7,
        n_vq: 8,
      });

      if (result.data && result.data[0]) {
        const audioUrl = result.data[0].url;
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
        }
      }
    } catch (err) {
      console.error("TTS Error:", err);
      setIsPlaying(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating) return;

    const userMsg = inputValue.trim();
    setInputValue('');

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
        playSpeech(botResponse);
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setIsGenerating(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    setMessages([]);
    setUserName(null);
    localStorage.removeItem('therapy_user_name');
    
    if (gradioClientRef.current) {
      try {
        await gradioClientRef.current.predict("/clear_memory", {});
      } catch (e) { console.error(e); }
    }
    
    message.info("Session reset. No data kept.");
    greetUser();
  };

  const lastDixonMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0];

  return (
    <div className={`therapy-container app-container dark`}>
      <Sidebar
        mobileMenuOpen={sidebarOpen}
        setMobileMenuOpen={setSidebarOpen}
        darkMode={true}
        setDarkMode={() => {}}
        logout={() => {}}
        setLoginModalVisible={() => {}}
        isDevMode={isDevMode}
        hiddenByDefault={isSidebarHidden}
      />

      <div className="therapy-main">
        {/* Floating Controls */}
        <div className="therapy-controls">
          <Button 
            type="text" 
            icon={<MenuFoldOutlined />} 
            onClick={() => setIsSidebarHidden(!isSidebarHidden)}
            className="sidebar-toggle-btn"
          />
          <div className="system-status-group">
            <div className={`status-badge ${serverStatus}`}>BRAIN</div>
            <div className={`status-badge ${gradioStatus}`}>VOICE</div>
          </div>
          <div className="privacy-badge">🔒 Private Session</div>
        </div>

        {/* Floating Message Overlay */}
        {lastDixonMsg && (
          <div className="floating-msg-area">
            <div className="dixon-msg">
              {lastDixonMsg.content}
            </div>
          </div>
        )}

        {/* Hero Center - The Orb */}
        <div className="orb-wrapper">
          {serverStatus === 'checking' || gradioStatus === 'checking' ? (
            <div className="warming-up">
              <Spin size="large" />
              <div>Connecting to Dixon...</div>
            </div>
          ) : (
            <Orb 
              isPlaying={isPlaying} 
              isGenerating={isGenerating}
              onClick={stopAndClear}
            />
          )}
        </div>

        {/* Minimal Bottom Interaction Overlay */}
        <div className="hero-input-overlay">
          <div className="minimal-input-container">
            <input
              placeholder={!userName ? "Enter your name..." : "Talk to Dixon..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleSend}
              disabled={isGenerating}
            />
            <Button 
              className="send-btn-minimal"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={isGenerating}
            />
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

      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default Therapy;

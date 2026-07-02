import React, { useState, useEffect, useRef } from 'react';
import { Layout, Button, Typography, Tooltip, Badge, message } from 'antd';
import {
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { auth } from '../firebase';
import VoiceWaveform from './VoiceWaveform';
import Sidebar from './Sidebar';
import Settings from './Settings';
import Orb from './Orb';
import LoginModal from './LoginModal';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useMossVoice } from '../hooks/useMossVoice';
import { getTherapyResponse } from '../services/api';
import './Therapy.css';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

const Therapy: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [serverStatus, setServerStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [ttsStatus, setTtsStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [adminSettingsVisible, setAdminSettingsVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [currentApiUrl, setCurrentApiUrl] = useState<string | null>(localStorage.getItem('ollama_apiUrl'));
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') !== 'light');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const normalizeChatUrl = (url: string | null): string => {
    if (!url) return '';
    return url.endsWith('/api/chat') ? url : `${url.replace(/\/$/, '')}/api/chat`;
  }

  // Voice & Brain Hooks
  const {
    isSpeaking,
    isGeneratingVoice,
    speakText,
    forceReset,
    progress,
    engineStatus,
  } = useMossVoice();
  const logs: string[] = [];

  const [isGenerating, setIsGenerating] = useState(false);
  const hasWarmedUp = useRef(false);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // System Health Check
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        const ttsUrl = localStorage.getItem('tts_apiUrl') || 'https://mdx.tail299d7f.ts.net';
        const response = await fetch(`${ttsUrl}/health`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        if (response.ok) {
          setTtsStatus('online');

          if (!hasWarmedUp.current) {
            hasWarmedUp.current = true;
            // Warmup TTS
            fetch(`${ttsUrl}/api/tts/warmup`, {
              method: 'POST',
              headers: { 'ngrok-skip-browser-warning': 'true' }
            }).catch(() => { });

            // Warmup Brain
            if (currentApiUrl) {
              const chatUrl = normalizeChatUrl(currentApiUrl);
              const modelName = localStorage.getItem('modelName') || 'gemma3:1b';
              fetch(chatUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
                body: JSON.stringify({ model: modelName, messages: [], stream: false, keep_alive: '10m' })
              }).catch(() => { });
            }
          }
        } else {
          setTtsStatus('offline');
        }
      } catch (err) {
        setTtsStatus('offline');
      }

      try {
        const chatUrl = normalizeChatUrl(currentApiUrl);
        const response = await fetch(chatUrl.replace('/api/chat', '/api/tags'), {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        setServerStatus(response.ok ? 'online' : 'offline');
      } catch (err) {
        setServerStatus('offline');
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [currentApiUrl]);

  const onResult = (text: string, isFinal: boolean) => {
    if (isFinal) {
      handleSend(text);
    }
  };

  const { isListening, toggleListening, setIsListening } = useSpeechRecognition(onResult);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    setIsListening(false);
    setIsGenerating(true);

    const newUserMsg = { role: 'user', content: text };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    try {
      const response = await getTherapyResponse(updatedMessages);
      const assistantMsg = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMsg]);

      setIsGenerating(false);
      speakText(response);
    } catch (err) {
      message.error("Failed to get response from Devon.");
      setIsGenerating(false);
    }
  };

  const stopAndClear = () => {
    forceReset();
    setMessages([]);
    setIsStarted(false);
    setIsListening(false);
  };

  return (
    <div className="therapy-container">
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        logout={() => auth.signOut()}
        setLoginModalVisible={setLoginModalVisible}
        isDevMode={true}
      />

      <div className="therapy-main-content">
        <Header className="therapy-header">
          <div className="header-left">
            <Button
              type="text"
              icon={mobileMenuOpen ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="mobile-menu-btn"
            />
            <Title level={4} style={{ margin: 0 }}>Devon AI</Title>
          </div>
          <div className="header-right">
            <Badge status={serverStatus === 'online' ? 'success' : 'error'} text="BRAIN" style={{ marginRight: 16 }} />
            <Badge status={ttsStatus === 'online' ? 'success' : 'error'} text="MOSS" style={{ marginRight: 16 }} />
            <Tooltip title="Settings">
              <Button type="text" icon={<SettingOutlined />} onClick={() => setAdminSettingsVisible(true)} />
            </Tooltip>
          </div>
        </Header>

        <Content className="therapy-body">
          {!isStarted ? (
            <div className="welcome-screen">
              <div className="welcome-content">
                <Title level={2}>Ready to begin your session?</Title>
                <Text type="secondary">Devon is here to listen and guide you through your thoughts.</Text>
                <div style={{ marginTop: 40 }}>
                  <Orb
                    isStarted={false}
                    isGenerating={false}
                    isPlaying={false}
                    onToggle={() => {
                      setIsStarted(true);
                      speakText("Good evening. I am Devon, your AI therapy assistant. I am here to provide a safe space for your thoughts. To begin, may I ask your name?");
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="session-active">
              <div className="visualizer-hero">
                <VoiceWaveform isActive={isListening} isDevonSpeaking={isSpeaking} />
              </div>

              <div className="interaction-hub">
                <Orb
                  isStarted={true}
                  isListening={isListening}
                  isGenerating={isGenerating || isGeneratingVoice}
                  isPlaying={isSpeaking}
                  status={engineStatus}
                  progress={progress}
                  duration={isListening ? "00:00" : (isSpeaking ? "PLAYING" : "00:00")}
                  onToggle={() => {
                    if (isSpeaking || isGenerating || isGeneratingVoice) {
                      forceReset();
                    } else {
                      toggleListening();
                    }
                  }}
                />

                <div style={{ marginTop: 20 }}>
                  <Button
                    type="text"
                    danger
                    icon={<CloseOutlined />}
                    onClick={stopAndClear}
                    style={{
                      opacity: 0.8,
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      fontWeight: 600,
                      letterSpacing: '1px'
                    }}
                  >
                    RESET SESSION
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Content>

        {/* Minimalist Live Logs - Bottom Left */}
        <div className="live-logs-container">
          {logs.map((log: string, i: number) => (
            <div key={i} className="log-entry" style={{ opacity: 1 - (i * 0.2) }}>
              {log}
            </div>
          ))}
        </div>
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

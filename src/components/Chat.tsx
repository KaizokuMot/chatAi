import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Spin, Checkbox, message } from 'antd';
import {
  SendOutlined, RobotOutlined, LogoutOutlined, LoginOutlined,
  SearchOutlined, BellOutlined, InfoCircleOutlined,
  DeleteOutlined,
  AppstoreOutlined, MenuOutlined, BarChartOutlined,
  MenuFoldOutlined, BulbOutlined
} from '@ant-design/icons';
import { auth, db } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Settings from './Settings';
import LoginModal from './LoginModal';

interface MessageData {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: any;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiUrl, setApiUrl] = useState(() => {
    const saved = localStorage.getItem('apiUrl');
    if (saved && saved !== "undefined" && saved !== "null" && saved.trim() !== "") return saved;
    return import.meta.env.VITE_OLLAMA_ENDPOINT || "https://necessitative-freeda-serologically.ngrok-free.dev/api/chat";
  });

  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline' | 'error'>('online');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  }, [darkMode]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDevMode = localStorage.getItem('devMode') === 'true';
  const hasGreeted = useRef(false);

  const checkServerHealth = async () => {
    setServerStatus('checking');
    try {
      // Base URL from /api/chat
      const baseUrl = apiUrl.replace(/\/api\/chat$/, '');
      const healthUrl = `${baseUrl}/api/health`;

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true' // Helpful for ngrok links
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Health Check Response:", data);
        setServerStatus('online');
        // If there's a message in the health check, show it
        if (data.message) {
          message.info(`Server Status: ${data.message}`);
        }
        return true;
      } else {
        // Fallback for 404 or other issues
        setServerStatus('online');
        return true;
      }
    } catch (e) {
      console.error("Health check failed:", e);
      setServerStatus('error');
      return false;
    }
  };

  useEffect(() => {
    checkServerHealth();
  }, [apiUrl]);

  const generateGreeting = async (displayName: string | null) => {
    if (serverStatus !== 'online') return;
    setLoading(true);
    try {
      const modelName = localStorage.getItem('modelName') || 'gemma3:1b';
      const promptText = displayName
        ? `Greet the returning user ${displayName} warmly and offer help.`
        : `Greet the user warmly and offer help. Keep it extremely short.`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            // { role: "system", content: "You are an entity from another time but here you're a helpful AI assistant built by kalanzi dixon" },
            { role: "user", content: promptText }
          ],
          stream: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        const botResponse = data.message?.content || "Hello! How can I help you today?";

        if (isDevMode) {
          setMessages([{ text: botResponse, sender: 'bot', timestamp: new Date() }]);
        } else if (auth.currentUser) {
          const msgRef = collection(db, `users/${auth.currentUser.uid}/messages`);
          await addDoc(msgRef, {
            text: botResponse,
            sender: 'bot',
            timestamp: serverTimestamp()
          });
        }
      }
    } catch (e) {
      console.error(e);
      if (isDevMode) {
        setMessages([{ id: 'mock-1', text: 'Welcome to chatAI Beta! Test the local model response.', sender: 'bot', timestamp: new Date() }]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDevMode || !auth.currentUser) {
      if (isDevMode && !hasGreeted.current && serverStatus === 'online') {
        hasGreeted.current = true;
        generateGreeting(null);
      }
      return;
    }

    if (auth.currentUser) {
      const q = query(
        collection(db, `users/${auth.currentUser.uid}/messages`),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs: MessageData[] = [];
        snapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as MessageData);
        });
        setMessages(msgs);

        if (msgs.length === 0 && !hasGreeted.current && serverStatus === 'online') {
          hasGreeted.current = true;
          generateGreeting(auth.currentUser?.displayName ?? null);
        }

        setTimeout(() => scrollToBottom(), 100);
      });

      return () => unsubscribe();
    }
  }, [auth.currentUser, isDevMode, apiUrl, serverStatus]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const clearHistory = async () => {
    if (isDevMode) {
      setMessages([]);
      hasGreeted.current = false;
      return;
    }
    if (!auth.currentUser) return;

    try {
      setLoading(true);
      const q = query(collection(db, `users/${auth.currentUser.uid}/messages`));
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(document =>
        deleteDoc(doc(db, `users/${auth.currentUser!.uid}/messages`, document.id))
      );
      await Promise.all(deletePromises);
      hasGreeted.current = false;
      message.success("Chat history cleared");
    } catch (e) {
      console.error(e);
      message.error("Failed to clear history");
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const attemptSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Auth Guard: Show Login modal if not authenticated
    if (!auth.currentUser && !isDevMode) {
      setLoginModalVisible(true);
      return;
    }

    const userMsg = inputValue.trim();
    setInputValue('');
    setLoading(true);

    try {
      if (isDevMode) {
        setMessages(prev => [...prev, { text: userMsg, sender: 'user', timestamp: new Date() }]);
      } else if (auth.currentUser) {
        const msgRef = collection(db, `users/${auth.currentUser.uid}/messages`);
        await addDoc(msgRef, {
          text: userMsg,
          sender: 'user',
          timestamp: serverTimestamp()
        });
      }

      const currentHistory = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      const modelName = localStorage.getItem('modelName') || 'gemma3:1b';

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            ...currentHistory,
            { role: "user", content: userMsg }
          ],
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      setServerStatus('online');

      const data = await response.json();
      const botResponse = data.message?.content || "I didn't understand that.";

      if (isDevMode) {
        setMessages(prev => [...prev, { text: botResponse, sender: 'bot', timestamp: new Date() }]);
      } else if (auth.currentUser) {
        const msgRef = collection(db, `users/${auth.currentUser.uid}/messages`);
        await addDoc(msgRef, {
          text: botResponse,
          sender: 'bot',
          timestamp: serverTimestamp()
        });
      }

    } catch (error: any) {
      console.error(error);
      setServerStatus('error');
      message.error("Failed to connect to Ollama Server. Check Settings.");

      if (isDevMode) {
        setMessages(prev => [...prev, { text: "Error connecting to model. Ensure server is running.", sender: 'bot', timestamp: new Date() }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (isDevMode) {
      localStorage.removeItem('devMode');
      window.location.reload();
    } else {
      auth.signOut();
      window.location.reload();
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Left Sidebar */}
      <div className={`left-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center' }}>
          <div style={{ background: '#ff8c42', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          {/* <h2 style={{ margin: 0, fontSize: 18 }}>ChatAi</h2> */}
        </div>

        <div className="menu-list" style={{ marginTop: 16 }}>
          {/* <div className="menu-item active">
            <MessageOutlined /> <span style={{ marginLeft: 12 }}>ChatAi</span>
          </div> */}
          <div className="menu-item">
            <AppstoreOutlined /> <span style={{ marginLeft: 12 }}>Generated</span>
            <span style={{ fontSize: 6 }} className="menu-tag">COMING SOON</span>
          </div>
          <div className="menu-item">
            <BarChartOutlined /> <span style={{ marginLeft: 12 }}>Statistics</span>
            <span style={{ fontSize: 6 }} className="menu-tag">COMING SOON</span>
          </div>
          <div className="menu-item">
            <MenuOutlined /> <span style={{ marginLeft: 12 }}>Agents</span>
            <span style={{ fontSize: 6 }} className="menu-tag">COMING SOON</span>
          </div>

          <div className="menu-item" onClick={() => setDarkMode(!darkMode)}>
            <BulbOutlined /> <span style={{ marginLeft: 12 }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </div>
          {/* <div className="menu-item" onClick={() => setSettingsVisible(true)}>
            <SettingOutlined /> <span style={{ marginLeft: 12 }}>Settings</span>
          </div> */}
          {/* <div className="menu-item">
            <QuestionCircleOutlined /> <span style={{ marginLeft: 12 }}>Updates & FAQ</span>
          </div> */}
        </div>

        <div style={{ flex: 1 }} />

        <div className="beta-card">
          <div style={{ background: 'rgba(255,255,255,0.2)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <RobotOutlined style={{ fontSize: 18 }} />
          </div>
          <h3 style={{ margin: '0 0 2px 0', fontSize: 16 }}>Beta V.0.1</h3>
          <p style={{ margin: 0, fontSize: 10, opacity: 0.6 }}>
            Kalanzi Dixon
          </p>
        </div>

        {auth.currentUser || isDevMode ? (
          <div className="menu-item" onClick={logout} style={{ marginBottom: 16 }}>
            <LogoutOutlined /> <span style={{ marginLeft: 12 }}>{isDevMode ? 'Exit Dev Mode' : 'Log out'}</span>
          </div>
        ) : (
          <div className="menu-item" onClick={() => setLoginModalVisible(true)} style={{ marginBottom: 16 }}>
            <LoginOutlined /> <span style={{ marginLeft: 12 }}>Log in</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-topbar)', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button icon={<MenuFoldOutlined />} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="mobile-only-btn" style={{ display: 'none' }} />
            <div style={{ fontWeight: 600, fontSize: 18 }}>ChatAi</div>
            <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
              {serverStatus === 'checking' && <Spin size="small" />}
              {serverStatus === 'online' && <span style={{ fontSize: 10, color: '#52c41a', background: 'rgba(82, 196, 26, 0.1)', padding: '2px 6px', borderRadius: 4 }}>ONLINE</span>}
              {serverStatus === 'offline' && <span style={{ fontSize: 10, color: '#f5222d', background: 'rgba(245, 34, 45, 0.1)', padding: '2px 6px', borderRadius: 4 }}>OFFLINE</span>}
              {serverStatus === 'error' && <span style={{ fontSize: 10, color: '#faad14', background: 'rgba(250, 173, 20, 0.1)', padding: '2px 6px', borderRadius: 4 }}>CONN ERROR</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Input className="top-bar-search" placeholder="Search" prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />} />
            <Button icon={<BellOutlined />} shape="circle" type="text" style={{ background: 'var(--bg-icon-btn)', color: 'var(--text-primary)' }} />
            <Button icon={<InfoCircleOutlined />} shape="circle" type="text" style={{ background: 'var(--bg-icon-btn)', color: 'var(--text-primary)' }} />
          </div>
        </div>

        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {messages.map((item, index) => (
            <div key={item.id || index}>
              {item.sender === 'user' ? (
                <div className="message-user">
                  <div className="message-user-bubble">
                    {item.text}
                  </div>
                </div>
              ) : (
                <div className="message-bot">
                  <div style={{ display: 'flex', marginBottom: 16 }}>
                    <div style={{ background: '#ff8c42', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                      <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                    <strong style={{ fontSize: 16 }}>chatAI</strong>
                  </div>
                  <div style={{ fontSize: "small", whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)' }}>
                    {item.text}
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="message-bot" style={{ display: 'flex', alignItems: 'center' }}>
              <Spin size="small" /> <span style={{ fontSize: "small", marginLeft: 12, color: 'var(--text-secondary)' }}>Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: '0 32px 24px 32px' }}>
          <div className="chat-input-container">
            {/* <PaperClipOutlined style={{ fontSize: 20, color: 'var(--text-secondary)', marginRight: 16, cursor: 'pointer' }} />
            <AudioOutlined style={{ fontSize: 20, color: 'var(--text-secondary)', marginRight: 16, cursor: 'pointer' }} /> */}
            <Input
              className="chat-input"
              placeholder="Start typing..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={attemptSendMessage}
            />
            <Button
              type="primary"
              shape="circle"
              icon={<SendOutlined />}
              size="large"
              onClick={attemptSendMessage}
              loading={loading}
              style={{ background: '#ff8c42', border: 'none', marginLeft: 8 }}
            />
          </div>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
            Free Research Preview. chatAI may produce inaccurate information about people, places, or facts.
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="right-sidebar">
        <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>History</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{messages.length}/50</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {messages.filter(m => m.sender === 'user').slice(-5).map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16 }}>
              <Checkbox style={{ marginTop: 2, marginRight: 12 }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>
                  {m.text.substring(0, 30)}{m.text.length > 30 ? '...' : ''}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.4 }}>
                  User query recorded
                </div>
              </div>
            </div>
          ))}
          {messages.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No recent history</div>}
        </div>
        <div style={{ padding: 24, paddingBottom: 32 }}>
          <Button block icon={<DeleteOutlined />} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }} onClick={clearHistory}>
            Clear history
          </Button>
        </div>
      </div>

      <LoginModal
        visible={loginModalVisible}
        onClose={() => setLoginModalVisible(false)}
        onSuccess={() => {
          setLoginModalVisible(false);
          attemptSendMessage();
        }}
      />

      <Settings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        apiUrl={apiUrl}
        setApiUrl={setApiUrl}
      />
    </div>
  );
};

export default Chat;

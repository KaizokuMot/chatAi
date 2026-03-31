import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Spin } from 'antd';
import Chat from './components/Chat';
import './index.css';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const isDevMode = localStorage.getItem('devMode') === 'true';

  useEffect(() => {
    console.log("App: Initializing auth listener...");
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("App: Auth state changed. User:", user ? user.uid : "None");
      setLoading(false);
    });

    // Fallback: If auth takes too long, stop loading
    const timer = setTimeout(() => {
      console.warn("App: Auth initialization timed out after 5s.");
      setLoading(false);
    }, 5000);

    if (isDevMode) {
      console.log("App: Dev mode detected, bypassing loading.");
      setLoading(false);
    }
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [isDevMode]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/*" element={<Chat />} />
      </Routes>
    </Router>
  );
};

export default App;

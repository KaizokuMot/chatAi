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
    const unsubscribe = onAuthStateChanged(auth, () => {
      setLoading(false);
    });
    if (isDevMode) setLoading(false);
    return () => unsubscribe();
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

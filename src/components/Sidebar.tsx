import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    RobotOutlined,
    LogoutOutlined,
    LoginOutlined,
    AppstoreOutlined,
    MenuOutlined,
    BarChartOutlined,
    BulbOutlined,
    HeartOutlined
} from '@ant-design/icons';
import { auth } from '../firebase';
import { ToolsBanner } from './ToolsUI';

interface SidebarProps {
    mobileMenuOpen: boolean;
    setMobileMenuOpen: (open: boolean) => void;
    darkMode: boolean;
    setDarkMode: (dark: boolean) => void;
    logout: () => void;
    setLoginModalVisible: (visible: boolean) => void;
    isDevMode: boolean;
    hiddenByDefault?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    mobileMenuOpen,
    setMobileMenuOpen,
    darkMode,
    setDarkMode,
    logout,
    setLoginModalVisible,
    isDevMode,
    hiddenByDefault = false
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${mobileMenuOpen ? 'open' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            {/* Left Sidebar */}
            <div className={`left-sidebar ${mobileMenuOpen ? 'open' : ''} ${hiddenByDefault ? 'hidden-by-default' : ''}`}>
                <div style={{display: 'flex', alignItems: 'center' }}>
                    <div
                        style={{
                            background: 'var(--accent-color)',
                            width: 32,
                            height: 32,
                            margin: '15px 12px 2px 15px',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        onClick={() => navigate('/')}
                    >
                        <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
                    </div>
                    <h2
                        style={{ margin: 0, fontSize: 18, color: 'var(--sidebar-text)', cursor: 'pointer' }}
                        onClick={() => navigate('/')}
                    >
                        {/* NanoChat */}
                    </h2>
                </div>

                <div className="menu-list" style={{ marginTop: 16 }}>
                    <div
                        className={`menu-item ${isActive('/') ? 'active' : ''}`}
                        onClick={() => {
                            navigate('/');
                            setMobileMenuOpen(false);
                        }}
                    >
                        <RobotOutlined /> <span style={{ marginLeft: 12 }}>NanoChat</span>
                    </div>

                    {/* Therapy Sessions - New Option */}
                    <div
                        className={`menu-item ${isActive('/therapy') ? 'active' : ''}`}
                        onClick={() => {
                            navigate('/therapy');
                            setMobileMenuOpen(false);
                        }}
                    >
                        <HeartOutlined /> <span style={{ marginLeft: 12 }}>Therapy Sessions</span>
                    </div>

                    <div className="menu-item disabled">
                        <AppstoreOutlined /> <span style={{ marginLeft: 12 }}>Generated</span>
                        <span style={{ fontSize: 6 }} className="menu-tag">COMING SOON</span>
                    </div>

                    <div className="menu-item disabled">
                        <BarChartOutlined /> <span style={{ marginLeft: 12 }}>Statistics</span>
                        <span style={{ fontSize: 6 }} className="menu-tag">COMING SOON</span>
                    </div>

                    <div className="menu-item disabled">
                        <MenuOutlined /> <span style={{ marginLeft: 12 }}>Agents</span>
                        <span style={{ fontSize: 6 }} className="menu-tag">COMING SOON</span>
                    </div>

                    <div className="menu-item" onClick={() => setDarkMode(!darkMode)}>
                        <BulbOutlined /> <span style={{ marginLeft: 12 }}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ padding: '0 16px', marginBottom: 16 }}>
                    <ToolsBanner noBorder />
                </div>

                <div className="beta-card">
                    <div
                        style={{
                            background: 'var(--sidebar-beta-bg)',
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16
                        }}
                    >
                        <RobotOutlined style={{ fontSize: 18, color: 'var(--sidebar-text)' }} />
                    </div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: 10, color: 'var(--sidebar-text)' }}>beta v.15</h3>
                    <p style={{ margin: 0, fontSize: 10, opacity: 0.6, color: 'var(--sidebar-text)' }}>
                        Kalanzi Dixon
                    </p>
                </div>

                {auth.currentUser || isDevMode ? (
                    <div className="menu-item" onClick={logout} style={{ marginBottom: 16, color: '#ff4d4f' }}>
                        <LogoutOutlined /> <span style={{ marginLeft: 12 }}>{isDevMode ? 'Exit Dev Mode' : 'Log out'}</span>
                    </div>
                ) : (
                    <div className="menu-item" onClick={() => setLoginModalVisible(true)} style={{ marginBottom: 16 }}>
                        <LoginOutlined /> <span style={{ marginLeft: 12 }}>Log in</span>
                    </div>
                )}
            </div>
        </>
    );
};

export default Sidebar;

import React from 'react';
import {
  SearchOutlined,
  FileTextOutlined,
  PictureOutlined,
  BarsOutlined,
  CalendarOutlined,
  GlobalOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { Tooltip, message } from 'antd';
import { getEnabledTools } from '../config/aiTools';

interface ToolButtonsProps {
  onToolClick?: (toolName: string) => void;
}

// Map tool names to icons
const TOOL_ICONS: Record<string, React.ReactNode> = {
  internet_search: <SearchOutlined />,
  web_browse: <GlobalOutlined />,
  document_analysis: <FileTextOutlined />,
  image_analysis: <PictureOutlined />,
  text_analysis: <BarsOutlined />,
  current_date_time: <CalendarOutlined />,
  calendar_aware: <CalendarOutlined />,
  data_synthesis: <BarChartOutlined />,
  research_compilation: <BarChartOutlined />,
};

/**
 * Tool Button for Input Area
 * Shows compact icons that users can click to enable specific tools
 */
export const ToolButtons: React.FC<ToolButtonsProps> = ({ onToolClick }) => {
  const enabledTools = getEnabledTools();
  const mainTools = enabledTools.slice(0, 5); // Show top 5

  const handleClick = (toolName: string) => {
    if (onToolClick) {
      onToolClick(toolName);
    } else {
      message.info(`Tool "${toolName}" is active and used by Nano automatically.`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginRight: 8 }}>
      {mainTools.map(tool => (
        <Tooltip key={tool.name} title={`${tool.name.split('_').join(' ')} (Active)`} placement="top">
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: 14,
            }}
            onClick={() => handleClick(tool.name)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            {TOOL_ICONS[tool.name] || <ThunderboltOutlined />}
          </div>
        </Tooltip>
      ))}
    </div>
  );
};

/**
 * Tools Banner for Sidebar
 * Shows all available tools with descriptions
 */
export const ToolsBanner: React.FC<{ noBorder?: boolean }> = ({ noBorder }) => {
  const enabledTools = getEnabledTools();

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: noBorder ? 'none' : '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.5px' }}>CAPABILITIES</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {enabledTools.map(tool => (
          <div
            key={tool.name}
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '2px 0'
            }}
          >
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--text-secondary)', opacity: 0.5 }} />
            {tool.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Compact Tool Display for settings/info pages
 */
export const ToolsList: React.FC = () => {
  const enabledTools = getEnabledTools();

  return (
    <div>
      <h3 style={{ marginBottom: 16, fontSize: 14, fontWeight: 600 }}>Available Tools</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {enabledTools.map(tool => (
          <div
            key={tool.name}
            style={{
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 20, color: 'var(--text-main)' }}>
                {TOOL_ICONS[tool.name] || <ThunderboltOutlined />}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  {tool.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>v{tool.version}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {tool.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};


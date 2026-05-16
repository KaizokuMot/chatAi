import React from 'react';
import { PlayCircleFilled, PauseOutlined } from '@ant-design/icons';
import { Spin } from 'antd';
import './Orb.css';

interface OrbProps {
  isStarted: boolean;
  isGenerating: boolean;
  isPlaying: boolean;
  isListening?: boolean;
  status?: string;
  progress?: number;
  chunkCount?: number;
  duration?: string;
  onToggle: () => void;
}

const Orb: React.FC<OrbProps> = ({ 
  isStarted,
  isGenerating, 
  isPlaying, 
  isListening, 
  status = 'idle', 
  duration,
  onToggle
}) => {


  return (
    <div 
      className={`orb-container ${isListening ? 'active-listening' : ''} ${!isStarted ? 'not-started' : ''}`} 
      onClick={onToggle}
    >
      <div className={`orb-main ${isPlaying ? 'pulsing' : ''} ${isGenerating ? 'generating' : ''} ${isListening ? 'listening' : ''}`}>
        
        {/* Spinner during processing */}
        {(isGenerating || status === 'chunking') ? (
          <div className="orb-spinner-overlay">
            <Spin size="default" />
          </div>
        ) : (
          <div className="orb-icon-overlay">
            {!isStarted ? (
              <PlayCircleFilled style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)' }} />
            ) : (isListening || isPlaying) ? (
              <PauseOutlined style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)' }} />
            ) : (
              <PlayCircleFilled style={{ fontSize: 24, color: 'rgba(255,255,255,0.9)' }} />
            )}
          </div>
        )}

        {/* Timer separated */}
        {(isListening || isPlaying) && duration && duration !== "00:00" && (
          <div className="orb-stats-overlay">
            <div className="orb-timer-stable">{duration}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Orb;

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
    <div className={`orb-container ${isListening ? 'active-listening' : ''} ${!isStarted ? 'not-started' : ''}`} onClick={onToggle}>
      
      {/* Timer moved ABOVE the button to prevent overlap */}
      {(isListening || isPlaying) && duration && duration !== "00:00" && (
        <div className="orb-timer-top">{duration}</div>
      )}

      <div className={`orb-main ${isPlaying ? 'pulsing' : ''} ${isGenerating ? 'generating' : ''} ${isListening ? 'listening' : ''}`}>
        {(isGenerating || status === 'chunking') ? (
          <div className="orb-spinner-overlay">
            <Spin size="default" />
          </div>
        ) : (
          <div className="orb-icon-overlay">
            {!isStarted ? (
              <PlayCircleFilled style={{ fontSize: 24 }} />
            ) : (isListening || isPlaying) ? (
              <PauseOutlined style={{ fontSize: 24 }} />
            ) : (
              <PlayCircleFilled style={{ fontSize: 24 }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orb;

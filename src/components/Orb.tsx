import React from 'react';
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
  progress = 0,
  duration,
  onToggle
}) => {


  return (
    <div 
      className={`orb-container ${isListening ? 'active-listening' : ''} ${!isStarted ? 'not-started' : ''}`} 
      onClick={onToggle}
    >
      <div className={`orb-main ${isPlaying ? 'pulsing' : ''} ${isGenerating ? 'generating' : ''} ${isListening ? 'listening' : ''}`}>
        <div className="orb-inner"></div>
        <div className="orb-glow"></div>
        
        {/* Timer separated from fluid background to prevent flicker */}
        <div className="orb-stats-overlay">
          {(isListening || isPlaying || isGenerating) && duration && duration !== "00:00" && (
            <div className="orb-timer-stable">{duration}</div>
          )}
          {isGenerating && (!duration || duration === "00:00") && (
            <div className="orb-timer-stable" style={{ fontSize: '10px', letterSpacing: '1px' }}>CHUNKING...</div>
          )}
        </div>

        {isListening && (
          <>
            <div className="listening-ring"></div>
            <div className="listening-ring"></div>
            <div className="listening-ring"></div>
          </>
        )}
        {isGenerating && (
          <div className="orb-spinner">
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
            <div className="spinner-dot"></div>
          </div>
        )}
      </div>
      <div className="orb-label">
        {!isStarted
          ? 'TAP TO BEGIN'
          : isPlaying
            ? (status?.toUpperCase() || 'SPEAKING...')
            : isGenerating
              ? (status === 'idle' || !status ? 'THINKING...' : `GENERATING... ${progress}%`)
              : isListening
                ? 'TAP TO SEND'
                : 'TAP TO TALK'}
      </div>
    </div>
  );
};

export default Orb;

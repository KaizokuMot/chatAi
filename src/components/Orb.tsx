import React from 'react';
import './Orb.css';

interface OrbProps {
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
  isGenerating, 
  isPlaying, 
  isListening, 
  status, 
  progress,
  chunkCount,
  duration,
  onToggle 
}) => {


  return (
    <div 
      className={`orb-container ${isListening ? 'active-listening' : ''}`} 
      onClick={onToggle}
    >
      <div className={`orb-main ${isPlaying ? 'pulsing' : ''} ${isGenerating ? 'generating' : ''} ${isListening ? 'listening' : ''}`}>
        <div className="orb-inner"></div>
        <div className="orb-glow"></div>
        {(isListening || isPlaying) && duration && (
          <div className="orb-timer">{duration}</div>
        )}
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
        {isPlaying
          ? (status?.toUpperCase() || 'SPEAKING...')
          : (status === 'generating' || status === 'processing' || isGenerating)
            ? `Warming up... ${progress}%`
            : isListening
              ? 'TAP TO SEND'
              : 'TAP TO TALK'}
      </div>
    </div>
  );
};

export default Orb;

import React from 'react';
import './Orb.css';

interface OrbProps {
  isGenerating: boolean;
  isPlaying: boolean;
  isListening?: boolean;
  status?: string;
  progress?: number;
  chunkCount?: number;
  onStart: () => void;
  onEnd: () => void;
}

const Orb: React.FC<OrbProps> = ({ 
  isGenerating, 
  isPlaying, 
  isListening, 
  status, 
  progress,
  onStart, 
  onEnd 
}) => {

  return (
    <div 
      className="orb-container" 
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
      onTouchStart={(e) => { e.preventDefault(); onStart(); }}
      onTouchEnd={(e) => { e.preventDefault(); onEnd(); }}
    >
      <div className={`orb-main ${isPlaying ? 'pulsing' : ''} ${isGenerating ? 'generating' : ''} ${isListening ? 'listening' : ''}`}>
        <div className="orb-inner"></div>
        <div className="orb-glow"></div>
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
              ? 'KEEP HOLDING...'
              : 'HOLD TO TALK'}
      </div>


    </div>
  );
};

export default Orb;



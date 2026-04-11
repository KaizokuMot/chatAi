import React from 'react';
import './Orb.css';

interface OrbProps {
  isGenerating: boolean;
  isPlaying: boolean;
  isListening?: boolean;
  onClick: () => void;
}

const Orb: React.FC<OrbProps> = ({ isGenerating, isPlaying, isListening, onClick }) => {
  return (
    <div className="orb-container" onClick={onClick}>
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
          ? 'Listening...'
          : isGenerating
            ? 'Dixon is cooking...'
            : 'Tap to talk'}
      </div>
    </div>
  );
};

export default Orb;

import React from 'react';
import './Orb.css';

interface OrbProps {
  isGenerating: boolean;
  isPlaying: boolean;
  onClick: () => void;
}

const Orb: React.FC<OrbProps> = ({ isGenerating, isPlaying, onClick }) => {
  return (
    <div className="orb-container" onClick={onClick}>
      <div className={`orb-main ${isPlaying ? 'pulsing' : ''} ${isGenerating ? 'generating' : ''}`}>
        <div className="orb-inner"></div>
        <div className="orb-glow"></div>
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
          ? 'Listening to Dixon...'
          : isGenerating
          ? 'Dixon is thinking...'
          : 'Click to talk to Dixon'}
      </div>
    </div>
  );
};

export default Orb;

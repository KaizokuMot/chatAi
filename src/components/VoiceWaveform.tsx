import React, { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  color?: string;
  isDevonSpeaking?: boolean;
}

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ 
  isActive, 
  color = '#00d2ff',
  isDevonSpeaking = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    // Start drawing IMMEDIATELY for constant presence
    draw();
    
    if (isActive && !isDevonSpeaking) {
      initAudio();
    }
    
    return () => stopAudio();
  }, [isActive, isDevonSpeaking]);

  const initAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);
    } catch (err) {
      console.error("Visualizer Error:", err);
    }
  };

  const stopAudio = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (audioContextRef.current) audioContextRef.current.close();
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    animationRef.current = requestAnimationFrame(draw);
    let volume = 0;

    if (analyserRef.current && dataArrayRef.current) {
      analyserRef.current.getByteFrequencyData(dataArrayRef.current as any);
      const sum = Array.from(dataArrayRef.current).reduce((a, b) => a + b, 0);
      volume = sum / dataArrayRef.current.length;
    }

    // Baseline "Phantom" movement if silent
    const finalVolume = volume > 5 ? volume : (10 + Math.sin(Date.now() / 1000) * 5);

    // If Devon is speaking, simulate volume
    const speakingVolume = isDevonSpeaking ? (30 + Math.sin(Date.now() / 100) * 15) : finalVolume;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    
    phaseRef.current += 0.05 + (speakingVolume / 500);

    const drawWave = (amplitude: number, freq: number, opacity: number, lineWidth: number, pOffset: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      for (let x = 0; x < width; x++) {
        const relativeX = x - centerX;
        // SHARPER TAPER: Exponentially sharper envelope for a "thread" look
        const envelope = Math.exp(-Math.pow(relativeX / (width / 4), 4));
        const y = centerY + Math.sin(x * freq + phaseRef.current + pOffset) * amplitude * envelope * (speakingVolume / 25 + 0.2);
        
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };

    // Layer 1: Main bold wave
    drawWave(40, 0.02, 0.8, 3, 0);
    // Layer 2: Faster thin wave
    drawWave(25, 0.04, 0.4, 1.5, Math.PI / 2);
    // Layer 3: Slow deep wave
    drawWave(50, 0.015, 0.3, 1, Math.PI);
  };

  return (
    <div className="waveform-container" style={{ width: '100%', height: '120px', overflow: 'hidden', display: 'block' }}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={120} 
        style={{ 
          width: '100%', 
          height: '100%', 
          opacity: isActive || isDevonSpeaking ? 1 : 0.4,
          transition: 'opacity 0.5s ease'
        }}
      />
    </div>
  );
};

export default VoiceWaveform;

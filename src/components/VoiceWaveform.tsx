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
  const animationRef = useRef<number>();
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const dataArrayRef = useRef<Uint8Array>();
  const phaseRef = useRef(0);

  useEffect(() => {
    if (isActive && !isDevonSpeaking) {
      // Start Mic Listener for Visualization
      initAudio();
    } else {
      stopAudio();
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
      
      draw();
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
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
      volume = sum / dataArrayRef.current.length;
    }

    // If Devon is speaking, simulate volume if we don't have direct access
    if (isDevonSpeaking) {
      volume = 40 + Math.sin(Date.now() / 100) * 20;
    }

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    
    phaseRef.current += 0.05 + (volume / 500);

    // Draw multiple waves like the reference image
    const drawWave = (amplitude: number, freq: number, opacity: number, lineWidth: number, pOffset: number) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = opacity;
      ctx.lineWidth = lineWidth;
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;

      for (let x = 0; x < width; x++) {
        const relativeX = x - centerX;
        // Bell curve envelope to taper the ends
        const envelope = Math.exp(-Math.pow(relativeX / (width / 3), 2));
        const y = centerY + Math.sin(x * freq + phaseRef.current + pOffset) * amplitude * envelope * (volume / 20 + 0.2);
        
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
    
    // Add some "particles" like the image
    if (volume > 20) {
      for (let i = 0; i < 5; i++) {
        const px = Math.random() * width;
        const py = centerY + (Math.random() - 0.5) * volume;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  return (
    <div className="waveform-container" style={{ width: '100%', height: '120px', overflow: 'hidden', display: isActive || isDevonSpeaking ? 'block' : 'none' }}>
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={120} 
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default VoiceWaveform;

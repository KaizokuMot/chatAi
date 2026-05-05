import { useState, useRef } from 'react';

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);
  
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  const speakText = async (aiText: string) => {
    setIsGeneratingVoice(true);
    setError(null);
    setEngineStatus('warming up...');
    setProgress(0);
    setChunkCount(0);

    const baseUrl = "https://fruity-deer-lead.loca.lt";
    const apiTtsUrl = `${baseUrl}/api/tts`;
    const wsUrl = `wss://fruity-deer-lead.loca.lt/api/tts/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log("WebSocket connected to TTS engine");
        socket.send(JSON.stringify({ text: aiText, voice: "Junhao" }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) {
             if (data.chunk && data.chunk > 0) setEngineStatus('generating');
             else setEngineStatus(data.status);
          }
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.chunk !== undefined) setChunkCount(data.chunk);

          if (data.status === 'complete' || data.status === 'Loading audio...' || data.audio_url) {
            setProgress(100);
            const path = data.audio_url || data.url;
            if (path) {
              const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
              fetchAndPlayAudio(fullUrl);
              socket.close();
            }
          }
        } catch (e) {
          console.error("WS parse error:", e);
        }
      };

      socket.onerror = () => {
        console.warn("WebSocket error, falling back to polling if needed...");
      };

      // Silent POST fallback - ignore ERR_EMPTY_RESPONSE errors here
      fetch(apiTtsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
        credentials: 'include',
        body: JSON.stringify({ text: aiText })
      }).catch(() => {});

    } catch (err: any) {
      console.error("TTS Error:", err);
      setIsGeneratingVoice(false);
      setEngineStatus('idle');
    }
  };

  const fetchAndPlayAudio = async (url: string) => {
    try {
      setEngineStatus('downloading...');
      const resp = await fetch(url, {
        headers: { 'bypass-tunnel-reminder': 'true' },
        credentials: 'include'
      });
      if (resp.ok) {
        const blob = await resp.blob();
        playAudioFromBlob(blob);
      } else {
        setIsGeneratingVoice(false);
        setEngineStatus('error');
      }
    } catch (e) {
      console.error("Failed to fetch audio:", e);
      setIsGeneratingVoice(false);
    }
  };

  const playAudioFromBlob = async (blob: Blob) => {
    setIsGeneratingVoice(false);
    setIsSpeaking(true);
    setEngineStatus("speaking...");

    // Safety Watchdog: Reset if stuck for > 60s
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      if (isSpeaking) {
        console.warn("TTS Watchdog: Audio seems stuck, resetting...");
        setIsSpeaking(false);
        setEngineStatus('idle');
      }
    }, 60000);
    
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass();
      
      // CRITICAL FOR PRODUCTION: Ensure context is resumed
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setIsSpeaking(false);
        setEngineStatus('idle');
        audioCtx.close();
      };
      
      source.start(0);
    } catch (err) {
      console.error("AudioContext failed, using fallback:", err);
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setIsSpeaking(false);
        setEngineStatus('idle');
        URL.revokeObjectURL(audioUrl);
      };
      audio.play().catch(e => {
        console.error("Fallback audio play failed:", e);
        setIsSpeaking(false);
        setEngineStatus('idle');
      });
    }
  };

  return { speakText, isSpeaking, isGeneratingVoice, error, engineStatus, progress, chunkCount };
}

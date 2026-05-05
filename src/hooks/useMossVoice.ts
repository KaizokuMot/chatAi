import { useState, useRef } from 'react';

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);
  
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const prepareAudio = async () => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    } catch (e) {
      console.warn("AudioContext preparation failed:", e);
    }
  };

  const speakText = async (aiText: string) => {
    setIsGeneratingVoice(true);
    setError(null);
    setEngineStatus('warming up...');
    setProgress(0);
    setChunkCount(0);

    prepareAudio();

    const baseUrl = "https://lazy-words-sell.loca.lt";
    const apiTtsUrl = `${baseUrl}/api/tts`;
    // Note: Localtunnel sometimes struggles with WSS from different origins
    const wsUrl = `wss://lazy-words-sell.loca.lt/api/tts/ws`;

    try {
      // Create WebSocket with bypass if possible (using subprotocols is a common trick)
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        socket.send(JSON.stringify({ text: aiText, voice: "Junhao" }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.status) setEngineStatus(data.status);
          if (data.progress !== undefined) setProgress(data.progress);
          
          if (data.status === 'complete' || data.status === 'Loading audio...' || data.audio_url) {
            const path = data.audio_url || data.url;
            if (path) {
              const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
              fetchAndPlayAudio(fullUrl);
              socket.close();
            }
          }
        } catch (e) {}
      };

      // If WebSocket fails immediately (CORS/Proxy issue), Dixon will wait for the POST fallback
      socket.onerror = () => {
        console.warn("WebSocket blocked by proxy, waiting for POST response...");
      };

      // POST Request with ALL possible bypass headers
      fetch(apiTtsUrl, {
        method: 'POST',
        mode: 'cors', // Explicitly set CORS mode
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true',
          'x-bypass-test': 'true'
        },
        credentials: 'include',
        body: JSON.stringify({ text: aiText })
      }).then(async (resp) => {
         if (resp.ok) {
           const blob = await resp.blob();
           if (blob.size > 1000) playAudioFromBlob(blob);
         }
      }).catch(e => {
        console.error("CORS/Network error on POST:", e);
      });

    } catch (err: any) {
      setIsGeneratingVoice(false);
      setEngineStatus('idle');
    }
  };

  const fetchAndPlayAudio = async (url: string) => {
    try {
      const resp = await fetch(url, {
        headers: { 'bypass-tunnel-reminder': 'true' },
        credentials: 'include'
      });
      if (resp.ok) {
        const blob = await resp.blob();
        playAudioFromBlob(blob);
      }
    } catch (e) {
      setIsGeneratingVoice(false);
    }
  };

  const playAudioFromBlob = async (blob: Blob) => {
    setIsGeneratingVoice(false);
    setIsSpeaking(true);
    setEngineStatus("speaking...");

    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    watchdogRef.current = setTimeout(() => {
      setIsSpeaking(false);
      setEngineStatus('idle');
    }, 15000);
    
    try {
      await prepareAudio();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
      const source = audioCtxRef.current!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtxRef.current!.destination);
      
      source.onended = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setIsSpeaking(false);
        setEngineStatus('idle');
      };
      
      source.start(0);
    } catch (err) {
      console.error("AudioContext failed", err);
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setIsSpeaking(false);
        setEngineStatus('idle');
      };
      audio.play().catch(() => {
        setIsSpeaking(false);
        setEngineStatus('idle');
      });
    }
  };

  const forceReset = () => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    setIsSpeaking(false);
    setIsGeneratingVoice(false);
    setEngineStatus('idle');
  };

  return { speakText, isSpeaking, isGeneratingVoice, error, engineStatus, progress, chunkCount, forceReset };
}

import { useState } from 'react';

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);

  const speakText = async (aiText: string) => {
    setIsGeneratingVoice(true);
    setError(null);
    setEngineStatus('warming up...');
    setProgress(0);
    setChunkCount(0);

    const baseUrl = "https://fruity-deer-lead.loca.lt";
    const apiTtsUrl = `${baseUrl}/api/tts`;
    const wsUrl = `wss://https://fruity-deer-lead.loca.lt/api/tts/ws`;

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
             // If we start getting chunks, change status to 'generating'
             if (data.chunk && data.chunk > 0) {
               setEngineStatus('generating');
             } else {
               setEngineStatus(data.status);
             }
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
        setEngineStatus('ws error...');
        setIsGeneratingVoice(false);
      };

      // Also trigger via POST as a silent background prep
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
      setEngineStatus('ready...');
      const resp = await fetch(url, {
        headers: { 'bypass-tunnel-reminder': 'true' },
        credentials: 'include'
      });
      if (resp.ok) {
        const blob = await resp.blob();
        playAudioFromBlob(blob);
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
    
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        setEngineStatus('idle');
        audioCtx.close();
      };
      source.start(0);
    } catch (err) {
      console.error("AudioContext failed", err);
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.onended = () => {
        setIsSpeaking(false);
        setEngineStatus('idle');
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    }
  };

  return { speakText, isSpeaking, isGeneratingVoice, error, engineStatus, progress, chunkCount };
}

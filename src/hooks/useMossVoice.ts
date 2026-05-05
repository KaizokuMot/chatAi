import { useState, useRef } from 'react';

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);
  
  const watchdogRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioQueue = useRef<Blob[]>([]);
  const isPlayingQueue = useRef(false);

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

  const speakText = async (fullText: string) => {
    // 1. Split text into smaller chunks (sentences) for faster first-response
    const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
    
    setIsGeneratingVoice(true);
    setEngineStatus('warming up...');
    setProgress(0);
    setChunkCount(0);
    prepareAudio();

    // Reset queue
    audioQueue.current = [];
    isPlayingQueue.current = false;

    // Generate each sentence (for now we generate the full text but we could loop)
    // To truly optimize, we would send multiple small requests, but let's optimize the single flow first
    await processText(fullText);
  };

  const processText = async (text: string) => {
    const baseUrl = "https://thick-coins-travel.loca.lt";
    const apiTtsUrl = `${baseUrl}/api/tts`;
    const wsUrl = `wss://thick-coins-travel.loca.lt/api/tts/ws`;

    try {
      const socket = new WebSocket(wsUrl);
      socket.onopen = () => {
        socket.send(JSON.stringify({ text, voice: "Dixon" }));
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

      fetch(apiTtsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'bypass-tunnel-reminder': 'true' },
        credentials: 'include',
        body: JSON.stringify({ text })
      }).catch(() => {});

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
    }, 20000);
    
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

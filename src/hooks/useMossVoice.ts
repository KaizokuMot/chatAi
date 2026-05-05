import { useState } from 'react';

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);


  const speakText = async (aiText: string) => {
    setIsSpeaking(true);
    setError(null);
    setEngineStatus('initializing voice...');
    setProgress(0);
    setChunkCount(0);

    const baseUrl = "https://shy-buckets-fail.loca.lt";
    const apiTtsUrl = `${baseUrl}/api/tts`;
    const wsUrl = `wss://shy-buckets-fail.loca.lt/api/tts/ws`;

    try {
      // 1. Connect to WebSocket (Server expects client to talk first)
      const socket = new WebSocket(wsUrl);
      let socketOpen = false;
      
      socket.onopen = () => {
        socketOpen = true;
        setEngineStatus('voice engine connected...');
        console.log("WebSocket connected to TTS engine");
        
        // HANDSHAKE: Send the text to the server so it starts generating
        socket.send(JSON.stringify({ 
          text: aiText,
          voice: "Junhao" // Default as per your server code
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("TTS WS Update:", data);
          
          if (data.status) {
            setEngineStatus(data.status);
          }
          
          if (data.progress !== undefined) setProgress(data.progress);
          if (data.chunk !== undefined) setChunkCount(data.chunk);

          // Your server sends 'complete' with 'audio_url'
          if (data.status === 'complete' || data.audio_url) {
            setProgress(100);
            const path = data.audio_url || data.url;

            if (path) {
              const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
              console.log("TTS: Playing completed audio from:", fullUrl);
              fetchAndPlayAudio(fullUrl);
              socket.close();
            }
          }
        } catch (e) {
          console.error("WS Message parse error:", e);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        setEngineStatus('working (ws unavailable)...');
      };

      // 2. Trigger the TTS generation via POST as well (Server handles both)
      console.log("TTS: Sending POST request to", apiTtsUrl);
      const response = await fetch(apiTtsUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'bypass-tunnel-reminder': 'true'
        },
        credentials: 'include', 
        body: JSON.stringify({ text: aiText })
      });

      console.log("TTS: Response status", response.status);

      if (!response.ok) {
        if (response.status === 511) throw new Error("Tunnel Auth Required");
        console.warn("TTS POST failed, relying on WebSocket...");
        return; 
      }

      const contentType = response.headers.get('Content-Type');
      const blob = await response.blob();
      const text = await blob.text();

      // If the POST returns the full audio directly, play it immediately
      if (contentType && contentType.includes('audio') && blob.size > 1000) {
        console.log("TTS: Playing direct audio stream from POST");
        playAudioFromBlob(blob);
        if (socket.readyState === WebSocket.OPEN) socket.close();
        return;
      }

      // If the POST returns JSON (mislabeled or otherwise)
      if (text.trim().startsWith('{')) {
        try {
          const result = JSON.parse(text);
          handleJsonResponse(result, baseUrl, socketOpen);
        } catch (e) {}
      }

    } catch (err: any) {
      console.error("Voice Generation failed:", err);
      setError(err.message || "Failed to generate voice");
      setIsSpeaking(false);
      setEngineStatus('idle');
    }
  };

  const handleJsonResponse = (result: any, baseUrl: string, socketOpen: boolean) => {
    console.log("TTS API Response (JSON):", result);
    // Handle either audio_url (from your Pydantic model) or filename
    const path = result.audio_url || result.filename;
    if (path) {
      const fullUrl = path.startsWith('http') ? path : (path.startsWith('/audio') ? `${baseUrl}${path}` : `${baseUrl}/audio/${path}`);
      if (socketOpen) {
        setEngineStatus('generating...');
      } else {
        setEngineStatus('polling...');
        pollForAudio(fullUrl);
      }
    }
  };

  const pollForAudio = async (url: string, attempts = 0) => {
    if (attempts >= 20) { 
      setEngineStatus('timeout');
      setIsSpeaking(false);
      return;
    }

    try {
      const resp = await fetch(url, { 
        headers: { 'bypass-tunnel-reminder': 'true' },
        credentials: 'include'
      });
      if (resp.ok) {
        const audioBlob = await resp.blob();
        playAudioFromBlob(audioBlob);
      } else {
        setTimeout(() => pollForAudio(url, attempts + 1), 1000);
      }
    } catch (e) {
      setTimeout(() => pollForAudio(url, attempts + 1), 1000);
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
      console.error("Failed to fetch final audio:", e);
    }
  };

  const playAudioFromBlob = async (blob: Blob) => {
    console.log("TTS: AudioContext playback, size:", blob.size);
    setEngineStatus("playing...");
    
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
      console.log("TTS: Playing...");
      
    } catch (err) {
      console.error("TTS: AudioContext failed, using fallback:", err);
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

  return { speakText, isSpeaking, error, engineStatus, progress, chunkCount };
}


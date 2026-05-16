import { useState, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// TTS URL resolution
//  - Priority 1: localStorage key "ttsUrl"  (set this when the tunnel changes)
//  - Priority 2: compile-time env var VITE_TTS_URL
//  - Priority 3: localhost fallback for dev
// ---------------------------------------------------------------------------
function getTtsBaseUrl(): string {
  return (
    localStorage.getItem('ttsUrl') ||
    (import.meta.env.VITE_TTS_URL as string | undefined) ||
    'https://mdx.tail299d7f.ts.net'
  );
}

// ---------------------------------------------------------------------------
// useMossVoice
//  Calls POST /api/tts  → returns a WAV blob → plays via AudioContext
//  No streaming, no WebSocket.  Voice is always "Della" (bella.wav preset).
// ---------------------------------------------------------------------------
export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);
  const [normalizedText, setNormalizedText] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track the current source so forceReset can stop it
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Abort controller so in-flight requests can be cancelled
  const abortRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------------------
  // Ensure AudioContext is ready
  // -------------------------------------------------------------------------
  const prepareAudio = async () => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
    } catch {
      console.warn('AudioContext preparation failed');
    }
  };

  // -------------------------------------------------------------------------
  // Play a WAV blob
  // -------------------------------------------------------------------------
  const playAudioFromBlob = useCallback((blob: Blob) => {
    return new Promise<void>(async (resolve) => {
      console.log(`[useMossVoice] Playing audio blob of size: ${blob.size} bytes`);
      setEngineStatus('decoding...');
      setIsSpeaking(true);

      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      watchdogRef.current = setTimeout(() => {
        setIsSpeaking(false);
        setEngineStatus('idle');
        resolve();
      }, 60_000);

      const onEnded = () => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        setIsSpeaking(false);
        setEngineStatus('idle');
        sourceRef.current = null;
        audioRef.current = null;
        resolve();
      };

      try {
        await prepareAudio();
        const arrayBuffer = await blob.arrayBuffer();
        console.log(`[useMossVoice] Decoding audio data...`);
        const audioBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
        console.log(`[useMossVoice] Audio decoded successfully. Duration: ${audioBuffer.duration.toFixed(2)}s`);
        setEngineStatus('speaking...');
        
        const source = audioCtxRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtxRef.current!.destination);
        source.onended = onEnded;
        sourceRef.current = source;
        source.start(0);
      } catch (err) {
        console.warn('[useMossVoice] WebAudio decode failed, falling back to HTML Audio:', err);
        // Fallback to HTML audio element
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          console.log('[useMossVoice] HTML Audio playback ended');
          URL.revokeObjectURL(url);
          onEnded();
        };
        audio.onerror = (e) => {
          console.error('[useMossVoice] HTML Audio error:', e);
          URL.revokeObjectURL(url);
          onEnded();
        };
        audio.play().catch(e => {
          console.error('[useMossVoice] HTML Audio play blocked:', e);
          onEnded();
        });
      }
    });
  }, []);

  // -------------------------------------------------------------------------
  // Generate a single chunk of text via POST /api/tts
  // -------------------------------------------------------------------------
  const generateChunk = useCallback(async (text: string, signal: AbortSignal): Promise<{blob: Blob, normalized: string} | null> => {
    const baseUrl = getTtsBaseUrl();
    const url = `${baseUrl}/api/tts`;

    console.log(`[useMossVoice] Generating chunk: "${text.substring(0, 30)}..." at ${url}`);
    
    // Create a timeout signal for the request (30 seconds per sentence)
    const timeoutId = setTimeout(() => {
      // We don't abort the main signal, just this individual chunk if it takes too long
    }, 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ 
        text, 
        voice: 'Bella',
        cpu_threads: parseInt(localStorage.getItem('tts_cpuThreads') || '6') || 6,
        attn_implementation: localStorage.getItem('tts_attnBackend') || 'model_default',
        text_temperature: parseFloat(localStorage.getItem('tts_textTemp') || '1.0') || 1.0,
        audio_temperature: parseFloat(localStorage.getItem('tts_audioTemp') || '0.8') || 0.8,
        text_top_p: parseFloat(localStorage.getItem('tts_textTopP') || '1.0') || 1.0,
        audio_top_p: parseFloat(localStorage.getItem('tts_audioTopP') || '0.95') || 0.95,
        text_top_k: parseInt(localStorage.getItem('tts_textTopK') || '50') || 50,
        audio_top_k: parseInt(localStorage.getItem('tts_audioTopK') || '25') || 25,
        audio_repetition_penalty: parseFloat(localStorage.getItem('tts_audioRepPenalty') || '1.2') || 1.2,
      }),
      signal,
    });
    
    clearTimeout(timeoutId);
    console.log(`[useMossVoice] Chunk response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`TTS server error ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`[useMossVoice] Content-Type: ${contentType}`);
    
    // CASE 1: New JSON API (with metadata)
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      if (data.status === 'success' && data.audio_base64) {
        const binaryString = window.atob(data.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return {
          blob: new Blob([bytes], { type: 'audio/wav' }),
          normalized: data.normalized_text
        };
      }
    } 
    
    // CASE 2: Legacy Binary API (raw WAV)
    const blob = await response.blob();
    return {
      blob,
      normalized: text // Fallback to original text if server is old
    };
  }, []);

  // -------------------------------------------------------------------------
  // speakText – entry point called from Therapy / Chat
  //   Splits text into sentences, generates + plays each one sequentially.
  // -------------------------------------------------------------------------
  const speakText = useCallback(async (fullText: string) => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const sentences: string[] = fullText.match(/[^.!?]+[.!?]+/g) ?? [fullText];
    const cleaned = sentences.map(s => s.trim()).filter(Boolean);

    setError(null);
    setIsGeneratingVoice(true);
    setEngineStatus('chunking...');
    setProgress(0);
    setChunkCount(cleaned.length);
    await prepareAudio();

    for (let i = 0; i < cleaned.length; i++) {
      if (abortRef.current.signal.aborted) break;
      try {
        setEngineStatus(`generating chunk ${i + 1}/${cleaned.length}...`);
        setProgress(Math.round(((i) / cleaned.length) * 100));

        const result = await generateChunk(cleaned[i], abortRef.current.signal);
        if (!result) continue;

        setNormalizedText(result.normalized);
        setProgress(Math.round(((i + 1) / cleaned.length) * 100));
        // Wait for the chunk to finish playing before generating the next
        setIsGeneratingVoice(false); // Switch to 'speaking' mode for UI
        await playAudioFromBlob(result.blob);
        setIsGeneratingVoice(true); // Back to 'generating' mode for next chunk

        // Small pause between sentences
        await new Promise(res => setTimeout(res, 120));
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        const msg = err?.message ?? 'Unknown TTS error';
        setError(msg);
        console.error('[useMossVoice] chunk error:', msg);
        setIsGeneratingVoice(false);
        setEngineStatus('error');
        break; // Stop if there's an error
      }
    }

    setIsGeneratingVoice(false);
    setEngineStatus('idle');
    setProgress(100);
  }, [generateChunk, playAudioFromBlob]);

  // -------------------------------------------------------------------------
  // forceReset – stop everything immediately
  // -------------------------------------------------------------------------
  const forceReset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch { /* already stopped */ }
      sourceRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsGeneratingVoice(false);
    setEngineStatus('idle');
    setProgress(0);
  }, []);

  return {
    speakText,
    isSpeaking,
    isGeneratingVoice,
    error,
    engineStatus,
    progress,
    chunkCount,
    normalizedText,
    forceReset,
  };
}

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
//  No streaming, no WebSocket.  Voice is always "Dixon" (dixon.wav preset).
// ---------------------------------------------------------------------------
export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [chunkCount, setChunkCount] = useState<number>(0);

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
      setIsGeneratingVoice(false);
      setIsSpeaking(true);
      setEngineStatus('speaking...');

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
        const audioBuffer = await audioCtxRef.current!.decodeAudioData(arrayBuffer);
        const source = audioCtxRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtxRef.current!.destination);
        source.onended = onEnded;
        sourceRef.current = source;
        source.start(0);
      } catch {
        // Fallback to HTML audio element
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          onEnded();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          onEnded();
        };
        audio.play().catch(() => onEnded());
      }
    });
  }, []);

  // -------------------------------------------------------------------------
  // Generate a single chunk of text via POST /api/tts
  // -------------------------------------------------------------------------
  const generateChunk = useCallback(async (text: string, signal: AbortSignal): Promise<Blob | null> => {
    const baseUrl = getTtsBaseUrl();
    const url = `${baseUrl}/api/tts`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true',
        'ngrok-skip-browser-warning': 'true',
      },
      body: JSON.stringify({ text, voice: 'Dixon' }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`TTS server error ${response.status}: ${response.statusText}`);
    }

    return response.blob();
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
    setEngineStatus('generating...');
    setProgress(0);
    setChunkCount(cleaned.length);
    await prepareAudio();

    for (let i = 0; i < cleaned.length; i++) {
      if (abortRef.current.signal.aborted) break;
      try {
        setEngineStatus(`generating chunk ${i + 1}/${cleaned.length}...`);
        setProgress(Math.round(((i) / cleaned.length) * 100));

        const blob = await generateChunk(cleaned[i], abortRef.current.signal);
        if (!blob) continue;

        setProgress(Math.round(((i + 1) / cleaned.length) * 100));
        // Wait for the chunk to finish playing before generating the next
        await playAudioFromBlob(blob);

        // Small pause between sentences
        await new Promise(res => setTimeout(res, 120));
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        const msg = err?.message ?? 'Unknown TTS error';
        setError(msg);
        console.error('[useMossVoice] chunk error:', msg);
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
    forceReset,
  };
}

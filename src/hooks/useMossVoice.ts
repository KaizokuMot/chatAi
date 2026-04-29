import { useState } from 'react';
import { Client } from "@gradio/client";

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<string>('idle');

  const speakText = async (aiText: string) => {
    setIsSpeaking(true);
    setError(null);
    setEngineStatus('connecting to voice engine...');

    try {
      // Connect to your ngrok or Gradio exposed URL
      const gradioUrl = import.meta.env.VITE_GRADIO_ENDPOINT || "https://8ac6-102-86-13-172.ngrok-free.app";
      const app = await Client.connect(gradioUrl, {
        headers: { "ngrok-skip-browser-warning": "true" }
      });
      const submission = app.submit("/_on_generate", [
        "User Prompt",             // user_text (context)
        aiText,                    // assistant_text (What gets spoken!)
        null,                      // prompt_audio
        null,                      // user_audio
        true,                      // use_default_prompt (This uses your to-use.m4a!)
        false,                     // use_default_user
        0.8, 0.6, 30, 1.1,         // temp, top_p, top_k, repetition_penalty
        50, true, 2000, 0,         // repetition_window, do_sample, max_length, seed
        12, 0.0, 6, 0, 0.96, 0.0   // streaming/codec settings (default)
      ]);

      for await (const msg of submission) {
        if (msg.type === "status") {
          const stage = msg.stage || "generating";
          setEngineStatus(`voice engine: ${stage}...`);
        } else if (msg.type === "data") {
          const responseData = msg.data as any[];
          const audioData = responseData[1];
          const infoStatus = responseData[2]; // This contains detailed progress like "chunks=10 | audio=4.48s"

          // Update UI with the detailed text status from the Gradio engine
          if (infoStatus) {
            setEngineStatus(infoStatus);
          }

          // If Final Audio is populated (usually happens on the final event), play it!
          if (audioData) {
            let audioUrl = typeof audioData === 'string' ? audioData : audioData?.url;

            // Fallback for Gradio 4+ if it returns `.path` instead of auto-resolving `.url`
            if (!audioUrl && audioData?.path) {
              const gradioUrl = import.meta.env.VITE_GRADIO_ENDPOINT || "https://8ac6-102-86-13-172.ngrok-free.app";
              audioUrl = `${gradioUrl}/file=${audioData.path}`;
            }

            if (audioUrl) {
              setEngineStatus("playing audio...");
              const audio = new Audio(audioUrl);
              
              audio.onerror = () => {
                console.error("Audio playback error for URL:", audioUrl);
                setEngineStatus('audio playback failed - try again');
                setIsSpeaking(false);
              };
              
              audio.onended = () => {
                setIsSpeaking(false);
                setEngineStatus('idle');
              };
              
              try {
                await audio.play();
              } catch (playError) {
                console.error("Audio play() rejected:", playError);
                setEngineStatus('audio playback blocked - check browser permissions');
                setIsSpeaking(false);
              }
            }
          }
          // Note: We DO NOT throw an error if audioData is null, because intermediate streaming events will naturally have null audio until the final chunk.
        }
      }

    } catch (err: any) {
      console.error("Voice Generation failed:", err);
      setError(err.message || "Failed to generate voice");
      setIsSpeaking(false);
      setEngineStatus('idle');
    }
  };

  return { speakText, isSpeaking, error, engineStatus };
}

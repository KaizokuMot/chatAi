import { useState } from 'react';
import { Client } from "@gradio/client";

export function useMossVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speakText = async (aiText: string) => {
    setIsSpeaking(true);
    setError(null);
   
    try {
      // Connect to your ngrok or Gradio exposed URL
      const app = await Client.connect("https://cce8-197-239-7-140.ngrok-free.app");
     
      // Call the API endpoint (matches the Gradio generate button exactly)
      const result = await app.predict("/predict", [
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

      // The returned result has a standard structure. `result.data[1]` contains the output Audio.
      const responseData = result.data as any[];
      const audioData = responseData[1];
     
      if (audioData && audioData.url) {
        // Instantiate real temporary HTML Audio object and play it
        const audio = new Audio(audioData.url);
       
        audio.onended = () => setIsSpeaking(false);
        await audio.play();
      } else {
        throw new Error("No audio returned from server");
      }

    } catch (err: any) {
      console.error("Voice Generation failed:", err);
      setError(err.message || "Failed to generate voice");
      setIsSpeaking(false);
    }
  };

  return { speakText, isSpeaking, error };
}

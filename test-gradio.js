import { Client } from "@gradio/client";

async function test() {
  const url = "https://cce8-197-239-7-140.ngrok-free.app";
  try {
    console.log(`Connecting to Gradio at ${url}...`);
    const app = await Client.connect(url);
    console.log("Connected!");

    const aiText = "Hello, this is a test of the Moss Voice system.";
    const payload = [
      "User Prompt",             // user_text (context)
      aiText,                    // assistant_text (What gets spoken!)
      null,                      // prompt_audio
      null,                      // user_audio
      true,                      // use_default_prompt (This uses your to-use.m4a!)
      false,                     // use_default_user
      0.8, 0.6, 30, 1.1,         // temp, top_p, top_k, repetition_penalty
      50, true, 2000, 0,         // repetition_window, do_sample, max_length, seed
      12, 0.0, 6, 0, 0.96, 0.0   // streaming/codec settings (default)
    ];

    console.log("Attempting prediction on index 0...");
    try {
      const result = await app.predict(0, payload);
      console.log("SUCCESS on index 0!");
      console.log("Audio URL:", result.data[1]?.url);
      return;
    } catch (e) {
      console.log("Failed on index 0:", e.message);
    }

    console.log("Attempting prediction on index 1...");
    try {
      const result = await app.predict(1, payload);
      console.log("SUCCESS on index 1!");
      console.log("Audio URL:", result.data[1]?.url);
      return;
    } catch (e) {
      console.log("Failed on index 1:", e.message);
    }

    console.log("Attempting prediction on /predict...");
    try {
      const result = await app.predict("/predict", payload);
      console.log("SUCCESS on /predict!");
      console.log("Audio URL:", result.data[1]?.url);
      return;
    } catch (e) {
      console.log("Failed on /predict:", e.message);
    }

  } catch (error) {
    console.error("Error during connection:", error.message);
    if (error.message.includes("fetch failed")) {
      console.log("TIP: Check if the ngrok URL is still active and accessible.");
    }
  }
}

test();

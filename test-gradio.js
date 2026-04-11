import { Client } from "@gradio/client";

async function test() {
  const url = "https://f09f-102-86-13-172.ngrok-free.app";
  try {
    console.log(`Connecting to Gradio at ${url}...`);
    const app = await Client.connect(url, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    console.log("Connected!");

    const payload = [
      "User Prompt",             // user_text (context)
      "Hello, this is a test.",  // assistant_text
      null,                      // prompt_audio
      null,                      // user_audio
      true,                      // use_default_prompt
      false,                     // use_default_user
      0.8, 0.6, 30, 1.1,         // temp, top_p, top_k, repetition_penalty
      50, true, 2000, 0,         // repetition_window, do_sample, max_length, seed
      12, 0.0, 6, 0, 0.96, 0.0   // streaming/codec settings (default)
    ];
    const submission = app.submit("/_on_generate", payload);
    for await (const msg of submission) {
      console.log("Msg Type:", msg.type);
      if (msg.type === "status") {
        console.log("Status Stage:", msg.stage);
      } else if (msg.type === "data") {
        console.log("Raw Data result:", JSON.stringify(msg.data, null, 2));
      }
    }
  } catch (error) {
    console.error("Error during connection:", error.message);
  }
}

test();

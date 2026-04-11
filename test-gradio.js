import { Client } from "@gradio/client";

async function test() {
  const url = "https://8ac6-102-86-13-172.ngrok-free.app";
  try {
    console.log(`Connecting to Gradio at ${url}...`);
    const app = await Client.connect(url, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    console.log("Connected!");

    const apiInfo = await app.view_api();
    console.log(JSON.stringify(apiInfo.named_endpoints["/_on_generate"], null, 2));
  } catch (error) {
    console.error("Error during connection:", error.message);
  }
}

test();

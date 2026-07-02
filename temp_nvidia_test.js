const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
const headers = {
  'Authorization': 'Bearer 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',
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

const payload = {
  model: 'minimaxai/minimax-m3',
  messages: [{ role: 'user', content: "How many r's are in strawberry?" }],
  max_tokens: 8192,
  temperature: 1.0,
  top_p: 0.95,
  stream: false
};

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (error) {
    console.error('ERROR', error);
  }
})();

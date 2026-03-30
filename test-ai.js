
async function test() {
  const url = 'https://necessitative-freeda-serologically.ngrok-free.dev/api/chat';
  const data = {
    model: 'gemma3:1b',
    messages: [{ role: 'user', content: 'hi' }],
    stream: false
  };

  try {
    console.log(`Testing ${url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
      body: JSON.stringify(data)
    });

    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();

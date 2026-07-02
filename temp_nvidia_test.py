import json
import urllib.request
import urllib.error

url = 'https://integrate.api.nvidia.com/v1/chat/completions'
headers = {
    'Authorization': 'Bearer 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',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
}
payload = {
    'model': 'minimaxai/minimax-m3',
    'messages': [{'role': 'user', 'content': "How many r's are in strawberry?"}],
    'max_tokens': 8192,
    'temperature': 1.0,
    'top_p': 0.95,
    'stream': False
}
req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        body = resp.read().decode('utf-8')
        print('STATUS', resp.status)
        print(body)
except urllib.error.HTTPError as e:
    print('HTTP', e.code, e.reason)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('ERROR', e)

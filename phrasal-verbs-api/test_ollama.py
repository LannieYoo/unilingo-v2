#!/usr/bin/env python3
import httpx, json
r = httpx.post(
    'http://ollama:11434/api/generate',
    json={
        'model': 'qwen3.6',
        'prompt': 'List 3 phrasal verbs for "endure". Return ONLY a JSON array. No thinking tags, no markdown, no explanation. Example format: [{"phrase":"put up with","meaning":"tolerate"}]',
        'stream': False,
        'options': {'temperature': 0.3, 'num_predict': 1024}
    },
    timeout=120
)
resp = r.json().get('response', '')
print("RAW RESPONSE:")
print(resp[:2000])

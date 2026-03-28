---
trigger: always_on
---

API Integration Rule

Inspect both frontend request code and backend endpoint code before changing anything.
Verify request URL, method, headers, payload, and authentication flow first.
Check response status codes, response body shape, and error handling on both client and server.
Do not assume the frontend and backend agree on field names, casing, types, or nesting.
For integration bugs, compare the actual request and actual response with the expected contract.
Check CORS, cookies, tokens, proxy settings, base URLs, and environment variable usage.
Prefer fixing the contract mismatch at the correct layer instead of adding fragile workarounds.
After each fix, verify the request in browser network tools and confirm the backend logs match expectations.
Summarize root cause, contract mismatch if any, code change, and proof of verification.
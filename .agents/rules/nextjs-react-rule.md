---
trigger: always_on
---

Next.js React Rule

Inspect the actual component, route, config, and console output before changing code.
Check browser console, network tab, server logs, and build output first.
Do not assume framework behavior without checking project files and documentation.
For UI bugs, inspect props, state, effects, rendering conditions, and async data flow.
For routing issues, check app router or pages router structure, middleware, redirects, and environment variables.
For API issues, verify request shape, response shape, status codes, and authentication flow.
Prefer the smallest possible code change that can be tested quickly.
After each fix, verify UI behavior, console errors, network requests, and build status.
Watch for hydration issues, client versus server component boundaries, and caching behavior.
Summarize root cause, code change, and verification results.
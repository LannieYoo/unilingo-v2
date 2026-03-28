---
trigger: always_on
---

Database and Auth Rule

Inspect the actual schema, queries, migrations, auth flow, and error logs before changing code.
Reproduce the issue with a clear request path from login or session creation to protected resource access.
Check database connection settings, migration state, seed data, and query assumptions first.
For auth bugs, verify session creation, token issuance, token validation, cookie flags, expiry, and middleware behavior.
Do not assume the user object, role, or session shape is the same across backend, frontend, and database layers.
Check for mismatches in IDs, field names, relation loading, permissions, and null handling.
Prefer the smallest possible fix that preserves data integrity and security.
After each fix, verify login, logout, protected routes, database writes, and authorization behavior.
Summarize root cause, affected layer, code or config change, and proof of verification.
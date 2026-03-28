---
trigger: always_on
---

Python FastAPI Rule

Inspect the actual endpoint, schema, logs, stack trace, and configuration before changing code.
Reproduce the issue clearly before proposing a fix.
Check request models, response models, validation errors, and dependency injection flow.
Verify environment variables, database connection settings, and middleware behavior.
For API bugs, inspect status codes, request payloads, response payloads, and exception handling.
Do not guess library behavior when you can inspect the code or documentation.
Prefer minimal, reversible changes with clear validation steps.
After each fix, test the endpoint again and confirm expected output.
Check for related issues in authentication, CORS, async handling, and database transactions.
Summarize root cause, fix, and proof of verification.
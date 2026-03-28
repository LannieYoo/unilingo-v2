---
trigger: always_on
---

Env and Deployment Rule

Inspect the actual environment variables, config files, build settings, and deployment logs before changing code.
Verify which environment is failing: local, development, preview, staging, or production.
Do not assume an environment variable is loaded correctly without checking its source and scope.
Check .env files, platform secrets, build commands, output directories, and runtime configuration.
For deployment bugs, inspect build logs, runtime logs, package versions, and framework mode.
Check differences between local and deployed behavior, including paths, ports, domains, and API base URLs.
Prefer minimal configuration fixes over broad code changes when the issue is environment-specific.
After each fix, verify build success, runtime health, and the exact user-facing behavior.
Summarize root cause, environment difference, configuration change, and proof of verification.
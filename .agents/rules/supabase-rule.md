---
trigger: always_on
---

Supabase Rule

Inspect the actual Supabase client usage, environment variables, schema, policies, and logs before changing code.
Verify whether the issue is in Database, Auth, Storage, Edge Functions, or client configuration first.
Do not assume the anon key, service role key, project URL, or environment variables are loaded correctly without checking.
For database issues, inspect schema, constraints, relations, migrations, and the exact query being executed.
For auth issues, verify session state, token handling, cookie behavior, redirect flow, and server versus client usage.
For RLS issues, inspect the actual policy, authenticated role, anon role, user ID match, and query context before changing application code.
Do not bypass Row Level Security unless there is a clear server-side reason and the security impact is understood.
For storage issues, verify bucket policy, file path, upload response, signed URL logic, and public versus private access settings.
For Next.js integration, verify whether Supabase code runs in client components, server components, route handlers, or middleware, and use the correct helper for that context.
Prefer fixing schema, policy, configuration, or environment mismatches at the correct layer instead of adding fragile frontend workarounds.
After each fix, verify the exact failing flow end to end, including login state, query result, policy behavior, and user-visible outcome.
Summarize root cause, affected Supabase layer, code or policy change, and proof of verification.
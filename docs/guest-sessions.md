# Guest sessions and account transfer

The root frontend creates a random 256-bit `guest_id` on first entry, including
direct links to registration and upload. Web uses localStorage; native uses
SecureStore. The API receives it in `X-Guest-Id` and stores only a SHA-256 hash.
Treat the device value as a credential, not a public analytics identifier.

First-touch UTM/referral attribution is inserted once, including an empty/direct
visit. Later URLs cannot change it. Each analysis stores its session reference,
attribution, source resume, goal, requested language, result and matched jobs.
Draft forms and interface language are saved separately in the guest session.
Uploaded originals are stored when the user submits the analysis; selecting a
local file alone does not upload it. A browser reload requires reselecting an
unsubmitted local file. Text drafts have a device cache and background server sync.

After password, Google or Telegram authentication, the root bridge claims the
session with the authenticated API. Owner assignment is atomic and cannot switch
accounts. All unexpired session analyses are linked in bulk, retaining their IDs,
results and sources. Retries are idempotent. Account first touch is set only if
absent. Existing-account sign-in adds analyses instead of replacing older ones.
Legacy analyses without a session ID can still be claimed with their existing
per-analysis secret. Logout clears device credentials and drafts; account data
remains in MongoDB.

History is available at `/resume-history` from the profile and full analysis.
`GET /api/guest/analyses/history` returns owner-only summaries, 20 per page.
Full results continue to require authenticated ownership. The saved draft API
can restore account drafts on another device without making them public.

Set `GUEST_RETENTION_DAYS` in backend configuration (integer 1–365, default 30).
New guest sessions and their analyses use that expiry. Mongo TTL and the minute
cleanup remove expired unowned records; API checks reject expiry immediately.
Claiming removes both analysis and source expiry. Changing configuration affects
new sessions, rather than reviving deleted or previously expired records.
Existing legacy analyses retain their original expiry until claimed. Previously
deleted source data cannot be recovered.

Run `npm run test:resume` in backend. Tests cover ownership, first touch, retention,
draft validation, private history, legacy claims and the existing AI pipeline
without contacting an AI provider or modifying the application database.

# AMOH JUSTICE AI Music Engine

This first-party API adapter removes KIE from the active Music Studio flow and connects the website to a self-hosted ACE-Step 1.5 model server.

## Architecture

- music-app.js calls /api/music.
- api/music.js verifies the user's Supabase access token on every request.
- Vercel calls a private ACE-Step HTTP API server. Model-server credentials remain server-side.
- ACE-Step 1.5 supports lyric-conditioned music generation with vocals and instruments. Its official v1.5 site states that it is released under the MIT License; review the specific model/checkpoint and upstream terms before commercial use.

## Vercel environment variables

Keep existing Supabase configuration unchanged.

- SUPABASE_URL — existing Supabase project URL.
- SUPABASE_ANON_KEY — existing Supabase anon/publishable key used for session validation.
- MUSIC_ENGINE_URL — base URL of your deployed ACE-Step API server, without a trailing slash.
- MUSIC_ENGINE_TOKEN — optional private API token configured on the ACE-Step server. Strongly recommended for an internet-accessible model server.

Do not add a KIE key for this design. Never put MUSIC_ENGINE_TOKEN in browser JavaScript or commit it to GitHub.

## Model server

Deploy the official ACE-Step 1.5 project on a compatible GPU host. From the ACE-Step environment, configure a long random secret as ACESTEP_API_KEY and start its API server (the official API guide documents port 8001):

```bash
export ACESTEP_API_KEY='replace-with-a-long-random-secret'
python -m acestep.api_server --api-key "$ACESTEP_API_KEY"
```

Set MUSIC_ENGINE_URL to the server's public HTTPS base URL and set the same secret as MUSIC_ENGINE_TOKEN in Vercel. Keep the model API behind HTTPS and authentication. Use the official API guide for the exact command and supported model setup:

- https://ace-step.github.io/ACE-Step-1.5/en/API
- https://github.com/ace-step/ACE-Step

Vercel hosts the authenticated website API; a separate GPU worker hosts the model. A free GPU host is not guaranteed. No paid host should be selected or activated without approval.

## Test plan

1. Set the environment variables in Vercel and redeploy.
2. Sign in to AMOH JUSTICE AI.
3. Open /music.html, enter original lyrics, choose a style and select Generate.
4. Verify the task completes and audio plays through /api/music?audio=...
5. Confirm unauthenticated requests return 401 and missing engine configuration returns 503.

## Limitations

The API adapter is ready for an ACE-Step-compatible server, but it cannot generate audio until MUSIC_ENGINE_URL points to a running model server. GPU hosting can incur charges. The initial song length is configured for two minutes; adjust duration after end-to-end testing.

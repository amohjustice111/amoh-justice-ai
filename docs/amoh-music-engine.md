# AMOH JUSTICE AI Music Engine

This first-party API adapter removes KIE from the active Music Studio flow and connects the website to an ACE-Step 1.5 model server. The AMOH endpoint is `/api/music`; the AI model still needs a separate running host.

## Architecture

- `music-app.js` calls `/api/music`.
- `api/music.js` verifies the user's Supabase access token on every generation, polling, and audio request.
- Vercel calls an ACE-Step HTTP API server. Model-server credentials stay server-side.
- ACE-Step 1.5 can generate music from descriptions and lyrics with vocals/instruments. Check the license of the exact model/checkpoint and upstream terms before commercial use.

## Vercel environment variables

Keep existing Supabase configuration unchanged.

- `SUPABASE_URL` — existing Supabase project URL.
- `SUPABASE_ANON_KEY` — existing Supabase anon/publishable key used for session validation.
- `MUSIC_ENGINE_URL` — base URL of the deployed ACE-Step HTTP API server, without a trailing slash.
- `MUSIC_ENGINE_TOKEN` — private API token configured on the ACE-Step server; recommended for any internet-accessible model server.

Do not add a KIE key for this design. Never put `MUSIC_ENGINE_TOKEN` in browser JavaScript or commit a real secret to GitHub.

## Free-hosting-first plan

Try free hosting before considering a paid GPU. Hugging Face ZeroGPU can be free, but it is not a drop-in ACE-Step HTTP server:

- Free ZeroGPU Space hosting currently requires an eligible Hugging Face personal account (verified email, good standing, and account older than 30 days).
- Free GPU use has a small daily quota and queues; full-length song generation may be slow or exceed the available free time.
- ZeroGPU Spaces use Gradio. This website adapter expects the ACE-Step HTTP endpoints `/release_task`, `/query_result`, and `/v1/audio`. A Gradio-hosted Space needs a compatible wrapper/adapter and must be tested before it can be used as `MUSIC_ENGINE_URL`.
- Do not paste a Hugging Face token or any other secret into website/browser code. Keep credentials in server-side environment variables only.
- Do not enable billing, buy GPU credits, or select paid hosting without explicit approval.

Official references:
- ACE-Step API: https://ace-step.github.io/ACE-Step-1.5/en/API
- ACE-Step installation: https://github.com/ACE-Step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md
- Hugging Face ZeroGPU: https://huggingface.co/docs/hub/spaces-zerogpu
- Hugging Face Spaces API endpoints: https://huggingface.co/docs/hub/spaces-api-endpoints

## Running a dedicated ACE-Step HTTP server

For a compatible GPU machine, follow the current official ACE-Step installation instructions. The documented API launch command is `uv run acestep-api` (or the command shown by the version you install), with the API listening on port 8001 by default. Do not assume the older Python module command works for every release.

Configure a long random secret as `ACESTEP_API_KEY` in the model server environment, and set the same secret as `MUSIC_ENGINE_TOKEN` in Vercel. Use a public HTTPS URL for `MUSIC_ENGINE_URL`; never expose an unauthenticated model server to the internet.

## Test plan

1. Deploy a compatible model server and configure the environment variables in Vercel.
2. Redeploy the website after adding/changing environment variables.
3. Sign in to AMOH JUSTICE AI and open `/music.html`.
4. Generate a short original song and verify task polling, audio playback, and download.
5. Confirm unauthenticated requests return 401 and missing engine configuration returns 503.

## Limitations

The website adapter cannot generate audio until `MUSIC_ENGINE_URL` points to a running, compatible model server. Free GPU availability and quotas are not guaranteed. The initial request asks for two minutes of audio; adjust this after end-to-end testing. No paid host has been activated.

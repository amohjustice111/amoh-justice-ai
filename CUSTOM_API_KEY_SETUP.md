# AMOH JUSTICE AI custom API key setup

This adds a separate protected endpoint at `POST /api/secure-chat`. The existing `POST /api/chat` route is left unchanged so the current website continues to work.

## 1. Create a secret key

Generate a long random secret on your own computer. If Node.js is installed, open a terminal and run:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and keep it private. Do not commit it to GitHub or put it in browser/frontend code.

## 2. Add it to Vercel

1. Open the Vercel dashboard and select the **amoh-justice-ai** project.
2. Open **Settings → Environment Variables**.
3. Add a variable named `AMOH_JUSTICE_API_KEY`.
4. Paste the random secret as its value. Select the environments you use (at least Production).
5. Save the variable, then redeploy the latest deployment so it becomes available.

The existing `GEMINI_API_KEY` must also remain configured for AI responses.

## 3. Call the protected endpoint

Send a POST request to `https://amoh-justice-ai.vercel.app/api/secure-chat` with a JSON body and an Authorization header:

```http
POST /api/secure-chat
Content-Type: application/json
Authorization: Bearer YOUR_AMOH_JUSTICE_API_KEY
```

Example JSON body:

```json
{
  "message": "Explain artificial intelligence in simple words",
  "history": []
}
```

A valid key forwards the request to the existing chat handler. Missing or incorrect keys receive HTTP 401. The key must only be used by trusted server-side clients; do not expose it in frontend JavaScript, public repositories, or shared screenshots.

## Important limitation

The current public website continues using `/api/chat` to preserve its existing behavior. This new key protects the separate `/api/secure-chat` endpoint; it does not make the old public route private or provide a new AI model or free Gemini quota. If you later want to require authentication on the website route too, the frontend and access design need to be changed carefully.

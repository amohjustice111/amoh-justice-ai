AMOH JUSTICE AI — LIVE AI UPGRADE

WHAT CHANGED
- Justice AI now calls a server-side Vercel function connected to Google Gemini.
- The AI can answer general questions as well as AMOH JUSTICE service questions.
- Your Gemini API key is read only on the server from GEMINI_API_KEY; it is not included in browser JavaScript.
- Black-and-gold design, office photo, installable web app, and existing website sections are retained.

IMPORTANT
- This upgrade needs a Gemini API key. Until the key is added in Vercel, chat will show a setup message.
- Free tier availability, model access, rate limits, and terms can change. Check Google's current Gemini API pricing and terms before public launch.
- Do not commit your API key into GitHub or put it in script.js.
- This is not a user-authenticated app and does not include per-user quotas or persistent rate limiting. Add abuse protection before advertising it widely.

DEPLOY ON VERCEL
1. Extract this ZIP. The api folder must be at the project root alongside index.html.
2. In GitHub repository amoh-justice-ai, upload/replace the updated files and folders from this ZIP. Keep README.md if GitHub already created it. Commit the changes.
3. Vercel should redeploy automatically. Wait until deployment is Ready.
4. Open https://aistudio.google.com/apikey and sign in to create a Gemini API key.
5. In Vercel, open your project > Settings > Environment Variables. Add Name: GEMINI_API_KEY and Value: paste your key. Select Production (and Preview if you need it), then Save.
6. Go to Deployments and redeploy the latest deployment (or push another commit) so the new environment variable is applied.
7. Open the published app and ask Justice AI: “Explain photosynthesis in simple words.”

SECURITY
- Treat the API key like a password. Never share it in chat, screenshots, public GitHub files, or browser code.
- If a key is exposed, revoke it in Google AI Studio and create another.
- Google AI Studio: https://aistudio.google.com/apikey
- Gemini pricing and terms: https://ai.google.dev/gemini-api/docs/pricing
- Vercel environment variables: https://vercel.com/docs/environment-variables

OTHER EXISTING LIMITATIONS
- The enquiry form opens the visitor's email app. Replace amohjustice@example.com in script.js with your real business email before publishing.
- AI video generation, customer accounts, payments, and database features are not connected.

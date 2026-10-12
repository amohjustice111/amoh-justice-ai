// Vercel serverless function: keeps GEMINI_API_KEY on the server.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to send a chat message.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Justice AI is not connected yet. The site owner must add GEMINI_API_KEY in Vercel settings.' });
  }

  const body = req.body || {};
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'Please type a question first.' });
  if (message.length > 4000) return res.status(413).json({ error: 'Please keep each message under 4,000 characters.' });

  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const contents = [];
  for (const item of history) {
    if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') continue;
    const text = item.text.trim().slice(0, 4000);
    if (text) contents.push({ role: item.role, parts: [{ text }] });
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  const systemInstruction = `You are Justice AI, the friendly, helpful assistant for AMOH JUSTICE. Be warm, clear, respectful, and useful. Answer general questions across education, writing, technology, coding, business, creativity, and everyday knowledge, not only questions about AMOH JUSTICE. Explain step by step when helpful and adapt explanations for beginners. If a request is unclear, ask a short clarifying question. Be honest about uncertainty and do not invent facts. For medical, legal, financial, or safety-critical questions, provide general information and encourage consulting a qualified professional when appropriate. Do not claim you performed actions you cannot perform. You may explain AMOH JUSTICE services: AI video guidance, website design and development, graphic design, and digital learning. For AMOH JUSTICE contact, WhatsApp is +233 546 389 770 (https://wa.me/233546389770). Do not claim that video generation, payments, or accounts are connected unless the user asks about the site and the owner confirms they are implemented.`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=' + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 900 }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Gemini API error status:', response.status, data && data.error && data.error.message);
      if (response.status === 429) return res.status(429).json({ error: 'Justice AI is busy or the current free quota has been reached. Please wait a little and try again.' });
      if (response.status === 400 || response.status === 403) return res.status(502).json({ error: 'The AI provider rejected the request. Please check that the Gemini API key is valid and enabled.' });
      return res.status(502).json({ error: 'Justice AI could not get an answer right now. Please try again shortly.' });
    }

    const answer = (data.candidates || []).flatMap(c => (c.content && c.content.parts) || []).map(p => p.text || '').join('\n').trim();
    if (!answer) return res.status(502).json({ error: 'Justice AI could not form an answer. Please rephrase your question.' });
    return res.status(200).json({ answer });
  } catch (error) {
    console.error('Justice AI request failed:', error && error.message);
    return res.status(502).json({ error: 'Unable to reach the AI service right now. Please check your connection and try again.' });
  }
};

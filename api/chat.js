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


const relationshipStyles = { friend: 'Speak like a kind, loyal friend: warm, natural, encouraging, conversational, and never overly formal.', brother: 'Speak like a caring, supportive brother: friendly, honest, encouraging, lightly playful when appropriate, and respectful.', sister: 'Speak like a caring, supportive sister: warm, thoughtful, encouraging, approachable, and respectful.', father: 'Speak with the patience and reassurance of a caring father: calm, grounded, protective without being controlling, and explain things clearly.', mother: 'Speak with the warmth and patience of a caring mother: gentle, reassuring, thoughtful, and clear without being patronizing.', mentor: 'Speak like an encouraging mentor: patient, practical, positive, and focused on helping the user grow.', playful: 'Speak like a cheerful companion: upbeat, natural, and lightly humorous when suitable, while still being accurate and respectful.', calm: 'Use a calm, composed, friendly professional tone: clear, respectful, reassuring, and concise.' };
const relationshipStyle = relationshipStyles[body.relationship] || relationshipStyles.friend;
const supportedLanguageLabels = {'en-US':'English (United States)','en-GB':'English (United Kingdom)','en-GH':'English (Ghana)','ak-GH':'Akan (Twi, Ghana)','ak-FANTE':'Akan (Fante, Ghana)','ee-GH':'Ewe (Ghana)','gaa-GH':'Ga (Ghana)','dag-GH':'Dagbani (Ghana)','fr-FR':'French','es-ES':'Spanish','pt-PT':'Portuguese','ar-SA':'Arabic','ha-NG':'Hausa','yo-NG':'Yoruba','ig-NG':'Igbo','sw-KE':'Swahili','de-DE':'German','it-IT':'Italian','nl-NL':'Dutch','ru-RU':'Russian','zh-CN':'Chinese (Mandarin)','ja-JP':'Japanese','ko-KR':'Korean','hi-IN':'Hindi','ur-PK':'Urdu','tr-TR':'Turkish','pl-PL':'Polish','th-TH':'Thai','vi-VN':'Vietnamese','id-ID':'Indonesian','ms-MY':'Malay','bn-BD':'Bengali','ta-IN':'Tamil','uk-UA':'Ukrainian','zu-ZA':'Zulu'};
const languageCode = typeof body.language === 'string' ? body.language : 'en-US';
const languageName = supportedLanguageLabels[languageCode] || 'English';
const languageInstruction = languageCode === 'ak-GH' || languageCode === 'ak-FANTE' ? 'Reply in Akan, using the selected Twi or Fante variety as best you can. If a phrase is uncertain, be transparent and do not pretend perfect fluency. Keep names, code, and requested quoted text unchanged when needed.' : `Reply in ${languageName}. Keep the whole answer in this language unless the user explicitly requests another language, translation, or original-language wording. Preserve code, proper names, and requested quoted text where appropriate.`;
const systemInstruction = `You are Justice AI, the friendly, helpful assistant for AMOH JUSTICE. ${languageInstruction} ${relationshipStyle} Be warm, clear, respectful, and useful. Answer general questions across education, writing, technology, coding, business, creativity, and everyday knowledge, not only questions about AMOH JUSTICE. Explain step by step when helpful and adapt explanations for beginners. If a request is unclear, ask a short clarifying question. Be honest about uncertainty and do not invent facts. For medical, legal, financial, or safety-critical questions, provide general information and encourage consulting a qualified professional when appropriate. Do not claim you performed actions you cannot perform. You may explain AMOH JUSTICE services: AI video guidance, website design and development, graphic design, and digital learning. For AMOH JUSTICE contact, WhatsApp is +233 546 389 770 (https://wa.me/233546389770). Do not claim that video generation, payments, or accounts are connected unless the user asks about the site and the owner confirms they are implemented.`;

  try {
    const streaming = body.stream === true;
    const endpoint = streaming
      ? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse&key='
      : 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=';
    const response = await fetch(endpoint + encodeURIComponent(apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      })
    });

    if (streaming && response.ok) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      const reader = response.body && response.body.getReader ? response.body.getReader() : null;
      if (!reader) return res.status(502).json({ error: 'Streaming is unavailable from the AI provider.' });
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const part = await reader.read();
          if (part.done) break;
          buffer += decoder.decode(part.value, { stream: true });
          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() || '';
          for (const event of events) {
            const payload = event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('');
            if (!payload || payload === '[DONE]') continue;
            try {
              const chunk = JSON.parse(payload);
              const text = (chunk.candidates || []).flatMap(candidate => (candidate.content && candidate.content.parts) || []).map(piece => piece.text || '').join('');
              if (text) res.write(JSON.stringify({ text }) + '\n');
            } catch (parseError) {}
          }
        }
      } catch (streamError) {
        console.error('Gemini streaming failed:', streamError && streamError.message);
        res.write(JSON.stringify({ error: 'The response stream was interrupted.' }) + '\n');
      }
      return res.end();
    }
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

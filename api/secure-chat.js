const { timingSafeEqual } = require('crypto');

// Protected API endpoint for integrations that need their own AMOH JUSTICE key.
// The existing /api/chat route remains unchanged for the current website.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST to send a chat message.' });
  }

  const expectedKey = process.env.AMOH_JUSTICE_API_KEY;
  if (!expectedKey) {
    return res.status(503).json({
      error: 'The custom API is not configured. Add AMOH_JUSTICE_API_KEY in Vercel Environment Variables, then redeploy.'
    });
  }

  const authorization = req.headers && req.headers.authorization;
  const suppliedKey = typeof authorization === 'string' && authorization.startsWith('Bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!suppliedKey) {
    return res.status(401).json({ error: 'Missing API key. Send Authorization: Bearer YOUR_API_KEY.' });
  }

  const expected = Buffer.from(expectedKey, 'utf8');
  const supplied = Buffer.from(suppliedKey, 'utf8');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    return res.status(401).json({ error: 'Invalid API key.' });
  }

  // Reuse the existing handler to preserve its validation, Gemini integration,
  // response format, and error handling.
  return require('./chat')(req, res);
};

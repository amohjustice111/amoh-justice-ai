// KIE video generation proxy. The KIE secret stays on the server.
// Requires KIE_API_KEY plus Supabase URL/anon key; only authenticated users may spend credits.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!['POST', 'GET'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use GET to check a task or POST to create one.' });
  }
  const { KIE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!KIE_API_KEY) return res.status(503).json({ error: 'Video generation is not configured yet. Add KIE_API_KEY in Vercel.' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Secure generation requires Supabase authentication. Configure SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.' });
  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in to your AMOH JUSTICE AI account before generating a video.' });
  try {
    const userResponse = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth }
    });
    if (!userResponse.ok) return res.status(401).json({ error: 'Your session is not valid. Sign in again.' });
    if (req.method === 'POST') {
      const body = req.body || {};
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt || prompt.length > 4000) return res.status(400).json({ error: 'Enter a prompt of 1–4000 characters.' });
      const ratio = ['16:9', '9:16', '1:1'].includes(body.ratio) ? body.ratio : '16:9';
      const upstream = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + KIE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'wan/2-2-a14b-text-to-video-turbo',
          input: {
            prompt,
            resolution: '720p',
            aspect_ratio: ratio,
            enable_prompt_expansion: true,
            acceleration: 'none',
            nsfw_checker: true
          }
        })
      });
      const data = await upstream.json();
      if (!upstream.ok || data.code !== 200 || !data.data?.taskId) {
        return res.status(502).json({ error: data.msg || data.message || 'KIE could not start the video task.', providerCode: data.code || upstream.status });
      }
      return res.status(200).json({ taskId: data.data.taskId, state: 'waiting' });
    }
    const taskId = String(req.query?.taskId || '').trim();
    if (!taskId || taskId.length > 200) return res.status(400).json({ error: 'A valid taskId is required.' });
    const url = 'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + encodeURIComponent(taskId);
    const upstream = await fetch(url, { headers: { Authorization: 'Bearer ' + KIE_API_KEY } });
    const data = await upstream.json();
    if (!upstream.ok || data.code !== 200 || !data.data) {
      return res.status(502).json({ error: data.msg || data.message || 'Could not check the video task.', providerCode: data.code || upstream.status });
    }
    let results = {};
    try { results = typeof data.data.resultJson === 'string' ? JSON.parse(data.data.resultJson) : (data.data.resultJson || {}); } catch (_) {}
    const urls = results.resultUrls || results.result_urls || results.videoUrls || results.video_urls || [];
    return res.status(200).json({
      taskId: data.data.taskId,
      state: data.data.state || 'waiting',
      progress: data.data.progress,
      videoUrl: Array.isArray(urls) ? urls[0] : null,
      error: data.data.failMsg || data.data.failMsg || null
    });
  } catch (error) {
    return res.status(502).json({ error: 'Could not reach the video provider. Please try again.' });
  }
};

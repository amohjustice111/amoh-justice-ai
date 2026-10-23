// Secure KIE AI music generation proxy. The provider key never reaches the browser.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use POST to create a song or GET to check a task.' });
  }

  const { KIE_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!KIE_API_KEY) return res.status(503).json({ error: 'Music generation is not configured. Add KIE_API_KEY in Vercel environment variables.' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Secure music generation requires SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.' });

  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Please sign in to your AMOH JUSTICE AI account before generating music.' });

  try {
    const base = SUPABASE_URL.replace(/\/$/, '');
    const userResponse = await fetch(base + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth }
    });
    if (!userResponse.ok) return res.status(401).json({ error: 'Your session is not valid. Please sign in again.' });
    const user = await userResponse.json();
    if (!user.id) return res.status(401).json({ error: 'Could not verify your account. Please sign in again.' });

    if (req.method === 'POST') {
      const body = req.body || {};
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : '';
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const style = typeof body.style === 'string' ? body.style.trim().slice(0, 1000) : '';
      const instrumental = body.instrumental === true;
      const customMode = body.mode !== 'idea';
      if (!prompt || prompt.length > 5000) return res.status(400).json({ error: 'Enter lyrics or a song description of 1–5,000 characters.' });
      if (!title) return res.status(400).json({ error: 'Please enter a song title (up to 80 characters).' });
      if (!style) return res.status(400).json({ error: 'Please choose a genre and sound style.' });
      if (customMode && !instrumental && !prompt.trim()) return res.status(400).json({ error: 'Lyrics are required in Lyrics to Song mode.' });

      const input = {
        custom_mode: customMode,
        instrumental,
        model: 'V6',
        title,
        style
      };
      if (customMode) {
        if (!instrumental) input.lyrics = prompt;
      } else {
        input.prompt = prompt;
      }
      if (typeof body.vocalGender === 'string' && ['m', 'f'].includes(body.vocalGender)) input.vocal_gender = body.vocalGender;

      const upstream = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + KIE_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'ai-music-api/generate', input })
      });
      const data = await upstream.json().catch(() => ({}));
      const taskId = data.data?.taskId || data.data?.task_id;
      if (!upstream.ok || data.code !== 200 || !taskId) {
        return res.status(502).json({ error: data.msg || data.message || 'KIE could not start the music task. Check your KIE account credits and API access.', providerCode: data.code || upstream.status });
      }
      return res.status(200).json({ taskId, state: 'waiting' });
    }

    const taskId = String(req.query?.taskId || '').trim();
    if (!taskId || taskId.length > 200) return res.status(400).json({ error: 'A valid taskId is required.' });
    const upstream = await fetch('https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + encodeURIComponent(taskId), {
      headers: { Authorization: 'Bearer ' + KIE_API_KEY }
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || data.code !== 200 || !data.data) {
      return res.status(502).json({ error: data.msg || data.message || 'Could not check the music task.', providerCode: data.code || upstream.status });
    }

    const task = data.data;
    const stateRaw = String(task.state || task.status || 'waiting').toLowerCase();
    const state = ['success', 'succeed', 'completed', 'complete'].includes(stateRaw) ? 'success'
      : ['fail', 'failed', 'error'].includes(stateRaw) ? 'fail' : stateRaw;
    let result = {};
    try { result = typeof task.resultJson === 'string' ? JSON.parse(task.resultJson) : (task.resultJson || {}); } catch (_) {}
    const clips = result.data || result.sunoData || result.clips || task.response?.data || task.response?.sunoData || [];
    const tracks = Array.isArray(clips) ? clips.map(clip => ({
      id: clip.id || null,
      title: clip.title || 'Generated song',
      audioUrl: clip.audio_url || clip.audioUrl || clip.source_audio_url || null,
      streamAudioUrl: clip.stream_audio_url || clip.streamAudioUrl || null,
      imageUrl: clip.image_url || clip.imageUrl || null,
      duration: clip.duration || null
    })).filter(clip => clip.audioUrl || clip.streamAudioUrl) : [];
    return res.status(200).json({
      taskId: task.taskId || taskId,
      state,
      progress: task.progress,
      tracks,
      error: task.failMsg || task.errorMessage || (state === 'fail' ? 'Music generation failed. Please try again.' : null)
    });
  } catch (error) {
    console.error('AMOH music API request failed:', error && error.message);
    return res.status(502).json({ error: 'Unable to reach the music service right now. Please try again shortly.' });
  }
};

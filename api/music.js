// AMOH JUSTICE AI Music API.
// Authenticated adapter for a self-hosted ACE-Step 1.5 model server.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Use POST to start a song or GET to check its status.' });
  }

  const { MUSIC_ENGINE_URL, MUSIC_ENGINE_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
  if (!MUSIC_ENGINE_URL) return res.status(503).json({ error: 'AMOH Music Engine is not connected yet. Deploy the ACE-Step model server, then set MUSIC_ENGINE_URL in Vercel.' });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(503).json({ error: 'Secure music generation requires SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.' });

  const auth = String(req.headers.authorization || '');
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Please sign in to your AMOH JUSTICE AI account before generating music.' });

  try {
    const userResponse = await fetch(SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: auth }
    });
    if (!userResponse.ok) return res.status(401).json({ error: 'Your session is not valid. Please sign in again.' });
    const user = await userResponse.json();
    if (!user.id) return res.status(401).json({ error: 'Could not verify your account. Please sign in again.' });

    const engineBase = MUSIC_ENGINE_URL.replace(/\/$/, '');
    const engineHeaders = { 'Content-Type': 'application/json' };
    if (MUSIC_ENGINE_TOKEN) engineHeaders.Authorization = 'Bearer ' + MUSIC_ENGINE_TOKEN;

    // Proxy generated audio through this authenticated route so the private model server and token stay hidden.
    if (req.method === 'GET' && req.query?.audio) {
      const rawPath = String(req.query.audio);
      if (rawPath.length > 4000 || !rawPath.startsWith('/v1/audio?path=')) return res.status(400).json({ error: 'Invalid audio path.' });
      const audioUrl = new URL(rawPath, engineBase);
      if (audioUrl.origin !== new URL(engineBase).origin || audioUrl.pathname !== '/v1/audio') return res.status(400).json({ error: 'Invalid audio path.' });
      const audioResponse = await fetch(audioUrl.toString(), { headers: MUSIC_ENGINE_TOKEN ? { Authorization: 'Bearer ' + MUSIC_ENGINE_TOKEN } : {} });
      if (!audioResponse.ok) return res.status(502).json({ error: 'The model server could not provide the generated audio.' });
      res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/mpeg');
      res.setHeader('Content-Disposition', 'inline; filename="amoh-generated-song.mp3"');
      res.setHeader('Cache-Control', 'private, max-age=300');
      return res.status(200).send(Buffer.from(await audioResponse.arrayBuffer()));
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 80) : '';
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      const style = typeof body.style === 'string' ? body.style.trim().slice(0, 1000) : '';
      const instrumental = body.instrumental === true;
      const ideaMode = body.mode === 'idea';
      if (!title) return res.status(400).json({ error: 'Please enter a song title (up to 80 characters).' });
      if (!prompt || prompt.length > 5000) return res.status(400).json({ error: 'Enter lyrics or a song description of 1–5,000 characters.' });
      if (!style) return res.status(400).json({ error: 'Please choose a genre and sound style.' });

      const languageRaw = typeof body.language === 'string' ? body.language.toLowerCase() : 'english';
      const payload = {
        prompt: style + ', song title: ' + title,
        task_type: 'text2music',
        model: 'acestep-v15-turbo',
        thinking: true,
        audio_format: 'mp3',
        audio_duration: 120,
        inference_steps: 8,
        batch_size: 1,
        use_random_seed: true,
        vocal_language: ({ english: 'en', twi: 'en', 'english + twi': 'en', ga: 'en', ewe: 'en', hausa: 'en' })[languageRaw] || 'en'
      };
      if (ideaMode && !instrumental) {
        payload.sample_query = prompt + '. Musical style: ' + style + '. Title: ' + title;
      } else if (ideaMode && instrumental) {
        payload.prompt = 'Instrumental music only, no singing or vocals. ' + prompt + '. Musical style: ' + style + '. Title: ' + title;
        payload.lyrics = '';
      } else if (!instrumental) {
        payload.lyrics = prompt;
      } else {
        payload.lyrics = '';
        payload.prompt += ', instrumental only, no vocals';
      }

      const upstream = await fetch(engineBase + '/release_task', { method: 'POST', headers: engineHeaders, body: JSON.stringify(payload) });
      const data = await upstream.json().catch(() => ({}));
      const taskId = data.data?.task_id || data.data?.taskId;
      if (!upstream.ok || data.code !== 200 || !taskId) return res.status(502).json({ error: data.error || 'AMOH Music Engine could not start this song. Check the model server logs and configuration.' });
      return res.status(200).json({ taskId, state: 'waiting', title });
    }

    const taskId = String(req.query?.taskId || '').trim();
    if (!taskId || taskId.length > 200) return res.status(400).json({ error: 'A valid taskId is required.' });
    const upstream = await fetch(engineBase + '/query_result', { method: 'POST', headers: engineHeaders, body: JSON.stringify({ task_id_list: [taskId] }) });
    const data = await upstream.json().catch(() => ({}));
    const task = Array.isArray(data.data) ? data.data.find(item => item.task_id === taskId) || data.data[0] : null;
    if (!upstream.ok || data.code !== 200 || !task) return res.status(502).json({ error: data.error || 'Could not check the song generation task.' });

    const status = Number(task.status);
    let result = [];
    try { result = typeof task.result === 'string' ? JSON.parse(task.result) : (task.result || []); } catch (_) {}
    const tracks = Array.isArray(result) ? result.map((item, index) => {
      const file = typeof item.file === 'string' ? item.file : '';
      if (!file.startsWith('/v1/audio?path=')) return null;
      return { id: taskId + '-' + index, title: item.title || 'AMOH JUSTICE AI — Generated Song', audioUrl: '/api/music?audio=' + encodeURIComponent(file), duration: item.metas?.duration || null };
    }).filter(Boolean) : [];
    return res.status(200).json({ taskId, state: status === 1 ? 'success' : status === 2 ? 'fail' : 'waiting', progress: status === 1 ? 100 : null, tracks, error: status === 2 ? 'The music model could not complete this song. Please try again.' : null });
  } catch (error) {
    console.error('AMOH Music API failed:', error && error.message);
    return res.status(502).json({ error: 'AMOH Music Engine is temporarily unreachable. Please try again shortly.' });
  }
};

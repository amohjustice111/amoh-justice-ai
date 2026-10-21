// Only public Supabase URL and anon key are exposed. Never put service-role keys here.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  return res.status(200).json({ supabaseUrl, supabaseAnonKey, configured: Boolean(supabaseUrl && supabaseAnonKey) });
};
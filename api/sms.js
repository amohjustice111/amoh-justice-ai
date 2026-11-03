// AMOH JUSTICE AI — server-side SMS gateway and admin API.
// Provider: Africa's Talking. Credentials must exist only in Vercel Environment Variables.
const crypto = require('crypto');

const noStore = res => res.setHeader('Cache-Control', 'no-store, private');
const json = (res, code, body) => res.status(code).json(body);
const env = name => String(process.env[name] || '').trim();
const baseUrl = () => env('SUPABASE_URL').replace(/\/$/, '');
const serviceKey = () => env('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = () => env('SUPABASE_ANON_KEY');

function normalizePhone(value) {
  let phone = String(value || '').replace(/[\s().-]/g, '');
  if (phone.startsWith('00')) phone = '+' + phone.slice(2);
  if (/^0\d{9}$/.test(phone)) phone = '+233' + phone.slice(1);
  else if (/^233\d{9}$/.test(phone)) phone = '+' + phone;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return '';
  return phone;
}

async function getIdentity(req) {
  const auth = req.headers.authorization || '';
  const token = auth.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token || !baseUrl() || !anonKey()) return null;
  const response = await fetch(baseUrl() + '/auth/v1/user', {
    headers: { apikey: anonKey(), Authorization: 'Bearer ' + token }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user && user.id ? user : null;
}

function isAdmin(user) {
  const allowed = env('SMS_ADMIN_EMAILS').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  return Boolean(user && user.email && allowed.includes(user.email.toLowerCase()));
}

async function adminFetch(path, options = {}) {
  if (!serviceKey()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  const response = await fetch(baseUrl() + path, {
    ...options,
    headers: {
      apikey: serviceKey(),
      Authorization: 'Bearer ' + serviceKey(),
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Supabase admin request failed.');
  return data;
}

async function sendSms(phone, message) {
  const username = env('AT_USERNAME'), apiKey = env('AT_API_KEY'), sender = env('AT_SENDER_ID');
  if (!username || !apiKey || !sender) throw new Error('SMS provider is not configured. Add AT_USERNAME, AT_API_KEY and AT_SENDER_ID in Vercel.');
  const form = new URLSearchParams({ username, to: phone, message, from: sender });
  const response = await fetch('https://api.africastalking.com/version1/messaging', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(username + ':' + apiKey).toString('base64')
    },
    body: form.toString()
  });
  const data = await response.json().catch(() => ({}));
  const recipient = data.SMSMessageData?.Recipients?.[0];
  if (!response.ok || !recipient || !/^Success/i.test(String(recipient.status || ''))) {
    throw new Error(recipient?.status || data.SMSMessageData?.Message || 'The SMS provider did not accept this message.');
  }
  return { providerMessageId: recipient.messageId || null, cost: recipient.cost || null };
}

async function logSms(row) {
  return adminFetch('/rest/v1/amoh_sms_logs', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
}

async function sendAndLog({ userId, phone, message, kind, eventKey, adminEmail }) {
  const existing = eventKey
    ? await adminFetch('/rest/v1/amoh_sms_logs?event_key=eq.' + encodeURIComponent(eventKey) + '&select=id,status&limit=1')
    : [];
  if (existing.length) return { skipped: true, reason: 'already_sent' };
  const normalized = normalizePhone(phone);
  if (!normalized) throw new Error('Customer phone number is missing or invalid. Use a Ghana number such as 0241234567 or +233241234567.');
  const sent = await sendSms(normalized, message);
  await logSms({
    user_id: userId || null,
    recipient_phone: normalized,
    message: message.slice(0, 1000),
    message_type: kind,
    event_key: eventKey || null,
    status: 'sent',
    provider_message_id: sent.providerMessageId,
    provider_cost: sent.cost,
    sent_by: adminEmail || null
  });
  return { sent: true, cost: sent.cost };
}

async function listCustomers() {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await adminFetch('/auth/v1/admin/users?page=' + page + '&per_page=100');
    const users = Array.isArray(batch.users) ? batch.users : [];
    all.push(...users);
    if (users.length < 100) break;
  }
  return all.map(user => {
    const meta = user.user_metadata || {};
    return {
      id: user.id,
      email: user.email || '',
      phone: normalizePhone(meta.phone || meta.phone_number || ''),
      smsConsent: meta.sms_consent === true,
      createdAt: user.created_at || null
    };
  }).filter(user => user.phone && user.smsConsent);
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Use GET or POST.' });
  }
  if (!baseUrl() || !anonKey()) return json(res, 503, { error: 'Supabase is not configured. SMS features are unavailable.' });
  const action = String(req.query?.action || req.body?.action || 'status');
  try {
    const user = await getIdentity(req);
    if (!user) return json(res, 401, { error: 'Sign in to your AMOH JUSTICE AI account first.' });
    const admin = isAdmin(user);
    if (action === 'status') {
      return json(res, 200, {
        admin,
        providerConfigured: Boolean(env('AT_USERNAME') && env('AT_API_KEY') && env('AT_SENDER_ID')),
        senderIdConfigured: Boolean(env('AT_SENDER_ID')),
        serviceConfigured: Boolean(serviceKey())
      });
    }
    if (action === 'automatic') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
      const meta = user.user_metadata || {};
      if (meta.sms_consent !== true || !(meta.phone || meta.phone_number)) {
        return json(res, 200, { sent: false, reason: 'No phone number or SMS consent.' });
      }
      const eventKey = 'welcome:' + user.id;
      const message = 'Welcome to AMOH JUSTICE AI! Your creative workspace is ready. Visit https://amoh-justice-ai.vercel.app to explore.';
      const result = await sendAndLog({ userId: user.id, phone: meta.phone || meta.phone_number, message, kind: 'welcome', eventKey });
      return json(res, 200, result);
    }
    if (!admin) return json(res, 403, { error: 'Admin access is required for the SMS control centre.' });
    if (action === 'customers') {
      if (req.method !== 'GET') return json(res, 405, { error: 'Use GET.' });
      const customers = await listCustomers();
      return json(res, 200, { customers, eligibleCount: customers.length });
    }
    if (action === 'send') {
      if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
      if (!serviceKey()) return json(res, 503, { error: 'Add SUPABASE_SERVICE_ROLE_KEY in Vercel to enable the secure customer list.' });
      if (!env('AT_USERNAME') || !env('AT_API_KEY') || !env('AT_SENDER_ID')) return json(res, 503, { error: 'SMS sending is not activated. Configure the approved SMS provider credentials in Vercel first.' });
      const body = req.body || {};
      const message = typeof body.message === 'string' ? body.message.trim() : '';
      if (!message || message.length > 500) return json(res, 400, { error: 'Enter a message between 1 and 500 characters.' });
      if (body.confirm !== true) return json(res, 400, { error: 'Confirm the send action before sending.' });
      const customers = await listCustomers();
      const selected = Array.isArray(body.userIds) ? new Set(body.userIds.filter(x => typeof x === 'string')) : null;
      const targets = customers.filter(c => !selected || selected.has(c.id));
      if (!targets.length) return json(res, 400, { error: 'No opted-in customers with valid phone numbers were selected.' });
      if (targets.length > 250) return json(res, 413, { error: 'This batch is limited to 250 customers. Select a smaller group.' });
      let sent = 0, failed = 0;
      const failures = [];
      for (const customer of targets) {
        try {
          await sendAndLog({ userId: customer.id, phone: customer.phone, message, kind: 'announcement', adminEmail: user.email });
          sent++;
        } catch (error) {
          failed++;
          if (failures.length < 5) failures.push({ email: customer.email, error: error.message });
        }
      }
      return json(res, 200, { sent, failed, eligible: targets.length, failures });
    }
    return json(res, 400, { error: 'Unknown SMS action.' });
  } catch (error) {
    console.error('AMOH SMS API error:', error && error.message);
    return json(res, 502, { error: error.message || 'SMS request failed.' });
  }
};

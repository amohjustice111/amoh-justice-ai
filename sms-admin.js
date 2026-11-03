(()=> {
  const $ = id => document.getElementById(id);
  let token = '', customers = [], providerReady = false;
  const selectedIds = new Set();
  const status = message => { $('result').textContent = message; };
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  async function api(action, body) {
    const response = await fetch('/api/sms?action=' + encodeURIComponent(action), {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'SMS request failed.');
    return data;
  }

  function renderCustomers() {
    const query = $('search').value.trim().toLowerCase();
    const visible = customers.filter(customer => (customer.email + ' ' + customer.phone).toLowerCase().includes(query));
    $('customers').innerHTML = visible.length
      ? visible.map(customer => '<label class="customer"><input type="checkbox" data-customer value="' + escapeHtml(customer.id) + '"' + (selectedIds.has(customer.id) ? ' checked' : '') + '><span><b>' + escapeHtml(customer.email || 'Customer') + '</b><small>' + escapeHtml(customer.phone) + '</small></span></label>').join('')
      : '<p class="muted">No matching opted-in customers. Customers must add a phone number and consent to SMS.</p>';
    updateCount();
  }

  function updateCount() {
    $('recipientCount').textContent = selectedIds.size + ' selected · ' + customers.length + ' eligible';
    $('send').disabled = !providerReady || selectedIds.size === 0 || !$('message').value.trim();
  }

  async function init() {
    try {
      const config = await fetch('/api/public-config').then(response => response.json());
      if (!config.configured || !window.supabase?.createClient) throw new Error('Supabase account service is not configured.');
      const client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
      const { data } = await client.auth.getSession();
      token = data?.session?.access_token || '';
      if (!token) throw new Error('Sign in with your admin account first.');
      const state = await api('status');
      if (!state.admin) throw new Error('This account is not on the SMS administrator allowlist.');
      providerReady = Boolean(state.providerConfigured && state.serviceConfigured);
      $('blockedPanel').classList.add('hidden');
      $('adminPanel').classList.remove('hidden');
      $('statusChips').innerHTML =
        '<span class="chip">Admin verified</span><span class="chip">' +
        (state.providerConfigured ? 'SMS provider configured' : 'SMS sending not activated') +
        '</span><span class="chip">' +
        (state.serviceConfigured ? 'Private database ready' : 'Service role key missing') + '</span>';
      await loadCustomers();
    } catch (error) {
      $('statusChips').innerHTML = '<span class="chip">Restricted access</span>';
      $('blockedMessage').textContent = error.message;
    }
  }

  async function loadCustomers() {
    try {
      const result = await api('customers');
      customers = result.customers || [];
      renderCustomers();
      $('statusChips').insertAdjacentHTML('beforeend', '<span class="chip">' + customers.length + ' opted-in customers</span>');
    } catch (error) {
      $('customers').textContent = error.message;
      providerReady = false;
      updateCount();
    }
  }

  $('customers').addEventListener('change', event => {
    const input = event.target.closest('[data-customer]');
    if (!input) return;
    if (input.checked) selectedIds.add(input.value);
    else selectedIds.delete(input.value);
    updateCount();
  });
  $('search').addEventListener('input', renderCustomers);
  $('message').addEventListener('input', () => {
    $('charCount').textContent = $('message').value.length;
    updateCount();
  });
  $('selectAll').addEventListener('click', () => {
    customers.forEach(customer => selectedIds.add(customer.id));
    renderCustomers();
  });
  $('clearAll').addEventListener('click', () => {
    selectedIds.clear();
    renderCustomers();
  });

  $('send').addEventListener('click', async () => {
    const ids = [...selectedIds];
    const message = $('message').value.trim();
    if (!ids.length || !message || !providerReady) return;
    if (!confirm('Send this SMS to ' + ids.length + ' opted-in customer(s)? Provider charges may apply. This cannot be undone.')) return;
    const preview = message.length > 130 ? message.slice(0, 130) + '…' : message;
    if (!confirm('Final confirmation. Message preview:\n\n' + preview + '\n\nSend now?')) return;
    $('send').disabled = true;
    status('Sending messages… Please keep this page open.');
    try {
      const result = await api('send', { message, userIds: ids, confirm: true });
      status('Finished. Accepted by provider: ' + result.sent + '. Failed: ' + result.failed + '. Selected eligible: ' + result.eligible + '.' +
        (result.failures?.length ? ' First issue: ' + result.failures[0].error : ''));
    } catch (error) {
      status(error.message);
    } finally {
      updateCount();
    }
  });

  init();
})();
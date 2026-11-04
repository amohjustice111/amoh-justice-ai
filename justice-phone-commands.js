/* Phone commands for the installed AMOH JUSTICE AI PWA.
   Contacts are imported only after the user taps the picker button.
   Calls always open the phone dialler; the user confirms the call there. */
(()=> {
  const STORE='amohJusticeSelectedContactsV1';
  const form=document.getElementById('chatForm');
  const input=document.getElementById('chatInput');
  const status=document.getElementById('voiceStatus');
  if(!form||!input)return;

  const normalise=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+]/g,' ').replace(/\s+/g,' ').trim();
  const readContacts=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(x)?x:[]}catch(e){return []}};
  const saveContacts=x=>{try{localStorage.setItem(STORE,JSON.stringify(x))}catch(e){setStatus('Could not save selected contacts on this device.')}}};
  const setStatus=s=>{if(status)status.textContent=s;};
  const cleanNumber=s=>String(s||'').replace(/[^+\d]/g,'');
  const validNumber=s=>/^\+?\d{7,15}$/.test(s);
  function openDialler(number,name=''){
    const phone=cleanNumber(number);
    if(!validNumber(phone)){setStatus('That phone number does not look valid. Please check it and try again.');return true;}
    const label=name?name+' · '+phone:phone;
    const wrap=document.getElementById('justiceCallConfirm');
    if(wrap)wrap.remove();
    const panel=document.createElement('div');
    panel.id='justiceCallConfirm';
    panel.setAttribute('role','status');
    panel.style.cssText='margin:10px 0;padding:14px;border:1px solid #60a5fa;border-radius:16px;background:#0b1b34;color:#eff6ff;display:grid;gap:9px';
    const title=document.createElement('strong');title.textContent='Ready to call '+label+'?';
    const note=document.createElement('span');note.textContent='Your phone dialler will open. Review the number and tap Call to place the call.';
    const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
    const link=document.createElement('a');link.href='tel:'+phone;link.textContent='Open phone dialler';link.style.cssText='display:inline-block;padding:10px 14px;border-radius:999px;background:#2563eb;color:white;text-decoration:none;font-weight:700';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.style.cssText='padding:10px 14px;border-radius:999px;border:1px solid #93c5fd;background:transparent;color:#dbeafe';
    cancel.addEventListener('click',()=>panel.remove());
    actions.append(link,cancel);panel.append(title,note,actions);
    const chat=document.querySelector('.chat-shell')||form.parentElement;
    chat.insertBefore(panel,form);
    setStatus('Call prepared. Tap “Open phone dialler” to continue.');
    return true;
  }
  function matchContact(query){
    const q=normalise(query);
    if(!q)return null;
    const contacts=readContacts();
    const exact=contacts.find(c=>(c.names||[]).some(n=>normalise(n)===q));
    if(exact)return exact;
    const matches=contacts.filter(c=>(c.names||[]).some(n=>{const nn=normalise(n);return nn&&(nn.startsWith(q+' ')||q.startsWith(nn+' '));}));
    return matches.length===1?matches[0]:null;
  }
  function handleCommand(raw){
    const text=String(raw||'').trim();
    const m=text.match(/^(?:hey\s+)?(?:please\s+)?(?:can\s+you\s+)?(?:call|phone|dial)\s+(.+?)\s*[?.!]*$/i);
    if(!m)return false;
    const target=m[1].trim().replace(/^(?:the number|number)\s+/i,'');
    const digits=cleanNumber(target);
    if(validNumber(digits))return openDialler(digits);
    const contact=matchContact(target);
    if(contact){
      const numbers=(contact.phones||[]).filter(validNumber);
      if(numbers.length===1)return openDialler(numbers[0],(contact.names||[])[0]||'contact');
      if(numbers.length>1){
        setStatus('More than one number is saved for '+(contact.names||[])[0]+'. Please choose a number in your phone contacts or say the full number.');
        return true;
      }
    }
    setStatus('I could not find “'+target+'” in the contacts you selected for Justice AI. Tap “Choose contacts” to select it, or say “call” followed by the full phone number.');
    return true;
  }

  const bar=document.createElement('div');
  bar.id='justicePhoneCommands';
  bar.style.cssText='display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;padding:0 4px';
  const pick=document.createElement('button');
  pick.type='button';pick.textContent='👤 Choose contacts';pick.style.cssText='border:1px solid #60a5fa;border-radius:999px;background:#10284a;color:#dbeafe;padding:9px 13px;font-weight:700';
  const count=document.createElement('span');count.style.cssText='font-size:12px;color:#9fb8d9';
  const updateCount=()=>{const n=readContacts().length;count.textContent=n?n+' selected contact'+(n===1?'':'s'):'No contacts selected';};
  pick.addEventListener('click',async()=>{
    if(!window.isSecureContext){setStatus('Contact access requires the secure HTTPS website.');return;}
    if(!navigator.contacts?.select){setStatus('This browser does not support the Contacts Picker. Use Chrome on Android if available, or say “call” followed by the full phone number.');return;}
    try{
      const selected=await navigator.contacts.select(['name','tel'],{multiple:true});
      const entries=[];
      for(const c of selected||[]){
        const names=(c.name||[]).map(x=>String(x).trim()).filter(Boolean);
        const phones=(c.tel||[]).map(cleanNumber).filter(validNumber);
        if(names.length&&phones.length)entries.push({names,phones});
      }
      const merged=new Map(readContacts().map(c=>[(c.names||[]).map(normalise).join('|'),c]));
      for(const c of entries)merged.set(c.names.map(normalise).join('|'),c);
      saveContacts([...merged.values()]);
      updateCount();
      setStatus(entries.length?'Saved '+entries.length+' selected contact(s). You can now say “Call [name]”.':'No contacts with phone numbers were selected.');
    }catch(e){if(e.name!=='AbortError')setStatus('Contact selection was not completed. You can try again.');}
  });
  const clear=document.createElement('button');
  clear.type='button';clear.textContent='Clear';clear.title='Remove contacts saved for Justice AI';clear.style.cssText='border:1px solid #64748b;border-radius:999px;background:transparent;color:#cbd5e1;padding:9px 12px';
  clear.addEventListener('click',()=>{saveContacts([]);updateCount();setStatus('Selected contacts were cleared from Justice AI on this device.');});
  bar.append(pick,clear,count);
  form.parentElement.insertBefore(bar,form);
  updateCount();

  // Capture before the normal chat handler, so phone commands do not go to the AI API.
  form.addEventListener('submit',e=>{
    const text=input.value.trim();
    if(handleCommand(text)){e.preventDefault();e.stopImmediatePropagation();input.value='';}
  },true);

  window.amohJusticePhoneCommand=handleCommand;
})();
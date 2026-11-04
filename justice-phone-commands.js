/* Justice AI phone commands for the installed PWA.
   Contacts are added only with the user's action. Calls open the phone dialler
   for final confirmation; a website cannot silently place cellular calls. */
(()=> {
  const STORE='amohJusticeSelectedContactsV1';
  const form=document.getElementById('chatForm');
  const input=document.getElementById('chatInput');
  const status=document.getElementById('voiceStatus');
  if(!form||!input)return;
  const normalise=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9+]/g,' ').replace(/\s+/g,' ').trim();
  const read=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
  const save=v=>{try{localStorage.setItem(STORE,JSON.stringify(v))}catch{}};
  const clean=s=>String(s||'').replace(/[^+\d]/g,'');
  const valid=s=>/^\+?\d{7,15}$/.test(s);
  const setStatus=s=>{if(status)status.textContent=s;};
  const chat=()=>document.querySelector('#justiceAiOverlay .chat-shell')||document.querySelector('.chat-shell')||form.parentElement;
  const panel=document.createElement('section');
  panel.id='justicePhoneContacts';
  panel.setAttribute('aria-label','Justice AI contacts and calling');
  panel.style.cssText='width:min(1180px,88%);margin:0 auto 24px;padding:14px;border:1px solid #3b82f6;border-radius:16px;background:#07172b;color:#eaf2ff;display:grid;gap:9px;position:relative;z-index:2';
  panel.innerHTML='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap"><strong>📞 Call someone</strong><span id="justiceContactCount" style="font-size:12px;color:#bfdbfe">No contacts saved</span></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="justicePickContacts" style="border:1px solid #60a5fa;border-radius:999px;background:#15345b;color:white;padding:9px 12px;font-weight:700">👤 Select from phone contacts</button><button type="button" id="justiceAddContact" style="border:1px solid #60a5fa;border-radius:999px;background:#1d4ed8;color:white;padding:9px 12px;font-weight:700">＋ Add contact</button></div><div id="justiceManualContact" hidden style="display:grid;gap:7px"><input id="justiceContactName" placeholder="Contact name (e.g. Mum)" autocomplete="name" style="padding:11px;border-radius:9px;border:1px solid #64748b;background:#0b1220;color:white"><input id="justiceContactPhone" placeholder="Phone number (e.g. 0241234567)" inputmode="tel" autocomplete="tel" style="padding:11px;border-radius:9px;border:1px solid #64748b;background:#0b1220;color:white"><button type="button" id="justiceSaveContact" style="padding:10px;border:0;border-radius:9px;background:#16a34a;color:white;font-weight:700">Save contact</button></div><small style="color:#bfdbfe">Save a contact once, then say or type “Call Mum”. You can also say “Call” followed by a phone number.</small>';
  // Keep contact management on the homepage, not inside the chat composer.
  const home=document.querySelector('#home');
  const homeHero=home||document.querySelector('.hero');
  if(homeHero)homeHero.insertAdjacentElement('afterend',panel);else document.body.insertBefore(panel,document.body.firstChild);
  panel.classList.add('justice-home-contacts');
  const count=document.getElementById('justiceContactCount');
  const update=()=>{const n=read().length;count.textContent=n+' saved contact'+(n===1?'':'s');};
  const manual=document.getElementById('justiceManualContact');
  document.getElementById('justiceAddContact').addEventListener('click',()=>{manual.hidden=!manual.hidden;if(!manual.hidden)document.getElementById('justiceContactName').focus();});
  document.getElementById('justiceSaveContact').addEventListener('click',()=>{
    const name=document.getElementById('justiceContactName').value.trim(),phone=clean(document.getElementById('justiceContactPhone').value);
    if(!name||!valid(phone)){setStatus('Enter a contact name and a valid phone number.');return;}
    const all=read();const existing=all.find(c=>(c.names||[]).some(n=>normalise(n)===normalise(name)));
    if(existing){existing.phones=[...new Set([...(existing.phones||[]),phone])];if(!existing.names.some(n=>normalise(n)===normalise(name)))existing.names.push(name);}
    else all.push({names:[name],phones:[phone]});
    save(all);update();document.getElementById('justiceContactName').value='';document.getElementById('justiceContactPhone').value='';manual.hidden=true;
    setStatus('Saved '+name+'. Now say or type “Call '+name+'”.');
  });
  document.getElementById('justicePickContacts').addEventListener('click',async()=>{
    if(!window.isSecureContext){setStatus('Open the HTTPS Justice AI website to select contacts.');return;}
    if(!navigator.contacts?.select){setStatus('This browser does not offer a phone contact picker. Tap “Add contact” and enter the saved name and number instead.');manual.hidden=false;document.getElementById('justiceContactName').focus();return;}
    try{
      const chosen=await navigator.contacts.select(['name','tel'],{multiple:true});
      const all=read();
      for(const c of chosen||[]){
        const names=(c.name||[]).map(x=>String(x).trim()).filter(Boolean),phones=(c.tel||[]).map(clean).filter(valid);
        if(!names.length||!phones.length)continue;
        const existing=all.find(x=>(x.names||[]).some(n=>names.some(m=>normalise(n)===normalise(m))));
        if(existing){existing.names=[...new Set([...existing.names,...names])];existing.phones=[...new Set([...existing.phones,...phones])];}
        else all.push({names,phones});
      }
      save(all);update();setStatus('Contacts selected and saved. You can now say “Call [name]”.');
    }catch(e){if(e.name!=='AbortError')setStatus('Could not select contacts. You can use Add contact instead.');}
  });
  function match(q){const k=normalise(q).replace(/^(?:my|the)\\s+/,'').replace(/\\s+(?:please|now)$/,'');const all=read();let found=all.find(c=>(c.names||[]).some(n=>{const x=normalise(n);return x===k||x.replace(/^(?:my|the)\\s+/,'')===k;}));if(found)return found;const hits=all.filter(c=>(c.names||[]).some(n=>{const x=normalise(n).replace(/^(?:my|the)\\s+/,'');return x&&(x.startsWith(k+' ')||k.startsWith(x+' '));}));return hits.length===1?hits[0]:null;}
  function dial(number,name=''){
    const phone=clean(number);if(!valid(phone)){setStatus('That phone number is not valid.');return true;}
    setStatus('Opening the phone dialler for '+(name||phone)+'. Your phone may still ask you to confirm the call.');
    // Launch the Android/iOS dialler immediately. The OS controls final call approval.
    const link=document.createElement('a');link.href='tel:'+phone;link.setAttribute('aria-hidden','true');link.style.cssText='position:fixed;left:-9999px';document.body.appendChild(link);
    try{link.click();}catch(e){window.location.assign('tel:'+phone);}finally{link.remove();}
    return true;
  }
  function handle(raw){
    const text=String(raw||'').trim();
    const cleaned=text.replace(/^(?:(?:hey|hello)\s+)?(?:justice[\s,.-]*ai[\s,.:;-]*)+/i,'').trim();
    const m=cleaned.match(/^(?:(?:please|kindly)\s+)?(?:(?:can|could)\s+you\s+)?(?:(?:i want you to|i need you to)\s+)?(?:please\s+)?(?:call|phone|dial|ring)\s+(.+?)\s*[?.!]*$/i);
    if(!m)return false;
    const who=m[1].trim().replace(/^(?:the number|number)\s+/i,'').replace(/\s+(?:please|now|for me)$/i,'').trim();
    const number=clean(who);if(valid(number))return dial(number);
    const c=match(who);
    if(c){const nums=[...new Set((c.phones||[]).filter(valid))];if(nums.length===1)return dial(nums[0],c.names?.[0]||who);if(nums.length>1){setStatus('More than one number is saved for '+(c.names?.[0]||who)+'. Please choose one by saving a single number or say the full number.');return true;}}
    setStatus('I cannot find '+who+' yet. Tap “Select from phone contacts” or “Add contact” above, save the person, then say “Call '+who+'” again.');return true;
  }
  update();
  form.addEventListener('submit',e=>{if(handle(input.value)){e.preventDefault();e.stopImmediatePropagation();input.value='';}},true);
  window.amohJusticePhoneCommand=handle;
  window.addEventListener('pageshow',()=>{if(!document.getElementById('justicePhoneContacts')){const h=document.querySelector('#home')||document.querySelector('.hero');if(h)h.insertAdjacentElement('afterend',panel);else document.body.insertBefore(panel,document.body.firstChild);}});
})();
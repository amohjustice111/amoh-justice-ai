/* Justice AI history: local-first, with private Supabase sync for signed-in users. */
(function(){
const KEY='amohJusticeChatConversationsV2',OLD='amohJusticeAIChatHistoryV1',box=document.getElementById('chatMessages'),form=document.getElementById('chatForm'),input=document.getElementById('chatInput');
if(!box||!form||!input)return;
const greeting=box.querySelector('.bubble.bot')?.textContent||'Hello! Welcome to AMOH JUSTICE.';
const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch(_){return[]}};
const write=()=>{try{localStorage.setItem(KEY,JSON.stringify(chats.slice(0,100)))}catch(_){status('Browser storage is full; chat may not be saved.')}};
const id=()=>{try{return crypto.randomUUID()}catch(_){return 'chat-'+Date.now()+'-'+Math.random().toString(36).slice(2)}};
const clean=ms=>(Array.isArray(ms)?ms:[]).filter(m=>m&&['user','model'].includes(m.role)&&typeof m.text==='string'&&m.text.trim()&&m.text.trim()!=='Justice AI is thinking…').slice(-80).map(m=>({role:m.role,text:m.text.slice(0,6000)}));
const title=ms=>(ms.find(m=>m.role==='user')?.text||'New chat').replace(/\s+/g,' ').trim().slice(0,58)||'New chat';
let chats=read(),activeId=null,db=null,user=null,timer=null;
function status(t){const e=document.getElementById('justiceHistoryStatus');if(e)e.textContent=t}
function addUi(){
if(document.getElementById('justiceHistoryPanel'))return;
const top=box.closest('.chat-shell')?.querySelector('.chat-top');
if(!top)return;
const menu=document.createElement('button');menu.id='justiceHistoryToggle';menu.type='button';menu.setAttribute('aria-label','Open chat history');menu.setAttribute('aria-expanded','false');menu.title='Chat history';menu.innerHTML='<span></span><span></span>';
top.prepend(menu);
const backdrop=document.createElement('button');backdrop.id='justiceHistoryBackdrop';backdrop.type='button';backdrop.setAttribute('aria-label','Close chat history');
const p=document.createElement('aside');p.id='justiceHistoryPanel';p.setAttribute('aria-label','Chat history sidebar');p.setAttribute('aria-hidden','true');
p.innerHTML='<div class="jh-head"><div><b>Chat history</b><small>Find and continue a conversation</small></div><button id="jhClose" type="button" aria-label="Close history">×</button></div><button id="jhNew" class="jh-new" type="button">＋ New chat</button><label for="jhSearch">Search conversations</label><input id="jhSearch" type="search" placeholder="Search conversations…"><div id="jhList" role="list" aria-label="Saved conversations"></div><p id="justiceHistoryStatus" role="status" aria-live="polite">Chats save automatically in this browser.</p>';
document.body.append(backdrop,p);
const css=document.createElement('style');css.textContent=`
#justiceHistoryToggle{width:40px;height:40px;flex:0 0 40px;display:flex;flex-direction:column;justify-content:center;gap:6px;align-items:center;border:1px solid rgba(74,222,128,.35);border-radius:11px;background:#07170d;color:#d1fae5;cursor:pointer;margin-right:10px}
#justiceHistoryToggle span{display:block;width:19px;height:2px;border-radius:2px;background:#bbf7d0}
#justiceHistoryBackdrop{position:fixed;inset:0;z-index:2147483002;background:rgba(0,0,0,.62);border:0;padding:0;display:none}
#justiceHistoryPanel{position:fixed;z-index:2147483003;inset:0 auto 0 0;width:min(360px,88vw);box-sizing:border-box;padding:18px 14px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px;background:linear-gradient(160deg,#07130b,#030805);border-right:1px solid #34d39955;color:#ecfdf5;box-shadow:18px 0 55px #0009;transform:translateX(-105%);transition:transform .22s ease;visibility:hidden}
#justiceHistoryPanel.is-open{transform:translateX(0);visibility:visible}
#justiceHistoryBackdrop.is-open{display:block}
.jh-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.jh-head b{display:block;font-size:18px}.jh-head small{display:block;color:#9bb5a4;font-size:11px;margin-top:4px}
#jhClose{width:38px;height:38px;border:1px solid #34d39950;border-radius:10px;background:#102319;color:#d1fae5;font-size:25px;cursor:pointer}
#justiceHistoryPanel .jh-new{width:100%;padding:12px;border:1px solid #34d39975;border-radius:11px;background:linear-gradient(120deg,#14532d,#064e3b);color:#ecfdf5;font-weight:700;text-align:left;cursor:pointer}
#justiceHistoryPanel label{display:block;margin-bottom:-7px;color:#a7b9ad;font-size:12px}
#jhSearch{box-sizing:border-box;width:100%;padding:11px;border-radius:10px;border:1px solid #34d39940;background:#07100a;color:#fff;outline-color:#34d399}
#jhList{display:flex;flex-direction:column;gap:7px;overflow-y:auto;min-height:0;flex:1;padding:2px 1px}
.jh-row{display:flex;align-items:stretch;gap:6px}.jh-item{min-width:0;flex:1;padding:11px;text-align:left;border:1px solid #34d39928;border-radius:10px;background:#0b1a10;color:#e2f5e8;cursor:pointer}.jh-item[aria-current=true]{border-color:#34d399;background:#123321}.jh-item span,.jh-item small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.jh-item span{font-size:13px}.jh-item small{font-size:10px;color:#9eb6a7;margin-top:5px}.jh-delete{flex:0 0 38px;align-self:center;height:38px;border:1px solid #fb718540;border-radius:9px;background:#261014;color:#fecdd3;cursor:pointer;font-size:16px}.jh-empty{font-size:12px;color:#9eb6a7;padding:12px 4px;line-height:1.5}#justiceHistoryStatus{font-size:11px;color:#9eb6a7;line-height:1.5;margin:0}
@media(prefers-reduced-motion:reduce){#justiceHistoryPanel{transition:none}}
`;document.head.appendChild(css);
const closeSidebar=()=>{p.classList.remove('is-open');backdrop.classList.remove('is-open');p.setAttribute('aria-hidden','true');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open chat history');document.body.style.overflow= document.getElementById('justiceAiOverlay')?.classList.contains('is-open')?'hidden':''};
const openSidebar=()=>{p.classList.add('is-open');backdrop.classList.add('is-open');p.setAttribute('aria-hidden','false');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Close chat history');document.body.style.overflow='hidden';document.getElementById('jhSearch')?.focus()};
menu.addEventListener('click',()=>p.classList.contains('is-open')?closeSidebar():openSidebar());
backdrop.addEventListener('click',closeSidebar);document.getElementById('jhClose').addEventListener('click',closeSidebar);
document.getElementById('jhNew').onclick=()=>{newChat();closeSidebar()};
document.getElementById('jhSearch').oninput=renderList;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&p.classList.contains('is-open'))closeSidebar()});
window.amohJusticeHistoryClose=closeSidebar;
}
function renderList(){
const list=document.getElementById('jhList');if(!list)return;list.replaceChildren();
const q=(document.getElementById('jhSearch')?.value||'').toLowerCase().trim();
const rows=chats.filter(c=>!q||c.title.toLowerCase().includes(q)||c.messages.some(m=>m.text.toLowerCase().includes(q))).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));
if(!rows.length){const e=document.createElement('div');e.className='jh-empty';e.textContent=q?'No matching conversations.':'Your saved conversations will appear here. Start a chat and it will be saved automatically.';list.appendChild(e);return}
rows.forEach(c=>{
const row=document.createElement('div');row.className='jh-row';
const b=document.createElement('button');b.type='button';b.className='jh-item';b.setAttribute('role','listitem');b.setAttribute('aria-current',String(c.id===activeId));
const t=document.createElement('span');t.textContent=c.title;const d=document.createElement('small');d.textContent=new Date(c.updatedAt||c.createdAt||Date.now()).toLocaleDateString()+(c.id===activeId?' · Current chat':'');b.append(t,d);
b.onclick=()=>{openChat(c.id);window.amohJusticeHistoryClose?.()};
const del=document.createElement('button');del.type='button';del.className='jh-delete';del.textContent='🗑';del.title='Delete conversation';del.setAttribute('aria-label','Delete '+c.title);
del.onclick=async()=>{if(!confirm('Delete this conversation? This cannot be undone.'))return;chats=chats.filter(x=>x.id!==c.id);try{write()}catch(_){}if(db&&user&&c.cloud){const {error}=await db.from('amoh_chat_conversations').delete().eq('id',c.id).eq('user_id',user.id);if(error)status('Deleted from this browser, but account sync could not remove the cloud copy.')}if(activeId===c.id){activeId=null;renderMessages([]);status('Conversation deleted. Start a new chat whenever you are ready.')}renderList()};
row.append(b,del);list.appendChild(row);
});
}
function getMessages(){return clean([...box.querySelectorAll('.bubble')].map(e=>({role:e.classList.contains('user')?'user':'model',text:(e.innerText||e.textContent||'').trim()})))}
function renderMessages(ms){box.replaceChildren();const messages=clean(ms);if(!messages.length){const e=document.createElement('div');e.className='bubble bot';e.textContent=greeting;box.appendChild(e)}messages.forEach(m=>{const e=document.createElement('div');e.className='bubble '+(m.role==='user'?'user':'bot');e.textContent=m.text;box.appendChild(e)});box.scrollTop=box.scrollHeight;const ctx=window.amohJusticeChatHistory||[];ctx.splice(0,ctx.length,...messages)}
function saveNow(){const c=chats.find(x=>x.id===activeId);if(!c)return;c.messages=getMessages();if(!c.messages.some(m=>m.role==='user'))return;c.title=title(c.messages);c.updatedAt=new Date().toISOString();write();renderList();sync(c)}
function schedule(){clearTimeout(timer);timer=setTimeout(saveNow,500)}
function newChat(){if(activeId)saveNow();activeId=null;renderMessages([]);renderList();status('New chat ready. Your next message starts a separate conversation.');input.focus()}
function openChat(cid){if(activeId)saveNow();const c=chats.find(x=>x.id===cid);if(!c)return;activeId=cid;renderMessages(c.messages);renderList();status(c.cloud?'Saved privately to your account.':'Saved in this browser.')}
function beginMessage(text){if(!activeId){const c={id:id(),title:text.slice(0,58),messages:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};chats.unshift(c);activeId=c.id;write();renderList()}schedule()}
form.addEventListener('submit',()=>{const text=input.value.trim();if(text)beginMessage(text)},true);
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>beginMessage(b.dataset.question)));
new MutationObserver(()=>{if(activeId)schedule()}).observe(box,{childList:true,subtree:true,characterData:true});
async function connect(){
try{const r=await fetch('/api/public-config');if(!r.ok)return;const cfg=await r.json();if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)return;
if(!window.supabase?.createClient)await new Promise(resolve=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=resolve;document.head.appendChild(s)});
if(!window.supabase?.createClient)return;db=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);const s=await db.auth.getSession();user=s.data?.session?.user||null;if(user)await loadCloud()
}catch(_){status('Local history is ready; account sync is not available right now.')}}
async function loadCloud(){
const {data,error}=await db.from('amoh_chat_conversations').select('id,title,messages,created_at,updated_at').eq('user_id',user.id).order('updated_at',{ascending:false}).limit(100);
if(error){status('Local history works. Run the chat-history SQL from supabase-schema.sql to enable private account sync.');return}
const map=new Map((data||[]).map(r=>[r.id,{id:r.id,title:r.title||'New chat',messages:clean(r.messages),createdAt:r.created_at,updatedAt:r.updated_at,cloud:true}]));
chats.forEach(c=>{if(!map.has(c.id))map.set(c.id,c)});chats=[...map.values()].sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||'')).slice(0,100);write();renderList();
if(chats.length)openChat(chats.find(c=>c.id===activeId)?.id||chats[0].id);
for(const c of chats.filter(c=>!c.cloud))sync(c);
status('Signed-in chat history is private to your account.');
}
let queue=Promise.resolve();
function sync(c){if(!db||!user||!c?.messages?.length)return;const row={id:c.id,user_id:user.id,title:c.title.slice(0,120),messages:clean(c.messages),updated_at:c.updatedAt||new Date().toISOString()};queue=queue.then(async()=>{const {error}=await db.from('amoh_chat_conversations').upsert(row,{onConflict:'id'});if(error)status('Saved locally. Run the chat-history SQL in Supabase for cloud sync.');else{c.cloud=true;status('Conversation saved privately to your account.')}}).catch(()=>status('Saved locally; cloud sync is unavailable right now.'))}
addUi();
if(!chats.length){try{const old=JSON.parse(localStorage.getItem(OLD)||'[]');if(Array.isArray(old)&&old.some(m=>m.role==='user')){const ms=clean(old.map(m=>({role:m.role==='user'?'user':'model',text:String(m.text||'')})));const c={id:id(),title:title(ms),messages:ms,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};chats=[c];activeId=c.id;write();renderMessages(ms)}}catch(_){}}
renderList();if(chats.length&&!activeId)openChat(chats[0].id);connect();
})();

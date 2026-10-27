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
const p=document.createElement('section');p.id='justiceHistoryPanel';p.innerHTML='<div class="jh-head"><b>Chat history</b><button id="jhNew" type="button">＋ New chat</button></div><label for="jhSearch">Search previous chats</label><input id="jhSearch" type="search" placeholder="Search conversations…"><div id="jhList" role="list" aria-label="Saved conversations"></div><p id="justiceHistoryStatus" role="status" aria-live="polite">Chats save automatically in this browser.</p>';
box.closest('.chat-shell')?.querySelector('.chat-top')?.insertAdjacentElement('afterend',p);
const css=document.createElement('style');css.textContent='#justiceHistoryPanel{padding:12px 14px;border-bottom:1px solid #34d39935;background:#06100a}.jh-head{display:flex;justify-content:space-between;align-items:center;color:#d1fae5;font-size:13px}.jh-head button{border:1px solid #34d39970;border-radius:9px;padding:8px 10px;background:#10301d;color:#d1fae5}.jh-head button,#jhList button{cursor:pointer}#justiceHistoryPanel label{display:block;margin:10px 0 5px;color:#a7b9ad;font-size:11px}#jhSearch{box-sizing:border-box;width:100%;padding:10px;border-radius:9px;border:1px solid #34d39940;background:#07100a;color:#fff}#jhList{display:flex;gap:7px;overflow-x:auto;padding:10px 0}.jh-item{flex:0 0 auto;max-width:190px;padding:9px 11px;text-align:left;border:1px solid #34d39935;border-radius:10px;background:#0b1a10;color:#e2f5e8}.jh-item[aria-current=true]{border-color:#34d399;background:#123321}.jh-item span,.jh-item small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:165px}.jh-item small,#justiceHistoryStatus{font-size:10px;color:#9eb6a7;margin-top:5px}.jh-empty{font-size:12px;color:#9eb6a7;padding:8px 0}@media(max-width:520px){.jh-item{max-width:155px}.jh-item span,.jh-item small{max-width:130px}}';document.head.appendChild(css);
document.getElementById('jhNew').onclick=newChat;document.getElementById('jhSearch').oninput=renderList;
}
function renderList(){const list=document.getElementById('jhList');if(!list)return;list.replaceChildren();const q=(document.getElementById('jhSearch')?.value||'').toLowerCase().trim();const rows=chats.filter(c=>!q||c.title.toLowerCase().includes(q)||c.messages.some(m=>m.text.toLowerCase().includes(q))).sort((a,b)=>(b.updatedAt||'').localeCompare(a.updatedAt||''));if(!rows.length){const e=document.createElement('div');e.className='jh-empty';e.textContent=q?'No matching conversations.':'Your saved conversations will appear here.';list.appendChild(e);return}rows.forEach(c=>{const b=document.createElement('button');b.type='button';b.className='jh-item';b.setAttribute('role','listitem');b.setAttribute('aria-current',String(c.id===activeId));const t=document.createElement('span');t.textContent=c.title;const d=document.createElement('small');d.textContent=new Date(c.updatedAt||c.createdAt||Date.now()).toLocaleDateString();b.append(t,d);b.onclick=()=>openChat(c.id);list.appendChild(b)})}
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

/* AMOH JUSTICE AI — practical assistant upgrades.
   Uses the existing /api/chat route and server-side Gemini key. No new paid services. */
(()=>{'use strict';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(k,d=[])=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return Array.isArray(v)?v:d}catch(_){return d}};
const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}};
const TASKS='amohJusticePlannerTasksV1',PROJECTS='amohJusticeSuiteProjectsV1';
function openPanel(title,html){
 const root=$('#justiceSuite'),panel=$('#justiceSuiteWork');
 if(!root||!panel){alert('The dashboard is not ready yet. Please reopen Open All Features.');return;}
 root.classList.add('open');document.body.style.overflow='hidden';
 panel.innerHTML='<strong>'+title+'</strong>'+html;
 panel.scrollIntoView({behavior:'smooth',block:'start'});
}
function askChat(prompt){
 const float=$('#justiceAiFloat'),overlay=$('#justiceAiOverlay'),input=$('#chatInput'),form=$('#chatForm');
 if(!input||!form){alert('Justice AI chat is not available on this screen.');return;}
 if(!overlay?.classList.contains('is-open'))float?.click();
 setTimeout(()=>{input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));form.requestSubmit();},220);
}
async function aiRequest(message,opts={}){
 const username=await window.amohJusticeGetChatUsername?.()||'';
 const prefs=window.amohJusticeVoicePreferences?.()||{};
 const body={message,username,stream:false,webSearch:opts.webSearch===true,longOutput:opts.longOutput===true,language:prefs.language||'en-US',relationship:prefs.relationship||'friend',memory:window.amohJusticeMemoryContext?.()||''};
 if(opts.attachments)body.attachments=opts.attachments;
 const response=await fetch('/api/chat',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data.error||'Justice AI could not complete the request.');
 return data;
}
const upgrades=[
 ['🗓️','Daily Planner','Save tasks and due times on this device; get reminders while the app is open.','planner'],
 ['📑','Document Intelligence','Ask Justice AI questions about PDF, image and text files.','documents'],
 ['🌐','AI Research Mode','Search the web with Google grounding and get source links.','research'],
 ['🎨','Creative Studio','Build professional image, poster, logo and video prompts.','creative'],
 ['⚙️','Personalisation Centre','Open voice, language and assistant-style settings.','personalise']
];
function addCards(){
 const grid=$('#justiceSuiteGrid');if(!grid||grid.dataset.upgradesReady)return;
 grid.dataset.upgradesReady='1';
 upgrades.forEach(([icon,name,desc,id])=>{
  const card=document.createElement('article');card.className='suite-card';
  const title=document.createElement('strong');title.textContent=icon+' '+name;
  const p=document.createElement('p');p.textContent=desc;
  const button=document.createElement('button');button.type='button';button.dataset.upgradeFeature=id;button.textContent='Open '+name+' →';
  card.append(title,p,button);grid.appendChild(card);
 });
 grid.addEventListener('click',e=>{const b=e.target.closest('button[data-upgrade-feature]');if(!b)return;e.preventDefault();e.stopPropagation();try{run(b.dataset.upgradeFeature)}catch(err){openPanel('Feature error','<p class="suite-status">'+esc(err.message||'This feature could not open.')+'</p>')}});
}
function drawTasks(){
 const list=$('#upgradeTaskList');if(!list)return;
 const tasks=read(TASKS);
 list.replaceChildren();
 if(!tasks.length){const li=document.createElement('li');li.textContent='No tasks yet. Add your first task above.';list.appendChild(li);return;}
 tasks.forEach((task,index)=>{
  const li=document.createElement('li');li.className='upgrade-task'+(task.done?' is-done':'');
  const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=!!task.done;
  check.addEventListener('change',()=>{const all=read(TASKS);all[index].done=check.checked;write(TASKS,all);drawTasks()});
  const span=document.createElement('span');span.textContent=task.title+(task.due?' · '+new Date(task.due).toLocaleString():'');
  label.append(check,span);
  const del=document.createElement('button');del.type='button';del.textContent='Delete';del.addEventListener('click',()=>{const all=read(TASKS);all.splice(index,1);write(TASKS,all);drawTasks()});
  li.append(label,del);list.appendChild(li);
 });
}
let dueTimer=null;
function checkDueTasks(){
 const tasks=read(TASKS),now=Date.now();let changed=false;
 tasks.forEach(t=>{if(!t.done&&t.due&&new Date(t.due).getTime()<=now&&!t.notified){t.notified=true;changed=true;const message='Task due: '+t.title;
  if('Notification'in window&&Notification.permission==='granted'){try{new Notification('AMOH JUSTICE AI',{body:message})}catch(_){}}else if(document.visibilityState==='visible'){const status=$('#upgradePlannerStatus');if(status)status.textContent=message;}
 }});
 if(changed)write(TASKS,tasks);
}
function planner(){
 openPanel('🗓️ Daily Planner','<p class="suite-muted">Tasks are saved on this device. Reminders can appear while this app is open; a browser page cannot guarantee alerts after it is closed.</p><input id="upgradeTaskTitle" placeholder="What do you need to do?"><label for="upgradeTaskDue">Due date and time (optional)</label><input id="upgradeTaskDue" type="datetime-local"><div class="suite-row"><button id="upgradeTaskAdd">＋ Add task</button><button id="upgradeTaskNotify">Enable notifications</button></div><p id="upgradePlannerStatus" class="suite-status" aria-live="polite"></p><ul id="upgradeTaskList" class="suite-list"></ul>');
 $('#upgradeTaskAdd').onclick=()=>{const title=$('#upgradeTaskTitle').value.trim(),due=$('#upgradeTaskDue').value;if(!title){$('#upgradePlannerStatus').textContent='Enter a task first.';return;}const tasks=read(TASKS);tasks.unshift({title,due:due?new Date(due).toISOString():'',done:false,notified:false,created:Date.now()});if(!write(TASKS,tasks)){$('#upgradePlannerStatus').textContent='Could not save. Device storage may be full.';return;}$('#upgradeTaskTitle').value='';$('#upgradeTaskDue').value='';$('#upgradePlannerStatus').textContent='Task saved on this device.';drawTasks();checkDueTasks()};
 $('#upgradeTaskNotify').onclick=async()=>{if(!('Notification'in window)){$('#upgradePlannerStatus').textContent='Notifications are not supported in this browser.';return;}const permission=await Notification.requestPermission();$('#upgradePlannerStatus').textContent='Notification permission: '+permission;};
 drawTasks();checkDueTasks();if(dueTimer)clearInterval(dueTimer);dueTimer=setInterval(checkDueTasks,20000);
}
function renderSources(container,sources){
 if(!Array.isArray(sources)||!sources.length)return;
 const wrap=document.createElement('div');wrap.className='upgrade-sources';const h=document.createElement('strong');h.textContent='Sources';wrap.appendChild(h);
 sources.slice(0,8).forEach(s=>{if(!s.url||!/^https?:\/\//i.test(s.url))return;const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title||s.url;wrap.appendChild(a)});
 container.appendChild(wrap);
}
function research(){
 openPanel('🌐 AI Research Mode','<p class="suite-muted">Justice AI uses Google Search grounding for current web research and returns source links when available.</p><input id="upgradeResearchQuery" placeholder="What should I research?"><div class="suite-row"><button id="upgradeResearchGo">🔎 Research with Justice AI</button><button id="upgradeResearchGoogle">Open Google Search</button></div><p id="upgradeResearchStatus" class="suite-status" aria-live="polite"></p><div id="upgradeResearchAnswer" class="upgrade-answer"></div>');
 $('#upgradeResearchGoogle').onclick=()=>{const q=$('#upgradeResearchQuery').value.trim();if(q)window.open('https://www.google.com/search?q='+encodeURIComponent(q),'_blank','noopener,noreferrer')};
 $('#upgradeResearchGo').onclick=async()=>{const q=$('#upgradeResearchQuery').value.trim();if(!q)return;const b=$('#upgradeResearchGo'),status=$('#upgradeResearchStatus'),out=$('#upgradeResearchAnswer');b.disabled=true;b.textContent='Researching…';status.textContent='Searching the web and checking available sources…';out.replaceChildren();try{const data=await aiRequest('Research this topic using current web sources. Summarise the key findings, distinguish confirmed facts from uncertainty, and include dates where relevant: '+q,{webSearch:true,longOutput:true});const p=document.createElement('p');p.textContent=data.answer||'No answer was returned.';out.appendChild(p);renderSources(out,data.sources);status.textContent=data.sources?.length?'Research complete. Review the linked sources.':'Research complete. No source links were returned for this query.';}catch(e){status.textContent=e.message||'Research failed. Please try again.';}finally{b.disabled=false;b.textContent='🔎 Research with Justice AI';}};
}
function documents(){
 openPanel('📑 Document Intelligence','<p class="suite-muted">Upload a PDF or image (up to 4 MB), or a TXT, MD, CSV or JSON file. The selected file is sent to Justice AI only when you press Analyse. Word files should be exported as PDF first.</p><input id="upgradeDocumentFile" type="file" accept=".pdf,.txt,.md,.csv,.json,.png,.jpg,.jpeg,.webp,.gif,application/pdf,text/plain,text/markdown,text/csv,application/json,image/*"><textarea id="upgradeDocumentQuestion" placeholder="What should Justice AI do with this file?">Summarise this document, identify its key points, and tell me anything important I should notice.</textarea><button id="upgradeDocumentAnalyse">Analyse document</button><p id="upgradeDocumentStatus" class="suite-status" aria-live="polite"></p><div id="upgradeDocumentAnswer" class="upgrade-answer"></div>');
 $('#upgradeDocumentAnalyse').onclick=async()=>{const file=$('#upgradeDocumentFile').files?.[0];if(!file){$('#upgradeDocumentStatus').textContent='Choose a document first.';return;}if(file.size>4*1024*1024){$('#upgradeDocumentStatus').textContent='Please choose a file smaller than 4 MB.';return;}const q=$('#upgradeDocumentQuestion').value.trim()||'Summarise this file and identify its important details.';const b=$('#upgradeDocumentAnalyse'),status=$('#upgradeDocumentStatus'),out=$('#upgradeDocumentAnswer');b.disabled=true;b.textContent='Analysing…';status.textContent='Reading your selected file…';out.textContent='';try{let data;if(['application/pdf','image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('Could not read this file.'));reader.readAsDataURL(file)});data=await aiRequest(q+' The attached file is named '+file.name+'. Please analyse its contents carefully.',{attachments:[{mimeType:file.type,data:base64}],longOutput:true});}else if(/\.(txt|md|csv|json)$/i.test(file.name)||file.type.startsWith('text/')){const text=await file.text();if(!text.trim())throw new Error('This text file is empty.');data=await aiRequest(q+' File name: '+file.name+'. Document content:\n'+text.slice(0,3200),{longOutput:true});}else throw new Error('This file type is not supported yet. Export Word documents as PDF and try again.');out.textContent=data.answer||'No analysis was returned.';status.textContent='Analysis complete.';}catch(e){status.textContent=e.message||'Could not analyse this file.';}finally{b.disabled=false;b.textContent='Analyse document';}};
}
function creative(){
 openPanel('🎨 Creative Studio','<p class="suite-muted">Create a strong prompt for your chosen creative tool. This builds and saves prompts; it does not silently start paid image or video generation.</p><label for="upgradeCreativeType">What are you creating?</label><select id="upgradeCreativeType"><option>Photorealistic AI image</option><option>Professional poster or flyer</option><option>Logo and brand identity</option><option>Cinematic AI video</option><option>Social media advert</option></select><input id="upgradeCreativeSubject" placeholder="Subject, product, person or business"><input id="upgradeCreativeStyle" placeholder="Style, colours or mood (optional)"><textarea id="upgradeCreativeDetails" placeholder="Describe what you want, text to include, aspect ratio, audience, etc."></textarea><div class="suite-row"><button id="upgradeCreativeMake">Create prompt with Justice AI</button><button id="upgradeCreativeSave">Save prompt</button></div><textarea id="upgradeCreativeOutput" placeholder="Your finished prompt will appear here." rows="6"></textarea><p id="upgradeCreativeStatus" class="suite-status"></p><div class="suite-row"><a class="suite-action" href="https://www.canva.com/" target="_blank" rel="noopener noreferrer">Canva</a><a class="suite-action" href="https://clipchamp.com/" target="_blank" rel="noopener noreferrer">Clipchamp</a></div>');
 $('#upgradeCreativeMake').onclick=async()=>{const subject=$('#upgradeCreativeSubject').value.trim();if(!subject){$('#upgradeCreativeStatus').textContent='Describe what you want to create first.';return;}const b=$('#upgradeCreativeMake');b.disabled=true;b.textContent='Creating prompt…';try{const data=await aiRequest('Act as an expert creative director and prompt engineer. Write one detailed, ready-to-use prompt for: '+$('#upgradeCreativeType').value+'. Subject: '+subject+'. Style/mood: '+$('#upgradeCreativeStyle').value+'. Requirements: '+$('#upgradeCreativeDetails').value+'. Include composition, lighting, camera/framing, materials, typography if relevant, and negative constraints. Return only the finished prompt.',{longOutput:true});$('#upgradeCreativeOutput').value=data.answer||'';$('#upgradeCreativeStatus').textContent='Prompt created. Review and save it before using an external tool.';}catch(e){$('#upgradeCreativeStatus').textContent=e.message||'Could not create the prompt.';}finally{b.disabled=false;b.textContent='Create prompt with Justice AI';}};
 $('#upgradeCreativeSave').onclick=()=>{const text=$('#upgradeCreativeOutput').value.trim();if(!text){$('#upgradeCreativeStatus').textContent='Create or paste a prompt first.';return;}const list=read(PROJECTS);list.unshift({name:'Creative prompt — '+($('#upgradeCreativeSubject').value.trim()||'Untitled'),text,date:Date.now()});if(write(PROJECTS,list))$('#upgradeCreativeStatus').textContent='Prompt saved in Saved Projects on this device.';else $('#upgradeCreativeStatus').textContent='Could not save. Device storage may be full.';};
}
function personalise(){
 openPanel('⚙️ Personalisation Centre','<p>Voice, language and speaking style settings are already part of Justice AI. Open the chat first, then open its settings.</p><div class="suite-row"><button id="upgradeOpenSettings">Open voice & language settings</button><button id="upgradeOpenChat">Open Justice AI chat</button></div><p class="suite-muted">Available voices and speech recognition depend on the voices and language services installed on your device. Akan/Twi recognition may vary by browser.</p>');
 $('#upgradeOpenSettings').onclick=()=>{const float=$('#justiceAiFloat');if(!$('#justiceAiOverlay')?.classList.contains('is-open'))float?.click();setTimeout(()=>{const b=$('#amohVoiceSettingsButton');if(b)b.click();else{alert('Open the chat and tap the gear icon to change voice settings.');}},350)};
 $('#upgradeOpenChat').onclick=()=>$('#justiceAiFloat')?.click();
}
function run(id){if(id==='planner')planner();else if(id==='documents')documents();else if(id==='research')research();else if(id==='creative')creative();else if(id==='personalise')personalise();}
const commandMap=[
 [/^(?:open|show|go to|take me to)\s+(?:my\s+)?(?:dashboard|all features)$/,'dashboard'],
 [/^(?:open|show|go to|take me to)\s+(?:my\s+)?(?:planner|daily planner|tasks|calendar)$/,'planner'],
 [/^(?:open|show|go to|take me to)\s+(?:my\s+)?(?:documents|document assistant|document intelligence|pdf reader)$/,'documents'],
 [/^(?:open|show|go to|take me to)\s+(?:my\s+)?(?:research|research mode|web research)$/,'research'],
 [/^(?:open|show|go to|take me to)\s+(?:my\s+)?(?:creative studio|design studio|prompt studio)$/,'creative'],
 [/^(?:open|show|go to|take me to)\s+(?:my\s+)?(?:settings|personalisation|personalization|voice settings)$/,'personalise']
];
window.amohJusticeFeatureCommand=raw=>{
 const text=String(raw||'').trim().replace(/^(?:(?:hey|hello)\s+)?justice[\s,.-]*ai[\s,.:;-]*/i,'').replace(/[?.!]+$/,'').trim().toLowerCase();
 const match=commandMap.find(([re])=>re.test(text));if(!match)return false;
 const id=match[1];
 if(id==='dashboard'){if(!$('#justiceSuite')?.classList.contains('open'))$('#justiceSuiteLauncher')?.click();return true;}
 const launch=()=>{if(!$('#justiceSuite')?.classList.contains('open'))$('#justiceSuiteLauncher')?.click();setTimeout(()=>{const b=$('#justiceSuiteGrid [data-upgrade-feature="'+id+'"]');if(b)b.click();else if(id==='personalise')run(id);},180)};
 launch();return true;
};
function init(){addCards();const observer=new MutationObserver(addCards);if(document.body)observer.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
window.addEventListener('pageshow',()=>{addCards();checkDueTasks()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkDueTasks()});
})();

/* Justice AI Tools Hub: web search, file analysis, local memory, quick tools, image generation. */
(()=> {
 const $=s=>document.querySelector(s);
 const safe=(s)=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const style=document.createElement('style');
 style.textContent=`
 #amohToolsLauncher{border:1px solid #34d39988;border-radius:999px;padding:7px 11px;background:#052e16;color:#bbf7d0;font-weight:800;cursor:pointer;font-size:12px;white-space:nowrap}
 #amohToolsModal{position:fixed;inset:0;z-index:2147483003;background:#020805f5;display:none;align-items:center;justify-content:center;padding:12px;color:#ecfdf5}
 #amohToolsModal.open{display:flex}
 #amohToolsPanel{width:min(900px,100%);height:min(850px,95dvh);overflow:auto;border:1px solid #166534;border-radius:20px;background:linear-gradient(145deg,#07180d,#030805);box-shadow:0 25px 90px #000b;padding:clamp(14px,3vw,26px)}
 #amohToolsPanel *{box-sizing:border-box} #amohToolsPanel h2{margin:0 0 6px;font-size:clamp(21px,4vw,30px)} #amohToolsPanel p{color:#bbd8c4;line-height:1.55;font-size:13px}
 #amohToolsPanel button,#amohToolsPanel select,#amohToolsPanel input,#amohToolsPanel textarea{font:inherit}
 .ajtools-head{display:flex;align-items:center;gap:12px;justify-content:space-between;margin-bottom:16px}
 .ajtools-close{width:40px;height:40px;border:1px solid #166534;border-radius:50%;background:#052e16;color:#dcfce7;font-size:24px}
 .ajtools-tabs{display:flex;gap:7px;overflow-x:auto;padding:4px 0 12px}
 .ajtools-tab{flex:0 0 auto;border:1px solid #166534;border-radius:999px;background:#07180d;color:#bbf7d0;padding:9px 13px;cursor:pointer}
 .ajtools-tab[aria-selected=true]{background:#166534;color:#fff;border-color:#4ade80}
 .ajtools-page{display:none}.ajtools-page.active{display:block}
 .ajtools-field{display:block;margin:12px 0 6px;font-size:13px;color:#d1fae5;font-weight:700}
 .ajtools-input,.ajtools-area,.ajtools-select{width:100%;border:1px solid #245c38;border-radius:12px;background:#020805;color:#f0fdf4;padding:12px;min-height:44px}
 .ajtools-area{min-height:100px;resize:vertical}
 .ajtools-primary{border:1px solid #4ade80;border-radius:12px;background:linear-gradient(135deg,#4ade80,#15803d);color:#03140a;padding:11px 15px;font-weight:800;cursor:pointer;margin:8px 6px 4px 0}
 .ajtools-secondary{border:1px solid #166534;border-radius:12px;background:#07180d;color:#d1fae5;padding:10px 13px;cursor:pointer;margin:6px 6px 4px 0}
 .ajtools-output{margin-top:12px;padding:13px;border:1px solid #14532d;border-radius:13px;background:#020805;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font-size:14px}
 .ajtools-output a{color:#86efac;overflow-wrap:anywhere}.ajtools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.ajtools-card{border:1px solid #14532d;border-radius:14px;padding:13px;background:#06120a}.ajtools-card h3{margin:0 0 6px;font-size:15px}.ajtools-small{font-size:12px;color:#9cc7a8}.ajtools-image{display:block;max-width:100%;max-height:520px;object-fit:contain;border-radius:12px;margin-top:12px}.ajtools-status{min-height:22px;color:#86efac;font-size:13px}
 @media(max-width:580px){#amohToolsModal{padding:0}#amohToolsPanel{height:100dvh;border-radius:0;border-left:0;border-right:0;padding:14px}.ajtools-grid{grid-template-columns:1fr}.ajtools-head{align-items:flex-start}}
 @media(prefers-reduced-motion:reduce){#amohToolsPanel *{scroll-behavior:auto!important}}
 `;
 document.head.appendChild(style);
 const modal=document.createElement('div');modal.id='amohToolsModal';modal.innerHTML=`
 <section id="amohToolsPanel" role="dialog" aria-modal="true" aria-labelledby="ajtoolsTitle">
  <div class="ajtools-head"><div><div style="font-size:11px;letter-spacing:.18em;color:#86efac;font-weight:800">AMOH JUSTICE AI</div><h2 id="ajtoolsTitle">AI Tools Hub</h2><p style="margin:4px 0 0">Search, create, learn, and work with your files.</p></div><button class="ajtools-close" id="ajtoolsClose" aria-label="Close tools">×</button></div>
  <div class="ajtools-tabs" role="tablist">
   <button class="ajtools-tab" data-tab="search" aria-selected="true">Web Search</button><button class="ajtools-tab" data-tab="files" aria-selected="false">Files & Images</button><button class="ajtools-tab" data-tab="create" aria-selected="false">Generate Image</button><button class="ajtools-tab" data-tab="memory" aria-selected="false">My Memory</button><button class="ajtools-tab" data-tab="tools" aria-selected="false">Quick Tools</button>
  </div>
  <section class="ajtools-page active" data-page="search">
   <h3>Live web search</h3><p>Ask a question that needs current information. When Google Search grounding is available for your Gemini key/model, Justice AI will include source links.</p>
   <label class="ajtools-field" for="ajSearchQuery">What should Justice AI search for?</label><textarea class="ajtools-area" id="ajSearchQuery" placeholder="Example: Latest AI news in Ghana and links to reliable sources"></textarea>
   <button class="ajtools-primary" id="ajSearchRun">Search the web ↗</button><div class="ajtools-status" id="ajSearchStatus" role="status"></div><div class="ajtools-output" id="ajSearchOutput" hidden></div>
  </section>
  <section class="ajtools-page" data-page="files">
   <h3>Ask about a document or image</h3><p>Choose up to 3 images or PDFs (combined upload about 4 MB), then ask Justice AI to explain, summarize, read text, or answer questions about them.</p>
   <label class="ajtools-field" for="ajFileInput">Select images or PDF files</label><input class="ajtools-input" id="ajFileInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" multiple>
   <label class="ajtools-field" for="ajFileQuestion">What do you want to know?</label><textarea class="ajtools-area" id="ajFileQuestion" placeholder="Summarize this file in simple English…"></textarea>
   <button class="ajtools-primary" id="ajAnalyzeFiles">Analyze files</button><div class="ajtools-status" id="ajFileStatus" role="status"></div><div class="ajtools-output" id="ajFileOutput" hidden></div>
  </section>
  <section class="ajtools-page" data-page="create">
   <h3>AI image generator</h3><p>Describe the image you want. Image generation uses your existing Gemini API connection; availability, quotas, and possible charges depend on your Google AI account settings. Nothing is generated until you press the button.</p>
   <label class="ajtools-field" for="ajImagePrompt">Image description</label><textarea class="ajtools-area" id="ajImagePrompt" placeholder="A cinematic emerald-green and black luxury poster for AMOH JUSTICE AI, dramatic lighting, clean composition…"></textarea>
   <div class="ajtools-grid"><div><label class="ajtools-field" for="ajImageRatio">Shape</label><select class="ajtools-select" id="ajImageRatio"><option value="square">Square poster</option><option value="landscape">Landscape 16:9 style</option><option value="portrait">Portrait poster</option></select></div><div><label class="ajtools-field" for="ajImageStyle">Style</label><select class="ajtools-select" id="ajImageStyle"><option>Photorealistic</option><option>Cinematic</option><option>3D illustration</option><option>Anime</option><option>Graphic design</option><option>Watercolor</option></select></div></div>
   <button class="ajtools-primary" id="ajGenerateImage">Generate image ✦</button><div class="ajtools-status" id="ajImageStatus" role="status"></div><div class="ajtools-output" id="ajImageOutput" hidden></div>
  </section>
  <section class="ajtools-page" data-page="memory">
   <h3>Your personal memory</h3><p>Memory stays in this browser on this device. Save preferences or project context you want Justice AI to use. Do not save passwords or sensitive information.</p>
   <label class="ajtools-field" for="ajMemoryText">What should Justice AI remember?</label><textarea class="ajtools-area" id="ajMemoryText" placeholder="I prefer step-by-step explanations. My current project is…"></textarea>
   <button class="ajtools-primary" id="ajMemorySave">Save memory</button><button class="ajtools-secondary" id="ajMemoryClear">Clear memory</button><div class="ajtools-status" id="ajMemoryStatus" role="status"></div><div class="ajtools-output" id="ajMemoryOutput"></div>
  </section>
  <section class="ajtools-page" data-page="tools">
   <h3>Quick tools</h3><p>Choose an action to prepare a useful prompt in the main Justice AI chat.</p>
   <div class="ajtools-grid">
    <button class="ajtools-card" data-quick="writing"><h3>✍ Writing helper</h3><span class="ajtools-small">Emails, letters, stories, posts</span></button>
    <button class="ajtools-card" data-quick="coding"><h3>⌘ Coding assistant</h3><span class="ajtools-small">Explain or debug code</span></button>
    <button class="ajtools-card" data-quick="study"><h3>🎓 Study coach</h3><span class="ajtools-small">Simple lessons and quizzes</span></button>
    <button class="ajtools-card" data-quick="translate"><h3>🌍 Translator</h3><span class="ajtools-small">Translate between languages</span></button>
    <button class="ajtools-card" data-quick="creative"><h3>🎨 Image prompt builder</h3><span class="ajtools-small">Create a detailed image prompt</span></button>
    <button class="ajtools-card" data-quick="business"><h3>📈 Business planner</h3><span class="ajtools-small">Ideas, plans, and marketing</span></button>
   </div>
  </section>
  <p class="ajtools-small">Privacy: files are sent to the existing AI provider for your request; saved memory is stored locally in this browser. Avoid uploading confidential documents.</p>
 </section>`;
 document.body.appendChild(modal);
 const memoryKey='amohJusticePersonalMemoryV1';
 function getMemory(){try{return localStorage.getItem(memoryKey)||''}catch(e){return ''}}
 function renderMemory(){const v=getMemory();$('#ajMemoryText').value=v;$('#ajMemoryOutput').textContent=v?'Saved memory:\n'+v:'No personal memory saved on this device.'}
 window.amohJusticeMemoryContext=getMemory;
 function open(){modal.classList.add('open');document.body.style.overflow='hidden';renderMemory()}
 function close(){modal.classList.remove('open');document.body.style.overflow=''}
 $('#amohToolsLauncher')?.addEventListener('click',open);$('#ajtoolsClose').addEventListener('click',close);modal.addEventListener('click',e=>{if(e.target===modal)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
 modal.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>{modal.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',String(b===btn)));modal.querySelectorAll('[data-page]').forEach(p=>p.classList.toggle('active',p.dataset.page===btn.dataset.tab))}));
 async function readFiles(){const files=Array.from($('#ajFileInput').files||[]).slice(0,3);if(!files.length)throw Error('Choose at least one PDF or image.');let total=0;const result=[];for(const file of files){if(!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(file.type))throw Error('Use JPG, PNG, WEBP, GIF, or PDF files.');total+=file.size;if(total>4*1024*1024)throw Error('The combined file size must be about 4 MB or less.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]||'');r.onerror=()=>reject(new Error('Could not read '+file.name));r.readAsDataURL(file)});result.push({mimeType:file.type,data})}return result}
 async function chatCall(message,extra={}){const prefs=window.amohJusticeVoicePreferences?.()||{};const res=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history:[],relationship:prefs.relationship||'friend',language:prefs.language||'en-US',memory:getMemory(),...extra})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Justice AI could not complete the request.');return data}
 function showAnswer(el,answer,sources=[]){el.hidden=false;el.textContent=answer||'';if(sources.length){const list=document.createElement('div');list.style.marginTop='14px';const heading=document.createElement('b');heading.textContent='Sources';list.appendChild(heading);sources.forEach(s=>{const p=document.createElement('p');const a=document.createElement('a');a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=s.title||s.url;p.appendChild(a);list.appendChild(p)});el.appendChild(list)}}
 $('#ajSearchRun').addEventListener('click',async()=>{const q=$('#ajSearchQuery').value.trim();if(!q)return;$('#ajSearchStatus').textContent='Searching…';$('#ajSearchOutput').hidden=true;try{const data=await chatCall(q,{webSearch:true});showAnswer($('#ajSearchOutput'),data.answer,data.sources||[]);$('#ajSearchStatus').textContent=(data.sources||[]).length?'Answer and sources ready.':'Answer ready; the provider did not return source links for this query.'}catch(e){$('#ajSearchStatus').textContent=e.message}});
 $('#ajAnalyzeFiles').addEventListener('click',async()=>{const q=$('#ajFileQuestion').value.trim()||'Please analyze the attached file(s), summarize their contents, and explain key details clearly.';$('#ajFileStatus').textContent='Reading and analyzing…';$('#ajFileOutput').hidden=true;try{const attachments=await readFiles();const data=await chatCall(q,{attachments});showAnswer($('#ajFileOutput'),data.answer);$('#ajFileStatus').textContent='Analysis complete.'}catch(e){$('#ajFileStatus').textContent=e.message}});
 $('#ajGenerateImage').addEventListener('click',async()=>{const prompt=$('#ajImagePrompt').value.trim();if(!prompt){$('#ajImageStatus').textContent='Please describe the image first.';return}$('#ajImageStatus').textContent='Generating image… this may take a little while.';$('#ajImageOutput').hidden=true;try{const res=await fetch('/api/generate-image',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,style:$('#ajImageStyle').value,ratio:$('#ajImageRatio').value})});const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Image generation failed.');const out=$('#ajImageOutput');out.hidden=false;out.textContent=data.text||'Your image is ready.';if(data.image){const img=document.createElement('img');img.className='ajtools-image';img.alt='AI-generated image';img.src=data.image;out.appendChild(img);const a=document.createElement('a');a.href=data.image;a.download='amoh-justice-ai-image.png';a.textContent='Open generated image';a.style.display='inline-block';a.style.marginTop='12px';out.appendChild(a)}$('#ajImageStatus').textContent='Image generation finished.'}catch(e){$('#ajImageStatus').textContent=e.message}});
 $('#ajMemorySave').addEventListener('click',()=>{const v=$('#ajMemoryText').value.trim().slice(0,3000);try{if(v)localStorage.setItem(memoryKey,v);else localStorage.removeItem(memoryKey);$('#ajMemoryStatus').textContent=v?'Memory saved on this device.':'Memory cleared.';renderMemory()}catch(e){$('#ajMemoryStatus').textContent='Could not save memory in this browser.'}});
 $('#ajMemoryClear').addEventListener('click',()=>{try{localStorage.removeItem(memoryKey);$('#ajMemoryStatus').textContent='Memory cleared.';renderMemory()}catch(e){$('#ajMemoryStatus').textContent='Could not clear memory.'}});
 const quickPrompts={writing:'Act as my writing helper. Ask what I need to write if not clear, then help me create a polished draft.',coding:'Act as a patient coding assistant. Help me understand, write, or debug code step by step. Ask for the code or error if needed.',study:'Act as my study coach. Explain the topic in simple steps, give an example, then quiz me briefly.',translate:'Help me translate text. Ask me for the text and target language if I have not provided them.',creative:'Help me create a detailed image-generation prompt. Ask about subject, style, colors, mood, and format if needed.',business:'Act as a practical business planner. Help with ideas, audience, costs, marketing, and a simple action plan.'};
 modal.querySelectorAll('[data-quick]').forEach(btn=>btn.addEventListener('click',()=>{const input=$('#chatInput');const form=$('#chatForm');if(!input||!form){return}input.value=quickPrompts[btn.dataset.quick];close();input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));}));
})();
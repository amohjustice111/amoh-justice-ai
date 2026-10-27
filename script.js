const nav=document.getElementById('nav');
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
document.getElementById('year').textContent=new Date().getFullYear();
const toast=document.getElementById('toast');let toastTimer;
function showToast(t){toast.textContent=t;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),4000)}
document.querySelectorAll('[data-service]').forEach(a=>a.addEventListener('click',()=>document.getElementById('serviceSelect').value=a.dataset.service));
document.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>showToast('Selected tutorial topic: '+b.dataset.topic+'. Add your lesson or video link here when ready.')));
document.getElementById('contactForm').addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('name').value.trim(),email=document.getElementById('email').value.trim(),service=document.getElementById('serviceSelect').value,message=document.getElementById('message').value.trim();const subject=encodeURIComponent('AMOH JUSTICE enquiry — '+service);const body=encodeURIComponent('Name: '+name+'\nEmail: '+email+'\nService: '+service+'\n\nProject details:\n'+message);window.location.href='mailto:amohjustice@example.com?subject='+subject+'&body='+body;});

// Live Justice AI chat. The browser calls our server route; the secret key stays on Vercel.
const chatMessages=document.getElementById('chatMessages');
const chatForm=document.getElementById('chatForm');
const chatInput=document.getElementById('chatInput');
const sendButton=chatForm.querySelector('button[type="submit"]');
window.amohJusticeChatHistory=window.amohJusticeChatHistory||[];const chatHistory=window.amohJusticeChatHistory;
function addBubble(text,who){const el=document.createElement('div');el.className='bubble '+who;el.textContent=text;chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight;return el;}
function setChatBusy(busy){sendButton.disabled=busy;sendButton.textContent=busy?'Thinking…':'Send ↗';chatInput.disabled=busy;}
let activeRequestController=null,chatRequestId=0;
window.amohInterruptJusticeAnswer=()=>{chatRequestId++;if(activeRequestController){activeRequestController.abort();activeRequestController=null;}setChatBusy(false);};
async function askJustice(message){
  addBubble(message,'user');
  chatHistory.push({role:'user',text:message});
  const pending=addBubble('Justice AI is thinking…','bot');
  const requestId=++chatRequestId,controller=new AbortController();activeRequestController=controller;setChatBusy(true);
  try{
    const voiceStream=Boolean(window.amohVoiceConversationActive&&window.amohQueueVoiceText);
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({message,history:chatHistory.slice(-10,-1),stream:voiceStream})});
    if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Justice AI could not answer. Please try again.');}
    let answer='';
    if(voiceStream&&response.body&&response.body.getReader){
      const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',sentenceBuffer='';
      while(true){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true});const lines=buffer.split(/\\r?\\n/);buffer=lines.pop()||'';for(const line of lines){if(!line.trim())continue;const item=JSON.parse(line);if(item.error)throw new Error(item.error);if(!item.text)continue;answer+=item.text;sentenceBuffer+=item.text;pending.textContent=answer;chatMessages.scrollTop=chatMessages.scrollHeight;const matches=sentenceBuffer.match(/[\\s\\S]*?[.!?](?:\\s+|$)/g)||[];if(matches.length){for(const sentence of matches)if(sentence.trim())window.amohQueueVoiceText(sentence.trim());sentenceBuffer=sentenceBuffer.slice(matches.join('').length);}}}
      if(buffer.trim()){const item=JSON.parse(buffer);if(item.text){answer+=item.text;sentenceBuffer+=item.text;}}
      if(sentenceBuffer.trim())window.amohQueueVoiceText(sentenceBuffer.trim());
      if(!answer.trim())throw new Error('Justice AI returned an empty answer. Please try again.');
      window.dispatchEvent(new CustomEvent('amoh:justice-answer',{detail:{answer,streamed:true}}));
    }else{
      const data=await response.json().catch(()=>({}));answer=data.answer||'';if(!answer)throw new Error(data.error||'Justice AI returned an empty answer.');pending.textContent=answer;window.dispatchEvent(new CustomEvent('amoh:justice-answer',{detail:{answer}}));if(document.getElementById('voiceReplies')?.checked&&window.amohSpeakResponse&&!window.amohVoiceConversationActive)window.amohSpeakResponse(answer);
    }
    chatHistory.push({role:'model',text:answer});if(chatHistory.length>12)chatHistory.splice(0,chatHistory.length-12);
  }catch(error){if(error.name==='AbortError')return;pending.textContent='Sorry, I could not answer just now. '+(error.message||'Please try again later.');window.dispatchEvent(new CustomEvent('amoh:justice-answer',{detail:{answer:pending.textContent}}));}
  finally{if(requestId===chatRequestId){activeRequestController=null;setChatBusy(false);chatInput.focus();}chatMessages.scrollTop=chatMessages.scrollHeight;}
}
chatForm.addEventListener('submit',e=>{e.preventDefault();const message=chatInput.value.trim();if(!message||sendButton.disabled)return;chatInput.value='';askJustice(message);});
document.querySelectorAll('[data-question]').forEach(btn=>btn.addEventListener('click',()=>{if(!sendButton.disabled)askJustice(btn.dataset.question);}));
let installPrompt;const installButton=document.getElementById('installApp');if(installButton){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});installButton.addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=null;if(choice&&choice.outcome==='accepted')showToast('AMOH JUSTICE is being installed.');return;}showToast('If no install window appears, your browser may not support one-click installation. In Chrome or Edge, open the menu ⋮ and choose Install AMOH JUSTICE AI.');});window.addEventListener('appinstalled',()=>{installButton.textContent='App Installed ✓';installButton.disabled=true;showToast('AMOH JUSTICE has been installed.');});}

/* Local conversation history: restores the recent chat in this browser. */
(()=>{const KEY='amohJusticeAIChatHistoryV1';const box=document.getElementById('chatMessages');if(!box)return;try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(saved.length&&!box.children.length){saved.slice(-40).forEach(m=>{const el=document.createElement('div');el.className='message '+(m.role==='user'?'user':'assistant');el.textContent=m.text;box.appendChild(el);});}}catch(e){}const observer=new MutationObserver(()=>{try{const messages=[...box.children].map(el=>({role:el.classList.contains('user')?'user':'assistant',text:el.innerText||el.textContent||''})).filter(m=>m.text.trim()).slice(-40);localStorage.setItem(KEY,JSON.stringify(messages));}catch(e){}});observer.observe(box,{childList:true,subtree:true,characterData:true});})();


/* Subtle pointer-driven 3D hero tilt; disabled for touch and reduced-motion users. */
(()=>{const card=document.querySelector('.hero-image');if(!card||window.matchMedia('(prefers-reduced-motion: reduce)').matches||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.transform='perspective(1100px) rotateY('+(x*7).toFixed(2)+'deg) rotateX('+(-y*5).toFixed(2)+'deg) translateY(-2px)'});card.addEventListener('pointerleave',()=>{card.style.transform='perspective(1100px) rotateY(0deg) rotateX(0deg) translateY(0)'});})();

/* Searchable homepage navigation and accessible mobile menu */
(()=> {
const nav=document.getElementById('nav'),menu=document.getElementById('menu'),overlay=document.getElementById('amohCommandOverlay'),openBtn=document.getElementById('amohCommandOpen'),closeBtn=document.getElementById('amohCommandClose'),input=document.getElementById('amohCommandInput'),results=document.getElementById('amohCommandResults');
if(!nav||!menu||!overlay||!openBtn||!input||!results)return;
const items=[...nav.querySelectorAll('a')].map(a=>({title:a.textContent.trim(),href:a.getAttribute('href'),desc:a.classList.contains('nav-cta')?'Start a project':'Open page'}));
function render(){const q=input.value.trim().toLowerCase();const filtered=items.filter(x=>(x.title+' '+x.href).toLowerCase().includes(q));results.replaceChildren();const label=document.createElement('div');label.className='amoh-command-label';label.id='amohCommandTitle';label.textContent=q?'SEARCH RESULTS':'QUICK NAVIGATION';results.appendChild(label);if(!filtered.length){const empty=document.createElement('div');empty.className='amoh-command-empty';empty.textContent='No results. Try poster, AI, gallery, or contact.';results.appendChild(empty);return}filtered.forEach(item=>{const a=document.createElement('a');a.className='amoh-command-link';a.href=item.href;const icon=document.createElement('span');icon.className='amoh-command-icon';icon.textContent='↗';const copy=document.createElement('span');copy.className='amoh-command-copy';const title=document.createElement('b');title.textContent=item.title;const desc=document.createElement('small');desc.textContent=item.desc;copy.append(title,desc);a.append(icon,copy);a.addEventListener('click',()=>{close();nav.classList.remove('open');menu.setAttribute('aria-expanded','false')});results.appendChild(a)})}
function open(){overlay.classList.add('is-open');overlay.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';input.value='';render();input.focus()}
function close(){overlay.classList.remove('is-open');overlay.setAttribute('aria-hidden','true');document.body.style.overflow='';openBtn.focus()}
openBtn.addEventListener('click',open);closeBtn.addEventListener('click',close);input.addEventListener('input',render);overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
menu.addEventListener('click',()=>{const opened=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(opened))});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open()}else if(e.key==='Escape'&&overlay.classList.contains('is-open'))close()});
render();
})();

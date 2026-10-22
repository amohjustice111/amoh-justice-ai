const nav=document.getElementById('nav');
document.getElementById('menu').addEventListener('click',()=>nav.classList.toggle('open'));
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
const chatHistory=[];
function addBubble(text,who){const el=document.createElement('div');el.className='bubble '+who;el.textContent=text;chatMessages.appendChild(el);chatMessages.scrollTop=chatMessages.scrollHeight;return el;}
function setChatBusy(busy){sendButton.disabled=busy;sendButton.textContent=busy?'Thinking…':'Send ↗';chatInput.disabled=busy;}
async function askJustice(message){
  addBubble(message,'user');
  chatHistory.push({role:'user',text:message});
  const pending=addBubble('Justice AI is thinking…','bot');
  setChatBusy(true);
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message,history:chatHistory.slice(-10,-1)})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new Error(data.error||'Justice AI could not answer. Please try again.');
    pending.textContent=data.answer;
    chatHistory.push({role:'model',text:data.answer});
    if(chatHistory.length>12)chatHistory.splice(0,chatHistory.length-12);
  }catch(error){pending.textContent='Sorry, I could not answer just now. '+(error.message||'Please try again later.');}
  finally{setChatBusy(false);chatInput.focus();chatMessages.scrollTop=chatMessages.scrollHeight;}
}
chatForm.addEventListener('submit',e=>{e.preventDefault();const message=chatInput.value.trim();if(!message||sendButton.disabled)return;chatInput.value='';askJustice(message);});
document.querySelectorAll('[data-question]').forEach(btn=>btn.addEventListener('click',()=>{if(!sendButton.disabled)askJustice(btn.dataset.question);}));
let installPrompt;const installButton=document.getElementById('installApp');if(installButton){window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});installButton.addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();const choice=await installPrompt.userChoice;installPrompt=null;if(choice&&choice.outcome==='accepted')showToast('AMOH JUSTICE is being installed.');return;}showToast('If no install window appears, your browser may not support one-click installation. In Chrome or Edge, open the menu ⋮ and choose Install AMOH JUSTICE AI.');});window.addEventListener('appinstalled',()=>{installButton.textContent='App Installed ✓';installButton.disabled=true;showToast('AMOH JUSTICE has been installed.');});}

/* Local conversation history: restores the recent chat in this browser. */
(()=>{const KEY='amohJusticeAIChatHistoryV1';const box=document.getElementById('chatMessages');if(!box)return;try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');if(saved.length&&!box.children.length){saved.slice(-40).forEach(m=>{const el=document.createElement('div');el.className='message '+(m.role==='user'?'user':'assistant');el.textContent=m.text;box.appendChild(el);});}}catch(e){}const observer=new MutationObserver(()=>{try{const messages=[...box.children].map(el=>({role:el.classList.contains('user')?'user':'assistant',text:el.innerText||el.textContent||''})).filter(m=>m.text.trim()).slice(-40);localStorage.setItem(KEY,JSON.stringify(messages));}catch(e){}});observer.observe(box,{childList:true,subtree:true,characterData:true});})();


/* Subtle pointer-driven 3D hero tilt; disabled for touch and reduced-motion users. */
(()=>{const card=document.querySelector('.hero-image');if(!card||window.matchMedia('(prefers-reduced-motion: reduce)').matches||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.transform='perspective(1100px) rotateY('+(x*7).toFixed(2)+'deg) rotateX('+(-y*5).toFixed(2)+'deg) translateY(-2px)'});card.addEventListener('pointerleave',()=>{card.style.transform='perspective(1100px) rotateY(0deg) rotateX(0deg) translateY(0)'});})();
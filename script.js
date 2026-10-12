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
let installPrompt;const installButton=document.getElementById('installApp');window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;installButton.hidden=false;});installButton.addEventListener('click',async()=>{if(!installPrompt){showToast('If install is unavailable, open your browser menu and choose Install app or Add to Home Screen.');return;}installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;installButton.hidden=true;});window.addEventListener('appinstalled',()=>{installButton.hidden=true;showToast('AMOH JUSTICE has been installed.');});

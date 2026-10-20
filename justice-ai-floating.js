/* Adds a floating Justice AI button and opens the existing chat full-screen. */
(()=>{function init(){
 const chat=document.querySelector('#justice-ai .chat-shell'); if(!chat||document.getElementById('justiceAiFloat'))return;
 const originalParent=chat.parentNode, originalNext=chat.nextSibling;
 const button=document.createElement('button');button.id='justiceAiFloat';button.type='button';button.textContent='✦ Chat with Justice AI';button.setAttribute('aria-label','Open Justice AI chat');
 const overlay=document.createElement('div');overlay.id='justiceAiOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Justice AI full-screen chat');
 const close=document.createElement('button');close.className='justice-ai-close';close.type='button';close.innerHTML='&times;';close.setAttribute('aria-label','Close chat');
 overlay.appendChild(close);document.body.append(button,overlay);
 function open(){overlay.classList.add('is-open');overlay.appendChild(chat);document.body.style.overflow='hidden';close.focus();}
 function shut(){overlay.classList.remove('is-open');if(originalNext&&originalNext.parentNode===originalParent)originalParent.insertBefore(chat,originalNext);else originalParent.appendChild(chat);document.body.style.overflow='';button.focus();}
 button.addEventListener('click',open);close.addEventListener('click',shut);overlay.addEventListener('click',e=>{if(e.target===overlay)shut()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open'))shut()});
 } if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();
/* Full-screen Justice AI launcher with one persistent chat instance. */
(()=>{function init(){
 const chat=document.querySelector('#justice-ai .chat-shell'); if(!chat||document.getElementById('justiceAiFloat'))return;
 const section=chat.closest('#justice-ai');
 const button=document.createElement('button');button.id='justiceAiFloat';button.type='button';button.textContent='✦ Chat with Justice AI';button.setAttribute('aria-label','Open Justice AI chat');
 const overlay=document.createElement('div');overlay.id='justiceAiOverlay';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Justice AI full-screen chat');
 const close=document.createElement('button');close.className='justice-ai-close';close.type='button';close.innerHTML='&times;';close.setAttribute('aria-label','Close chat');
 overlay.appendChild(close);overlay.appendChild(chat);document.body.append(button,overlay);if(section)section.remove();document.getElementById('justice-ai-jumping-person')?.remove();
 function open(){overlay.classList.add('is-open');document.body.style.overflow='hidden';close.focus();}
 function shut(){overlay.classList.remove('is-open');window.amohJusticeHistoryClose?.();document.body.style.overflow='';button.focus();}
 button.addEventListener('click',open);close.addEventListener('click',shut);overlay.addEventListener('click',e=>{if(e.target===overlay)shut()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.classList.contains('is-open')&&!document.getElementById('justiceHistoryPanel')?.classList.contains('is-open'))shut()});
 }if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();})();

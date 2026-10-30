/* AMOH JUSTICE AI — dashboard navigation, search, recent work and responsive shortcuts */
(()=>{'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const nav=$('.sidebar .nav[aria-label="Main dashboard navigation"]');
if(nav){
 const extras=[['Poster Creator','poster.html','▧'],['Video Editor','editor.html','▶'],['Lyrics Video Maker','lyrics-video.html','♫'],['Portfolio Gallery','gallery.html','▤']];
 extras.forEach(([label,url,icon])=>{if($$('a',nav).some(a=>a.getAttribute('href')===url))return;const a=document.createElement('a');a.className='dash-extra-link';a.href=url;a.dataset.ajNavLabel=label.toLowerCase();a.textContent=icon+'  '+label;nav.appendChild(a)});
}
const top=$('.topbar .top-actions');
if(top&&!$('#ajDashboardSearch')){const wrap=document.createElement('label');wrap.className='aj-dashboard-tools';wrap.innerHTML='<input id="ajDashboardSearch" class="aj-dashboard-search" type="search" placeholder="Find a tool…" aria-label="Search dashboard tools">';top.prepend(wrap)}
const search=$('#ajDashboardSearch');
if(search){search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();$$('.sidebar .nav button,.sidebar .nav a').forEach(item=>{const text=(item.textContent+' '+(item.getAttribute('href')||'')).toLowerCase();item.classList.toggle('aj-nav-hidden',!!q&&!text.includes(q))});});search.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const first=$$('.sidebar .nav button:not(.aj-nav-hidden),.sidebar .nav a:not(.aj-nav-hidden)')[0];if(first)first.click()})}
const overview=$('#screen-overview');
if(overview&&!$('#ajRecentProjects')){
 const panel=document.createElement('section');panel.className='aj-project-panel';panel.id='ajRecentProjects';
 panel.innerHTML='<div class="aj-project-head"><div><h2>Recently saved projects</h2><p>Your latest browser and AI Studio saves on this device</p></div><a href="gallery.html" style="color:#86efac;font-size:10px;text-decoration:none">Open full gallery ↗</a></div><div class="aj-project-grid" id="ajRecentProjectGrid"></div>';
 const anchor=$('.dash-bottom-grid',overview);if(anchor)anchor.after(panel);else overview.appendChild(panel);
}
function refreshProjects(){
 const root=$('#ajRecentProjectGrid');if(!root)return;
 let items=[];try{items=JSON.parse(localStorage.getItem('amohJusticeV2Projects')||'[]')}catch(_){}
 root.replaceChildren();
 if(!items.length){const p=document.createElement('p');p.className='aj-project-empty';p.textContent='No projects saved on this device yet. Create a prompt in AI Studio or save a project in the Portfolio Gallery. Your account-synced projects remain available through the account workspace.';root.append(p);return}
 items.slice(0,6).forEach(item=>{const card=document.createElement('article');card.className='aj-project-card';const title=document.createElement('b');title.textContent=item.title||'Untitled project';const meta=document.createElement('small');meta.textContent=(item.category||'Project')+' · '+(item.savedAt?new Date(item.savedAt).toLocaleDateString():'Saved');const link=document.createElement('a');link.href='gallery.html';link.textContent='View in gallery →';card.append(title,meta,link);root.append(card)});
}
refreshProjects();window.addEventListener('storage',e=>{if(e.key==='amohJusticeV2Projects')refreshProjects()});window.addEventListener('focus',refreshProjects);
const sidebar=$('#sidebar'),toggle=$('#menuToggle');if(nav&&sidebar){nav.addEventListener('click',e=>{if(e.target.closest('a')){sidebar.classList.remove('open');toggle?.setAttribute('aria-expanded','false')}})}
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduced){$$('.metric,.dash-panel,.card').forEach((el,i)=>{el.style.animationDelay=(Math.min(i,8)*35)+'ms';el.classList.add('aj-dashboard-enter')})}
})();
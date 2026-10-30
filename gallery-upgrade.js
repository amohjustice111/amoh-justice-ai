/* AMOH JUSTICE AI — searchable gallery and clear browser-vs-cloud messaging */
(()=>{'use strict';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const grid=$('#galleryGrid'),saved=$('#gallerySavedProjects');
if(grid&&!$('#ajGallerySearch')){
 const toolbar=document.createElement('div');toolbar.className='aj-gallery-toolbar';
 toolbar.innerHTML='<input class="aj-gallery-search" id="ajGallerySearch" type="search" placeholder="Search inspiration by title or category…" aria-label="Search gallery ideas"><span class="aj-gallery-count" id="ajGalleryCount"></span>';
 grid.before(toolbar);
}
const search=$('#ajGallerySearch'),count=$('#ajGalleryCount');
function filter(){const q=(search?.value||'').trim().toLowerCase();let n=0;$$('#galleryGrid .v2-art').forEach(card=>{const text=card.textContent.toLowerCase();const visible=!q||text.includes(q);card.classList.toggle('v2-hidden',!visible);if(visible)n++});if(count)count.textContent=n+' inspiration '+(n===1?'idea':'ideas')}
search?.addEventListener('input',filter);filter();
if(saved&&!$('#ajSavedSearch')){
 const tools=document.createElement('div');tools.className='aj-gallery-library-tools';tools.innerHTML='<input id="ajSavedSearch" type="search" placeholder="Search your saved projects…" aria-label="Search saved projects"><span class="aj-gallery-count" id="ajSavedCount"></span>';saved.before(tools);
}
const savedSearch=$('#ajSavedSearch'),savedCount=$('#ajSavedCount');
function filterSaved(){const q=(savedSearch?.value||'').trim().toLowerCase();const cards=$$('.v2-art',saved||document);let n=0;cards.forEach(card=>{const visible=!q||card.textContent.toLowerCase().includes(q);card.classList.toggle('v2-hidden',!visible);if(visible)n++});if(savedCount)savedCount.textContent=n+' saved '+(n===1?'project':'projects')}
if(saved){new MutationObserver(filterSaved).observe(saved,{childList:true,subtree:true});savedSearch?.addEventListener('input',filterSaved);filterSaved()}
const note=$('.v2-panel #projectForm')?.closest('.v2-panel')?.querySelector('.v2-note');if(note)note.textContent='Project details and optional preview links are saved in this browser. AI Studio prompt saves can also sync to your signed-in Supabase account when the existing project table is configured. Browser saves do not automatically sync between devices.';
})();
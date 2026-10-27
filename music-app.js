// Connects Music Studio to the authenticated first-party AMOH Music API.
(function(){
const $=id=>document.getElementById(id);
let mode='lyrics',lastBrief='',pollTimer=null;
function token(){
  try {
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(!k||!k.startsWith('sb-')||!k.includes('auth-token')) continue;
      const v=JSON.parse(localStorage.getItem(k)||'{}');
      if(v.access_token)return v.access_token;
      if(v.currentSession&&v.currentSession.access_token)return v.currentSession.access_token;
    }
  } catch(e) {}
  return null;
}
async function request(url,opts={}){
  const t=token();
  if(!t)throw Error('Please sign in to your AMOH JUSTICE AI account first, then reopen Music Studio.');
  const res=await fetch(url,{...opts,headers:{'Content-Type':'application/json','Authorization':'Bearer '+t,...(opts.headers||{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(data.error||'Music request failed. Please try again.');
  return data;
}
function busy(v){const b=$('generateSong');if(b){b.disabled=v;b.textContent=v?'♫ Working…':'♫ Generate real song';}}
async function tracks(items){
  const box=$('trackResults');if(!box)return;box.replaceChildren();
  if(!items||!items.length)return;
  const h=document.createElement('h3');h.textContent='Your generated tracks';h.style.fontSize='15px';box.append(h);
  for(const [i,t] of items.entries()){
    const card=document.createElement('div');card.className='side-card';
    const title=document.createElement('strong');title.textContent=t.title||('Song variation '+(i+1));card.append(title);
    const url=t.audioUrl||t.streamAudioUrl;
    if(url){
      const status=document.createElement('p');status.textContent='Preparing secure audio player…';card.append(status);
      const audio=document.createElement('audio');audio.controls=true;audio.preload='none';audio.style.width='100%';audio.style.margin='8px 0';
      const link=document.createElement('a');link.textContent='Download song ↗';link.style.color='var(--cyan)';link.style.display='inline-block';link.style.marginTop='8px';link.download='amoh-justice-ai-song.mp3';
      card.append(audio,link);box.append(card);
      try{
        const response=await fetch(url,{headers:{Authorization:'Bearer '+token()}});
        if(!response.ok)throw Error('Could not load audio ('+response.status+').');
        const objectUrl=URL.createObjectURL(await response.blob());audio.src=objectUrl;link.href=objectUrl;status.textContent='Your song is ready to play or download.';
      }catch(err){status.textContent=err.message||'Could not load this song audio.';}
    }
    box.append(card);
  }
}
async function poll(id){
  try{
    const d=await request('/api/music?taskId='+encodeURIComponent(id),{method:'GET'});
    if(d.state==='success'&&d.tracks&&d.tracks.length){
      $('resultTitle').textContent='Your music is ready!';
      $('resultText').textContent='The AI music service returned '+d.tracks.length+' track variation(s). Play or open the audio below.';
      tracks(d.tracks);busy(false);return;
    }
    if(d.state==='fail')throw Error(d.error||'Music generation failed. Please try again.');
    $('resultText').textContent='Your song is being composed… '+(d.progress!=null?'Progress: '+d.progress+'%':'Please keep this page open.');
    pollTimer=setTimeout(()=>poll(id),5000);
  }catch(e){$('resultTitle').textContent='Could not finish the song';$('resultText').textContent=e.message;busy(false);}
}
function init(){
  const form=$('musicForm');if(!form||!$('generateSong'))return;
  const lm=$('lyricsMode'),im=$('ideaMode');
  if(lm)lm.addEventListener('click',()=>mode='lyrics');
  if(im)im.addEventListener('click',()=>mode='idea');
  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const prompt=$('prompt').value.trim();if(!prompt)return;
    const title=$('songTitle').value.trim().slice(0,80)||'AMOH JUSTICE AI Song';
    const vocals=$('vocals').value;
    const instrumental=vocals==='Instrumental only';
    const style=[$('genre').value,$('mood').value,$('language').value+' vocals',vocals,$('instruments').value.trim()].filter(Boolean).join(', ');
    if(!window.confirm('Generate this song with the AMOH JUSTICE AI Music Engine? This does not use KIE credits. The model server must be configured.'))return;
    if(pollTimer)clearTimeout(pollTimer);
    $('result').classList.add('show');$('trackResults').replaceChildren();
    $('resultTitle').textContent='Starting your song…';$('resultText').textContent='Contacting your AMOH Music Engine.';busy(true);
    try{
      const d=await request('/api/music',{method:'POST',body:JSON.stringify({title,prompt,style,mode:mode==='idea'?'idea':'lyrics',instrumental,language:$('language').value,vocalGender:vocals==='Male lead vocal'?'m':vocals==='Female lead vocal'?'f':undefined})});
      $('resultTitle').textContent='Song generation started';$('resultText').textContent='Your song is being composed by the AMOH Music Engine. This can take a few minutes.';
      poll(d.taskId);
    }catch(err){$('resultTitle').textContent='Could not start music generation';$('resultText').textContent=err.message;busy(false);}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
/* Native speech controls and hands-free turn-taking for Justice AI. */
(()=>{
 const input=document.getElementById('chatInput'),form=document.getElementById('chatForm'),mic=document.getElementById('voiceInput'),modeBtn=document.getElementById('amohVoiceLauncher'),replies=document.getElementById('voiceReplies'),status=document.getElementById('voiceStatus'),avatarPanel=document.getElementById('amohVoiceAvatarPanel'),avatarStatus=document.getElementById('amohVoiceAvatarStatus'),avatar=document.getElementById('amohVoiceAvatar'),avatarClose=document.getElementById('amohVoiceAvatarClose');
 if(!input||!form||!mic||!status)return;
 // Keep V visible on every device: first in the message row, before Speak and Send.
 function placeVoiceLauncher(){
  if(!modeBtn)return;
  if(modeBtn.parentNode!==form||modeBtn.nextElementSibling!==mic){
   form.insertBefore(modeBtn,mic);
  }
 }
 placeVoiceLauncher();
 const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 const settingsKey='amohJusticeVoicePrefsV1';
 const defaultPrefs={voiceURI:'',gender:'all',relationship:'calm',language:'en-US',voiceStyle:'standard',rate:0.9,pitch:1};
 let voicePrefs={...defaultPrefs};
 try{const savedPrefs=JSON.parse(localStorage.getItem(settingsKey)||'{}');voicePrefs={...defaultPrefs,...savedPrefs,gender:'all',relationship:'calm',language:'en-US',voiceURI:'',voiceStyle:'standard',rate:0.9,pitch:1};savePrefs()}catch(e){voicePrefs.gender='all'}
 const relationships={
  friend:{label:'Friendly friend',instruction:'Speak like a kind, loyal friend: warm, natural, encouraging, conversational, and never overly formal.'},
  brother:{label:'Supportive brother',instruction:'Speak like a caring, supportive brother: friendly, honest, encouraging, lightly playful when appropriate, and respectful.'},
  sister:{label:'Supportive sister',instruction:'Speak like a caring, supportive sister: warm, thoughtful, encouraging, approachable, and respectful.'},
  wife:{label:'Loving wife style',instruction:'Use a gentle, affectionate conversational style someone might associate with a loving wife: calm, caring, reassuring, attentive, and warmly playful when appropriate. Keep it respectful and grounded; do not claim to be the user’s actual spouse or encourage emotional dependence.'},
  father:{label:'Wise father',instruction:'Speak with the patience and reassurance of a caring father: calm, grounded, protective without being controlling, and explain things clearly.'},
  mother:{label:'Caring mother',instruction:'Speak with the warmth and patience of a caring mother: gentle, reassuring, thoughtful, and clear without being patronizing.'},
  mentor:{label:'Helpful mentor',instruction:'Speak like an encouraging mentor: patient, practical, positive, and focused on helping the user grow.'},
  playful:{label:'Playful companion',instruction:'Speak like a cheerful companion: upbeat, natural, and lightly humorous when suitable, while still being accurate and respectful.'},
  calm:{label:'Calm professional',instruction:'Use a calm, composed, friendly professional tone: clear, respectful, reassuring, and concise.'}
 };
 const languageOptions=[['en-US','English']];
 function savePrefs(){try{localStorage.setItem(settingsKey,JSON.stringify(voicePrefs))}catch(e){}}
 function languageBase(code){return String(code||'en-US').toLowerCase().split('-')[0]}
 function selectedLanguageCode(){voicePrefs.language='en-US';return 'en-US'}
 function applyVoiceStyle(utterance){if(voicePrefs.voiceStyle==='santa'){utterance.pitch=Math.min(Number(voicePrefs.pitch)||0.82,0.85);utterance.rate=Math.min(Number(voicePrefs.rate)||0.9,0.95)}}
 function getVoices(){return window.speechSynthesis?.getVoices?.()||[]}
 function voiceGender(v){const name=((v.name||'')+' '+(v.voiceURI||'')).toLowerCase();if(/female|woman|girl|zira|samantha|victoria|karen|moira|tessa|susan|hazel|aria|jenny|libby|sonia|natasha|google uk english female|google us english female|microsoft.*(jenny|aria|zira)/.test(name))return 'female';if(/(^|[\s_-])(male|man|boy)([\s_-]|$)|david|mark|daniel|james|george|guy|ryan|liam|thomas|alex|fred|oliver|aaron|google uk english male|google us english male|microsoft.*(guy|davis|tony|jason)/.test(name))return 'male';return 'unknown'}
 function refreshVoiceOptions(){
  const select=document.getElementById('amohVoiceChoice');if(!select)return;
  const voices=getVoices(),previous=voicePrefs.voiceURI;select.replaceChildren();
  const requested=voices.filter(v=>voicePrefs.gender==='all'||voiceGender(v)===voicePrefs.gender);
  const choices=requested.slice().sort((a,b)=>{const lang=languageBase(selectedLanguageCode()),am=languageBase(a.lang)===lang?0:1,bm=languageBase(b.lang)===lang?0:1;const preferred=n=>/google.*(us|uk).*english|microsoft.*(aria|jenny|guy)|samantha|ava|allison|daniel|oliver/i.test(n)?0:1;return am-bm||preferred(a.name)-preferred(b.name)||a.name.localeCompare(b.name)});
  if(!choices.length){voicePrefs.voiceURI='';savePrefs();const opt=document.createElement('option');opt.value='';opt.textContent='Use the browser default voice';select.appendChild(opt);select.dataset.voiceFallback='true';const hint=document.getElementById('amohVoiceAvailability');if(hint)hint.textContent='No selectable system voices were found. Justice AI will use your browser’s default spoken voice if available.';return}
  select.dataset.voiceFallback='false';
  choices.forEach(v=>{const opt=document.createElement('option');opt.value=v.voiceURI;opt.textContent=v.name+' · '+(v.lang||'voice');select.appendChild(opt)});
  if(previous&&choices.some(v=>v.voiceURI===previous))select.value=previous;else{select.selectedIndex=0;voicePrefs.voiceURI=select.value;savePrefs()}
  const hint=document.getElementById('amohVoiceAvailability');if(hint)hint.textContent='Calm default voice selected. Available voices vary by browser and device; choose another voice here if you prefer.';
 }
 function openVoiceSettings(){
  if(!avatarPanel)return;
  avatarPanel.classList.add('amoh-settings-only');avatarPanel.classList.add('is-active');avatarPanel.setAttribute('aria-hidden','false');
  const settings=document.getElementById('amohVoiceSettings');if(settings)settings.hidden=false;
  refreshVoiceOptions();
 }
 function closeVoiceSettings(){
  if(!avatarPanel)return;
  avatarPanel.classList.remove('amoh-settings-only');
  if(handsFree){avatarPanel.classList.add('is-active');avatarPanel.setAttribute('aria-hidden','false')}
  else hideAvatar();
  const settings=document.getElementById('amohVoiceSettings');if(settings)settings.hidden=true;
 }
 function installVoiceSettings(){
  if(!avatarPanel||document.getElementById('amohVoiceSettings'))return;
  const card=document.getElementById('amohVoiceAvatarCard');if(!card)return;
  const style=document.createElement('style');style.textContent=`

  #amohVoiceAvatarPanel .amoh-voice-orb-wrap{position:relative;isolation:isolate;width:clamp(150px,45vw,220px);height:clamp(150px,45vw,220px);margin:8px auto 22px;display:grid;place-items:center;border-radius:50%}
  #amohVoiceAvatarPanel .amoh-voice-orb-wrap:before,#amohVoiceAvatarPanel .amoh-voice-orb-wrap:after{content:"";position:absolute;inset:-12px;border:1.5px solid rgba(74,222,128,.8);border-radius:50%;animation:amohVoiceOrbWave 2.2s ease-out infinite;pointer-events:none}
  #amohVoiceAvatarPanel .amoh-voice-orb-wrap:after{animation-delay:1.1s}
  #amohVoiceAvatarPanel #amohVoiceAvatar{position:relative;z-index:1;width:100%;height:100%;margin:0;border:3px solid #a7f3d0;box-shadow:0 0 0 7px #22c55e20,0 0 35px #22c55e70;animation:amohVoiceOrbGlow 2s ease-in-out infinite}
  @keyframes amohVoiceOrbWave{0%{transform:scale(.86);opacity:.95}100%{transform:scale(1.38);opacity:0}}
  @keyframes amohVoiceOrbGlow{0%,100%{box-shadow:0 0 0 7px #22c55e20,0 0 30px #22c55e55}50%{box-shadow:0 0 0 12px #22c55e12,0 0 52px #22c55e99}}
  #amohVoiceAvatarClose{min-width:150px;background:linear-gradient(120deg,#7f1d1d,#b91c1c);border-color:#fca5a5}
  @media(prefers-reduced-motion:reduce){#amohVoiceAvatarPanel .amoh-voice-orb-wrap:before,#amohVoiceAvatarPanel .amoh-voice-orb-wrap:after,#amohVoiceAvatarPanel #amohVoiceAvatar{animation:none!important}}
  #amohVoiceSettings{margin-top:14px;text-align:left;border-top:1px solid #86efac35;padding-top:14px}
  #amohVoiceSettings[hidden]{display:none!important}
  #amohVoiceSettings h3{font-size:17px;color:#bbf7d0;margin:0 0 5px}
  #amohVoiceSettings p{font-size:12px;line-height:1.5;color:#b8d4c0;margin:0 0 12px}
  #amohVoiceSettings label{display:block;font-size:12px;color:#dff7e5;font-weight:700;margin:12px 0 6px}
  #amohVoiceSettings select,#amohVoiceSettings input[type=range]{box-sizing:border-box;width:100%;min-height:42px;border:1px solid #4ade8055;border-radius:12px;background:#06130b;color:#f0fff4;padding:9px;font:inherit}
  #amohVoiceSettings input[type=range]{padding:0;accent-color:#4ade80;min-height:28px}
  #amohVoiceSettings .amoh-voice-setting-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #amohVoiceSettings .amoh-setting-actions{display:flex;gap:8px;margin-top:14px}
  #amohVoiceSettings button{flex:1;min-height:42px;border-radius:999px;border:1px solid #4ade80;background:#14532d;color:white;font-weight:800;padding:9px;cursor:pointer}
  #amohVoiceSettings button.secondary{background:#07130b;border-color:#86efac55}
  #amohVoiceAvatarPanel.amoh-settings-only #amohVoiceAvatar,#amohVoiceAvatarPanel.amoh-settings-only #amohVoiceAvatarTitle,#amohVoiceAvatarPanel.amoh-settings-only #amohVoiceAvatarStatus,#amohVoiceAvatarPanel.amoh-settings-only #amohVoiceAvatarClose{display:none!important}
  #amohVoiceAvatarPanel.amoh-settings-only #amohVoiceAvatarCard{width:min(440px,100%);max-height:calc(100dvh - 30px);overflow:auto}
  /* Wake-word mode stays as a compact floating widget; the main chat remains a separate full-screen control. */
  #amohVoiceAvatarPanel{position:fixed!important;inset:auto 14px 86px auto!important;z-index:2147483002!important;width:min(270px,calc(100vw - 28px));padding:0!important;display:none;align-items:flex-end;justify-content:flex-end;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;pointer-events:none}
  #amohVoiceAvatarPanel.is-active{display:flex!important;pointer-events:none}
  #amohVoiceAvatarCard{pointer-events:auto;width:100%!important;padding:12px!important;border-radius:20px!important;box-shadow:0 12px 42px #000b,0 0 28px #16a34a22!important}
  #amohVoiceAvatarPanel .amoh-voice-orb-wrap{width:76px!important;height:76px!important;margin:0 auto 8px!important}
  #amohVoiceAvatarPanel .amoh-voice-orb-wrap:before,#amohVoiceAvatarPanel .amoh-voice-orb-wrap:after{inset:-6px!important}
  #amohVoiceAvatarPanel #amohVoiceAvatar{width:68px!important;height:68px!important;border-width:2px!important}
  #amohVoiceAvatarTitle{font-size:14px!important;margin:0 0 3px!important}
  #amohVoiceAvatarStatus{min-height:0!important;font-size:11px!important;line-height:1.35!important}
  #amohVoiceAvatarClose{min-width:0!important;margin-top:8px!important;padding:7px 12px!important;font-size:11px!important}
  #amohVoiceAvatarPanel.amoh-settings-only{inset:0!important;width:auto!important;padding:14px!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(1,8,4,.9)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;pointer-events:auto!important}
  #amohVoiceAvatarPanel.amoh-settings-only #amohVoiceAvatarCard{width:min(440px,100%)!important;max-height:calc(100dvh - 28px)!important;overflow:auto!important}
  @media(max-width:600px){#amohVoiceAvatarPanel{right:10px!important;bottom:82px!important;width:min(250px,calc(100vw - 20px))!important}}
  @media(prefers-reduced-motion:reduce){#amohVoiceAvatarPanel .amoh-voice-orb-wrap:before,#amohVoiceAvatarPanel .amoh-voice-orb-wrap:after{animation:none!important}}
  #amohVoiceSettings .amoh-voice-setting-row>div{min-width:0}
  @media(max-width:380px){#amohVoiceSettings .amoh-voice-setting-row{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  const box=document.createElement('section');box.id='amohVoiceSettings';box.hidden=true;box.innerHTML=`
   <h3>Make Justice AI feel like family</h3><p>Choose a voice and the friendly style you feel most comfortable with. Options depend on voices installed in your browser or device.</p>
   <label for="amohChatLanguage">Chat and spoken language</label><select id="amohChatLanguage">${languageOptions.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')}</select>
   <p>Justice AI will try to answer in your selected language. For Akan, it will use short, calm, friendly Twi or Fante wording and a slower speaking pace. Natural Akan pronunciation still depends on whether your browser or phone has an Akan-compatible speech voice.</p>
   <label for="amohVoiceStyle">Voice character</label><select id="amohVoiceStyle"><option value="standard">Natural voice</option><option value="santa">Santa Claus style — deep, warm voice effect</option></select>
   <label for="amohVoiceRelationship">Friendly personality</label><select id="amohVoiceRelationship">
    <option value="friend">Friend — natural and supportive</option><option value="brother">Brother — honest and encouraging</option><option value="sister">Sister — warm and thoughtful</option><option value="wife">Loving wife style — calm and affectionate</option><option value="father">Father — calm and wise</option><option value="mother">Mother — caring and reassuring</option><option value="mentor">Mentor — patient and motivating</option><option value="playful">Playful companion — cheerful</option><option value="calm">Calm professional — clear and gentle</option>
   </select>
   <div class="amoh-voice-setting-row"><div><label for="amohVoiceGender">Voice gender</label><select id="amohVoiceGender"><option value="all">Automatic — calmest available</option><option value="male">Male</option><option value="female">Female</option></select></div><div><label for="amohVoiceChoice">Installed voice</label><select id="amohVoiceChoice" aria-label="Choose a spoken voice"></select></div></div><p id="amohVoiceAvailability" role="status" aria-live="polite">A calm voice is selected automatically from the voices available on this device.</p>
   <label for="amohVoiceRate">Speaking speed (slower is calmer) <span id="amohVoiceRateValue">0.90×</span></label><input id="amohVoiceRate" type="range" min="0.75" max="1.25" step="0.05" value="0.9">
   <label for="amohVoicePitch">Voice pitch <span id="amohVoicePitchValue">1.00</span></label><input id="amohVoicePitch" type="range" min="0.7" max="1.3" step="0.05" value="1">
   <div class="amoh-setting-actions"><button id="amohVoiceTest" type="button">▶ Test voice</button><button id="amohVoiceSettingsClose" class="secondary" type="button">Save & close</button></div>`;
  card.insertBefore(box,document.getElementById('amohVoiceAvatarClose'));
  const rel=document.getElementById('amohVoiceRelationship'),gender=document.getElementById('amohVoiceGender'),rate=document.getElementById('amohVoiceRate'),pitch=document.getElementById('amohVoicePitch'),language=document.getElementById('amohChatLanguage'),styleChoice=document.getElementById('amohVoiceStyle');
  rel.value=voicePrefs.relationship;gender.value=voicePrefs.gender;if(Number(voicePrefs.rate)>0.95)voicePrefs.rate=0.92;rate.value=String(voicePrefs.rate);pitch.value=String(voicePrefs.pitch);language.value=voicePrefs.language;styleChoice.value=voicePrefs.voiceStyle;
  rel.addEventListener('change',()=>{voicePrefs.relationship=rel.value;savePrefs()});
  language.addEventListener('change',()=>{voicePrefs.language=language.value;const matching=getVoices().find(v=>languageBase(v.lang)===languageBase(language.value)&&(voicePrefs.gender==='all'||voiceGender(v)===voicePrefs.gender));if(matching)voicePrefs.voiceURI=matching.voiceURI;refreshVoiceOptions();savePrefs();if(rec)rec.lang=language.value});
  styleChoice.addEventListener('change',()=>{voicePrefs.voiceStyle=styleChoice.value;if(voicePrefs.voiceStyle==='santa'){voicePrefs.pitch=0.82;voicePrefs.rate=0.9;pitch.value='0.82';rate.value='0.9';document.getElementById('amohVoicePitchValue').textContent='0.82';document.getElementById('amohVoiceRateValue').textContent='0.90×'}savePrefs()});
  gender.addEventListener('change',()=>{voicePrefs.gender=gender.value;voicePrefs.voiceURI='';refreshVoiceOptions();savePrefs()});
  document.getElementById('amohVoiceChoice').addEventListener('change',e=>{voicePrefs.voiceURI=e.target.value;savePrefs()});
  rate.addEventListener('input',()=>{voicePrefs.rate=Number(rate.value);document.getElementById('amohVoiceRateValue').textContent=voicePrefs.rate.toFixed(2)+'×';savePrefs()});
  pitch.addEventListener('input',()=>{voicePrefs.pitch=Number(pitch.value);document.getElementById('amohVoicePitchValue').textContent=voicePrefs.pitch.toFixed(2);savePrefs()});
  document.getElementById('amohVoiceTest').addEventListener('click',()=>{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const testText='Hello, I am Justice AI. I am here for you. What would you like us to talk about today?';const u=new SpeechSynthesisUtterance(testText);applyVoice(u);window.speechSynthesis.speak(u)});
  document.getElementById('amohVoiceSettingsClose').addEventListener('click',closeVoiceSettings);
  refreshVoiceOptions();if(window.speechSynthesis)window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoiceOptions);
 }
 function applyVoice(utterance){
  const voices=getVoices();const lang=languageBase(selectedLanguageCode());const preferred=/google.*(us|uk).*english|microsoft.*(aria|jenny|guy)|samantha|ava|allison|daniel|oliver/i;const selected=voices.find(v=>languageBase(v.lang)===lang&&preferred.test(v.name))||voices.find(v=>languageBase(v.lang)===lang)||null;
  if(selected)utterance.voice=selected;utterance.rate=Number(voicePrefs.rate)||0.92;
  // Use the selected device voice with a relaxed default pace and neutral pitch.
  const requestedPitch=Number(voicePrefs.pitch)||1;utterance.pitch=Math.max(0.7,Math.min(requestedPitch,1.15));
  utterance.lang=selected&&languageBase(selected.lang)===languageBase(selectedLanguageCode())?selected.lang:selectedLanguageCode();
  // Akan sounds clearer when spoken gently and a little slower. Native pronunciation still depends on an installed Akan-capable speech voice.
  
  applyVoiceStyle(utterance);
 }
 function selectedRelationship(){return relationships[voicePrefs.relationship]||relationships.friend}
 window.amohJusticeVoicePreferences=()=>({relationship:voicePrefs.relationship,voiceGender:voicePrefs.gender,language:'en-US'});
 
 let rec=null,listening=false,transcript='',handsFree=false,waiting=false,stopped=false,wakeIndicator=null;
 let textEntryActive=false;
 function setVoiceIndicator(message,visible=true){if(!wakeIndicator){const style=document.createElement('style');style.id='amohVoiceBrainStyles';style.textContent='@keyframes amohBrainPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 5px #34d399)}50%{transform:scale(1.13);filter:drop-shadow(0 0 16px #10b981)}}@keyframes amohBrainRing{0%{transform:scale(.82);opacity:.85}100%{transform:scale(1.45);opacity:0}}@keyframes amohBrainThink{0%,100%{box-shadow:0 0 12px #10b98155, inset 0 0 12px #10b98122}50%{box-shadow:0 0 24px #10b981aa, inset 0 0 18px #10b98155}}#amohVoiceRecordingIndicator .amoh-brain-orb{position:relative;display:grid;place-items:center;width:38px;height:38px;flex:0 0 38px;border-radius:50%;border:1px solid #34d399;background:radial-gradient(circle at 35% 25%,#14532d,#031209 72%);animation:amohBrainThink 1.8s ease-in-out infinite}#amohVoiceRecordingIndicator .amoh-brain-orb:before{content:"";position:absolute;inset:-5px;border:1px solid #34d399;border-radius:50%;animation:amohBrainRing 1.8s ease-out infinite}#amohVoiceRecordingIndicator .amoh-brain-icon{font-size:23px;line-height:1;animation:amohBrainPulse 1.4s ease-in-out infinite}#amohVoiceRecordingIndicator .amoh-brain-copy{display:flex;flex-direction:column;gap:3px;min-width:0}#amohVoiceRecordingIndicator .amoh-brain-title{font-weight:700;color:#ecfdf5}#amohVoiceRecordingIndicator .amoh-brain-subtitle{font-size:11px;font-weight:500;color:#86efac}';document.head.appendChild(style);wakeIndicator=document.createElement('div');wakeIndicator.id='amohVoiceRecordingIndicator';wakeIndicator.setAttribute('role','status');wakeIndicator.setAttribute('aria-live','polite');wakeIndicator.style.cssText='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483002;display:none;align-items:center;gap:12px;padding:10px 16px;border:1px solid #10b981;border-radius:22px;background:rgba(2,15,8,.97);color:#dcfce7;font:600 13px/1.2 system-ui,sans-serif;box-shadow:0 8px 34px rgba(16,185,129,.22);pointer-events:none;max-width:calc(100vw - 24px);backdrop-filter:blur(12px)';document.body.appendChild(wakeIndicator)}wakeIndicator.replaceChildren();const orb=document.createElement('span');orb.className='amoh-brain-orb';const brain=document.createElement('span');brain.className='amoh-brain-icon';brain.textContent='🧠';orb.appendChild(brain);const copy=document.createElement('span');copy.className='amoh-brain-copy';const title=document.createElement('span');title.className='amoh-brain-title';const subtitle=document.createElement('span');subtitle.className='amoh-brain-subtitle';const lower=String(message).toLowerCase();title.textContent=lower.includes('speak')&&lower.includes('justice ai')||lower.includes('speaking')?'JUSTICE AI IS SPEAKING':lower.includes('record')||lower.includes('listening')?'JUSTICE AI IS LISTENING':'JUSTICE AI IS READY';subtitle.textContent=lower.includes('speak')&&lower.includes('justice ai')||lower.includes('speaking')?'Answering you now…':lower.includes('record')||lower.includes('listening')?'Recording — speak naturally':'Voice assistant active';copy.append(title,subtitle);wakeIndicator.append(orb,copy);wakeIndicator.style.display=visible?'flex':'none'}
 const sayStatus=t=>{if(status)status.textContent=t;if(avatarStatus)avatarStatus.textContent=t;if(handsFree&&wakeIndicator){const lower=String(t).toLowerCase();setVoiceIndicator(lower.includes('speak')&&lower.includes('justice ai')?'Justice AI is speaking…':lower.includes('speaking')?'Justice AI is speaking…':lower.includes('record')||lower.includes('listening')?'● Recording — speak now':'Justice AI voice assistant active',true)}};
 let motionEnabled=false,lastShakeAt=0,lastMotion=null;
 function showAvatar(){if(!avatarPanel)return;avatarPanel.classList.remove('amoh-settings-only');Object.assign(avatarPanel.style,{position:'fixed',inset:'auto 12px 84px auto',zIndex:'2147483002',width:'min(250px,calc(100vw - 24px))',maxWidth:'250px',padding:'0',display:'flex',alignItems:'flex-end',justifyContent:'flex-end',background:'transparent',backdropFilter:'none',WebkitBackdropFilter:'none',pointerEvents:'none'});const card=document.getElementById('amohVoiceAvatarCard');if(card)Object.assign(card.style,{width:'100%',boxSizing:'border-box',padding:'12px',borderRadius:'18px',background:'#06130b',border:'1px solid #34d39988',boxShadow:'0 12px 42px #000b',pointerEvents:'auto'});if(avatar){avatar.style.width='58px';avatar.style.height='58px';avatar.style.objectFit='cover';avatar.style.borderRadius='50%';avatar.style.display='block';avatar.style.margin='0 auto 7px'}const title=document.getElementById('amohVoiceAvatarTitle');if(title)Object.assign(title.style,{fontSize:'13px',margin:'0 0 4px',textAlign:'center'});if(avatarStatus)Object.assign(avatarStatus.style,{display:'block',fontSize:'11px',lineHeight:'1.4',textAlign:'center'});if(avatarClose)Object.assign(avatarClose.style,{display:'block',minWidth:'0',margin:'8px auto 0',padding:'7px 12px',fontSize:'11px'});avatarPanel.classList.add('is-active');avatarPanel.setAttribute('aria-hidden','false')}
 function hideAvatar(){if(avatarPanel){avatarPanel.classList.remove('is-active');avatarPanel.setAttribute('aria-hidden','true');avatarPanel.style.display='none'}}
 function onMotion(e){if(!handsFree||!avatar)return;const a=e.acceleration||e.accelerationIncludingGravity;if(!a)return;const x=Number(a.x)||0,y=Number(a.y)||0,z=Number(a.z)||0;let strength=Math.sqrt(x*x+y*y+z*z);if(e.accelerationIncludingGravity&&(!e.acceleration||e.acceleration.x===null)){if(lastMotion){strength=Math.sqrt((x-lastMotion.x)**2+(y-lastMotion.y)**2+(z-lastMotion.z)**2)}lastMotion={x,y,z}}if(strength>17&&Date.now()-lastShakeAt>650){lastShakeAt=Date.now();avatar.classList.remove('is-shaking');void avatar.offsetWidth;avatar.classList.add('is-shaking');setTimeout(()=>avatar.classList.remove('is-shaking'),460)}}
 async function enableMotion(){if(motionEnabled)return;try{if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){const permission=await DeviceMotionEvent.requestPermission();if(permission!=='granted'){sayStatus('Voice chat is on. Motion permission was not granted, so the picture will not react to phone shakes.');return}}if(typeof DeviceMotionEvent!=='undefined'){window.addEventListener('devicemotion',onMotion,{passive:true});motionEnabled=true}}catch(e){sayStatus('Voice chat is on. This browser does not allow shake detection here.')}}
 window.amohVoiceConversationActive=false;
 function stopMic(){if(rec)try{rec.stop()}catch(e){}listening=false;mic.textContent='🎙 Speak';mic.setAttribute('aria-pressed','false')}
 function stopMode(message='Voice conversation ended.'){handsFree=false;window.amohVoiceConversationActive=false;setVoiceIndicator('',false);stopped=true;waiting=false;stopMic();speechQueue=[];queuedSpeechActive=false;if(window.speechSynthesis)window.speechSynthesis.cancel();if(modeBtn){modeBtn.textContent='V';modeBtn.setAttribute('aria-pressed','false');modeBtn.setAttribute('aria-label','Start hands-free voice chat with Justice AI')}hideAvatar();sayStatus(message)}
  
 function listen(){if(!handsFree||!rec||listening||waiting||stopped)return;if(!window.isSecureContext){stopMode('Voice chat needs the secure HTTPS website.');return}try{rec.lang='en-US';rec.start()}catch(e){sayStatus('Microphone is busy. Tap V again if it does not start.')}}

 // Convert formatted AI text into natural speech. Keep the on-screen answer unchanged.
 function cleanSpeechText(value){return String(value||'')
  .replace(/\x60\x60\x60[\s\S]*?\x60\x60\x60/g,' Code example omitted. ')
  .replace(/!?\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/https?:\/\/\S+/gi,' link omitted ')
  .replace(/<[^>]*>/g,' ')
  .replace(/^\s{0,3}(?:#{1,6}\s*|[-*+]\s+|\d+[.)]\s+)/gm,'')
  .replace(/[*_~\x60>#|]/g,' ')
  .replace(/[\p{Extended_Pictographic}\p{Emoji_Component}]/gu,' ')
  .replace(/[^\p{L}\p{N}\p{M}\s.,!?;:'"()’-]/gu,' ')
  .replace(/\s+([.,!?;:])/g,'$1').replace(/([.,!?;:])(?=\S)/g,'$1 ')
  .replace(/\s{2,}/g,' ').trim();}
 let speechQueue=[],queuedSpeechActive=false;
 function clearSpeechQueue(){speechQueue=[];queuedSpeechActive=false;if(window.speechSynthesis)window.speechSynthesis.cancel()}
 function speakNextQueued(){if(!window.speechSynthesis||stopped||!handsFree)return;const next=speechQueue.shift();if(!next){queuedSpeechActive=false;return}queuedSpeechActive=true;const u=new SpeechSynthesisUtterance(next);applyVoice(u);u.onstart=()=>{if(handsFree){sayStatus('Justice AI is speaking — you can interrupt me.');listen()}};u.onend=()=>{if(!handsFree||stopped)return;if(speechQueue.length)speakNextQueued();else{queuedSpeechActive=false;sayStatus('Your turn — listening…');listen()}};u.onerror=()=>{if(handsFree&&!stopped){if(speechQueue.length)speakNextQueued();else{queuedSpeechActive=false;listen()}}};window.speechSynthesis.speak(u)}
 window.amohQueueVoiceText=text=>{const clean=cleanSpeechText(text);if(!clean||!handsFree||stopped)return;waiting=false;speechQueue.push(clean);if(!queuedSpeechActive)speakNextQueued()};
 window.amohSpeakResponse=text=>{if(!window.speechSynthesis||!text)return;clearSpeechQueue();const clean=cleanSpeechText(String(text).slice(0,5000));if(!clean)return;speechQueue=[clean];speakNextQueued()};
 function sendSpoken(text){if(!text.trim())return;const spoken=text.trim();input.value=spoken;/* Handle local dashboard navigation commands before sending ordinary chat. */if(typeof window.amohJusticeFeatureCommand==='function'&&window.amohJusticeFeatureCommand(spoken)){input.value='';return;}/* Run phone actions directly from the recognised voice turn before submitting it as ordinary chat. */if(typeof window.amohJusticePhoneCommand==='function'&&window.amohJusticePhoneCommand(spoken)){input.value='';return;}sayStatus('Sending your spoken question…');if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
 if(SR){try{rec=new SR();rec.lang='en-US';rec.interimResults=true;rec.continuous=false;}catch(error){rec=null;}}
 // Keep controls interactive even where the browser has no Web Speech API.
 if(!rec){rec={lang:'en-US',start(){sayStatus('Speech recognition is unavailable in this browser. Open this site in Chrome and allow microphone access.');},stop(){}};}
 rec.onstart=()=>{listening=true;transcript='';mic.textContent=handsFree?'● Recording':'■ Stop';mic.setAttribute('aria-pressed','true');sayStatus(handsFree?'● Recording — speak to Justice AI.':'Listening… speak now.')};
 rec.onresult=e=>{let interim='',gotFinal=false;for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal){transcript+=t+' ';gotFinal=true}else interim+=t}if(handsFree&&window.speechSynthesis?.speaking&&(interim.trim()||transcript.trim())){clearSpeechQueue();window.amohInterruptJusticeAnswer?.();waiting=false;sayStatus('I heard you — stopping my voice and listening.')}if(!textEntryActive)input.value=(transcript+interim).trim();if(gotFinal){try{rec.stop()}catch(e){}}};
 rec.onerror=e=>{listening=false;mic.textContent='🎙 Speak';if(handsFree&&e.error==='no-speech'){sayStatus('I did not hear you. Listening again…')}else if(handsFree){const msg=e.error==='not-allowed'?'Allow microphone access in browser settings.':'Voice input stopped. You can still type.';stopMode(msg)}else sayStatus(e.error==='not-allowed'?'Allow microphone access in browser settings.':'Voice input stopped. You can still type.')};
 rec.onend=()=>{const spoken=transcript.trim();listening=false;mic.textContent='🎙 Speak';mic.setAttribute('aria-pressed','false');if(spoken){if(handsFree)waiting=true;sendSpoken(spoken)}else if(handsFree&&!stopped&&!waiting){sayStatus('Listening again…');listen()}else if(input.value.trim())sayStatus('Speech captured. Press Send to ask Justice AI.')};
 mic.addEventListener('click',()=>{if(listening){stopMic();sayStatus(input.value.trim()?'Speech captured. Press Send to ask Justice AI.':'Voice input stopped.');return}if(!window.isSecureContext){sayStatus('Voice input needs the secure HTTPS website.');return}try{transcript='';rec.lang='en-US';rec.start()}catch(e){sayStatus('Microphone is starting. Please wait, then tap Speak again.')}});
 modeBtn?.addEventListener('click',()=>{if(handsFree){stopMode();return}if(!window.isSecureContext){sayStatus('Voice chat needs the secure HTTPS website.');return}stopped=false;handsFree=true;waiting=false;window.amohVoiceConversationActive=true;modeBtn.textContent='V';modeBtn.setAttribute('aria-pressed','true');modeBtn.setAttribute('aria-label','End hands-free voice chat');if(replies)replies.checked=true;showAvatar();sayStatus(SR?'Starting microphone… speak when the browser asks for permission.':'Speech recognition is unavailable in this browser. Open this site in Chrome and allow microphone access.');listen()});
 if(avatarClose){avatarClose.textContent='👎  End voice chat';avatarClose.setAttribute('aria-label','End voice conversation');avatarClose.title='End voice conversation';avatarClose.addEventListener('click',()=>stopMode('Voice conversation ended.'));}
 avatarPanel?.addEventListener('click',e=>{if(e.target===avatarPanel)stopMode()});
 window.addEventListener('amoh:justice-answer',e=>{if(!handsFree)return;waiting=false;if(e.detail?.streamed){sayStatus('Justice AI is preparing the next part…');return}if(e.detail?.answer)window.amohSpeakResponse(e.detail.answer);else listen()});
 replies?.addEventListener('change',()=>{if(!replies.checked&&window.speechSynthesis)window.speechSynthesis.cancel();sayStatus(replies.checked?'AI replies will be spoken aloud.':'Voice chat is ready. Tap Speak to ask by voice.')});
 window.addEventListener('pagehide',()=>{stopMic();if(window.speechSynthesis)window.speechSynthesis.cancel()});
})();
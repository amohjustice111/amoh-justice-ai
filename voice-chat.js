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
 const defaultPrefs={voiceURI:'',gender:'female',relationship:'friend',language:'en-US',voiceStyle:'standard',rate:1.04,pitch:1};
 let voicePrefs={...defaultPrefs};
 try{voicePrefs={...defaultPrefs,...JSON.parse(localStorage.getItem(settingsKey)||'{}')}}catch(e){}
 const relationships={
  friend:{label:'Friendly friend',instruction:'Speak like a kind, loyal friend: warm, natural, encouraging, conversational, and never overly formal.'},
  brother:{label:'Supportive brother',instruction:'Speak like a caring, supportive brother: friendly, honest, encouraging, lightly playful when appropriate, and respectful.'},
  sister:{label:'Supportive sister',instruction:'Speak like a caring, supportive sister: warm, thoughtful, encouraging, approachable, and respectful.'},
  father:{label:'Wise father',instruction:'Speak with the patience and reassurance of a caring father: calm, grounded, protective without being controlling, and explain things clearly.'},
  mother:{label:'Caring mother',instruction:'Speak with the warmth and patience of a caring mother: gentle, reassuring, thoughtful, and clear without being patronizing.'},
  mentor:{label:'Helpful mentor',instruction:'Speak like an encouraging mentor: patient, practical, positive, and focused on helping the user grow.'},
  playful:{label:'Playful companion',instruction:'Speak like a cheerful companion: upbeat, natural, and lightly humorous when suitable, while still being accurate and respectful.'},
  calm:{label:'Calm professional',instruction:'Use a calm, composed, friendly professional tone: clear, respectful, reassuring, and concise.'}
 };
 const languageOptions=[
  ['en-US','English (United States)'],['en-GB','English (United Kingdom)'],['en-GH','English (Ghana)'],
  ['ak-GH','Akan (Twi, Ghana)'],['ak-FANTE','Akan (Fante, Ghana)'],['ee-GH','Ewe (Ghana)'],['gaa-GH','Ga (Ghana)'],['dag-GH','Dagbani (Ghana)'],
  ['fr-FR','French'],['es-ES','Spanish'],['pt-PT','Portuguese'],['ar-SA','Arabic'],['ha-NG','Hausa'],['yo-NG','Yoruba'],['ig-NG','Igbo'],['sw-KE','Swahili'],
  ['de-DE','German'],['it-IT','Italian'],['nl-NL','Dutch'],['ru-RU','Russian'],['zh-CN','Chinese (Mandarin)'],['ja-JP','Japanese'],['ko-KR','Korean'],['hi-IN','Hindi'],['ur-PK','Urdu'],
  ['tr-TR','Turkish'],['pl-PL','Polish'],['th-TH','Thai'],['vi-VN','Vietnamese'],['id-ID','Indonesian'],['ms-MY','Malay'],['bn-BD','Bengali'],['ta-IN','Tamil'],['uk-UA','Ukrainian'],['zu-ZA','Zulu']
 ];
 function savePrefs(){try{localStorage.setItem(settingsKey,JSON.stringify(voicePrefs))}catch(e){}}
 function languageBase(code){return String(code||'en-US').toLowerCase().split('-')[0]}
 function selectedLanguageCode(){return voicePrefs.language||'en-US'}
 function applyVoiceStyle(utterance){if(voicePrefs.voiceStyle==='santa'){utterance.pitch=Math.min(Number(voicePrefs.pitch)||0.82,0.85);utterance.rate=Math.min(Number(voicePrefs.rate)||0.9,0.95)}}
 function getVoices(){return window.speechSynthesis?.getVoices?.()||[]}
 function voiceGender(v){const name=((v.name||'')+' '+(v.voiceURI||'')).toLowerCase();if(/female|woman|girl|zira|samantha|victoria|karen|moira|tessa|susan|hazel|aria|jenny|libby|sonia|natasha|google uk english female|google us english female/.test(name))return 'female';if(/(^|[\s_-])(male|man|boy)([\s_-]|$)|david|mark|daniel|james|george|guy|ryan|liam|thomas|alex|fred|oliver|aaron|google uk english male|google us english male/.test(name))return 'male';return 'unknown'}
 function refreshVoiceOptions(){
  const select=document.getElementById('amohVoiceChoice');if(!select)return;
  const voices=getVoices(),previous=voicePrefs.voiceURI;select.replaceChildren();
  const filtered=voices.filter(v=>voicePrefs.gender==='all'||voiceGender(v)===voicePrefs.gender);
  const choices=(filtered.length?filtered:voices).slice().sort((a,b)=>{const lang=languageBase(selectedLanguageCode()),am=languageBase(a.lang)===lang?0:1,bm=languageBase(b.lang)===lang?0:1;return am-bm||a.name.localeCompare(b.name)});
  if(!choices.length){const opt=document.createElement('option');opt.value='';opt.textContent='No browser voices found yet';select.appendChild(opt);return}
  choices.forEach((v,i)=>{const opt=document.createElement('option');opt.value=v.voiceURI;opt.textContent=v.name+' · '+(v.lang||'voice');select.appendChild(opt)});
  if(previous&&choices.some(v=>v.voiceURI===previous))select.value=previous;else{select.selectedIndex=0;voicePrefs.voiceURI=select.value;savePrefs()}
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
  #amohVoiceSettings .amoh-voice-setting-row>div{min-width:0}
  @media(max-width:380px){#amohVoiceSettings .amoh-voice-setting-row{grid-template-columns:1fr}}
  `;document.head.appendChild(style);
  const box=document.createElement('section');box.id='amohVoiceSettings';box.hidden=true;box.innerHTML=`
   <h3>Make Justice AI feel like family</h3><p>Choose a voice and the friendly style you feel most comfortable with. Options depend on voices installed in your browser or device.</p>
   <label for="amohChatLanguage">Chat and spoken language</label><select id="amohChatLanguage">${languageOptions.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')}</select>
   <p>Justice AI will try to answer in this language. Spoken output and microphone recognition depend on language support in your browser/device; Akan may need a compatible speech voice.</p>
   <label for="amohVoiceStyle">Voice character</label><select id="amohVoiceStyle"><option value="standard">Natural voice</option><option value="santa">Santa Claus style — deep, warm voice effect</option></select>
   <label for="amohVoiceRelationship">Friendly personality</label><select id="amohVoiceRelationship">
    <option value="friend">Friend — natural and supportive</option><option value="brother">Brother — honest and encouraging</option><option value="sister">Sister — warm and thoughtful</option><option value="father">Father — calm and wise</option><option value="mother">Mother — caring and reassuring</option><option value="mentor">Mentor — patient and motivating</option><option value="playful">Playful companion — cheerful</option><option value="calm">Calm professional — clear and gentle</option>
   </select>
   <div class="amoh-voice-setting-row"><div><label for="amohVoiceGender">Voice type</label><select id="amohVoiceGender"><option value="female">Female voices</option><option value="male">Male voices</option><option value="all">All available voices</option></select></div><div><label for="amohVoiceChoice">Choose a voice</label><select id="amohVoiceChoice" aria-label="Choose a spoken voice"></select></div></div>
   <label for="amohVoiceRate">Speaking speed <span id="amohVoiceRateValue">1.04×</span></label><input id="amohVoiceRate" type="range" min="0.75" max="1.25" step="0.05" value="1.04">
   <label for="amohVoicePitch">Voice pitch <span id="amohVoicePitchValue">1.00</span></label><input id="amohVoicePitch" type="range" min="0.7" max="1.3" step="0.05" value="1">
   <div class="amoh-setting-actions"><button id="amohVoiceTest" type="button">▶ Test voice</button><button id="amohVoiceSettingsClose" class="secondary" type="button">Save & close</button></div>`;
  card.insertBefore(box,document.getElementById('amohVoiceAvatarClose'));
  const rel=document.getElementById('amohVoiceRelationship'),gender=document.getElementById('amohVoiceGender'),rate=document.getElementById('amohVoiceRate'),pitch=document.getElementById('amohVoicePitch'),language=document.getElementById('amohChatLanguage'),styleChoice=document.getElementById('amohVoiceStyle');
  rel.value=voicePrefs.relationship;gender.value=voicePrefs.gender;rate.value=String(voicePrefs.rate);pitch.value=String(voicePrefs.pitch);language.value=voicePrefs.language;styleChoice.value=voicePrefs.voiceStyle;
  rel.addEventListener('change',()=>{voicePrefs.relationship=rel.value;savePrefs()});
  language.addEventListener('change',()=>{voicePrefs.language=language.value;const matching=getVoices().find(v=>languageBase(v.lang)===languageBase(language.value)&&(voicePrefs.gender==='all'||voiceGender(v)===voicePrefs.gender));if(matching)voicePrefs.voiceURI=matching.voiceURI;refreshVoiceOptions();savePrefs();if(rec)rec.lang=language.value});
  styleChoice.addEventListener('change',()=>{voicePrefs.voiceStyle=styleChoice.value;if(voicePrefs.voiceStyle==='santa'){voicePrefs.pitch=0.82;voicePrefs.rate=0.9;pitch.value='0.82';rate.value='0.9';document.getElementById('amohVoicePitchValue').textContent='0.82';document.getElementById('amohVoiceRateValue').textContent='0.90×'}savePrefs()});
  gender.addEventListener('change',()=>{voicePrefs.gender=gender.value;voicePrefs.voiceURI='';refreshVoiceOptions();savePrefs()});
  document.getElementById('amohVoiceChoice').addEventListener('change',e=>{voicePrefs.voiceURI=e.target.value;savePrefs()});
  rate.addEventListener('input',()=>{voicePrefs.rate=Number(rate.value);document.getElementById('amohVoiceRateValue').textContent=voicePrefs.rate.toFixed(2)+'×';savePrefs()});
  pitch.addEventListener('input',()=>{voicePrefs.pitch=Number(pitch.value);document.getElementById('amohVoicePitchValue').textContent=voicePrefs.pitch.toFixed(2);savePrefs()});
  document.getElementById('amohVoiceTest').addEventListener('click',()=>{if(!window.speechSynthesis)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance('Hey, I am Justice AI. I am here for you. What would you like us to talk about today?');applyVoice(u);window.speechSynthesis.speak(u)});
  document.getElementById('amohVoiceSettingsClose').addEventListener('click',closeVoiceSettings);
  refreshVoiceOptions();if(window.speechSynthesis)window.speechSynthesis.addEventListener?.('voiceschanged',refreshVoiceOptions);
 }
 function applyVoice(utterance){
  const voices=getVoices();const selected=voices.find(v=>v.voiceURI===voicePrefs.voiceURI);
  if(selected)utterance.voice=selected;utterance.rate=Number(voicePrefs.rate)||1.04;
  // Some Android/browser voices do not identify their gender in the voice name. Keep the selected voice, but lower its pitch when Male is selected so the setting still has a noticeable effect.
  const requestedPitch=Number(voicePrefs.pitch)||1;utterance.pitch=voicePrefs.gender==='male'?Math.min(requestedPitch,0.88):requestedPitch;
  utterance.lang=selected&&languageBase(selected.lang)===languageBase(selectedLanguageCode())?selected.lang:selectedLanguageCode();applyVoiceStyle(utterance);
 }
 function selectedRelationship(){return relationships[voicePrefs.relationship]||relationships.friend}
 window.amohJusticeVoicePreferences=()=>({relationship:voicePrefs.relationship,voiceGender:voicePrefs.gender,language:voicePrefs.language||'en-US'});
 
 installVoiceSettings();
 const chatTop=document.querySelector('#justiceAiOverlay .chat-top, .chat-top');
 if(chatTop&&!document.getElementById('amohVoiceSettingsButton')){const b=document.createElement('button');b.id='amohVoiceSettingsButton';b.type='button';b.textContent='⚙';b.title='Voice and personality settings';b.setAttribute('aria-label','Open Justice AI voice settings');b.style.cssText='flex:0 0 40px;width:40px;height:40px;border-radius:50%;border:1px solid #4ade8055;background:#07130b;color:#bbf7d0;font-size:21px;cursor:pointer';b.addEventListener('click',openVoiceSettings);const launcher=document.getElementById('amohVoiceLauncher');if(launcher&&launcher.parentNode===chatTop)chatTop.insertBefore(b,launcher);else chatTop.appendChild(b)}
 let rec=null,listening=false,transcript='',handsFree=false,waiting=false,stopped=false;
 const sayStatus=t=>{if(status)status.textContent=t;if(avatarStatus)avatarStatus.textContent=t};
 let motionEnabled=false,lastShakeAt=0,lastMotion=null;
 function showAvatar(){if(avatarPanel){avatarPanel.classList.add('is-active');avatarPanel.setAttribute('aria-hidden','false')}}
 function hideAvatar(){if(avatarPanel){avatarPanel.classList.remove('is-active');avatarPanel.setAttribute('aria-hidden','true')}}
 function onMotion(e){if(!handsFree||!avatar)return;const a=e.acceleration||e.accelerationIncludingGravity;if(!a)return;const x=Number(a.x)||0,y=Number(a.y)||0,z=Number(a.z)||0;let strength=Math.sqrt(x*x+y*y+z*z);if(e.accelerationIncludingGravity&&(!e.acceleration||e.acceleration.x===null)){if(lastMotion){strength=Math.sqrt((x-lastMotion.x)**2+(y-lastMotion.y)**2+(z-lastMotion.z)**2)}lastMotion={x,y,z}}if(strength>17&&Date.now()-lastShakeAt>650){lastShakeAt=Date.now();avatar.classList.remove('is-shaking');void avatar.offsetWidth;avatar.classList.add('is-shaking');setTimeout(()=>avatar.classList.remove('is-shaking'),460)}}
 async function enableMotion(){if(motionEnabled)return;try{if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){const permission=await DeviceMotionEvent.requestPermission();if(permission!=='granted'){sayStatus('Voice chat is on. Motion permission was not granted, so the picture will not react to phone shakes.');return}}if(typeof DeviceMotionEvent!=='undefined'){window.addEventListener('devicemotion',onMotion,{passive:true});motionEnabled=true}}catch(e){sayStatus('Voice chat is on. This browser does not allow shake detection here.')}}
 window.amohVoiceConversationActive=false;
 function stopMic(){if(rec)try{rec.stop()}catch(e){}listening=false;mic.textContent='🎙 Speak';mic.setAttribute('aria-pressed','false')}
 function stopMode(message='Voice conversation stopped.'){handsFree=false;window.amohVoiceConversationActive=false;stopped=true;waiting=false;thinkingUtterance=null;stopMic();speechQueue=[];queuedSpeechActive=false;if(window.speechSynthesis)window.speechSynthesis.cancel();if(modeBtn){modeBtn.textContent='V';modeBtn.setAttribute('aria-pressed','false');modeBtn.setAttribute('aria-label','Start hands-free voice chat with Justice AI')}hideAvatar();sayStatus(message)}
 function listen(){if(!handsFree||!rec||listening||waiting||stopped)return;if(!window.isSecureContext){stopMode('Voice chat needs the secure HTTPS website.');return}try{rec.start()}catch(e){sayStatus('Preparing microphone…')}}
 let speechQueue=[],queuedSpeechActive=false;
 function clearSpeechQueue(){speechQueue=[];queuedSpeechActive=false;if(window.speechSynthesis)window.speechSynthesis.cancel()}
 function speakNextQueued(){if(!window.speechSynthesis||stopped||!handsFree)return;const next=speechQueue.shift();if(!next){queuedSpeechActive=false;return}queuedSpeechActive=true;const u=new SpeechSynthesisUtterance(next);applyVoice(u);u.onstart=()=>{if(handsFree){sayStatus('Justice AI is speaking — you can interrupt me.');listen()}};u.onend=()=>{if(!handsFree||stopped)return;if(speechQueue.length)speakNextQueued();else{queuedSpeechActive=false;sayStatus('Your turn — listening…');listen()}};u.onerror=()=>{if(handsFree&&!stopped){if(speechQueue.length)speakNextQueued();else{queuedSpeechActive=false;listen()}}};window.speechSynthesis.speak(u)}
 let thinkingUtterance=null;
 function speakThinking(){if(!handsFree||stopped||!window.speechSynthesis)return;try{window.speechSynthesis.cancel();thinkingUtterance=new SpeechSynthesisUtterance('Thinking.');applyVoice(thinkingUtterance);const current=thinkingUtterance;current.onend=()=>{if(thinkingUtterance===current)thinkingUtterance=null};current.onerror=()=>{if(thinkingUtterance===current)thinkingUtterance=null};window.speechSynthesis.speak(current)}catch(e){thinkingUtterance=null}}
 window.amohQueueVoiceText=text=>{const clean=String(text||'').trim();if(!clean||!handsFree||stopped)return;if(thinkingUtterance){window.speechSynthesis?.cancel();thinkingUtterance=null}waiting=false;speechQueue.push(clean);if(!queuedSpeechActive)speakNextQueued()};
 window.amohSpeakResponse=text=>{if(!window.speechSynthesis||!text)return;clearSpeechQueue();const clean=String(text).slice(0,3000);speechQueue=[clean];speakNextQueued()};
 function sendSpoken(text){if(!text.trim())return;input.value=text.trim();if(handsFree){sayStatus('Thinking…');speakThinking()}else sayStatus('Sending your spoken question…');if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}
 if(!SR){mic.addEventListener('click',()=>sayStatus('Voice input is not supported here. Try Chrome or Edge.'));modeBtn?.addEventListener('click',()=>sayStatus('Hands-free voice chat needs a browser with speech recognition, such as Chrome.'));return}
 rec=new SR();rec.lang=selectedLanguageCode();rec.interimResults=true;rec.continuous=false;
 rec.onstart=()=>{listening=true;transcript='';mic.textContent='■ Stop';mic.setAttribute('aria-pressed','true');sayStatus(handsFree?'Listening — ask Justice AI anything.':'Listening… speak now.')};
 rec.onresult=e=>{let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)transcript+=t+' ';else interim+=t}if(handsFree&&window.speechSynthesis?.speaking&&interim.trim()){clearSpeechQueue();window.amohInterruptJusticeAnswer?.();waiting=false;sayStatus('I heard you — stopping my voice and listening.')}input.value=(transcript+interim).trim()};
 rec.onerror=e=>{listening=false;mic.textContent='🎙 Speak';if(handsFree&&e.error==='no-speech'){sayStatus('I did not hear you. Listening again…');listen()}else if(handsFree){const msg=e.error==='not-allowed'?'Allow microphone access in browser settings.':'Voice input stopped. You can still type.';stopMode(msg)}else sayStatus(e.error==='not-allowed'?'Allow microphone access in browser settings.':'Voice input stopped. You can still type.')};
 rec.onend=()=>{const spoken=transcript.trim();listening=false;mic.textContent='🎙 Speak';mic.setAttribute('aria-pressed','false');if(spoken){if(handsFree)waiting=true;sendSpoken(spoken)}else if(handsFree&&!stopped&&!waiting){sayStatus('Listening again…');listen()}else if(input.value.trim())sayStatus('Speech captured. Press Send to ask Justice AI.')};
 mic.addEventListener('click',()=>{if(listening){stopMic();sayStatus('Voice input stopped.');return}if(!window.isSecureContext){sayStatus('Voice input needs the secure HTTPS website.');return}try{rec.start()}catch(e){sayStatus('Microphone is starting. Please wait.')}});
 modeBtn?.addEventListener('click',async()=>{if(handsFree){stopMode();return}if(!window.isSecureContext){sayStatus('Voice chat needs the secure HTTPS website.');return}if(!window.speechSynthesis){sayStatus('Spoken replies are not supported in this browser.');return}stopped=false;handsFree=true;waiting=false;window.amohVoiceConversationActive=true;modeBtn.textContent='V';modeBtn.setAttribute('aria-pressed','true');modeBtn.setAttribute('aria-label','End hands-free voice chat');if(replies)replies.checked=true;avatarPanel?.classList.remove('amoh-settings-only');showAvatar();sayStatus('Voice chat starting — allow microphone access, then speak.');await enableMotion();listen()});
 avatarClose?.addEventListener('click',()=>stopMode());
 // Settings can be opened from the full-screen chat even when hands-free mode is off.
 const overlayObserver=new MutationObserver(()=>{const top=document.querySelector('#justiceAiOverlay .chat-top');const launcher=document.getElementById('amohVoiceLauncher');if(top&&!document.getElementById('amohVoiceSettingsButton')){const b=document.createElement('button');b.id='amohVoiceSettingsButton';b.type='button';b.textContent='⚙';b.title='Voice and personality settings';b.setAttribute('aria-label','Open Justice AI voice settings');b.style.cssText='flex:0 0 40px;width:40px;height:40px;border-radius:50%;border:1px solid #4ade8055;background:#07130b;color:#bbf7d0;font-size:21px;cursor:pointer';b.addEventListener('click',openVoiceSettings);if(launcher&&launcher.parentNode===top)top.insertBefore(b,launcher);else top.appendChild(b)}});overlayObserver.observe(document.body,{childList:true,subtree:true});
 avatarPanel?.addEventListener('click',e=>{if(e.target===avatarPanel)stopMode()});
 window.addEventListener('amoh:justice-answer',e=>{if(!handsFree)return;waiting=false;if(e.detail?.streamed){sayStatus('Justice AI is preparing the next part…');return}if(e.detail?.answer)window.amohSpeakResponse(e.detail.answer);else listen()});
 replies?.addEventListener('change',()=>{if(!replies.checked&&window.speechSynthesis)window.speechSynthesis.cancel();sayStatus(replies.checked?'AI replies will be spoken aloud.':'Voice chat is ready. Tap Speak to ask by voice.')});
 window.addEventListener('pagehide',()=>{stopMic();if(window.speechSynthesis)window.speechSynthesis.cancel()});
})();
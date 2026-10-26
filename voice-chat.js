/* Browser-native voice controls for Justice AI. The existing /api/chat endpoint is unchanged. */
(()=>{
 const input=document.getElementById('chatInput'),form=document.getElementById('chatForm'),mic=document.getElementById('voiceInput'),replies=document.getElementById('voiceReplies'),status=document.getElementById('voiceStatus');
 if(!input||!form||!mic||!status)return;
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 let recognition=null,listening=false,finalTranscript='';
 const setStatus=m=>{status.textContent=m};
 window.amohSpeakResponse=text=>{
   if(!('speechSynthesis' in window)||!text)return;
   window.speechSynthesis.cancel();
   const utterance=new SpeechSynthesisUtterance(String(text).slice(0,5000));
   utterance.lang='en-GH';utterance.rate=1;window.speechSynthesis.speak(utterance);
 };
 const stopListening=()=>{if(recognition){try{recognition.stop()}catch(e){}}listening=false;mic.setAttribute('aria-pressed','false');mic.textContent='🎙 Speak'};
 if(!Recognition){mic.addEventListener('click',()=>setStatus('Voice input is not supported in this browser. Try Chrome or Edge.'))}
 else{
   recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=true;recognition.continuous=false;
   recognition.onstart=()=>{listening=true;finalTranscript='';mic.setAttribute('aria-pressed','true');mic.textContent='■ Stop';setStatus('Listening… speak now.')};
   recognition.onresult=event=>{let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const piece=event.results[i][0].transcript;if(event.results[i].isFinal)finalTranscript+=piece+' ';else interim+=piece}input.value=(finalTranscript+interim).trim()};
   recognition.onerror=event=>{stopListening();const messages={'not-allowed':'Microphone permission was denied. Allow microphone access in browser settings.','no-speech':'No speech was detected. Tap Speak and try again.','network':'Browser speech recognition needs a working network connection.'};setStatus(messages[event.error]||'Voice input stopped. You can still type your question.')};
   recognition.onend=()=>{const shouldSend=finalTranscript.trim().length>0;stopListening();if(shouldSend){input.value=finalTranscript.trim();setStatus('Sending your spoken question to Justice AI…');if(typeof form.requestSubmit==='function')form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))}else if(input.value.trim())setStatus('Speech captured. Press Send to ask Justice AI.')};
   mic.addEventListener('click',()=>{if(listening){stopListening();setStatus('Voice input stopped.');return}if(!window.isSecureContext){setStatus('Voice input needs the secure HTTPS website.');return}try{recognition.start()}catch(e){setStatus('Voice input is already starting. Please wait.')}});
 }
 replies?.addEventListener('change',()=>{if(!replies.checked&&'speechSynthesis'in window)window.speechSynthesis.cancel();setStatus(replies.checked?'AI replies will be spoken aloud.':'Voice chat is ready. Tap Speak to ask by voice.')});
 if(replies?.checked===false)setStatus('Voice chat is ready. Tap Speak to ask by voice.');
 window.addEventListener('pagehide',()=>{stopListening();if('speechSynthesis'in window)window.speechSynthesis.cancel()});
})();